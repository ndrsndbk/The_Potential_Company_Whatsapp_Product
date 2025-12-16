// POST /api/flows/:id/publish - Publish or unpublish a flow

import { sbSelect, sbUpdate } from '../../../lib/supabase.js';

export async function onRequestPost(context) {
  const { env, params, request } = context;
  const flowId = params.id;

  try {
    const body = await request.json();
    const { publish } = body;

    // Get trigger nodes to validate
    const nodes = await sbSelect(
      env,
      'flow_nodes',
      `flow_id=eq.${flowId}&node_type=eq.trigger`,
      '*'
    );

    if (publish && (!nodes || nodes.length === 0)) {
      return Response.json(
        { error: 'Flow must have a trigger node to be published' },
        { status: 400 }
      );
    }

    // Update flow publish status
    const flowRows = await sbUpdate(
      env,
      'flows',
      `id=eq.${flowId}`,
      {
        is_published: publish,
        is_active: publish,
        updated_at: new Date().toISOString(),
      },
      true
    );

    const flow = flowRows?.[0];
    if (!flow) {
      return Response.json({ error: 'Flow not found' }, { status: 404 });
    }

    return Response.json({ flow });
  } catch (error) {
    console.error('Error publishing flow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
