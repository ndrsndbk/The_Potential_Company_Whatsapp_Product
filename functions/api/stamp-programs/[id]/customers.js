// GET /api/stamp-programs/:id/customers - List customers for a stamp program
// Supports filtering, pagination, and customer segment information

import { sbSelect, sbSelectOne } from '../../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const user = context.data?.user;
  const programId = params.id;

  try {
    // Check for dashboard_token in query params (public access)
    const url = new URL(request.url);
    const dashboardToken = url.searchParams.get('dashboard_token');

    // First verify access to the program
    let programFilter = `id=eq.${programId}`;

    if (dashboardToken) {
      // Public access via dashboard token
      programFilter += `&dashboard_token=eq.${dashboardToken}&is_active=eq.true`;
    } else if (user) {
      // Authenticated user access
      if (user.role !== 'super_admin' && user.organization_id) {
        programFilter += `&organization_id=eq.${user.organization_id}`;
      }
    } else {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify program exists and user has access
    const program = await sbSelectOne(env, 'stamp_programs', programFilter, 'id,stamps_required');
    if (!program) {
      return Response.json({ error: 'Program not found or access denied' }, { status: 404 });
    }

    // Parse query parameters for filtering and pagination
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    // Filtering options
    const segment = url.searchParams.get('segment'); // new, reward_ready, almost_there, regular, lapsed, active
    const search = url.searchParams.get('search'); // Search by phone or name
    const sortBy = url.searchParams.get('sort_by') || 'last_activity_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';

    // Build filter query
    let customerFilter = `program_id=eq.${programId}`;

    // Add search filter if provided
    if (search) {
      // Search by phone number or name (use ilike for case-insensitive)
      customerFilter += `&or=(wa_number.ilike.*${search}*,wa_name.ilike.*${search}*)`;
    }

    // Add sorting and pagination
    customerFilter += `&order=${sortBy}.${sortOrder}&limit=${limit}&offset=${offset}`;

    // Fetch customers
    const customers = await sbSelect(
      env,
      'stamp_customers',
      customerFilter,
      '*'
    );

    // Apply segment filtering in-memory (since it's a calculated field)
    // Segments: new, reward_ready, almost_there, regular, lapsed, active
    const stampsRequired = program.stamps_required;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Add segment info to each customer
    const customersWithSegments = customers.map(customer => {
      let customerSegment;
      const firstStampAt = customer.first_stamp_at ? new Date(customer.first_stamp_at) : null;
      const lastActivityAt = customer.last_activity_at ? new Date(customer.last_activity_at) : null;

      if (firstStampAt && firstStampAt > sevenDaysAgo) {
        customerSegment = 'new';
      } else if (customer.current_stamps >= stampsRequired) {
        customerSegment = 'reward_ready';
      } else if (customer.current_stamps >= stampsRequired - 2) {
        customerSegment = 'almost_there';
      } else if (customer.total_stamps_earned >= 5) {
        customerSegment = 'regular';
      } else if (lastActivityAt && lastActivityAt < thirtyDaysAgo) {
        customerSegment = 'lapsed';
      } else {
        customerSegment = 'active';
      }

      return {
        ...customer,
        segment: customerSegment,
        stamps_required: stampsRequired,
        stamps_to_reward: Math.max(0, stampsRequired - customer.current_stamps)
      };
    });

    // Filter by segment if specified
    let filteredCustomers = customersWithSegments;
    if (segment) {
      filteredCustomers = customersWithSegments.filter(c => c.segment === segment);
    }

    // Get total count for pagination (without segment filter for accurate count)
    let countFilter = `program_id=eq.${programId}`;
    if (search) {
      countFilter += `&or=(wa_number.ilike.*${search}*,wa_name.ilike.*${search}*)`;
    }
    const allCustomersForCount = await sbSelect(env, 'stamp_customers', countFilter, 'id');
    const totalCount = allCustomersForCount.length;

    // Calculate segment counts
    const segmentCounts = {
      new: 0,
      reward_ready: 0,
      almost_there: 0,
      regular: 0,
      lapsed: 0,
      active: 0
    };
    customersWithSegments.forEach(c => {
      segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
    });

    return Response.json({
      customers: filteredCustomers,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
        has_next: offset + limit < totalCount,
        has_prev: page > 1
      },
      segments: segmentCounts
    });
  } catch (error) {
    console.error('Error listing stamp customers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
