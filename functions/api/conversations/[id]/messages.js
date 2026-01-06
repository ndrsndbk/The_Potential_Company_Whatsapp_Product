// GET /api/conversations/:id/messages - Get messages with pagination
// POST /api/conversations/:id/messages - Send a new message

import { sbSelect, sbSelectOne, sbInsert, sbUpdate } from '../../../lib/supabase.js';
import {
  sendText,
  sendImage,
  sendVideo,
  sendAudio,
  sendDocument,
  sendLocation,
  sendContact,
  sendSticker,
} from '../../../webhook/_shared/whatsapp.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const conversationId = params.id;

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const before = url.searchParams.get('before'); // ISO timestamp for pagination

    let filter = `conversation_id=eq.${conversationId}`;

    if (before) {
      filter += `&sent_at=lt.${before}`;
    }

    filter += `&order=sent_at.desc&limit=${limit}&offset=${offset}`;

    const messages = await sbSelect(env, 'messages', filter, '*');

    // Reverse for chronological order
    messages.reverse();

    return Response.json({
      messages,
      pagination: {
        limit,
        offset,
        has_more: messages.length === limit
      }
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, params, request } = context;
  const conversationId = params.id;

  try {
    const body = await request.json();
    const {
      content,
      message_type = 'text',
      media_url,
      caption,
      filename,
      latitude,
      longitude,
      location_name,
      location_address,
      contacts,
    } = body;

    // Get conversation with config details
    const conversation = await sbSelectOne(
      env,
      'conversations',
      `id=eq.${conversationId}`,
      '*'
    );

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get WhatsApp config to send message
    const config = await sbSelectOne(
      env,
      'whatsapp_configs',
      `id=eq.${conversation.whatsapp_config_id}`,
      'access_token,phone_number_id'
    );

    if (!config) {
      return Response.json({ error: 'WhatsApp config not found' }, { status: 404 });
    }

    // Send message via WhatsApp API based on type
    let waResponse;
    let messageContent = content;
    let messageMediaUrl = media_url;

    try {
      switch (message_type) {
        case 'text':
          if (!content) {
            return Response.json({ error: 'Message content is required for text messages' }, { status: 400 });
          }
          waResponse = await sendText(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            content
          );
          break;

        case 'image':
          if (!media_url) {
            return Response.json({ error: 'media_url is required for image messages' }, { status: 400 });
          }
          waResponse = await sendImage(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            media_url,
            caption
          );
          messageContent = caption || '';
          break;

        case 'video':
          if (!media_url) {
            return Response.json({ error: 'media_url is required for video messages' }, { status: 400 });
          }
          waResponse = await sendVideo(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            media_url,
            caption
          );
          messageContent = caption || '';
          break;

        case 'audio':
          if (!media_url) {
            return Response.json({ error: 'media_url is required for audio messages' }, { status: 400 });
          }
          waResponse = await sendAudio(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            media_url
          );
          messageContent = '[Audio]';
          break;

        case 'document':
          if (!media_url) {
            return Response.json({ error: 'media_url is required for document messages' }, { status: 400 });
          }
          waResponse = await sendDocument(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            media_url,
            filename,
            caption
          );
          messageContent = filename || caption || '[Document]';
          break;

        case 'location':
          if (!latitude || !longitude) {
            return Response.json({ error: 'latitude and longitude are required for location messages' }, { status: 400 });
          }
          waResponse = await sendLocation(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            latitude,
            longitude,
            location_name,
            location_address
          );
          messageContent = location_name || `${latitude}, ${longitude}`;
          break;

        case 'contact':
          if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return Response.json({ error: 'contacts array is required for contact messages' }, { status: 400 });
          }
          waResponse = await sendContact(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            contacts
          );
          messageContent = contacts.map(c => c.name).join(', ');
          break;

        case 'sticker':
          if (!media_url) {
            return Response.json({ error: 'media_url is required for sticker messages' }, { status: 400 });
          }
          waResponse = await sendSticker(
            config.access_token,
            config.phone_number_id,
            conversation.contact_phone,
            media_url
          );
          messageContent = '[Sticker]';
          break;

        default:
          return Response.json({ error: `Unsupported message type: ${message_type}` }, { status: 400 });
      }
    } catch (waError) {
      console.error('WhatsApp API error:', waError);
      return Response.json({ error: 'Failed to send message via WhatsApp' }, { status: 500 });
    }

    // Check for WhatsApp API error
    if (waResponse.error) {
      console.error('WhatsApp API returned error:', waResponse.error);
      return Response.json({
        error: waResponse.error.message || 'WhatsApp API error',
        details: waResponse.error
      }, { status: 400 });
    }

    const waMessageId = waResponse.messages?.[0]?.id;

    // Save message to database
    const messageData = {
      conversation_id: conversationId,
      whatsapp_message_id: waMessageId,
      direction: 'outbound',
      message_type,
      content: messageContent,
      media_url: messageMediaUrl || null,
      metadata: JSON.stringify({
        caption,
        filename,
        latitude,
        longitude,
        location_name,
        location_address,
      }),
      status: 'sent',
      sent_at: new Date().toISOString(),
    };

    const savedMessage = await sbInsert(env, 'messages', [messageData], true);

    // Update conversation with last message info
    const messagePreview = messageContent?.substring(0, 100) || `[${message_type}]`;
    await sbUpdate(
      env,
      'conversations',
      `id=eq.${conversationId}`,
      {
        last_message_at: messageData.sent_at,
        last_message_preview: messagePreview,
        last_message_direction: 'outbound',
        updated_at: new Date().toISOString(),
      }
    );

    return Response.json({
      message: savedMessage[0],
      whatsapp_response: waResponse
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
