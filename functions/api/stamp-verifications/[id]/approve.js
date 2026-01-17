// PUT /api/stamp-verifications/:id/approve - Approve a verification request

import { sbSelectOne, sbUpdate, sbRpc } from '../../../lib/supabase.js';

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const user = context.data?.user;
  const verificationId = params.id;

  try {
    // Get the verification request
    const verification = await sbSelectOne(
      env,
      'stamp_verifications',
      `id=eq.${verificationId}`,
      '*, stamp_programs(id, name, organization_id, total_stamps)'
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

    // Check if verification has expired
    if (new Date(verification.expires_at) < new Date()) {
      return Response.json({ error: 'Verification has expired' }, { status: 400 });
    }

    // Call the award_stamp database function
    const stampResult = await sbRpc(env, 'award_stamp', {
      p_program_id: verification.program_id,
      p_customer_wa_number: verification.customer_wa_number,
      p_customer_wa_name: verification.customer_wa_name
    });

    // Update verification status to approved
    const updatedVerification = await sbUpdate(
      env,
      'stamp_verifications',
      `id=eq.${verificationId}`,
      {
        status: 'approved',
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      true
    );

    // Determine if the card was completed
    const totalStamps = verification.stamp_programs?.total_stamps || 10;
    const cardCompleted = stampResult.new_stamp_count >= totalStamps;

    return Response.json({
      verification: updatedVerification[0],
      stamp_result: {
        customer_id: stampResult.customer_id,
        new_stamp_count: stampResult.new_stamp_count,
        card_completed: cardCompleted,
        total_stamps_required: totalStamps
      },
      message: cardCompleted
        ? 'Stamp awarded! Card completed - customer earned a reward!'
        : 'Stamp awarded successfully'
    });
  } catch (error) {
    console.error('Error approving stamp verification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
