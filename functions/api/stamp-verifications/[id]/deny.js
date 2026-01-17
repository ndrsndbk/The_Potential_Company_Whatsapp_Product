// PUT /api/stamp-verifications/:id/deny - Deny a verification request

import { sbSelectOne, sbUpdate, sbInsert } from '../../../lib/supabase.js';

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const user = context.data?.user;
  const verificationId = params.id;

  try {
    // Parse optional denial reason from request body
    let denialReason = null;
    try {
      const body = await request.json();
      denialReason = body.reason || null;
    } catch {
      // No body provided, that's fine
    }

    // Get the verification request
    const verification = await sbSelectOne(
      env,
      'stamp_verifications',
      `id=eq.${verificationId}`,
      '*, stamp_programs(id, name, organization_id)'
    );

    if (!verification) {
      return Response.json({ error: 'Verification not found' }, { status: 404 });
    }

    // Check organization access for non-super-admins
    if (user && user.role !== 'super_admin' && user.organization_id) {
      if (verification.stamp_programs?.organization_id !== user.organization_id) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Check if verification is still pending
    if (verification.status !== 'pending') {
      return Response.json(
        { error: `Verification already ${verification.status}` },
        { status: 400 }
      );
    }

    // Update verification status to denied
    const updatedVerification = await sbUpdate(
      env,
      'stamp_verifications',
      `id=eq.${verificationId}`,
      {
        status: 'denied',
        denied_by: user?.id || null,
        denied_at: new Date().toISOString(),
        denial_reason: denialReason,
        updated_at: new Date().toISOString()
      },
      true
    );

    // Log the denial event to stamp_events table
    try {
      await sbInsert(env, 'stamp_events', [{
        program_id: verification.program_id,
        customer_wa_number: verification.customer_wa_number,
        event_type: 'verification_denied',
        event_data: {
          verification_id: verificationId,
          denied_by: user?.id || null,
          denied_by_email: user?.email || null,
          reason: denialReason
        },
        created_at: new Date().toISOString()
      }]);
    } catch (logError) {
      // Log error but don't fail the request
      console.error('Error logging denial event:', logError);
    }

    return Response.json({
      verification: updatedVerification[0],
      message: 'Verification request denied'
    });
  } catch (error) {
    console.error('Error denying stamp verification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
