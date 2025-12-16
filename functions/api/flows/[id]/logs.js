// GET /api/flows/:id/logs - Get execution logs for a flow

import { sbSelect } from '../../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const flowId = params.id;

  try {
    // Parse query params for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get flow executions with related data
    const executions = await sbSelect(
      env,
      'flow_executions',
      `flow_id=eq.${flowId}&order=started_at.desc&limit=${limit}&offset=${offset}`,
      '*'
    );

    // Get total count for pagination (include fields needed for stats)
    const allExecutions = await sbSelect(
      env,
      'flow_executions',
      `flow_id=eq.${flowId}`,
      'id,customer_id,started_at,status'
    );
    const totalCount = allExecutions.length;

    // Get node counts per execution
    const executionIds = executions.map(e => e.id);
    let nodeCounts = {};

    if (executionIds.length > 0) {
      // Get execution logs to count nodes executed per execution
      const logs = await sbSelect(
        env,
        'execution_logs',
        `execution_id=in.(${executionIds.join(',')})`,
        'execution_id,node_id'
      );

      // Count unique nodes per execution
      logs.forEach(log => {
        if (!nodeCounts[log.execution_id]) {
          nodeCounts[log.execution_id] = new Set();
        }
        if (log.node_id) {
          nodeCounts[log.execution_id].add(log.node_id);
        }
      });
    }

    // Transform executions to log format
    const logs = executions.map(exec => {
      const startedAt = new Date(exec.started_at);
      const completedAt = exec.completed_at ? new Date(exec.completed_at) : null;
      const durationMs = completedAt ? completedAt - startedAt : null;

      return {
        id: exec.id,
        executed_at: exec.started_at,
        customer_phone: exec.customer_id,
        customer_name: exec.variables?.customer_name || null,
        status: exec.status === 'running' ? 'in_progress' : exec.status,
        duration_ms: durationMs,
        nodes_executed: nodeCounts[exec.id] ? nodeCounts[exec.id].size : 0,
        error_message: exec.variables?.error || null,
      };
    });

    // Calculate stats
    const completedCount = allExecutions.length > 0
      ? (await sbSelect(env, 'flow_executions', `flow_id=eq.${flowId}&status=eq.completed`, 'id')).length
      : 0;
    const failedCount = allExecutions.length > 0
      ? (await sbSelect(env, 'flow_executions', `flow_id=eq.${flowId}&status=eq.failed`, 'id')).length
      : 0;

    // Get unique customers
    const uniqueCustomers = new Set(allExecutions.map(e => e.customer_id)).size;

    // Calculate average duration from completed executions
    const completedExecs = executions.filter(e => e.status === 'completed' && e.completed_at);
    let avgDuration = 0;
    if (completedExecs.length > 0) {
      const totalDuration = completedExecs.reduce((sum, exec) => {
        const started = new Date(exec.started_at);
        const completed = new Date(exec.completed_at);
        return sum + (completed - started);
      }, 0);
      avgDuration = Math.round(totalDuration / completedExecs.length);
    }

    // Get daily stats for the last 14 days
    const dailyStats = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayExecs = allExecutions.filter(e => {
        const execDate = new Date(e.started_at || e.created_at).toISOString().split('T')[0];
        return execDate === dateStr;
      });

      // Note: We need to fetch status for daily stats
      // For now, we'll use all executions we already have
      const dayExecutions = executions.filter(e => {
        const execDate = new Date(e.started_at).toISOString().split('T')[0];
        return execDate === dateStr;
      });

      const dayCompleted = dayExecutions.filter(e => e.status === 'completed').length;
      const dayFailed = dayExecutions.filter(e => e.status === 'failed').length;

      dailyStats.push({
        date: dateStr,
        executions: dayExecs.length,
        success: dayCompleted,
        failed: dayFailed,
      });
    }

    return Response.json({
      logs,
      stats: {
        total: totalCount,
        completed: completedCount,
        failed: failedCount,
        success_rate: totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0',
        avg_duration_ms: avgDuration,
        unique_customers: uniqueCustomers,
      },
      daily_stats: dailyStats,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error getting flow logs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
