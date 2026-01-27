// Stamp Card Verification Flow Handler
// Handles incoming messages for stamp programs:
// - Check if message matches a stamp program trigger keyword
// - Check if message is from a business owner responding to verification (YES/NO)
// - Create verification requests
// - Process verification responses
// - Send stamp cards to customers
// - Notify business owners

import { sbSelect, sbSelectOne, sbInsert, sbUpdate } from '../../lib/supabase.js';
import * as wa from './whatsapp.js';

/**
 * Handle incoming message for stamp programs
 * Returns { handled: true } if message was processed, { handled: false } otherwise
 */
export async function handleStampMessage(message, config, env) {
  const messageText = (message.text || '').trim();
  const customerPhone = message.from;
  const customerName = message.contactName || customerPhone;

  console.log('[STAMP] Processing message from:', customerPhone, 'Text:', messageText);

  // First, check if this is a verification response from a business owner (YES/NO)
  const normalizedResponse = messageText.toUpperCase();
  if (normalizedResponse === 'YES' || normalizedResponse === 'NO') {
    const verificationResult = await findPendingVerificationByOwner(customerPhone, env);
    if (verificationResult) {
      console.log('[STAMP] Found pending verification for business owner response');
      await processVerificationResponse(normalizedResponse, verificationResult, config, env);
      return { handled: true };
    }
  }

  // Check if message matches a stamp program trigger keyword
  const program = await findProgramByTrigger(messageText, config, env);
  if (program) {
    console.log('[STAMP] Found matching stamp program:', program.business_name);
    await createVerificationRequest(program, customerPhone, customerName, config, env);
    return { handled: true };
  }

  // Not a stamp-related message
  return { handled: false };
}

/**
 * Find a stamp program by trigger keyword
 * Matches if the message equals or starts with the trigger keyword (case-insensitive)
 */
export async function findProgramByTrigger(messageText, config, env) {
  if (!messageText) return null;

  const msgLower = messageText.toLowerCase().trim();

  // Get all active stamp programs for this organization
  // First get the whatsapp config to find the organization
  const waConfig = await sbSelectOne(
    env,
    'whatsapp_configs',
    `id=eq.${config.id}`,
    'organization_id'
  );

  if (!waConfig?.organization_id) {
    console.log('[STAMP] No organization found for config');
    return null;
  }

  // Get active stamp programs for this organization
  const programs = await sbSelect(
    env,
    'stamp_programs',
    `organization_id=eq.${waConfig.organization_id}&is_active=eq.true`,
    '*'
  );

  if (!programs || programs.length === 0) {
    console.log('[STAMP] No active stamp programs found');
    return null;
  }

  // Find matching program by trigger keyword or slug pattern
  for (const program of programs) {
    // Pattern 1: Existing trigger keyword (e.g., "Costa Sandton")
    if (program.trigger_keyword) {
      const triggerLower = program.trigger_keyword.toLowerCase().trim();
      // Exact match or message starts with trigger
      if (msgLower === triggerLower || msgLower.startsWith(triggerLower + ' ')) {
        return program;
      }
    }

    // Pattern 2: New {slug} STAMP format (e.g., "costa-sandton STAMP")
    if (program.business_slug) {
      const slugPattern = `${program.business_slug.toLowerCase()} stamp`;
      if (msgLower === slugPattern || msgLower.startsWith(slugPattern + ' ')) {
        return program;
      }
    }
  }

  return null;
}

/**
 * Find pending verification request for a business owner
 * Used when business owner responds with YES/NO
 */
export async function findPendingVerificationByOwner(ownerPhone, env) {
  // Clean phone number (remove + if present for comparison)
  const cleanPhone = ownerPhone.replace(/^\+/, '');

  // Find programs where this phone is the owner
  const programs = await sbSelect(
    env,
    'stamp_programs',
    `is_active=eq.true`,
    'id,owner_wa_number,business_name,stamps_required,reward_description,stamp_template_id,cards_base_url,cards_version,card_prefix'
  );

  if (!programs || programs.length === 0) return null;

  // Find programs owned by this phone number
  const ownedPrograms = programs.filter(p => {
    const ownerClean = (p.owner_wa_number || '').replace(/^\+/, '');
    return ownerClean === cleanPhone || p.owner_wa_number === ownerPhone;
  });

  if (ownedPrograms.length === 0) {
    console.log('[STAMP] Phone not a program owner:', ownerPhone);
    return null;
  }

  // Get program IDs
  const programIds = ownedPrograms.map(p => p.id);

  // Find pending verification for any of these programs
  // Order by created_at desc to get the most recent one
  for (const programId of programIds) {
    const verification = await sbSelectOne(
      env,
      'stamp_verifications',
      `program_id=eq.${programId}&status=eq.pending&expires_at=gt.${new Date().toISOString()}&order=created_at.desc`,
      '*'
    );

    if (verification) {
      const program = ownedPrograms.find(p => p.id === programId);
      return {
        verification,
        program
      };
    }
  }

  console.log('[STAMP] No pending verifications found for owner:', ownerPhone);
  return null;
}

