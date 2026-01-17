// POST /api/public/onboarding - Handle onboarding flow (no auth required)
// Actions: start, step, complete

import { sbSelectOne, sbInsert, sbUpdate, sbUpsert } from '../../../lib/supabase.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        return await handleStart(env, body);
      case 'step':
        return await handleStep(env, body);
      case 'complete':
        return await handleComplete(env, body);
      default:
        return Response.json(
          { error: 'Invalid action. Use: start, step, or complete' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in onboarding:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Start onboarding for a phone number
async function handleStart(env, body) {
  const { phone_number, organization_id } = body;

  if (!phone_number) {
    return Response.json(
      { error: 'Missing required field: phone_number' },
      { status: 400 }
    );
  }

  // Generate a unique session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Session expires in 24 hours

  // Create or update onboarding session
  const sessionData = {
    phone_number,
    organization_id: organization_id || null,
    session_token: sessionToken,
    current_step: 1,
    step_data: {},
    status: 'in_progress',
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert to handle re-starting onboarding
  const sessions = await sbUpsert(
    env,
    'onboarding_sessions',
    [sessionData],
    'phone_number',
    true
  );

  const session = sessions[0];

  return Response.json({
    session_token: session.session_token,
    current_step: session.current_step,
    expires_at: session.expires_at,
    message: 'Onboarding started successfully'
  }, { status: 201 });
}

// Submit an onboarding step
async function handleStep(env, body) {
  const { session_token, step_number, step_data } = body;

  if (!session_token) {
    return Response.json(
      { error: 'Missing required field: session_token' },
      { status: 400 }
    );
  }

  if (!step_number) {
    return Response.json(
      { error: 'Missing required field: step_number' },
      { status: 400 }
    );
  }

  // Get the session
  const session = await sbSelectOne(
    env,
    'onboarding_sessions',
    `session_token=eq.${session_token}`,
    '*'
  );

  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    return Response.json({ error: 'Session has expired' }, { status: 400 });
  }

  // Check if session is still in progress
  if (session.status !== 'in_progress') {
    return Response.json(
      { error: `Session already ${session.status}` },
      { status: 400 }
    );
  }

  // Validate step order (can't skip steps)
  if (step_number !== session.current_step) {
    return Response.json(
      { error: `Expected step ${session.current_step}, got step ${step_number}` },
      { status: 400 }
    );
  }

  // Merge step data
  const existingStepData = session.step_data || {};
  const updatedStepData = {
    ...existingStepData,
    [`step_${step_number}`]: step_data
  };

  // Update session with new step data and advance to next step
  const updatedSession = await sbUpdate(
    env,
    'onboarding_sessions',
    `session_token=eq.${session_token}`,
    {
      current_step: step_number + 1,
      step_data: updatedStepData,
      updated_at: new Date().toISOString()
    },
    true
  );

  return Response.json({
    current_step: updatedSession[0].current_step,
    step_completed: step_number,
    message: `Step ${step_number} completed successfully`
  });
}

// Finalize onboarding and create program
async function handleComplete(env, body) {
  const { session_token, program_name, template_id } = body;

  if (!session_token) {
    return Response.json(
      { error: 'Missing required field: session_token' },
      { status: 400 }
    );
  }

  // Get the session
  const session = await sbSelectOne(
    env,
    'onboarding_sessions',
    `session_token=eq.${session_token}`,
    '*'
  );

  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    return Response.json({ error: 'Session has expired' }, { status: 400 });
  }

  // Check if session is still in progress
  if (session.status !== 'in_progress') {
    return Response.json(
      { error: `Session already ${session.status}` },
      { status: 400 }
    );
  }

  // Get template if provided, otherwise use defaults
  let templateData = {};
  if (template_id) {
    const template = await sbSelectOne(
      env,
      'stamp_card_templates',
      `id=eq.${template_id}`,
      '*'
    );
    if (template) {
      templateData = {
        total_stamps: template.total_stamps,
        stamp_icon: template.stamp_icon,
        background_color: template.background_color,
        accent_color: template.accent_color,
        reward_text: template.reward_text,
        logo_url: template.logo_url
      };
    }
  }

  // Extract collected data from steps
  const stepData = session.step_data || {};

  // Generate dashboard token
  const dashboardToken = generateDashboardToken();

  // Create the stamp program
  const programData = {
    name: program_name || stepData.step_1?.business_name || 'My Loyalty Program',
    organization_id: session.organization_id,
    phone_number: session.phone_number,
    total_stamps: templateData.total_stamps || stepData.step_2?.total_stamps || 10,
    stamp_icon: templateData.stamp_icon || stepData.step_2?.stamp_icon || 'star',
    background_color: templateData.background_color || stepData.step_2?.background_color || '#000000',
    accent_color: templateData.accent_color || stepData.step_2?.accent_color || '#ccff00',
    reward_text: templateData.reward_text || stepData.step_2?.reward_text || 'FREE ITEM',
    logo_url: templateData.logo_url || stepData.step_1?.logo_url || null,
    dashboard_token: dashboardToken,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const programs = await sbInsert(env, 'stamp_programs', [programData], true);
  const program = programs[0];

  // Mark session as completed
  await sbUpdate(
    env,
    'onboarding_sessions',
    `session_token=eq.${session_token}`,
    {
      status: 'completed',
      program_id: program.id,
      updated_at: new Date().toISOString()
    }
  );

  // Generate the public dashboard URL
  const dashboardUrl = `/dashboard/${dashboardToken}`;

  return Response.json({
    program_id: program.id,
    program_name: program.name,
    dashboard_token: dashboardToken,
    dashboard_url: dashboardUrl,
    message: 'Onboarding completed successfully! Your loyalty program is now active.'
  }, { status: 201 });
}

// Helper function to generate a unique session token
function generateSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `onb_${token}`;
}

// Helper function to generate a unique dashboard token
function generateDashboardToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `dash_${token}`;
}
