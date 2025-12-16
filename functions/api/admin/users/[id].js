// Admin Users API - Get, Update, Delete
// GET /api/admin/users/:id - Get user
// PUT /api/admin/users/:id - Update user
// DELETE /api/admin/users/:id - Delete user

import { sbSelectOne, sbUpdate, sbDelete, getSupabaseConfig } from '../../../lib/supabase.js';

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

  const { env, params } = context;
  const { id } = params;

  try {
    const user = await sbSelectOne(
      env,
      'users',
      `id=eq.${id}`,
      '*,organization:organizations(id,name,slug)'
    );

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return Response.json({ user });
  } catch (error) {
    console.error('Error getting user:', error);
    return Response.json(
      { error: error.message || 'Failed to get user' },
      { status: 500 }
    );
  }
}

export async function onRequestPut(context) {
  const authError = await requireSuperAdmin(context);
  if (authError) return authError;

  const { env, params, request } = context;
  const { id } = params;

  try {
    const body = await request.json();
    const { full_name, role, organization_id, is_active } = body;

    const updates = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;
    if (organization_id !== undefined) updates.organization_id = organization_id;
    if (is_active !== undefined) updates.is_active = is_active;

    const users = await sbUpdate(
      env,
      'users',
      `id=eq.${id}`,
      updates
    );

    if (!users || users.length === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return Response.json({ user: users[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function onRequestDelete(context) {
  const authError = await requireSuperAdmin(context);
  if (authError) return authError;

  const { env, params } = context;
  const { id } = params;

  try {
    const { url, key } = getSupabaseConfig(env);

    // Delete user from Supabase Auth (will cascade to public.users)
    const authResponse = await fetch(`${url}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      console.error('Auth user deletion error:', errorData);
      // Even if auth deletion fails, try to delete from public.users
    }

    // Also delete from public.users table
    await sbDelete(env, 'users', `id=eq.${id}`);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
