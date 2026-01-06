// GET /api/flow-runs/:id - Get detailed flow run by execution ID

import { sbSelect, sbSelectOne } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const executionId = params.id;
  const user = context.data?.user;

  try {
    // Get the execution
    const execution = await sbSelectOne(
      env,
      'flow_executions',
      `id=eq.${executionId}`,
      '*'
    );

    if (!execution) {
      return Response.json({ error: 'Flow run not found' }, { status: 404 });
    }

    // Get the flow to verify organization access and get flow info
    const flow = await sbSelectOne(
      env,
      'flows',
      `id=eq.${execution.flow_id}`,
      'id,name,version,organization_id,trigger_type,trigger_value'
    );

    if (!flow) {
      return Response.json({ error: 'Associated flow not found' }, { status: 404 });
    }

    // Verify organization access
    if (user && user.role !== 'super_admin' && user.organization_id) {
      if (flow.organization_id !== user.organization_id) {
        return Response.json({ error: 'Flow run not found' }, { status: 404 });
      }
    }

    // Calculate duration
    const startedAt = new Date(execution.started_at);
    const completedAt = execution.completed_at ? new Date(execution.completed_at) : null;
    const durationMs = completedAt ? completedAt - startedAt : null;

    // Get customer profile
    let customerProfile = null;
    if (execution.customer_id) {
      customerProfile = await sbSelectOne(
        env,
        'customer_profiles',
        `phone=eq.${execution.customer_id}`,
        'id,phone,name,dob,preferences,custom_fields,visit_count,created_at,updated_at'
      );
    }

    // Get all execution logs for this run
    const executionLogs = await sbSelect(
      env,
      'execution_logs',
      `execution_id=eq.${executionId}&order=created_at.asc`,
      'id,node_id,action,data,created_at'
    );

    // Get conversation messages around the execution time (+-20 messages)
    // First, find the conversation for this customer and flow's WhatsApp config
    let conversationMessages = [];

    if (execution.customer_id) {
      // Get the flow's WhatsApp config
      const flowWithConfig = await sbSelectOne(
        env,
        'flows',
        `id=eq.${execution.flow_id}`,
        'whatsapp_config_id'
      );

      if (flowWithConfig?.whatsapp_config_id) {
        // Find the conversation
        const conversation = await sbSelectOne(
          env,
          'conversations',
          `whatsapp_config_id=eq.${flowWithConfig.whatsapp_config_id}&contact_phone=eq.${execution.customer_id}`,
          'id'
        );

        if (conversation) {
          // Get messages around the execution time
          // Strategy: Get messages from 10 minutes before start to 10 minutes after completion (or now if still running)
          const timeBuffer = 10 * 60 * 1000; // 10 minutes in milliseconds
          const startTime = new Date(startedAt.getTime() - timeBuffer).toISOString();
          const endTime = completedAt
            ? new Date(completedAt.getTime() + timeBuffer).toISOString()
            : new Date().toISOString();

          // Get messages within the time window, limit to 40 (+-20 around execution)
          const messages = await sbSelect(
            env,
            'messages',
            `conversation_id=eq.${conversation.id}&sent_at=gte.${startTime}&sent_at=lte.${endTime}&order=sent_at.asc&limit=40`,
            'id,whatsapp_message_id,direction,message_type,content,media_url,status,sent_at,metadata'
          );

          conversationMessages = messages;
        }
      }
    }

    // Build the response
    const flowRun = {
      id: execution.id,
      status: execution.status,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      duration_ms: durationMs,
      variables: execution.variables,
      current_node_id: execution.current_node_id,
      error_message: execution.variables?.error || null,

      flow: {
        id: flow.id,
        name: flow.name,
        version: flow.version,
        trigger_type: flow.trigger_type,
        trigger_value: flow.trigger_value,
      },

      customer: customerProfile ? {
        id: customerProfile.id,
        phone: customerProfile.phone,
        name: customerProfile.name,
        dob: customerProfile.dob,
        preferences: customerProfile.preferences,
        custom_fields: customerProfile.custom_fields,
        visit_count: customerProfile.visit_count,
        created_at: customerProfile.created_at,
        updated_at: customerProfile.updated_at,
      } : {
        phone: execution.customer_id,
        name: execution.variables?.customer_name || null,
      },

      execution_logs: executionLogs.map(log => ({
        id: log.id,
        node_id: log.node_id,
        action: log.action,
        data: log.data,
        created_at: log.created_at,
      })),

      conversation_messages: conversationMessages,
    };

    return Response.json({ flow_run: flowRun });
  } catch (error) {
    console.error('Error getting flow run:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
