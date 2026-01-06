// Flow Execution Engine using REST API

import { sbSelect, sbSelectOne, sbInsert, sbUpdate } from '../../lib/supabase.js';
import * as wa from './whatsapp.js';
import { interpolate, evaluateCondition, setNestedValue } from './variables.js';

/**
 * Store outbound message in conversations table
 */
async function storeOutboundMessage(env, configId, customerId, content, messageType = 'text', waMessageId = null, mediaUrl = null) {
  try {
    // Find conversation
    const conversation = await sbSelectOne(
      env,
      'conversations',
      `whatsapp_config_id=eq.${configId}&contact_phone=eq.${customerId}`,
      'id'
    );

    if (!conversation) {
      console.log('[ENGINE] No conversation found for outbound message storage');
      return;
    }

    const now = new Date().toISOString();
    const messagePreview = (content || `[${messageType}]`).substring(0, 100);

    // Store the message
    await sbInsert(
      env,
      'messages',
      [{
        conversation_id: conversation.id,
        whatsapp_message_id: waMessageId,
        direction: 'outbound',
        message_type: messageType,
        content: content,
        media_url: mediaUrl,
        status: 'sent',
        sent_at: now,
      }]
    );

    // Update conversation with last message info
    await sbUpdate(
      env,
      'conversations',
      `id=eq.${conversation.id}`,
      {
        last_message_at: now,
        last_message_preview: messagePreview,
        last_message_direction: 'outbound',
        updated_at: now,
      }
    );

    console.log('[ENGINE] Stored outbound message in conversation:', conversation.id);
  } catch (error) {
    console.error('[ENGINE] Error storing outbound message:', error);
  }
}

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
    // Merge stored variables with initial variables (preserves customer_name, customer_phone, etc.)
    this.variables = { ...this.variables, ...(data.variables || {}) };
    await this.loadFlow(data.flow_id);

    return data;
  }

  /**
   * Start new execution
   */
  async startExecution(customerId, configId, flowId) {
    console.log('[ENGINE] Starting execution for flow:', flowId);
    await this.loadFlow(flowId);
    console.log('[ENGINE] Loaded flow, nodes:', this.nodes.length, 'edges:', this.edges.length);

    const triggerNode = this.nodes.find((n) => n.node_type === 'trigger');
    if (!triggerNode) {
      console.error('[ENGINE] Flow has no trigger node!');
      throw new Error('Flow has no trigger node');
    }
    console.log('[ENGINE] Trigger node found:', triggerNode.id);

    // Store initial variables (customer_name, customer_phone, etc.) set by webhook
    const initialVariables = { ...this.variables };

    const rows = await sbInsert(
      this.env,
      'flow_executions',
      [{
        flow_id: flowId,
        customer_id: customerId,
        whatsapp_config_id: configId,
        current_node_id: triggerNode.id,
        status: 'running',
        variables: initialVariables,
      }],
      true
    );

    this.execution = rows[0];
    // Keep initial variables instead of overwriting
    this.variables = initialVariables;
    console.log('[ENGINE] Execution created:', this.execution?.id, 'with initial variables:', Object.keys(initialVariables));

    return this.execution;
  }

  /**
   * Execute flow from current node
   */
  async execute(customerId, messageContent) {
    console.log('[ENGINE] Execute called, customerId:', customerId);

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
    console.log('[ENGINE] Starting node execution loop, first node:', currentNodeId);
    while (currentNodeId) {
      const node = this.nodes.find((n) => n.id === currentNodeId);
      if (!node) {
        console.log('[ENGINE] Node not found:', currentNodeId);
        break;
      }

      console.log('[ENGINE] Executing node:', node.node_type, node.id);
      const result = await this.executeNode(node, customerId);
      console.log('[ENGINE] Node result:', JSON.stringify(result));

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
        console.log('[ENGINE] Sending text:', message.substring(0, 100), 'to:', customerId);
        console.log('[ENGINE] Using phone_number_id:', this.config.phone_number_id);
        try {
          const result = await wa.sendText(this.config.access_token, this.config.phone_number_id, customerId, message);
          console.log('[ENGINE] WhatsApp API response:', JSON.stringify(result));
          if (result.error) {
            console.error('[ENGINE] WhatsApp API error:', result.error.message);
          } else {
            // Store outbound message
            const waMessageId = result.messages?.[0]?.id;
            await storeOutboundMessage(this.env, this.config.id, customerId, message, 'text', waMessageId);
          }
        } catch (err) {
          console.error('[ENGINE] Failed to send text:', err.message);
        }
        return { success: true };
      }

      case 'sendImage': {
        const imageUrl = interpolate(config.imageUrl || '', this.variables);
        const caption = interpolate(config.caption || '', this.variables);
        const result = await wa.sendImage(this.config.access_token, this.config.phone_number_id, customerId, imageUrl, caption);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, caption || '', 'image', waMessageId, imageUrl);
        }
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
        const result = await wa.sendButtons(
          this.config.access_token,
          this.config.phone_number_id,
          customerId,
          bodyText,
          buttons,
          headerText,
          footerText
        );
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, bodyText, 'button', waMessageId);
        }
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
        const result = await wa.sendList(
          this.config.access_token,
          this.config.phone_number_id,
          customerId,
          bodyText,
          buttonText,
          sections,
          headerText,
          footerText
        );
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, bodyText, 'list', waMessageId);
        }
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

      // New send message nodes
      case 'sendTextEnhanced': {
        const bodyText = interpolate(config.bodyText || config.message || '', this.variables);
        const headerText = config.headerText ? interpolate(config.headerText, this.variables) : null;
        const footerText = config.footerText ? interpolate(config.footerText, this.variables) : null;
        const result = await wa.sendTextEnhanced(this.config.access_token, this.config.phone_number_id, customerId, bodyText, headerText, footerText);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, bodyText, 'text', waMessageId);
        }
        return { success: true };
      }

      case 'sendVideo': {
        const videoUrl = interpolate(config.videoUrl || '', this.variables);
        const caption = config.caption ? interpolate(config.caption, this.variables) : null;
        const result = await wa.sendVideo(this.config.access_token, this.config.phone_number_id, customerId, videoUrl, caption);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, caption || '', 'video', waMessageId, videoUrl);
        }
        return { success: true };
      }

      case 'sendAudio': {
        const audioUrl = interpolate(config.audioUrl || '', this.variables);
        const result = await wa.sendAudio(this.config.access_token, this.config.phone_number_id, customerId, audioUrl);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, '', 'audio', waMessageId, audioUrl);
        }
        return { success: true };
      }

      case 'sendDocument': {
        const documentUrl = interpolate(config.documentUrl || '', this.variables);
        const filename = config.filename ? interpolate(config.filename, this.variables) : null;
        const caption = config.caption ? interpolate(config.caption, this.variables) : null;
        const result = await wa.sendDocument(this.config.access_token, this.config.phone_number_id, customerId, documentUrl, filename, caption);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, caption || filename || '', 'document', waMessageId, documentUrl);
        }
        return { success: true };
      }

      case 'sendLocation': {
        const latitude = interpolate(config.latitude || '0', this.variables);
        const longitude = interpolate(config.longitude || '0', this.variables);
        const name = config.name ? interpolate(config.name, this.variables) : null;
        const address = config.address ? interpolate(config.address, this.variables) : null;
        const result = await wa.sendLocation(this.config.access_token, this.config.phone_number_id, customerId, latitude, longitude, name, address);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, name || address || '[Location]', 'location', waMessageId);
        }
        return { success: true };
      }

      case 'sendContact': {
        const contacts = (config.contacts || []).map((c) => ({
          name: interpolate(c.name || '', this.variables),
          firstName: c.firstName ? interpolate(c.firstName, this.variables) : null,
          lastName: c.lastName ? interpolate(c.lastName, this.variables) : null,
          phone: c.phone ? interpolate(c.phone, this.variables) : null,
          email: c.email ? interpolate(c.email, this.variables) : null,
        }));
        const result = await wa.sendContact(this.config.access_token, this.config.phone_number_id, customerId, contacts);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          const contactNames = contacts.map(c => c.name).join(', ');
          await storeOutboundMessage(this.env, this.config.id, customerId, `[Contact: ${contactNames}]`, 'contact', waMessageId);
        }
        return { success: true };
      }

      case 'sendSticker': {
        const stickerUrl = interpolate(config.stickerUrl || '', this.variables);
        const result = await wa.sendSticker(this.config.access_token, this.config.phone_number_id, customerId, stickerUrl);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, '', 'sticker', waMessageId, stickerUrl);
        }
        return { success: true };
      }

      // User data nodes
      case 'getCustomerPhone': {
        const varName = config.variableName || 'customer_phone';
        const format = config.format || 'e164';
        const phone = this.variables.customer_phone || customerId;
        setNestedValue(this.variables, varName, wa.formatPhoneNumber(phone, format));
        return { success: true };
      }

      case 'getCustomerName': {
        const varName = config.variableName || 'customer_name';
        setNestedValue(this.variables, varName, this.variables.customer_name || '');
        return { success: true };
      }

      case 'getCustomerCountry': {
        const varName = config.variableName || 'customer_country';
        const phone = this.variables.customer_phone || customerId;
        setNestedValue(this.variables, varName, wa.getCountryFromPhone(phone));
        return { success: true };
      }

      case 'getMessageTimestamp': {
        const varName = config.variableName || 'message_timestamp';
        setNestedValue(this.variables, varName, new Date().toISOString());
        return { success: true };
      }

      // Utility nodes
      case 'formatPhoneNumber': {
        const sourceVar = config.sourceVariable || 'customer_phone';
        const targetVar = config.variableName || 'formatted_phone';
        const format = config.format || 'e164';
        const phone = this.variables[sourceVar] || '';
        setNestedValue(this.variables, targetVar, wa.formatPhoneNumber(phone, format));
        return { success: true };
      }

      case 'randomChoice': {
        const choices = config.choices || ['a', 'b'];
        const randomIndex = Math.floor(Math.random() * choices.length);
        const chosenHandle = choices[randomIndex];
        if (config.variableName) {
          setNestedValue(this.variables, config.variableName, chosenHandle);
        }
        return { success: true, outputHandle: chosenHandle };
      }

      case 'dateTime': {
        const varName = config.variableName || 'datetime';
        const operation = config.operation || 'now';
        const format = config.format || 'iso';
        let result;

        const now = new Date();
        switch (operation) {
          case 'now':
            result = now;
            break;
          case 'today':
            result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'addDays':
            result = new Date(now.getTime() + (config.days || 0) * 24 * 60 * 60 * 1000);
            break;
          case 'addHours':
            result = new Date(now.getTime() + (config.hours || 0) * 60 * 60 * 1000);
            break;
          default:
            result = now;
        }

        switch (format) {
          case 'iso':
            setNestedValue(this.variables, varName, result.toISOString());
            break;
          case 'date':
            setNestedValue(this.variables, varName, result.toISOString().split('T')[0]);
            break;
          case 'time':
            setNestedValue(this.variables, varName, result.toISOString().split('T')[1].split('.')[0]);
            break;
          case 'timestamp':
            setNestedValue(this.variables, varName, result.getTime());
            break;
          case 'readable':
            setNestedValue(this.variables, varName, result.toLocaleString());
            break;
          default:
            setNestedValue(this.variables, varName, result.toISOString());
        }
        return { success: true };
      }

      case 'mathOperation': {
        const varName = config.variableName || 'result';
        const operation = config.operation || 'add';
        const valueA = parseFloat(interpolate(config.valueA || '0', this.variables)) || 0;
        const valueB = parseFloat(interpolate(config.valueB || '0', this.variables)) || 0;
        let result;

        switch (operation) {
          case 'add':
            result = valueA + valueB;
            break;
          case 'subtract':
            result = valueA - valueB;
            break;
          case 'multiply':
            result = valueA * valueB;
            break;
          case 'divide':
            result = valueB !== 0 ? valueA / valueB : 0;
            break;
          case 'modulo':
            result = valueB !== 0 ? valueA % valueB : 0;
            break;
          case 'round':
            result = Math.round(valueA);
            break;
          case 'floor':
            result = Math.floor(valueA);
            break;
          case 'ceil':
            result = Math.ceil(valueA);
            break;
          case 'abs':
            result = Math.abs(valueA);
            break;
          case 'min':
            result = Math.min(valueA, valueB);
            break;
          case 'max':
            result = Math.max(valueA, valueB);
            break;
          default:
            result = valueA;
        }

        setNestedValue(this.variables, varName, result);
        return { success: true };
      }

      case 'textOperation': {
        const varName = config.variableName || 'result';
        const operation = config.operation || 'uppercase';
        const text = interpolate(config.text || '', this.variables);
        let result;

        switch (operation) {
          case 'uppercase':
            result = text.toUpperCase();
            break;
          case 'lowercase':
            result = text.toLowerCase();
            break;
          case 'trim':
            result = text.trim();
            break;
          case 'length':
            result = text.length;
            break;
          case 'substring':
            result = text.substring(config.start || 0, config.end || text.length);
            break;
          case 'replace':
            result = text.replace(new RegExp(config.search || '', 'g'), config.replaceWith || '');
            break;
          case 'split':
            result = text.split(config.delimiter || ',');
            break;
          case 'join':
            const arr = Array.isArray(this.variables[config.arrayVariable])
              ? this.variables[config.arrayVariable]
              : [];
            result = arr.join(config.delimiter || ',');
            break;
          case 'capitalize':
            result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            break;
          case 'contains':
            result = text.includes(config.search || '');
            break;
          default:
            result = text;
        }

        setNestedValue(this.variables, varName, result);
        return { success: true };
      }

      case 'markAsRead': {
        // Mark the last received message as read (already done by webhook, but can be explicit)
        return { success: true };
      }

      case 'sendStampCard': {
        // Get config values with variable interpolation
        const stampServerUrl = interpolate(config.stampServerUrl || 'http://localhost:3000', this.variables);
        const stampCount = interpolate(config.stampCount || '0', this.variables);
        const customerName = interpolate(config.customerName || '', this.variables);
        const title = config.title ? interpolate(config.title, this.variables) : null;
        const subtitle = config.subtitle ? interpolate(config.subtitle, this.variables) : null;
        const caption = config.caption ? interpolate(config.caption, this.variables) : null;

        // Build the stamp card URL
        let stampCardUrl;
        if (config.useCustomTemplate && config.customHtml) {
          // For custom template, we'd need to POST the HTML to a custom endpoint
          // For now, use the standard endpoint with additional params
          const params = new URLSearchParams({
            n: stampCount,
            name: customerName,
          });
          if (title) params.append('title', title);
          if (subtitle) params.append('subtitle', subtitle);
          if (config.customHtml) params.append('html', config.customHtml);
          if (config.customStyle) params.append('style', config.customStyle);
          stampCardUrl = `${stampServerUrl}/generate-card?${params.toString()}`;
        } else {
          // Standard endpoint
          const params = new URLSearchParams({
            n: stampCount,
            name: customerName,
          });
          if (title) params.append('title', title);
          if (subtitle) params.append('subtitle', subtitle);
          stampCardUrl = `${stampServerUrl}/generate-card?${params.toString()}`;
        }

        // Send the stamp card as an image
        const result = await wa.sendImage(this.config.access_token, this.config.phone_number_id, customerId, stampCardUrl, caption);
        if (!result.error) {
          const waMessageId = result.messages?.[0]?.id;
          await storeOutboundMessage(this.env, this.config.id, customerId, caption || '', 'image', waMessageId, stampCardUrl);
        }
        return { success: true };
      }

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
