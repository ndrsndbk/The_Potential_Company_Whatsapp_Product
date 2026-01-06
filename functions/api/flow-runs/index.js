// GET /api/flow-runs - List all flow runs (executions) across all flows for the organization

import { sbSelect } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = context.data?.user;

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');
    const flowId = url.searchParams.get('flow_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');

    // Build filters for flow_executions
    let filters = [];

    // Get flows for the organization to filter executions
    let flowFilter = 'order=updated_at.desc';
    if (user && user.role !== 'super_admin' && user.organization_id) {
      flowFilter = `organization_id=eq.${user.organization_id}`;
    }

    const orgFlows = await sbSelect(env, 'flows', flowFilter, 'id,name');
    const orgFlowIds = orgFlows.map(f => f.id);

    if (orgFlowIds.length === 0) {
      return Response.json({
        flow_runs: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false,
        },
      });
    }

    // Create a map for flow names
    const flowNameMap = {};
    orgFlows.forEach(f => {
      flowNameMap[f.id] = f.name;
    });

    // Filter by organization's flows
    if (flowId) {
      // If specific flow_id is requested, verify it belongs to org
      if (!orgFlowIds.includes(flowId)) {
        return Response.json({ error: 'Flow not found' }, { status: 404 });
      }
      filters.push(`flow_id=eq.${flowId}`);
    } else {
      filters.push(`flow_id=in.(${orgFlowIds.join(',')})`);
    }

    // Filter by status
    if (status) {
      filters.push(`status=eq.${status}`);
    }

    // Filter by date range
    if (dateFrom) {
      filters.push(`started_at=gte.${dateFrom}`);
    }
    if (dateTo) {
      filters.push(`started_at=lte.${dateTo}`);
    }

    // Add ordering and pagination
    filters.push('order=started_at.desc');
    filters.push(`limit=${limit}`);
    filters.push(`offset=${offset}`);

    const executions = await sbSelect(
      env,
      'flow_executions',
      filters.join('&'),
      '*'
    );

    // Get total count for pagination (without limit/offset)
    const countFilters = filters.filter(f => !f.startsWith('limit=') && !f.startsWith('offset=') && !f.startsWith('order='));
    const allExecutions = await sbSelect(
      env,
      'flow_executions',
      countFilters.join('&'),
      'id'
    );
    const totalCount = allExecutions.length;

    // Get execution log counts per execution
    const executionIds = executions.map(e => e.id);
    let logCounts = {};

    if (executionIds.length > 0) {
      const logs = await sbSelect(
        env,
        'execution_logs',
        `execution_id=in.(${executionIds.join(',')})`,
        'execution_id'
      );

      logs.forEach(log => {
        logCounts[log.execution_id] = (logCounts[log.execution_id] || 0) + 1;
      });
    }

    // Get customer profiles for customer info
    const customerIds = [...new Set(executions.map(e => e.customer_id).filter(Boolean))];
    let customerMap = {};

    if (customerIds.length > 0) {
      // Customer IDs are phone numbers, try to get customer profiles
      const customers = await sbSelect(
        env,
        'customer_profiles',
        `phone=in.(${customerIds.map(id => `"${id}"`).join(',')})`,
        'phone,name,dob'
      );

      customers.forEach(c => {
        customerMap[c.phone] = c;
      });
    }

    // Transform executions to flow_runs format
    const flowRuns = executions.map(exec => {
      const startedAt = new Date(exec.started_at);
      const completedAt = exec.completed_at ? new Date(exec.completed_at) : null;
      const durationMs = completedAt ? completedAt - startedAt : null;
      const customer = customerMap[exec.customer_id] || null;

      return {
        id: exec.id,
        flow_id: exec.flow_id,
        flow_name: flowNameMap[exec.flow_id] || null,
        status: exec.status,
        started_at: exec.started_at,
        completed_at: exec.completed_at,
        duration_ms: durationMs,
        customer_id: exec.customer_id,
        customer_name: customer?.name || exec.variables?.customer_name || null,
        customer_phone: exec.customer_id,
        execution_logs_count: logCounts[exec.id] || 0,
        error_message: exec.variables?.error || null,
      };
    });

    return Response.json({
      flow_runs: flowRuns,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error listing flow runs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