/**
 * Process YES/NO verification response from business owner
 */
export async function processVerificationResponse(response, verificationResult, config, env) {
  const { verification, program } = verificationResult;
  const isApproved = response === 'YES';

  console.log('[STAMP] Processing verification response:', response, 'for customer:', verification.customer_wa_number);

  const now = new Date().toISOString();

  // Update verification status
  await sbUpdate(
    env,
    'stamp_verifications',
    `id=eq.${verification.id}`,
    {
      status: isApproved ? 'approved' : 'denied',
      responded_by: config.phone_number_id, // Using the business owner's context
      responded_at: now
    }
  );

  if (isApproved) {
    // Award the stamp
    const stampResult = await awardStamp(program, verification, config, env);

    // Send confirmation to business owner
    await wa.sendText(
      config.access_token,
      config.phone_number_id,
      program.owner_wa_number,
      `Stamp approved for ${verification.customer_wa_name || verification.customer_wa_number}.\n\nThey now have ${stampResult.newStampCount}/${program.stamps_required} stamps.${stampResult.cardCompleted ? '\n\nCONGRATULATIONS! They completed their card and earned a reward!' : ''}`
    );

    // Send stamp card to customer
    await sendStampCard(
      verification.customer_wa_number,
      program,
      stampResult.newStampCount,
      verification.customer_wa_name,
      stampResult.cardCompleted,
      stampResult.rewardCode,
      config,
      env
    );
  } else {
    // Stamp denied
    // Log denial event
    if (verification.customer_id) {
      await sbInsert(env, 'stamp_events', [{
        program_id: program.id,
        customer_id: verification.customer_id,
        event_type: 'stamp_denied',
        verification_id: verification.id,
        metadata: JSON.stringify({ denied_by: program.owner_wa_number })
      }]);
    }

    // Notify business owner
    await wa.sendText(
      config.access_token,
      config.phone_number_id,
      program.owner_wa_number,
      `Stamp denied for ${verification.customer_wa_name || verification.customer_wa_number}.`
    );

    // Notify customer
    await wa.sendText(
      config.access_token,
      config.phone_number_id,
      verification.customer_wa_number,
      `Sorry, your stamp request for ${program.business_name} was not approved this time. Please speak with a staff member if you believe this is an error.`
    );
  }
}

/**
 * Award a stamp to a customer
 * Handles card completion and reward generation
 */
