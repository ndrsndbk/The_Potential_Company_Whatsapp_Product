// GET /api/stamp-programs/:id/events - Get event history for a stamp program
// Supports filtering by event type, customer, and date range with pagination

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
    const program = await sbSelectOne(env, 'stamp_programs', programFilter, 'id,business_name');
    if (!program) {
      return Response.json({ error: 'Program not found or access denied' }, { status: 404 });
    }

    // Parse query parameters for filtering and pagination
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    // Filtering options
    const eventType = url.searchParams.get('event_type'); // stamp_requested, stamp_approved, stamp_denied, etc.
    const customerId = url.searchParams.get('customer_id');
    const startDate = url.searchParams.get('start_date'); // ISO date string
    const endDate = url.searchParams.get('end_date'); // ISO date string

    // Build filter query
    let eventFilter = `program_id=eq.${programId}`;

    // Add event type filter
    if (eventType) {
      eventFilter += `&event_type=eq.${eventType}`;
    }

    // Add customer filter
    if (customerId) {
      eventFilter += `&customer_id=eq.${customerId}`;
    }

    // Add date range filters
    if (startDate) {
      eventFilter += `&created_at=gte.${startDate}`;
    }
    if (endDate) {
      eventFilter += `&created_at=lte.${endDate}`;
    }

    // Add sorting and pagination
    eventFilter += `&order=created_at.desc&limit=${limit}&offset=${offset}`;

    // Fetch events
    const events = await sbSelect(
      env,
      'stamp_events',
      eventFilter,
      '*'
    );

    // Fetch customer info for the events
    const customerIds = [...new Set(events.map(e => e.customer_id).filter(Boolean))];
    let customerMap = {};

    if (customerIds.length > 0) {
      // Fetch customers in batch (using 'in' filter)
      const customersFilter = `id=in.(${customerIds.join(',')})`;
      const customers = await sbSelect(
        env,
        'stamp_customers',
        customersFilter,
        'id,wa_number,wa_name,current_stamps'
      );
      customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
    }

    // Enrich events with customer info
    const enrichedEvents = events.map(event => ({
      ...event,
      customer: customerMap[event.customer_id] || null
    }));

    // Get total count for pagination
    let countFilter = `program_id=eq.${programId}`;
    if (eventType) countFilter += `&event_type=eq.${eventType}`;
    if (customerId) countFilter += `&customer_id=eq.${customerId}`;
    if (startDate) countFilter += `&created_at=gte.${startDate}`;
    if (endDate) countFilter += `&created_at=lte.${endDate}`;

    const allEventsForCount = await sbSelect(env, 'stamp_events', countFilter, 'id');
    const totalCount = allEventsForCount.length;

    // Get event type counts for the filtered period
    const eventTypeCounts = {};
    const allEvents = await sbSelect(
      env,
      'stamp_events',
      `program_id=eq.${programId}${startDate ? `&created_at=gte.${startDate}` : ''}${endDate ? `&created_at=lte.${endDate}` : ''}`,
      'event_type'
    );
    allEvents.forEach(e => {
      eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1;
    });

    return Response.json({
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
        has_next: offset + limit < totalCount,
        has_prev: page > 1
      },
      event_types: eventTypeCounts,
      program: {
        id: program.id,
        business_name: program.business_name
      }
    });
  } catch (error) {
    console.error('Error listing stamp events:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
