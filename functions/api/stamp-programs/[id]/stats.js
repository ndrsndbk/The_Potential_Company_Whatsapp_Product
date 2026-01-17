// GET /api/stamp-programs/:id/stats - Get aggregated statistics for a stamp program
// Returns total customers, stamps, cards, segments, and time-based metrics

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
    const program = await sbSelectOne(env, 'stamp_programs', programFilter, '*');
    if (!program) {
      return Response.json({ error: 'Program not found or access denied' }, { status: 404 });
    }

    // Fetch all customers for this program
    const customers = await sbSelect(
      env,
      'stamp_customers',
      `program_id=eq.${programId}`,
      '*'
    );

    // Calculate time thresholds
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const stampsRequired = program.stamps_required;

    // Initialize stats
    const stats = {
      total_customers: customers.length,
      active_customers_7d: 0,
      active_customers_30d: 0,
      total_stamps_issued: 0,
      total_cards_completed: 0,
      total_rewards_redeemed: 0,
      average_stamps_per_customer: 0,
      almost_complete_cards: 0,
      segments: {
        new: 0,
        reward_ready: 0,
        almost_there: 0,
        regular: 0,
        lapsed: 0,
        active: 0
      }
    };

    // Calculate stats from customers
    customers.forEach(customer => {
      const lastActivityAt = customer.last_activity_at ? new Date(customer.last_activity_at) : null;
      const firstStampAt = customer.first_stamp_at ? new Date(customer.first_stamp_at) : null;

      // Active customers
      if (lastActivityAt && lastActivityAt > sevenDaysAgo) {
        stats.active_customers_7d++;
      }
      if (lastActivityAt && lastActivityAt > thirtyDaysAgo) {
        stats.active_customers_30d++;
      }

      // Totals
      stats.total_stamps_issued += customer.total_stamps_earned || 0;
      stats.total_cards_completed += customer.total_cards_completed || 0;
      stats.total_rewards_redeemed += customer.total_rewards_redeemed || 0;

      // Almost complete cards (within 2 stamps of completion)
      if (customer.current_stamps >= stampsRequired - 2 && customer.current_stamps < stampsRequired) {
        stats.almost_complete_cards++;
      }

      // Segment calculation
      let segment;
      if (firstStampAt && firstStampAt > sevenDaysAgo) {
        segment = 'new';
      } else if (customer.current_stamps >= stampsRequired) {
        segment = 'reward_ready';
      } else if (customer.current_stamps >= stampsRequired - 2) {
        segment = 'almost_there';
      } else if (customer.total_stamps_earned >= 5) {
        segment = 'regular';
      } else if (lastActivityAt && lastActivityAt < thirtyDaysAgo) {
        segment = 'lapsed';
      } else {
        segment = 'active';
      }
      stats.segments[segment]++;
    });

    // Calculate average
    if (stats.total_customers > 0) {
      stats.average_stamps_per_customer = Math.round(
        (stats.total_stamps_issued / stats.total_customers) * 100
      ) / 100;
    }

    // Fetch recent events for activity trends (last 30 days)
    const events = await sbSelect(
      env,
      'stamp_events',
      `program_id=eq.${programId}&created_at=gte.${thirtyDaysAgo.toISOString()}&order=created_at.desc`,
      'event_type,created_at'
    );

    // Calculate daily activity for chart data
    const dailyStats = {};
    events.forEach(event => {
      const date = event.created_at.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          stamps_approved: 0,
          stamps_denied: 0,
          cards_completed: 0,
          rewards_redeemed: 0
        };
      }
      switch (event.event_type) {
        case 'stamp_approved':
          dailyStats[date].stamps_approved++;
          break;
        case 'stamp_denied':
          dailyStats[date].stamps_denied++;
          break;
        case 'card_completed':
          dailyStats[date].cards_completed++;
          break;
        case 'reward_redeemed':
          dailyStats[date].rewards_redeemed++;
          break;
      }
    });

    // Convert to sorted array
    const dailyActivity = Object.values(dailyStats).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Calculate totals for last 7 days and 30 days
    const last7DaysEvents = events.filter(e => new Date(e.created_at) > sevenDaysAgo);
    const eventCounts7d = {
      stamps_approved: 0,
      stamps_denied: 0,
      cards_completed: 0,
      rewards_redeemed: 0
    };
    last7DaysEvents.forEach(event => {
      if (eventCounts7d.hasOwnProperty(event.event_type)) {
        eventCounts7d[event.event_type]++;
      }
    });

    const eventCounts30d = {
      stamps_approved: 0,
      stamps_denied: 0,
      cards_completed: 0,
      rewards_redeemed: 0
    };
    events.forEach(event => {
      if (eventCounts30d.hasOwnProperty(event.event_type)) {
        eventCounts30d[event.event_type]++;
      }
    });

    return Response.json({
      stats,
      activity: {
        last_7_days: eventCounts7d,
        last_30_days: eventCounts30d,
        daily: dailyActivity
      },
      program: {
        id: program.id,
        business_name: program.business_name,
        stamps_required: program.stamps_required,
        tier: program.tier,
        is_active: program.is_active,
        created_at: program.created_at
      }
    });
  } catch (error) {
    console.error('Error getting stamp program stats:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
