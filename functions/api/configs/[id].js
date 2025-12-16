// GET /api/configs/:id - Get single config
// PUT /api/configs/:id - Update config
// DELETE /api/configs/:id - Delete config

import { sbSelectOne, sbSelect, sbUpdate, sbDelete } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const configId = params.id;

  try {
    const config = await sbSelectOne(
      env,
      'whatsapp_configs',
      `id=eq.${configId}`,
      'id,name,phone_number_id,phone_number,verify_token,is_active,created_at'
    );

    if (!config) {
      return Response.json({ error: 'Config not found' }, { status: 404 });
    }

    return Response.json({ config });
  } catch (error) {
    console.error('Error getting config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const configId = params.id;

  try {
    const body = await request.json();
    const { name, phone_number_id, phone_number, access_token, verify_token, is_active } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone_number_id !== undefined) updateData.phone_number_id = phone_number_id;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (access_token !== undefined) updateData.access_token = access_token;
    if (verify_token !== undefined) updateData.verify_token = verify_token;
    if (is_active !== undefined) updateData.is_active = is_active;

    const configRows = await sbUpdate(
      env,
      'whatsapp_configs',
      `id=eq.${configId}`,
      updateData,
      true
    );

    const config = configRows?.[0];
    if (!config) {
      return Response.json({ error: 'Config not found' }, { status: 404 });
    }

    return Response.json({
      config: {
        id: config.id,
        name: config.name,
        phone_number_id: config.phone_number_id,
        phone_number: config.phone_number,
        is_active: config.is_active,
        created_at: config.created_at,
      }
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const configId = params.id;

  try {
    // Check if any flows are using this config
    const flows = await sbSelect(
      env,
      'flows',
      `whatsapp_config_id=eq.${configId}`,
      'id,name'
    );

    if (flows && flows.length > 0) {
      return Response.json(
        {
          error: 'Cannot delete config with associated flows',
          flows: flows.map((f) => ({ id: f.id, name: f.name })),
        },
        { status: 400 }
      );
    }

    await sbDelete(env, 'whatsapp_configs', `id=eq.${configId}`);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
