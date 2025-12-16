// Flow Execution Engine using REST API

import { sbSelect, sbSelectOne, sbInsert, sbUpdate } from '../../lib/supabase.js';
import * as wa from './whatsapp.js';
import { interpolate, evaluateCondition, setNestedValue } from './variables.js';

/**
 * Main flow execution engine
 */
export class FlowEngine {
  constructor(env) {
    this.env = env;
    this.config = null;
    this.flow = null;
    this.nodes = [];
    this.edges = [];
    this.execution = null;
    this.variables = {};
  }

  /**
   * Load WhatsApp config by ID
   */
  async loadConfig(configId) {
    const data = await sbSelectOne(
      this.env,
      'whatsapp_configs',
      `id=eq.${configId}&is_active=eq.true`,
      '*'
    );

    if (!data) return null;
    this.config = data;
    return data;
  }

  /**
   * Find matching flow for incoming message
   */
  async findMatchingFlow(messageText, configId) {
    // Get all active, published flows for this config
    const flows = await sbSelect(
      this.env,
      'flows',
      `whatsapp_config_id=eq.${configId}&is_active=eq.true&is_published=eq.true&order=priority.desc`,
      '*'
    );

    if (!flows || flows.length === 0) return null;

    for (const flow of flows) {
      if (flow.trigger_type === 'any_message') {
        return flow;
      }

      if (flow.trigger_type === 'keyword' && flow.trigger_value) {
        const keywords = flow.trigger_value.split(',').map((k) => k.trim().toLowerCase());
        const msgLower = messageText.toLowerCase().trim();

        if (keywords.some((kw) => msgLower === kw || msgLower.startsWith(kw + ' '))) {
          return flow;
        }
      }
    }

    return null;
  }

  /**
   * Load flow with nodes and edges
   */
  async loadFlow(flowId) {
    const flow = await sbSelectOne(this.env, 'flows', `id=eq.${flowId}`, '*');

    if (!flow) return null;
    this.flow = flow;

    const nodes = await sbSelect(this.env, 'flow_nodes', `flow_id=eq.${flowId}`, '*');
    const edges = await sbSelect(this.env, 'flow_edges', `flow_id=eq.${flowId}`, '*');

    this.nodes = nodes || [];
    this.edges = edges || [];

    return flow;
  }

  /**
   * Find existing waiting execution for customer
   */
  async findWaitingExecution(customerId, configId) {
    const executions = await sbSelect(
      this.env,
      'flow_executions',
      `customer_id=eq.${customerId}&whatsapp_config_id=eq.${configId}&status=eq.waiting&order=started_at.desc&limit=1`,
      '*'
    );

    if (!executions || executions.length === 0) return null;

    const data = executions[0];
    this.execution = data;
    this.variables = data.variables || {};
    await this.loadFlow(data.flow_id);

    return data;
  }

  /**
   * Start new execution
   */
  async startExecution(customerId, configId, flowId) {
    await this.loadFlow(flowId);

    const triggerNode = this.nodes.find((n) => n.node_type === 'trigger');
    if (!triggerNode) {
      throw new Error('Flow has no trigger node');
    }

    const rows = await sbInsert(
      this.env,
      'flow_executions',
      [{
        flow_id: flowId,
        customer_id: customerId,
        whatsapp_config_id: configId,
        current_node_id: triggerNode.id,
        status: 'running',
        variables: {},
      }],
      true
    );

    this.execution = rows[0];
    this.variables = {};

    return this.execution;
  }

  /**
   * Execute flow from current node
   */
  async execute(customerId, messageContent) {
    // Store incoming message in variables
    this.variables.last_message = messageContent.text;
    this.variables.last_message_type = messageContent.type;
    if (messageContent.buttonId) this.variables.last_button_id = messageContent.buttonId;
    if (messageContent.listRowId) this.variables.last_list_row_id = messageContent.listRowId;

    // If resuming from wait, capture variable
    if (this.execution.status === 'waiting' && this.execution.waiting_for) {
      const waitNode = this.nodes.find((n) => n.id === this.execution.current_node_id);
      if (waitNode && waitNode.config?.variableName) {
        this.variables[waitNode.config.variableName] = messageContent.text;
      }
    }

    // Find next node to execute
    let currentNodeId = this.execution.current_node_id;

    // If we were waiting, move to next node
    if (this.execution.status === 'waiting') {
      const nextEdge = this.edges.find((e) => e.source_node_id === currentNodeId);
      if (nextEdge) {
        currentNodeId = nextEdge.target_node_id;
      } else {
        await this.completeExecution();
        return;
      }
    } else {
      // Skip trigger node on new execution
      const nextEdge = this.edges.find((e) => e.source_node_id === currentNodeId);
      if (nextEdge) {
        currentNodeId = nextEdge.target_node_id;
      }
    }

    // Execute nodes sequentially
    while (currentNodeId) {
      const node = this.nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

      const result = await this.executeNode(node, customerId);

      // Log execution
      await this.logExecution(node.id, node.node_type, result);

      if (result.wait) {
        // Pause execution, waiting for user input
        await sbUpdate(
          this.env,
          'flow_executions',
          `id=eq.${this.execution.id}`,
          {
            current_node_id: node.id,
            status: 'waiting',
            waiting_for: result.waitFor,
            variables: this.variables,
          }
        );
        return;
      }

      if (result.end) {
        await this.completeExecution();
        return;
      }

      // Find next node
      let nextEdge;
      if (result.outputHandle) {
        // Condition node - follow specific handle
        nextEdge = this.edges.find(
          (e) => e.source_node_id === currentNodeId && e.source_handle === result.outputHandle
        );
      } else {
        // Normal flow - follow default edge
        nextEdge = this.edges.find((e) => e.source_node_id === currentNodeId);
      }

      currentNodeId = nextEdge ? nextEdge.target_node_id : null;
    }

    // No more nodes, complete
    await this.completeExecution();
  }

