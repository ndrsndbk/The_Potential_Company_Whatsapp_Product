// Admin Organizations API - List and Create
// GET /api/admin/organizations - List all organizations
// POST /api/admin/organizations - Create new organization

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
    const organizations = await sbSelect(
      env,
      'organizations',
      'order=created_at.desc',
      '*'
    );

    return Response.json({ organizations });
  } catch (error) {
    console.error('Error listing organizations:', error);
    return Response.json(
      { error: error.message || 'Failed to list organizations' },
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
    const { name, slug, logo_url } = body;

    if (!name || !slug) {
      return Response.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const organizations = await sbInsert(env, 'organizations', [{
      name,
      slug,
      logo_url: logo_url || null,
      is_active: true,
    }]);

    return Response.json(
      { organization: organizations[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating organization:', error);
    return Response.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}
