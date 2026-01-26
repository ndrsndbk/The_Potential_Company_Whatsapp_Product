// Temporary debug endpoint to trace stamp handler issues
// GET /api/stamp-debug?text=dmma+STAMP&from=84936094972&configId=c08f0b69-398c-4df7-8773-6feeb708dae3

import { sbSelect, sbSelectOne, sbInsert } from '../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const text = url.searchParams.get('text') || 'dmma STAMP';
  const from = url.searchParams.get('from') || '84936094972';
  const configId = url.searchParams.get('configId') || 'c08f0b69-398c-4df7-8773-6feeb708dae3';

  const steps = [];

  try {
    // Step 1: Check env vars
    steps.push({
      step: 1,
      name: 'env_check',
      SUPABASE_URL: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET',
      SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...' : 'NOT SET',
    });

    // Step 2: Load whatsapp config
    const waConfig = await sbSelectOne(env, 'whatsapp_configs', `id=eq.${configId}`, 'id,organization_id,phone_number_id,is_active');
    steps.push({
      step: 2,
      name: 'load_config',
      result: waConfig || 'NULL',
    });

    if (!waConfig?.organization_id) {
      steps.push({ step: 2.5, name: 'FAIL', reason: 'No organization_id on config' });
      return Response.json({ steps });
    }

    // Step 3: Load stamp programs for org
    const programs = await sbSelect(
      env,
      'stamp_programs',
      `organization_id=eq.${waConfig.organization_id}&is_active=eq.true`,
      'id,business_slug,trigger_keyword,business_name,owner_wa_number'
    );
    steps.push({
      step: 3,
      name: 'load_programs',
      count: programs?.length || 0,
      programs: programs || [],
    });

    if (!programs || programs.length === 0) {
      steps.push({ step: 3.5, name: 'FAIL', reason: 'No active programs found' });
      return Response.json({ steps });
    }

    // Step 4: Match trigger keyword
    const msgLower = text.toLowerCase().trim();
    let matchedProgram = null;
    for (const program of programs) {
      if (program.trigger_keyword) {
        const triggerLower = program.trigger_keyword.toLowerCase().trim();
        if (msgLower === triggerLower || msgLower.startsWith(triggerLower + ' ')) {
          matchedProgram = program;
          break;
        }
      }
      if (program.business_slug) {
        const slugPattern = `${program.business_slug.toLowerCase()} stamp`;
        if (msgLower === slugPattern || msgLower.startsWith(slugPattern + ' ')) {
          matchedProgram = program;
          break;
        }
      }
    }
    steps.push({
      step: 4,
      name: 'trigger_match',
      input: msgLower,
      matched: matchedProgram ? matchedProgram.business_name : 'NO MATCH',
      program_id: matchedProgram?.id || null,
    });

    if (!matchedProgram) {
      steps.push({ step: 4.5, name: 'FAIL', reason: 'No trigger keyword match' });
      return Response.json({ steps });
    }

    // Step 5: Check existing pending verification
    const existingVerification = await sbSelectOne(
      env,
      'stamp_verifications',
      `program_id=eq.${matchedProgram.id}&customer_wa_number=eq.${from}&status=eq.pending&expires_at=gt.${new Date().toISOString()}`,
      'id'
    );
    steps.push({
      step: 5,
      name: 'check_existing_verification',
      exists: !!existingVerification,
      id: existingVerification?.id || null,
    });

    // Step 6: Check stamp_customers
    const customer = await sbSelectOne(
      env,
      'stamp_customers',
      `program_id=eq.${matchedProgram.id}&wa_number=eq.${from}`,
      'id,last_stamp_at,current_stamps'
    );
    steps.push({
      step: 6,
      name: 'check_customer',
      exists: !!customer,
      data: customer || 'NO CUSTOMER YET',
    });

    // Step 7: Test insert into stamp_verifications
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    try {
      const verifications = await sbInsert(
        env,
        'stamp_verifications',
        [{
          program_id: matchedProgram.id,
          customer_id: customer?.id || null,
          customer_wa_number: from,
          customer_wa_name: 'DEBUG_TEST',
          status: 'pending',
          expires_at: expiresAt
        }],
        true
      );
      steps.push({
        step: 7,
        name: 'insert_verification',
        success: true,
        id: verifications?.[0]?.id,
      });

      // Clean up test record
      if (verifications?.[0]?.id) {
        try {
          const { url: supaUrl } = { url: env.SUPABASE_URL.replace(/\/+$/, '') };
          await fetch(`${supaUrl}/rest/v1/stamp_verifications?id=eq.${verifications[0].id}`, {
            method: 'DELETE',
            headers: {
              apikey: env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
          });
          steps.push({ step: '7b', name: 'cleanup', success: true });
        } catch (e) {
          steps.push({ step: '7b', name: 'cleanup', error: e.message });
        }
      }
    } catch (insertError) {
      steps.push({
        step: 7,
        name: 'insert_verification',
        success: false,
        error: insertError.message,
      });
    }

    steps.push({ step: 8, name: 'ALL_STEPS_PASSED' });

  } catch (error) {
    steps.push({
      step: 'ERROR',
      name: 'unexpected_error',
      message: error.message,
      stack: error.stack?.substring(0, 200),
    });
  }

  return Response.json({ steps }, {
    headers: { 'Content-Type': 'application/json' },
  });
}
