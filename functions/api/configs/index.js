// GET /api/configs - List all WhatsApp configurations
// POST /api/configs - Create new configuration

import { sbSelect, sbInsert } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const configs = await sbSelect(
      env,
      'whatsapp_configs',
      'order=created_at.desc',
      'id,name,phone_number_id,phone_number,is_active,created_at'
    );

    return Response.json({ configs });
  } catch (error) {
    console.error('Error listing configs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

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

    // Check max 2 configs
    const existing = await sbSelect(env, 'whatsapp_configs', '', 'id');
    if (existing.length >= 2) {
      return Response.json(
        { error: 'Maximum of 2 WhatsApp configurations allowed' },
        { status: 400 }
      );
    }

    const configRows = await sbInsert(
      env,
      'whatsapp_configs',
      [{
        name,
        phone_number_id,
        phone_number,
        access_token,
        verify_token,
        is_active: true,
      }],
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
