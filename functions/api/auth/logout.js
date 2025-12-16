// POST /api/auth/logout - Logout current user
// Invalidates the JWT token on Supabase

import { getSupabaseConfig } from '../../lib/supabase.js';

export async function onRequestPost(context) {
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

    // Logout with Supabase Auth
    const authResponse = await fetch(`${url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${token}`,
      },
    });

    // Logout is best-effort - even if it fails, we return success
    // The client should clear the token regardless
    if (!authResponse.ok) {
      console.warn('Logout request failed, but continuing:', authResponse.status);
    }

    return Response.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success - client should clear token
    return Response.json({
      message: 'Logout successful',
    });
  }
}
