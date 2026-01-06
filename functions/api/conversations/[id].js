// GET /api/conversations/:id - Get conversation with messages
// PUT /api/conversations/:id - Update conversation (status, mark read)
// DELETE /api/conversations/:id - Archive/delete conversation

import { sbSelect, sbSelectOne, sbUpdate, sbDelete } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const conversationId = params.id;

  try {
    const url = new URL(request.url);
    const messageLimit = parseInt(url.searchParams.get('message_limit') || '50');
    const messageOffset = parseInt(url.searchParams.get('message_offset') || '0');

    // Get conversation
    const conversation = await sbSelectOne(
      env,
      'conversations',
      `id=eq.${conversationId}`,
      '*'
    );

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages
    const messages = await sbSelect(
      env,
      'messages',
      `conversation_id=eq.${conversationId}&order=sent_at.desc&limit=${messageLimit}&offset=${messageOffset}`,
      '*'
    );

    // Reverse to show oldest first (for chat display)
    messages.reverse();

    // Get messaging window status
    const window = await sbSelectOne(
      env,
      'messaging_windows',
      `whatsapp_config_id=eq.${conversation.whatsapp_config_id}&contact_phone=eq.${conversation.contact_phone}`,
      '*'
    );

    const now = new Date();
    let inFreeWindow = false;
    let windowExpiresAt = null;

    if (window) {
      const windowEnd = new Date(window.window_end);
      inFreeWindow = windowEnd > now;
      windowExpiresAt = window.window_end;
    }

    return Response.json({
      conversation: {
        ...conversation,
        in_free_window: inFreeWindow,
        window_expires_at: windowExpiresAt,
      },
      messages,
      pagination: {
        limit: messageLimit,
        offset: messageOffset,
        has_more: messages.length === messageLimit
      }
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const conversationId = params.id;

  try {
    const body = await request.json();
    const { status, contact_name, mark_read } = body;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
    }

    if (contact_name !== undefined) {
      updates.contact_name = contact_name;
    }

    if (mark_read) {
      updates.unread_count = 0;
    }

    const result = await sbUpdate(
      env,
      'conversations',
      `id=eq.${conversationId}`,
      updates,
      true
    );

    if (!result || result.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ conversation: result[0] });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, params, request } = context;
  const conversationId = params.id;

  try {
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    if (permanent) {
      // Permanent delete (messages will cascade)
      await sbDelete(env, 'conversations', `id=eq.${conversationId}`);
    } else {
      // Soft delete - just archive
      await sbUpdate(
        env,
        'conversations',
        `id=eq.${conversationId}`,
        { status: 'archived', updated_at: new Date().toISOString() }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
