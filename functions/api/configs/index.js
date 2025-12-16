// GET /api/configs - List all WhatsApp configurations for user's organization
// POST /api/configs - Create new configuration in user's organization

import { sbSelect, sbInsert } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env } = context;
  const user = context.data?.user;

  try {
    // Build filter based on user's organization
    // Super admins can see all configs, others only see their org's configs
    let filter = 'order=created_at.desc';
    if (user && user.role !== 'super_admin' && user.organization_id) {
      filter = `organization_id=eq.${user.organization_id}&order=created_at.desc`;
    }

    const configs = await sbSelect(
      env,
      'whatsapp_configs',
      filter,
      'id,name,phone_number_id,phone_number,is_active,created_at,organization_id'
    );

    return Response.json({ configs });
  } catch (error) {
    console.error('Error listing configs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = context.data?.user;

  try {
    const body = await request.json();
    const { name, phone_number_id, phone_number, access_token, verify_token } = body;

    // Validate required fields
    if (!name || !phone_number_id || !phone_number || !access_token || !verify_token) {
      return Response.json(
        { error: 'Missing required fields: name, phone_number_id, phone_number, access_token, verify_token' },
        { status: 400 }
      );
    }

    // Check max 2 configs per organization (or total for super admins)
    let existingFilter = '';
    if (user && user.role !== 'super_admin' && user.organization_id) {
      existingFilter = `organization_id=eq.${user.organization_id}`;
    }
    const existing = await sbSelect(env, 'whatsapp_configs', existingFilter, 'id');
    if (existing.length >= 2) {
      return Response.json(
        { error: 'Maximum of 2 WhatsApp configurations allowed' },
        { status: 400 }
      );
    }

    // Build config data with organization_id
    const configData = {
      name,
      phone_number_id,
      phone_number,
      access_token,
      verify_token,
      is_active: true,
    };

    // Add organization_id if user belongs to an organization
    if (user && user.organization_id) {
      configData.organization_id = user.organization_id;
    }

    const configRows = await sbInsert(
      env,
      'whatsapp_configs',
      [configData],
      true
    );

    const config = configRows[0];

    // Return without access_token for security
    return Response.json({
      config: {
        id: config.id,
        name: config.name,
        phone_number_id: config.phone_number_id,
        phone_number: config.phone_number,
        is_active: config.is_active,
        created_at: config.created_at,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
