// GET /api/flows - List all flows
// POST /api/flows - Create new flow

import { sbSelect, sbInsert, sbSelectOne } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const flows = await sbSelect(
      env,
      'flows',
      'order=updated_at.desc',
      '*'
    );

    // Get whatsapp configs for each flow
    const flowsWithConfigs = await Promise.all(
      flows.map(async (flow) => {
        if (flow.whatsapp_config_id) {
          const config = await sbSelectOne(
            env,
            'whatsapp_configs',
            `id=eq.${flow.whatsapp_config_id}`,
            'id,name,phone_number'
          );
          return { ...flow, whatsapp_configs: config };
        }
        return { ...flow, whatsapp_configs: null };
      })
    );

    return Response.json({ flows: flowsWithConfigs });
  } catch (error) {
    console.error('Error listing flows:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { name, whatsapp_config_id, trigger_type, trigger_value, nodes, edges } = body;

    // Create flow
    const flowRows = await sbInsert(
      env,
      'flows',
      [{
        name,
        whatsapp_config_id: whatsapp_config_id || null,
        trigger_type: trigger_type || 'keyword',
        trigger_value: trigger_value || null,
        is_active: false,
        is_published: false,
      }],
      true // returning
    );

    const flow = flowRows[0];

    // Create nodes if provided
    if (nodes && nodes.length > 0) {
      const nodeInserts = nodes.map((node) => ({
        id: node.id,
        flow_id: flow.id,
        node_type: node.type,
        label: node.data?.label || null,
        position_x: node.position?.x || 0,
        position_y: node.position?.y || 0,
        config: node.data?.config || {},
      }));

      await sbInsert(env, 'flow_nodes', nodeInserts);
    }

    // Create edges if provided
    if (edges && edges.length > 0) {
      const edgeInserts = edges.map((edge) => ({
        id: edge.id,
        flow_id: flow.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        source_handle: edge.sourceHandle || 'default',
      }));

      await sbInsert(env, 'flow_edges', edgeInserts);
    }

    return Response.json({ flow }, { status: 201 });
  } catch (error) {
    console.error('Error creating flow:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
