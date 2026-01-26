// Dynamic webhook handler per WhatsApp config
// URL: /webhook/:configId

import { sbSelectOne, sbInsert, sbUpdate, sbUpsert } from '../lib/supabase.js';
import { FlowEngine } from './_shared/engine.js';
import { extractMessageContent, markAsRead, downloadAndUploadToCdn } from './_shared/whatsapp.js';
import { handleStampMessage } from './_shared/stamp-handler.js';

/**
 * Store incoming message and update conversation
 */
async function storeIncomingMessage(env, configId, customerId, contactName, messageContent, waMessageId, mediaUrl = null) {
  try {
    // Get config to find organization_id
    const config = await sbSelectOne(env, 'whatsapp_configs', `id=eq.${configId}`, 'organization_id');
    const orgId = config?.organization_id;

    // Upsert conversation (create if not exists, update if exists)
    const now = new Date().toISOString();
    const messagePreview = (messageContent.text || `[${messageContent.type}]`).substring(0, 100);

    // Try to get existing conversation
    let conversation = await sbSelectOne(
      env,
      'conversations',
      `whatsapp_config_id=eq.${configId}&contact_phone=eq.${customerId}`,
      'id,unread_count'
    );

    if (conversation) {
      // Update existing conversation
      await sbUpdate(
        env,
        'conversations',
        `id=eq.${conversation.id}`,
        {
          contact_name: contactName || customerId,
          last_message_at: now,
          last_message_preview: messagePreview,
          last_message_direction: 'inbound',
          unread_count: (conversation.unread_count || 0) + 1,
          updated_at: now,
        }
      );
    } else {
      // Create new conversation
      const newConv = await sbInsert(
        env,
        'conversations',
        [{
          organization_id: orgId,
          whatsapp_config_id: configId,
          contact_phone: customerId,
          contact_name: contactName || customerId,
          last_message_at: now,
          last_message_preview: messagePreview,
          last_message_direction: 'inbound',
          unread_count: 1,
          status: 'active',
        }],
        true
      );
      conversation = newConv[0];
    }

    // Store the message
    await sbInsert(
      env,
      'messages',
      [{
        conversation_id: conversation.id,
        whatsapp_message_id: waMessageId,
        direction: 'inbound',
        message_type: messageContent.type || 'text',
        content: messageContent.text || null,
        media_url: mediaUrl,
        metadata: JSON.stringify({
          buttonId: messageContent.buttonId,
          listRowId: messageContent.listRowId,
          mediaId: messageContent.mediaId,
          mimeType: messageContent.mimeType,
        }),
        status: 'received',
        sent_at: now,
      }]
    );

    // Update messaging window (24-hour free messaging window)
    const windowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await sbUpsert(
      env,
      'messaging_windows',
      [{
        whatsapp_config_id: configId,
        contact_phone: customerId,
        window_start: now,
        window_end: windowEnd,
      }],
      ['whatsapp_config_id', 'contact_phone']
    );

    console.log('[WEBHOOK] Stored message in conversation:', conversation.id);
  } catch (error) {
    console.error('[WEBHOOK] Error storing message:', error);
    // Don't throw - we don't want message storage failure to break flow execution
  }
}

/**
 * GET - Webhook verification (Meta callback verification)
 */
export async function onRequestGet(context) {
  const { env, params, request } = context;
  const configId = params.configId;

  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode !== 'subscribe') {
    return new Response('Invalid mode', { status: 403 });
  }

  try {
    // Get config to verify token
    const config = await sbSelectOne(
      env,
      'whatsapp_configs',
      `id=eq.${configId}`,
      'verify_token'
    );

    if (!config) {
      return new Response('Config not found', { status: 404 });
    }

    if (token !== config.verify_token) {
      return new Response('Invalid verify token', { status: 403 });
    }

    return new Response(challenge, { status: 200 });
  } catch (error) {
    console.error('Webhook verification error:', error);
    return new Response('Error', { status: 500 });
  }
}

/**
 * POST - Handle incoming webhook messages
 */