async function awardStamp(program, verification, config, env) {
  const customerPhone = verification.customer_wa_number;
  const customerName = verification.customer_wa_name;

  // Get or create customer record
  let customer = await sbSelectOne(
    env,
    'stamp_customers',
    `program_id=eq.${program.id}&wa_number=eq.${customerPhone}`,
    '*'
  );

  const now = new Date().toISOString();

  if (!customer) {
    // Create new customer
    const customers = await sbInsert(
      env,
      'stamp_customers',
      [{
        program_id: program.id,
        wa_number: customerPhone,
        wa_name: customerName,
        current_stamps: 0,
        total_stamps_earned: 0,
        total_cards_completed: 0,
        total_rewards_redeemed: 0,
        first_stamp_at: now,
        last_stamp_at: now,
        last_activity_at: now
      }],
      true
    );
    customer = customers[0];
  } else if (customerName && customer.wa_name !== customerName) {
    // Update customer name if changed
    await sbUpdate(
      env,
      'stamp_customers',
      `id=eq.${customer.id}`,
      { wa_name: customerName, updated_at: now }
    );
  }

  // Calculate new stamp count
  const stampsBefore = customer.current_stamps || 0;
  let newStampCount = stampsBefore + 1;
  let cardCompleted = false;
  let rewardCode = null;

  // Check if card is complete
  if (newStampCount >= program.stamps_required) {
    cardCompleted = true;
    newStampCount = 0; // Reset for new card

    // Generate reward code
    rewardCode = generateRewardCode(program.business_name);

    // Create reward record
    await sbInsert(env, 'stamp_rewards', [{
      program_id: program.id,
      customer_id: customer.id,
      reward_code: rewardCode,
      reward_description: program.reward_description,
      status: 'active',
      valid_from: now,
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }]);

    // Update customer with card completion
    await sbUpdate(
      env,
      'stamp_customers',
      `id=eq.${customer.id}`,
      {
        current_stamps: newStampCount,
        total_stamps_earned: (customer.total_stamps_earned || 0) + 1,
        total_cards_completed: (customer.total_cards_completed || 0) + 1,
        last_stamp_at: now,
        last_activity_at: now,
        updated_at: now
      }
    );

    // Log card completion event
    await sbInsert(env, 'stamp_events', [{
      program_id: program.id,
      customer_id: customer.id,
      event_type: 'card_completed',
      stamps_before: stampsBefore,
      stamps_after: newStampCount,
      verification_id: verification.id,
      metadata: JSON.stringify({ reward_code: rewardCode })
    }]);
  } else {
    // Just add the stamp
    await sbUpdate(
      env,
      'stamp_customers',
      `id=eq.${customer.id}`,
      {
        current_stamps: newStampCount,
        total_stamps_earned: (customer.total_stamps_earned || 0) + 1,
        last_stamp_at: now,
        last_activity_at: now,
        first_stamp_at: customer.first_stamp_at || now,
        updated_at: now
      }
    );
  }

  // Log stamp approved event
  await sbInsert(env, 'stamp_events', [{
    program_id: program.id,
    customer_id: customer.id,
    event_type: 'stamp_approved',
    stamps_before: stampsBefore,
    stamps_after: newStampCount,
    verification_id: verification.id,
    verified_by: program.owner_wa_number
  }]);

  // Update verification with customer_id if not set
  if (!verification.customer_id) {
    await sbUpdate(
      env,
      'stamp_verifications',
      `id=eq.${verification.id}`,
      { customer_id: customer.id }
    );
  }

  return {
    customerId: customer.id,
    newStampCount,
    cardCompleted,
    rewardCode,
    totalStamps: program.stamps_required
  };
}

/**
 * Generate a unique reward code
 */
function generateRewardCode(businessName) {
  const prefix = (businessName || 'RWD').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomPart}`;
}

/**
 * Create a verification request for a stamp
 */
export async function createVerificationRequest(program, customerPhone, customerName, config, env) {
  console.log('[STAMP] Creating verification request for:', customerPhone, 'Program:', program.business_name);

  // Check for existing pending verification to prevent spam
  const existingVerification = await sbSelectOne(
    env,
    'stamp_verifications',
    `program_id=eq.${program.id}&customer_wa_number=eq.${customerPhone}&status=eq.pending&expires_at=gt.${new Date().toISOString()}`,
    'id'
  );

  if (existingVerification) {
    console.log('[STAMP] Existing pending verification found, skipping');
    await wa.sendText(
      config.access_token,
      config.phone_number_id,
      customerPhone,
      `You already have a pending stamp request for ${program.business_name}. Please wait for the business owner to approve it.`
    );
    return;
  }

  // Check stamp cooldown
  const customer = await sbSelectOne(
    env,
    'stamp_customers',
    `program_id=eq.${program.id}&wa_number=eq.${customerPhone}`,
    'id,last_stamp_at,current_stamps'
  );

  if (customer && customer.last_stamp_at && program.stamp_cooldown_minutes) {
    const lastStampTime = new Date(customer.last_stamp_at).getTime();
    const cooldownMs = program.stamp_cooldown_minutes * 60 * 1000;
    const timeSinceLastStamp = Date.now() - lastStampTime;

    if (timeSinceLastStamp < cooldownMs) {
      const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastStamp) / 60000);
      console.log('[STAMP] Cooldown active, remaining minutes:', remainingMinutes);
      await wa.sendText(
        config.access_token,
        config.phone_number_id,
        customerPhone,
        `Please wait ${remainingMinutes} more minute${remainingMinutes === 1 ? '' : 's'} before requesting another stamp at ${program.business_name}.`
      );
      return;
    }
  }

  // Calculate expiration time
  const timeoutMinutes = program.verification_timeout_minutes || 10;
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();

  // Create verification record
  const verifications = await sbInsert(
    env,
    'stamp_verifications',
    [{
      program_id: program.id,
      customer_id: customer?.id || null,
      customer_wa_number: customerPhone,
      customer_wa_name: customerName,
      status: 'pending',
      expires_at: expiresAt
    }],
    true
  );
  const verification = verifications[0];

  // Log stamp requested event if customer exists
  if (customer?.id) {
    await sbInsert(env, 'stamp_events', [{
      program_id: program.id,
      customer_id: customer.id,
      event_type: 'stamp_requested',
      verification_id: verification.id
    }]);
  }

  // Send verification request to business owner
  const currentStamps = customer?.current_stamps || 0;
  await wa.sendButtons(
    config.access_token,
    config.phone_number_id,
    program.owner_wa_number,
    `STAMP REQUEST\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nCurrent stamps: ${currentStamps}/${program.stamps_required}\n\nDid this customer make a purchase?`,
    [
      { id: 'stamp_yes', title: 'YES' },
      { id: 'stamp_no', title: 'NO' }
    ],
    program.business_name,
    `Expires in ${timeoutMinutes} minutes`
  );

  // Send waiting message to customer
  await wa.sendText(
    config.access_token,
    config.phone_number_id,
    customerPhone,
    `Thanks for visiting ${program.business_name}!\n\nYour stamp request has been sent to the business owner for verification. You'll receive your updated stamp card shortly.\n\nCurrent progress: ${currentStamps}/${program.stamps_required} stamps`
  );

  console.log('[STAMP] Verification request created:', verification.id);
}

