// GET /api/stamp-programs/:id - Get single stamp program
// PUT /api/stamp-programs/:id - Update stamp program
// DELETE /api/stamp-programs/:id - Deactivate stamp program (soft delete)

import { sbSelectOne, sbUpdate } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const user = context.data?.user;
  const programId = params.id;

  try {
    // Check for dashboard_token in query params (public access)
    const url = new URL(request.url);
    const dashboardToken = url.searchParams.get('dashboard_token');

    let filter = `id=eq.${programId}`;

    if (dashboardToken) {
      // Public access via dashboard token - verify token matches this program
      filter += `&dashboard_token=eq.${dashboardToken}&is_active=eq.true`;
    } else if (user) {
      // Authenticated user access
      if (user.role !== 'super_admin' && user.organization_id) {
        filter += `&organization_id=eq.${user.organization_id}`;
      }
    } else {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const program = await sbSelectOne(env, 'stamp_programs', filter, '*');

    if (!program) {
      return Response.json({ error: 'Program not found' }, { status: 404 });
    }

    return Response.json({ program });
  } catch (error) {
    console.error('Error getting stamp program:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const user = context.data?.user;
  const programId = params.id;

  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      business_name,
      owner_wa_number,
      brand_color_primary,
      brand_color_secondary,
      logo_url,
      stamp_type,
      stamp_type_label,
      stamps_required,
      reward_description,
      trigger_keyword,
      stamp_cooldown_minutes,
      verification_timeout_minutes,
      auto_expire_days,
      tier,
      is_active,
      flow_id,
      stamp_template_id
    } = body;

    // Build filter
    let filter = `id=eq.${programId}`;
    if (user.role !== 'super_admin' && user.organization_id) {
      filter += `&organization_id=eq.${user.organization_id}`;
    }

    // Build update data (only include provided fields)
    const updateData = { updated_at: new Date().toISOString() };
    if (business_name !== undefined) updateData.business_name = business_name;
    if (owner_wa_number !== undefined) updateData.owner_wa_number = owner_wa_number;
    if (brand_color_primary !== undefined) updateData.brand_color_primary = brand_color_primary;
    if (brand_color_secondary !== undefined) updateData.brand_color_secondary = brand_color_secondary;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (stamp_type !== undefined) updateData.stamp_type = stamp_type;
    if (stamp_type_label !== undefined) updateData.stamp_type_label = stamp_type_label;
    if (stamps_required !== undefined) updateData.stamps_required = stamps_required;
    if (reward_description !== undefined) updateData.reward_description = reward_description;
    if (trigger_keyword !== undefined) updateData.trigger_keyword = trigger_keyword;
    if (stamp_cooldown_minutes !== undefined) updateData.stamp_cooldown_minutes = stamp_cooldown_minutes;
    if (verification_timeout_minutes !== undefined) updateData.verification_timeout_minutes = verification_timeout_minutes;
    if (auto_expire_days !== undefined) updateData.auto_expire_days = auto_expire_days;
    if (tier !== undefined) updateData.tier = tier;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (flow_id !== undefined) updateData.flow_id = flow_id;
    if (stamp_template_id !== undefined) updateData.stamp_template_id = stamp_template_id;

    const results = await sbUpdate(
      env,
      'stamp_programs',
      filter,
      updateData,
      true
    );

    if (!results || results.length === 0) {
      return Response.json({ error: 'Program not found or access denied' }, { status: 404 });
    }

    return Response.json({ program: results[0] });
  } catch (error) {
    console.error('Error updating stamp program:', error);
    // Handle unique constraint violation for trigger_keyword
    if (error.message && error.message.includes('trigger_keyword')) {
      return Response.json(
        { error: 'Trigger keyword already exists. Please choose a different one.' },
        { status: 409 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const user = context.data?.user;
  const programId = params.id;

  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Build filter
    let filter = `id=eq.${programId}`;
    if (user.role !== 'super_admin' && user.organization_id) {
      filter += `&organization_id=eq.${user.organization_id}`;
    }

    // Soft delete by setting is_active to false
    const results = await sbUpdate(
      env,
      'stamp_programs',
      filter,
      { is_active: false, updated_at: new Date().toISOString() },
      true
    );

    if (!results || results.length === 0) {
      return Response.json({ error: 'Program not found or access denied' }, { status: 404 });
    }

    return Response.json({ success: true, program: results[0] });
  } catch (error) {
    console.error('Error deactivating stamp program:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
