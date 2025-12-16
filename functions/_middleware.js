// Global middleware for all API routes
// Handles CORS and authentication

import { getSupabaseConfig } from './lib/supabase.js';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/webhook',
];

// Check if route is public (doesn't require auth)
function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

// Verify JWT token and return user
async function verifyToken(env, token) {
  try {
    const { url, key } = getSupabaseConfig(env);

    const authResponse = await fetch(`${url}/auth/v1/user`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!authResponse.ok) {
      return null;
    }

    const authUser = await authResponse.json();

    // Get user profile from public.users table (using service key to bypass RLS)
    const profileUrl = `${url}/rest/v1/users?id=eq.${authUser.id}&select=*`;
    console.log('[Middleware] Fetching profile:', profileUrl);

    const userResponse = await fetch(profileUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    console.log('[Middleware] Profile response status:', userResponse.status);

    let userProfile = null;
    if (userResponse.ok) {
      const users = await userResponse.json();
      console.log('[Middleware] Profile result:', JSON.stringify(users));
      userProfile = users[0] || null;
    } else {
      const errorText = await userResponse.text();
      console.error('[Middleware] Profile fetch failed:', errorText);
    }

    console.log('[Middleware] Final user role:', userProfile?.role);

    return {
      id: authUser.id,
      email: authUser.email,
      role: userProfile?.role || 'user',
      full_name: userProfile?.full_name || null,
      organization_id: userProfile?.organization_id || null,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Only check authentication for API routes (not static files or frontend routes)
  const isApiRoute = url.pathname.startsWith('/api/');

  if (isApiRoute && !isPublicRoute(url.pathname)) {
    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = await verifyToken(env, token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Attach user to context.data for use in route handlers
    // In Cloudflare Pages Functions, use context.data to pass data downstream
    context.data = context.data || {};
    context.data.user = user;
  }

  // Process request
  const response = await next();

  // Add CORS headers to response
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return newResponse;
}