export async function onRequestPost(context) {
  const { env, params, request } = context;
  const configId = params.configId;

  try {
    const body = await request.json();
    console.log('[WEBHOOK] Received:', JSON.stringify(body).substring(0, 500));

    // Validate webhook payload
    if (body.object !== 'whatsapp_business_account') {
      console.log('[WEBHOOK] Not a WhatsApp webhook');
      return new Response('Not a WhatsApp webhook', { status: 400 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      // No message - might be status update
      console.log('[WEBHOOK] Status update (no message)');
      return new Response('OK', { status: 200 });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];
    const customerId = message.from;
    const messageId = message.id;
    console.log('[WEBHOOK] Message from:', customerId, 'ID:', messageId, 'Type:', message.type);

    // Initialize engine
    const engine = new FlowEngine(env);

    // Load config
    const config = await engine.loadConfig(configId);
    if (!config) {
      console.error('[WEBHOOK] Config not found or inactive:', configId);
      return new Response('Config not found', { status: 404 });
    }
    console.log('[WEBHOOK] Config loaded:', config.name);

    // Check for duplicate message (idempotency)
    const existing = await sbSelectOne(
      env,
      'processed_messages',
      `message_id=eq.${messageId}`,
      'message_id'
    );

    if (existing) {
      console.log('[WEBHOOK] Duplicate message, skipping:', messageId);
      return new Response('Already processed', { status: 200 });
    }

    // Mark as processed
    try {
      await sbInsert(env, 'processed_messages', [{ message_id: messageId }]);
    } catch (e) {
      // Ignore duplicate key errors
      console.log('Message already processed (concurrent):', messageId);
    }

    // Mark message as read
    await markAsRead(config.access_token, config.phone_number_id, messageId);

    // Extract message content
    const messageContent = extractMessageContent(message);
    const contactName = contact?.profile?.name || customerId;

    // Download media and upload to CDN if message has media
    let mediaUrl = null;
    if (messageContent.mediaId && env.CDN_API_KEY) {
      console.log('[WEBHOOK] Downloading media and uploading to CDN for mediaId:', messageContent.mediaId);
      mediaUrl = await downloadAndUploadToCdn(
        config.access_token,
        messageContent.mediaId,
        env.CDN_API_KEY,
        env.CDN_URL || 'https://cdn.thepotentialcompany.com'
      );
      console.log('[WEBHOOK] CDN upload result:', mediaUrl ? 'success' : 'failed');
    }

    // Store incoming message in conversations table
    await storeIncomingMessage(env, configId, customerId, contactName, messageContent, messageId, mediaUrl);

    // Check if this message relates to stamp programs BEFORE flow matching
    // This handles: trigger keywords, verification responses (YES/NO)
    try {
      const stampResult = await handleStampMessage(
        {
          text: messageContent.text,
          from: customerId,
          contactName: contactName,
        },
        config,
        env
      );

      if (stampResult.handled) {
        console.log('[WEBHOOK] Message handled by stamp system');
        return new Response('OK', { status: 200 });
      }
    } catch (stampError) {
      // Log stamp handling errors but continue with normal flow processing
      console.error('[WEBHOOK] Stamp handler error (continuing with flows):', stampError.message);
      // Write error to database for debugging
      try {
        await sbInsert(env, 'error_log', [{
          source: 'stamp_handler',
          message: stampError.message,
          details: JSON.stringify({ stack: stampError.stack?.substring(0, 500), text: messageContent.text, from: customerId })
        }]);
      } catch (logErr) { /* ignore logging errors */ }
    }

    // Store contact info in variables (will be available in flow)
    engine.variables = {
      customer_phone: customerId,
      customer_name: contactName,
      customer_wa_id: contact?.wa_id || customerId,
    };

    // Check for existing waiting execution
    const waitingExecution = await engine.findWaitingExecution(customerId, configId);

    if (waitingExecution) {
      // Resume existing flow
      console.log('[WEBHOOK] Resuming waiting execution:', waitingExecution.id);
      await engine.execute(customerId, messageContent);
    } else {
      // Find matching flow
      const messageText = messageContent.text || '';
      console.log('[WEBHOOK] Looking for flow matching:', messageText);
      const matchingFlow = await engine.findMatchingFlow(messageText, configId);

      if (matchingFlow) {
        // Start new execution
        console.log('[WEBHOOK] Found matching flow:', matchingFlow.name, 'ID:', matchingFlow.id);
        await engine.startExecution(customerId, configId, matchingFlow.id);
        await engine.execute(customerId, messageContent);
      } else {
        console.log('[WEBHOOK] No matching flow for:', messageText);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
