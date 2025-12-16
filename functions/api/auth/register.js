// POST /api/auth/register - Register new user
// Uses Supabase Auth Admin API to create pre-confirmed users

import { getSupabaseConfig, sbInsert } from '../../lib/supabase.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { email, password, full_name } = body;

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const { url, key } = getSupabaseConfig(env);

    // Use Admin API to create user with email pre-confirmed (service role key bypasses RLS)
    const authResponse = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: full_name || null,
        },
      }),
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      console.error('Registration error:', errorData);
      return Response.json(
        { error: errorData.error_description || errorData.msg || errorData.message || 'Registration failed' },
        { status: 400 }
      );
    }

    const authData = await authResponse.json();

    // Handle both response formats:
    // - With email confirmation: user data at root level (authData.id, authData.email)
    // - Without email confirmation: user data nested (authData.user.id, authData.user.email)
    const userId = authData.user?.id || authData.id;
    const userEmail = authData.user?.email || authData.email;

    if (!userId || !userEmail) {
      console.error('Unexpected auth response format:', authData);
      return Response.json(
        { error: 'Registration failed - unexpected response format' },
        { status: 500 }
      );
    }

    // Insert user profile into public.users table
    try {
      await sbInsert(
        env,
        'users',
        [{
          id: userId,
          email: userEmail,
          full_name: full_name || null,
          role: 'user', // Default role
          created_at: new Date().toISOString(),
        }],
        false
      );
    } catch (insertError) {
      console.error('Error creating user profile:', insertError);
      // Auth user created but profile failed - not critical
    }

    return Response.json(
      {
        message: 'Registration successful',
        user: {
          id: userId,
          email: userEmail,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
