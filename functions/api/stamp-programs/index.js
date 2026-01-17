// GET /api/stamp-programs - List all stamp programs for user's organization (or by dashboard_token)
// POST /api/stamp-programs - Create new stamp program in user's organization

import { sbSelect, sbInsert } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = context.data?.user;

  try {
    // Check for dashboard_token in query params (public access)
    const url = new URL(request.url);
    const dashboardToken = url.searchParams.get('dashboard_token');

    let filter = 'order=created_at.desc';

    if (dashboardToken) {
      // Public access via dashboard token
      filter = `dashboard_token=eq.${dashboardToken}&is_active=eq.true&order=created_at.desc`;
    } else if (user) {
      // Authenticated user access
      if (user.role !== 'super_admin' && user.organization_id) {
        filter = `organization_id=eq.${user.organization_id}&order=created_at.desc`;
      }
    } else {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const programs = await sbSelect(
      env,
      'stamp_programs',
      filter,
      '*'
    );

    return Response.json({ programs });
  } catch (error) {
    console.error('Error listing stamp programs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = context.data?.user;

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
      flow_id,
      stamp_template_id
    } = body;

    // Validate required fields
    if (!business_name) {
      return Response.json(
        { error: 'Missing required field: business_name' },
        { status: 400 }
      );
    }
    if (!owner_wa_number) {
      return Response.json(
        { error: 'Missing required field: owner_wa_number' },
        { status: 400 }
      );
    }
    if (!reward_description) {
      return Response.json(
        { error: 'Missing required field: reward_description' },
        { status: 400 }
      );
    }
    if (!trigger_keyword) {
      return Response.json(
        { error: 'Missing required field: trigger_keyword' },
        { status: 400 }
      );
    }

    // Build program data
    const programData = {
      business_name,
      owner_wa_number,
      brand_color_primary: brand_color_primary || '#6366f1',
      brand_color_secondary: brand_color_secondary || '#ffffff',
      logo_url: logo_url || null,
      stamp_type: stamp_type || 'visit',
      stamp_type_label: stamp_type_label || null,
      stamps_required: stamps_required || 10,
      reward_description,
      trigger_keyword,
      stamp_cooldown_minutes: stamp_cooldown_minutes || 60,
      verification_timeout_minutes: verification_timeout_minutes || 10,
      auto_expire_days: auto_expire_days || 365,
      tier: tier || 'free',
      is_active: true,
      flow_id: flow_id || null,
      stamp_template_id: stamp_template_id || null
    };

    // Add organization_id if user belongs to an organization
    if (user.organization_id) {
      programData.organization_id = user.organization_id;
    } else {
      return Response.json(
        { error: 'User must belong to an organization' },
        { status: 400 }
      );
    }

    const programRows = await sbInsert(
      env,
      'stamp_programs',
      [programData],
      true
    );

    const program = programRows[0];

    return Response.json({ program }, { status: 201 });
  } catch (error) {
    console.error('Error creating stamp program:', error);
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
