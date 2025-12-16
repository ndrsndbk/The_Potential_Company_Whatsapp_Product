// Admin Organizations API - Get, Update, Delete
// GET /api/admin/organizations/:id - Get organization
// PUT /api/admin/organizations/:id - Update organization
// DELETE /api/admin/organizations/:id - Delete organization

import { sbSelectOne, sbUpdate, sbDelete } from '../../../lib/supabase.js';

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
    const organization = await sbSelectOne(
      env,
      'organizations',
      `id=eq.${id}`,
      '*'
    );

    if (!organization) {
      return Response.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return Response.json({ organization });
  } catch (error) {
    console.error('Error getting organization:', error);
    return Response.json(
      { error: error.message || 'Failed to get organization' },
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
    const { name, slug, logo_url, is_active } = body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (is_active !== undefined) updates.is_active = is_active;

    const organizations = await sbUpdate(
      env,
      'organizations',
      `id=eq.${id}`,
      updates
    );

    if (!organizations || organizations.length === 0) {
      return Response.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return Response.json({ organization: organizations[0] });
  } catch (error) {
    console.error('Error updating organization:', error);
    return Response.json(
      { error: error.message || 'Failed to update organization' },
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
    await sbDelete(env, 'organizations', `id=eq.${id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return Response.json(
      { error: error.message || 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
