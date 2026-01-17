// GET /api/stamp-verifications - List verification requests
// POST /api/stamp-verifications - Create new verification request

import { sbSelect, sbRpc } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = context.data?.user;

  try {
    const url = new URL(request.url);
    const programId = url.searchParams.get('program_id');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build filter
    let filter = 'order=created_at.desc';

    // Filter by program_id if provided
    if (programId) {
      filter = `program_id=eq.${programId}&${filter}`;
    }

    // Filter by status if provided
    if (status) {
      filter = `status=eq.${status}&${filter}`;
    }

    // Add pagination
    filter += `&limit=${limit}&offset=${offset}`;

    // Non-super-admins can only see their org's verifications
    if (user && user.role !== 'super_admin' && user.organization_id) {
      // Need to join with stamp_programs to filter by organization
      filter = `stamp_programs.organization_id=eq.${user.organization_id}&${filter}`;
    }

    const verifications = await sbSelect(
      env,
      'stamp_verifications',
      filter,
      '*, stamp_programs(id, name, organization_id)'
    );

    return Response.json({
      verifications,
      pagination: {
        limit,
        offset,
        has_more: verifications.length === limit
      }
    });
  } catch (error) {
    console.error('Error listing stamp verifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { program_id, customer_wa_number, customer_wa_name } = body;

    // Validate required fields
    if (!program_id) {
      return Response.json(
        { error: 'Missing required field: program_id' },
        { status: 400 }
      );
    }

    if (!customer_wa_number) {
      return Response.json(
        { error: 'Missing required field: customer_wa_number' },
        { status: 400 }
      );
    }

    // Call the create_stamp_verification database function
    const result = await sbRpc(env, 'create_stamp_verification', {
      p_program_id: program_id,
      p_customer_wa_number: customer_wa_number,
      p_customer_wa_name: customer_wa_name || null
    });

    // The RPC should return the verification_id and expires_at
    return Response.json({
      verification_id: result.verification_id,
      expires_at: result.expires_at,
      message: 'Verification request created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating stamp verification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
