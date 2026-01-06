// GET /api/conversations - List all conversations for user's organization
// POST /api/conversations - Create new conversation (usually auto-created by webhook)

import { sbSelect, sbInsert } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = context.data?.user;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'active';
    const configId = url.searchParams.get('config_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build filter based on user's organization
    let filters = [];

    if (user && user.role !== 'super_admin' && user.organization_id) {
      filters.push(`organization_id=eq.${user.organization_id}`);
    }

    if (status && status !== 'all') {
      filters.push(`status=eq.${status}`);
    }

    if (configId) {
      filters.push(`whatsapp_config_id=eq.${configId}`);
    }

    filters.push('order=last_message_at.desc.nullsfirst');
    filters.push(`limit=${limit}`);
    filters.push(`offset=${offset}`);

    const conversations = await sbSelect(
      env,
      'conversations',
      filters.join('&'),
      'id,organization_id,whatsapp_config_id,contact_phone,contact_name,last_message_at,last_message_preview,last_message_direction,unread_count,status,created_at,updated_at'
    );

    // Get messaging windows for these conversations to check 24-hour status
    const phones = conversations.map(c => c.contact_phone);
    let messagingWindows = [];

    if (phones.length > 0) {
      const phonesFilter = phones.map(p => `"${p}"`).join(',');
      messagingWindows = await sbSelect(
        env,
        'messaging_windows',
        `contact_phone=in.(${phonesFilter})`,
        'contact_phone,whatsapp_config_id,window_start,window_end'
      );
    }

    // Create a map for quick lookup
    const windowMap = new Map();
    messagingWindows.forEach(w => {
      windowMap.set(`${w.whatsapp_config_id}_${w.contact_phone}`, w);
    });

    // Add messaging window status to each conversation
    const now = new Date();
    const conversationsWithWindow = conversations.map(conv => {
      const window = windowMap.get(`${conv.whatsapp_config_id}_${conv.contact_phone}`);
      let inFreeWindow = false;
      let windowExpiresAt = null;

      if (window) {
        const windowEnd = new Date(window.window_end);
        inFreeWindow = windowEnd > now;
        windowExpiresAt = window.window_end;
      }

      return {
        ...conv,
        in_free_window: inFreeWindow,
        window_expires_at: windowExpiresAt,
      };
    });

    return Response.json({
      conversations: conversationsWithWindow,
      pagination: {
        limit,
        offset,
        has_more: conversations.length === limit
      }
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = context.data?.user;

  try {
    const body = await request.json();
    const { whatsapp_config_id, contact_phone, contact_name } = body;

    if (!whatsapp_config_id || !contact_phone) {
      return Response.json(
        { error: 'Missing required fields: whatsapp_config_id, contact_phone' },
        { status: 400 }
      );
    }

    // Get the config to find organization_id
    const configs = await sbSelect(
      env,
      'whatsapp_configs',
      `id=eq.${whatsapp_config_id}`,
      'organization_id'
    );

    if (configs.length === 0) {
      return Response.json({ error: 'WhatsApp config not found' }, { status: 404 });
    }

    const organizationId = configs[0].organization_id || user?.organization_id;

    const conversationData = {
      whatsapp_config_id,
      contact_phone,
      contact_name: contact_name || contact_phone,
      organization_id: organizationId,
      status: 'active',
    };

    const result = await sbInsert(env, 'conversations', [conversationData], true);

    return Response.json({ conversation: result[0] }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (conversation already exists)
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      // Fetch existing conversation
      const body = await context.request.clone().json();
      const existing = await sbSelect(
        env,
        'conversations',
        `whatsapp_config_id=eq.${body.whatsapp_config_id}&contact_phone=eq.${body.contact_phone}`,
        '*'
      );
      if (existing.length > 0) {
        return Response.json({ conversation: existing[0] });
      }
    }

    console.error('Error creating conversation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
