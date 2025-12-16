// Dynamic webhook handler per WhatsApp config
// URL: /webhook/:configId

import { sbSelectOne, sbInsert } from '../lib/supabase.js';
import { FlowEngine } from './_shared/engine.js';
import { extractMessageContent, markAsRead } from './_shared/whatsapp.js';

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

    // Store contact info in variables (will be available in flow)
    engine.variables = {
      customer_phone: customerId,
      customer_name: contact?.profile?.name || customerId,
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
