// POST /api/auth/login - User login with email/password
// Uses Supabase Auth REST API directly (no SDK)

import { getSupabaseConfig, sbInsert } from '../../lib/supabase.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { url, key } = getSupabaseConfig(env);

    // Authenticate with Supabase Auth
    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      console.error('Login error:', errorData);
      return Response.json(
        { error: errorData.error_description || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const authData = await authResponse.json();

    // Handle both response formats (user data might be at root or nested)
    const userId = authData.user?.id || authData.id;
    const userEmail = authData.user?.email || authData.email;

    if (!userId) {
      console.error('Unexpected auth response format:', authData);
      return Response.json(
        { error: 'Login failed - unexpected response format' },
        { status: 500 }
      );
    }

    // Get user profile from public.users table (using service key to bypass RLS)
    const userProfileUrl = `${url}/rest/v1/users?id=eq.${userId}&select=*`;
    console.log('Fetching user profile from:', userProfileUrl);

    const userResponse = await fetch(userProfileUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    console.log('User profile response status:', userResponse.status);

    let userProfile = null;
    if (userResponse.ok) {
      const users = await userResponse.json();
      console.log('User profile query result:', JSON.stringify(users));
      userProfile = users[0] || null;
    } else {
      const errorText = await userResponse.text();
      console.error('User profile fetch failed:', errorText);
    }

    console.log('Final userProfile:', JSON.stringify(userProfile));

    return Response.json({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      expires_in: authData.expires_in,
      user: {
        id: userId,
        email: userEmail,
        role: userProfile?.role || 'user',
        full_name: userProfile?.full_name || null,
        organization_id: userProfile?.organization_id || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