/**
 * Build stamp card image URL from pre-generated images in Supabase Storage
 * Images follow the pattern: {base_url}/{version}/{prefix}{stamp_count}.png
 * Stamp count is clamped to 0-10 range (matching pre-generated image set)
 */
function buildCardUrl(program, stampCount) {
  const base = program.cards_base_url || 'https://lhbtgjvejsnsrlstwlwl.supabase.co/storage/v1/object/public/cards';
  const version = program.cards_version || 'v1';
  const prefix = program.card_prefix || 'Demo_Shop_';
  // Clamp stamp count to 0-10 range (pre-generated images only go up to 10)
  const clamped = Math.max(0, Math.min(10, Number.isNaN(Number(stampCount)) ? 0 : Number(stampCount)));
  return `${base}/${version}/${prefix}${clamped}.png`;
}

/**
 * Send stamp card image to customer
 */
export async function sendStampCard(customerPhone, program, stampCount, customerName, cardCompleted, rewardCode, config, env) {
  // Build caption
  let caption = '';
  if (cardCompleted) {
    caption = `CONGRATULATIONS ${customerName || 'Valued Customer'}!\n\nYou've completed your stamp card at ${program.business_name}!\n\nYour reward: ${program.reward_description}\nReward Code: ${rewardCode}\n\nShow this code to redeem your reward. Valid for 30 days.`;
  } else {
    const remaining = program.stamps_required - stampCount;
    caption = `Thanks ${customerName || 'Valued Customer'}!\n\nYou now have ${stampCount}/${program.stamps_required} stamps at ${program.business_name}.\n\nOnly ${remaining} more stamp${remaining === 1 ? '' : 's'} until your reward: ${program.reward_description}`;
  }

  // For completed cards, show 0 stamps (fresh card) with a reward message;
  // otherwise show the current stamp count
  const imageStampCount = cardCompleted ? program.stamps_required : stampCount;
  const stampCardUrl = buildCardUrl(program, imageStampCount);
  console.log('[STAMP] Card image URL:', stampCardUrl);

  // Try to send the stamp card image first
  try {
    const result = await wa.sendImage(
      config.access_token,
      config.phone_number_id,
      customerPhone,
      stampCardUrl,
      caption
    );

    if (result.error) {
      console.error('[STAMP] Failed to send stamp card image:', JSON.stringify(result.error));
      // Fall back to text-only
      await wa.sendText(config.access_token, config.phone_number_id, customerPhone, caption);
      console.log('[STAMP] Sent text fallback to:', customerPhone);
    } else {
      console.log('[STAMP] Stamp card image sent to:', customerPhone);
    }
  } catch (error) {
    console.error('[STAMP] Error sending stamp card image:', error.message);
    // Fall back to text-only
    try {
      await wa.sendText(config.access_token, config.phone_number_id, customerPhone, caption);
      console.log('[STAMP] Sent text fallback to:', customerPhone);
    } catch (textError) {
      console.error('[STAMP] Failed to send text fallback:', textError.message);
    }
  }
}

/**
 * Check if a message could be a stamp-related message
 * Used for quick pre-filtering before full processing
 */
export function couldBeStampMessage(messageText) {
  if (!messageText) return false;
  const text = messageText.trim().toUpperCase();

  // YES/NO are potential verification responses
  if (text === 'YES' || text === 'NO') return true;

  // Any other message could be a trigger keyword
  // We'll check against the database in handleStampMessage
  return true;
}
