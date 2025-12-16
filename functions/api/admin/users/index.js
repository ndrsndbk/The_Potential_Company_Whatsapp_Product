// Admin Users API - List and Create
// GET /api/admin/users - List all users
// POST /api/admin/users - Create new user

import { sbSelect, sbInsert, getSupabaseConfig } from '../../../lib/supabase.js';

// Check if user is super admin
async function requireSuperAdmin(context) {
  const user = context.data?.user;
  if (!user || user.role !== 'super_admin') {
    return Response.json(
      { error: 'Super admin access required' },
      { status: 403 }
    );
  }
  return null;
}

export async function onRequestGet(context) {
  const authError = await requireSuperAdmin(context);
  if (authError) return authError;

  const { env } = context;

  try {
    const users = await sbSelect(
      env,
      'users',
      'order=created_at.desc',
      '*,organization:organizations(id,name,slug)'
    );

    return Response.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json(
      { error: error.message || 'Failed to list users' },
      { status: 500 }
    );
  }
}

export async function onRequestPost(context) {
  const authError = await requireSuperAdmin(context);
  if (authError) return authError;

  const { env, request } = context;

  try {
    const body = await request.json();
    const { email, password, full_name, role, organization_id } = body;

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { url, key } = getSupabaseConfig(env);

    // Create user with Supabase Auth
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
        email_confirm: true,
      }),
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      console.error('Auth user creation error:', errorData);
      return Response.json(
        { error: errorData.message || 'Failed to create auth user' },
        { status: 400 }
      );
    }

    const authData = await authResponse.json();

    // Insert user profile into public.users table
    const users = await sbInsert(env, 'users', [{
      id: authData.id,
      email,
      full_name: full_name || null,
      role: role || 'user',
      organization_id: organization_id || null,
      is_active: true,
    }]);

    return Response.json(
      { user: users[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
