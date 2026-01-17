// GET /api/public/dashboard/:token - Public dashboard data (no auth required)
// This endpoint is accessed via the public dashboard URL using the dashboard_token

import { sbSelectOne, sbSelect } from '../../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const dashboardToken = params.token;

  try {
    // Look up program by dashboard_token
    const program = await sbSelectOne(
      env,
      'stamp_programs',
      `dashboard_token=eq.${dashboardToken}&is_active=eq.true`,
      'id, name, total_stamps, reward_text, stamp_icon, background_color, accent_color, logo_url, created_at'
    );

    if (!program) {
      return Response.json(
        { error: 'Dashboard not found or program is inactive' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // Fetch stats in parallel
    const [
      totalCustomers,
      activeCustomers,
      recentActivity,
      customerSegments
    ] = await Promise.all([
      // Total unique customers
      sbSelect(
        env,
        'stamp_customers',
        `program_id=eq.${program.id}`,
        'id'
      ),
      // Active customers (with stamps in the period)
      sbSelect(
        env,
        'stamp_customers',
        `program_id=eq.${program.id}&updated_at=gte.${startDateStr}`,
        'id'
      ),
      // Recent activity (last 20 events)
      sbSelect(
        env,
        'stamp_events',
        `program_id=eq.${program.id}&order=created_at.desc&limit=20`,
        'id, event_type, customer_wa_number, event_data, created_at'
      ),
      // Customer segments by stamp count
      sbSelect(
        env,
        'stamp_customers',
        `program_id=eq.${program.id}`,
        'id, current_stamps, cards_completed'
      )
    ]);

    // Calculate segment distribution
    const totalStamps = program.total_stamps;
    const segments = {
      new: 0,        // 0 stamps
      engaged: 0,    // 1-49% of total
      loyal: 0,      // 50-99% of total
      champion: 0,   // Completed at least one card
    };

    customerSegments.forEach(customer => {
      if (customer.cards_completed > 0) {
        segments.champion++;
      } else if (customer.current_stamps === 0) {
        segments.new++;
      } else if (customer.current_stamps >= totalStamps * 0.5) {
        segments.loyal++;
      } else {
        segments.engaged++;
      }
    });

    // Calculate total stamps collected and cards completed
    let totalStampsCollected = 0;
    let totalCardsCompleted = 0;
    customerSegments.forEach(customer => {
      totalStampsCollected += customer.current_stamps + (customer.cards_completed * totalStamps);
      totalCardsCompleted += customer.cards_completed;
    });

    // Format recent activity for display
    const formattedActivity = recentActivity.map(event => ({
      id: event.id,
      type: event.event_type,
      customer: maskPhoneNumber(event.customer_wa_number),
      data: event.event_data,
      timestamp: event.created_at
    }));

    return Response.json({
      program: {
        name: program.name,
        total_stamps: program.total_stamps,
        reward_text: program.reward_text,
        stamp_icon: program.stamp_icon,
        background_color: program.background_color,
        accent_color: program.accent_color,
        logo_url: program.logo_url,
        created_at: program.created_at
      },
      stats: {
        total_customers: totalCustomers.length,
        active_customers: activeCustomers.length,
        total_stamps_collected: totalStampsCollected,
        cards_completed: totalCardsCompleted,
        period_days: days
      },
      segments: {
        new: segments.new,
        engaged: segments.engaged,
        loyal: segments.loyal,
        champion: segments.champion
      },
      recent_activity: formattedActivity
    });
  } catch (error) {
    console.error('Error fetching public dashboard:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to mask phone numbers for privacy
function maskPhoneNumber(phone) {
  if (!phone || phone.length < 6) return '***';
  return phone.slice(0, 3) + '***' + phone.slice(-3);
}