  /**
   * Execute single node
   */
  async executeNode(node, customerId) {
    const config = node.config || {};

    switch (node.node_type) {
      case 'trigger':
        return { success: true };

      case 'sendText': {
        const message = interpolate(config.message || '', this.variables);
        await wa.sendText(this.config.access_token, this.config.phone_number_id, customerId, message);
        return { success: true };
      }

      case 'sendImage': {
        const imageUrl = interpolate(config.imageUrl || '', this.variables);
        const caption = interpolate(config.caption || '', this.variables);
        await wa.sendImage(this.config.access_token, this.config.phone_number_id, customerId, imageUrl, caption);
        return { success: true };
      }

      case 'sendButtons': {
        const bodyText = interpolate(config.bodyText || '', this.variables);
        const buttons = (config.buttons || []).map((btn) => ({
          id: btn.id,
          title: interpolate(btn.title || '', this.variables),
        }));
        const headerText = config.headerText ? interpolate(config.headerText, this.variables) : null;
        const footerText = config.footerText ? interpolate(config.footerText, this.variables) : null;
        await wa.sendButtons(
          this.config.access_token,
          this.config.phone_number_id,
          customerId,
          bodyText,
          buttons,
          headerText,
          footerText
        );
        return { success: true };
      }

      case 'sendList': {
        const bodyText = interpolate(config.bodyText || '', this.variables);
        const buttonText = config.buttonText || 'View Options';
        const sections = (config.sections || []).map((section) => ({
          title: interpolate(section.title || '', this.variables),
          rows: (section.rows || []).map((row) => ({
            id: row.id,
            title: interpolate(row.title || '', this.variables),
            description: row.description ? interpolate(row.description, this.variables) : undefined,
          })),
        }));
        const headerText = config.headerText ? interpolate(config.headerText, this.variables) : null;
        const footerText = config.footerText ? interpolate(config.footerText, this.variables) : null;
        await wa.sendList(
          this.config.access_token,
          this.config.phone_number_id,
          customerId,
          bodyText,
          buttonText,
          sections,
          headerText,
          footerText
        );
        return { success: true };
      }

      case 'waitForReply':
        return { wait: true, waitFor: config.expectedType || 'any' };

      case 'condition': {
        const conditions = config.conditions || [];
        for (const cond of conditions) {
          if (evaluateCondition(cond.variable, cond.operator, cond.value, this.variables)) {
            return { success: true, outputHandle: cond.outputHandle };
          }
        }
        return { success: true, outputHandle: config.defaultHandle || 'false' };
      }

      case 'setVariable': {
        const assignments = config.assignments || [];
        for (const assignment of assignments) {
          let value;
          if (assignment.valueType === 'variable') {
            value = this.variables[assignment.value];
          } else {
            value = interpolate(assignment.value || '', this.variables);
          }
          setNestedValue(this.variables, assignment.variableName, value);
        }
        return { success: true };
      }

      case 'apiCall': {
        try {
          const url = interpolate(config.url || '', this.variables);
          const method = config.method || 'GET';
          const headers = {};

          // Interpolate headers
          if (config.headers) {
            for (const [key, val] of Object.entries(config.headers)) {
              headers[key] = interpolate(val, this.variables);
            }
          }

          const fetchOptions = { method, headers };

          if (config.body && method !== 'GET') {
            const bodyStr = interpolate(config.body, this.variables);
            fetchOptions.body = bodyStr;
            if (!headers['Content-Type']) {
              headers['Content-Type'] = 'application/json';
            }
          }

          const response = await fetch(url, fetchOptions);
          const responseData = await response.json().catch(() => ({}));

          // Map response to variables
          if (config.responseMapping) {
            for (const mapping of config.responseMapping) {
              const value = mapping.responsePath
                ? mapping.responsePath.split('.').reduce((obj, key) => obj?.[key], responseData)
                : responseData;
              setNestedValue(this.variables, mapping.variableName, value);
            }
          }

          this.variables.api_status = response.status;
          this.variables.api_success = response.ok;

          return { success: true };
        } catch (error) {
          this.variables.api_error = error.message;
          this.variables.api_success = false;
          return { success: true }; // Continue flow even on API error
        }
      }

      case 'delay': {
        const seconds = config.delaySeconds || 1;
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        return { success: true };
      }

      case 'loop': {
        // Simple loop implementation - increment counter
        const loopVar = `_loop_${node.id}`;
        const count = (this.variables[loopVar] || 0) + 1;
        const maxIterations = config.maxIterations || 10;

        this.variables[loopVar] = count;
        this.variables.loop_index = count;

        if (count >= maxIterations) {
          // Exit loop - follow 'complete' handle
          delete this.variables[loopVar];
          return { success: true, outputHandle: 'complete' };
        }

        // Continue loop - follow 'loop' handle
        return { success: true, outputHandle: 'loop' };
      }

      case 'end':
        return { end: true };

      default:
        return { success: true };
    }
  }

  /**
   * Mark execution as complete
   */
  async completeExecution() {
    await sbUpdate(
      this.env,
      'flow_executions',
      `id=eq.${this.execution.id}`,
      {
        status: 'completed',
        completed_at: new Date().toISOString(),
        variables: this.variables,
      }
    );
  }

  /**
   * Log execution step
   */
  async logExecution(nodeId, action, data) {
    await sbInsert(this.env, 'execution_logs', [{
      execution_id: this.execution.id,
      node_id: nodeId,
      action,
      data,
    }]);
  }
}
