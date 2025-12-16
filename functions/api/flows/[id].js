// GET /api/flows/:id - Get single flow with nodes and edges
// PUT /api/flows/:id - Update flow
// DELETE /api/flows/:id - Delete flow

import { sbSelectOne, sbSelect, sbUpdate, sbDelete, sbInsert } from '../../lib/supabase.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const flowId = params.id;

  try {
    // Get flow
    const flow = await sbSelectOne(env, 'flows', `id=eq.${flowId}`, '*');
    if (!flow) {
      return Response.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Get whatsapp config if assigned
    let whatsapp_configs = null;
    if (flow.whatsapp_config_id) {
      whatsapp_configs = await sbSelectOne(
        env,
        'whatsapp_configs',
        `id=eq.${flow.whatsapp_config_id}`,
        'id,name,phone_number'
      );
    }

    // Get nodes
    const nodes = await sbSelect(env, 'flow_nodes', `flow_id=eq.${flowId}`, '*');

    // Get edges
    const edges = await sbSelect(env, 'flow_edges', `flow_id=eq.${flowId}`, '*');

    // Transform nodes to React Flow format
    const reactFlowNodes = nodes.map((node) => ({
      id: node.id,
      type: node.node_type,
      position: { x: node.position_x, y: node.position_y },
      data: {
        label: node.label,
        nodeType: node.node_type,
        config: node.config,
      },
    }));

    // Transform edges to React Flow format
    const reactFlowEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      sourceHandle: edge.source_handle,
    }));

    return Response.json({
      flow: { ...flow, whatsapp_configs },
      nodes: reactFlowNodes,
      edges: reactFlowEdges,
    });
  } catch (error) {
    console.error('Error getting flow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const flowId = params.id;

  try {
    const body = await request.json();
    const { name, whatsapp_config_id, trigger_type, trigger_value, is_active, nodes, edges } = body;

    // Update flow metadata
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (whatsapp_config_id !== undefined) updateData.whatsapp_config_id = whatsapp_config_id;
    if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
    if (trigger_value !== undefined) updateData.trigger_value = trigger_value;
    if (is_active !== undefined) updateData.is_active = is_active;

    const flowRows = await sbUpdate(env, 'flows', `id=eq.${flowId}`, updateData, true);
    const flow = flowRows?.[0];

    if (!flow) {
      return Response.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Update nodes if provided
    if (nodes !== undefined) {
      // Delete existing nodes (cascade will delete edges too)
      await sbDelete(env, 'flow_nodes', `flow_id=eq.${flowId}`);

      // Insert new nodes
      if (nodes.length > 0) {
        const nodeInserts = nodes.map((node) => ({
          id: node.id,
          flow_id: flowId,
          node_type: node.type,
          label: node.data?.label || null,
          position_x: node.position?.x || 0,
          position_y: node.position?.y || 0,
          config: node.data?.config || {},
        }));

        await sbInsert(env, 'flow_nodes', nodeInserts);
      }
    }

    // Update edges if provided
    if (edges !== undefined) {
      // Delete existing edges
      await sbDelete(env, 'flow_edges', `flow_id=eq.${flowId}`);

      // Insert new edges
      if (edges.length > 0) {
        const edgeInserts = edges.map((edge) => ({
          id: edge.id,
          flow_id: flowId,
          source_node_id: edge.source,
          target_node_id: edge.target,
          source_handle: edge.sourceHandle || 'default',
        }));

        await sbInsert(env, 'flow_edges', edgeInserts);
      }
    }

    return Response.json({ flow });
  } catch (error) {
    console.error('Error updating flow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const flowId = params.id;

  try {
    await sbDelete(env, 'flows', `id=eq.${flowId}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
