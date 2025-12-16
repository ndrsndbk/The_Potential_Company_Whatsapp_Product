// GET /api/auth/me - Get current user profile
// Verifies JWT token and returns user information

import { getSupabaseConfig } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const { url, key } = getSupabaseConfig(env);

    // Verify token with Supabase Auth
    const authResponse = await fetch(`${url}/auth/v1/user`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!authResponse.ok) {
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const authUser = await authResponse.json();

    // Get user profile from public.users table (using service key to bypass RLS)
    const userResponse = await fetch(
      `${url}/rest/v1/users?id=eq.${authUser.id}&select=*`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );

    let userProfile = null;
    if (userResponse.ok) {
      const users = await userResponse.json();
      userProfile = users[0] || null;
    }

    return Response.json({
      user: {
        id: authUser.id,
        email: authUser.email,
        role: userProfile?.role || 'user',
        full_name: userProfile?.full_name || null,
        organization_id: userProfile?.organization_id || null,
        created_at: authUser.created_at,
        updated_at: userProfile?.updated_at || null,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
