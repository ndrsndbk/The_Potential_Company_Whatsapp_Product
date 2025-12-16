import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { ReactFlowProvider, type Node, type Edge } from '@xyflow/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Settings, Upload, Loader2, BarChart3 } from 'lucide-react';
import { FlowCanvas } from '@/components/canvas/FlowCanvas';
import { NodePalette } from '@/components/sidebar/NodePalette';
import { PropertyPanel } from '@/components/properties/PropertyPanel';
import { useFlowStore } from '@/stores/flowStore';
import { flowsApi, configsApi, type WhatsAppConfig } from '@/lib/api';
import type { NodeType, FlowNodeData } from '@/types/flow';

export function FlowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    nodes,
    edges,
    isDirty,
    setNodes,
    setEdges,
    addNode,
    setDirty,
    resetFlow,
  } = useFlowStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);

  // Flow metadata from API
  const [flowId, setFlowId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('');
  const [triggerType, setTriggerType] = useState<'keyword' | 'any_message'>('keyword');
  const [triggerValue, setTriggerValue] = useState('');
  const [configId, setConfigId] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);

  // Load flow on mount
  useEffect(() => {
    loadFlow();
    loadConfigs();

    return () => {
      resetFlow();
    };
  }, [id]);

  const loadConfigs = async () => {
    try {
      const { configs } = await configsApi.list();
      setConfigs(configs);
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  };

  const loadFlow = async () => {
    if (!id || id === 'new') {
      // New flow - start fresh
      setFlowId(null);
      setNodes([]);
      setEdges([]);
      setFlowName('New Flow');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { flow, nodes: apiNodes, edges: apiEdges } = await flowsApi.get(id);

      // Convert API nodes to React Flow nodes
      const rfNodes: Node<FlowNodeData>[] = apiNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: node.data.label,
          nodeType: node.data.nodeType as NodeType,
          config: node.data.config as unknown,
        } as FlowNodeData,
      }));

      // Convert API edges to React Flow edges
      // Note: sourceHandle 'default' should be converted to undefined for React Flow
      const rfEdges: Edge[] = apiEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle === 'default' ? undefined : edge.sourceHandle,
      }));

      setFlowId(flow.id);
      setNodes(rfNodes);
      setEdges(rfEdges);
      setFlowName(flow.name);
      setTriggerType(flow.trigger_type);
      setTriggerValue(flow.trigger_value || '');
      setConfigId(flow.whatsapp_config_id || '');
      setIsPublished(flow.is_published);
      setDirty(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flow');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const flowData = {
        name: flowName,
        trigger_type: triggerType,
        trigger_value: triggerValue,
        whatsapp_config_id: configId || undefined,
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type || 'unknown',
          position: node.position,
          data: node.data as Record<string, unknown>,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || undefined,
        })),
      };

      if (flowId) {
        // Update existing flow
        const { flow } = await flowsApi.update(flowId, flowData);
        setIsPublished(flow.is_published);
      } else {
        // Create new flow
        const { flow } = await flowsApi.create(flowData);
        setFlowId(flow.id);
        setIsPublished(flow.is_published);
        // Navigate to the new flow's URL
        navigate(`/editor/${flow.id}`, { replace: true });
      }

      setDirty(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!flowId) {
      // Save first, then publish
      await handleSave();
      return;
    }

    try {
      setSaving(true);
      await handleSave();
      const { flow } = await flowsApi.publish(flowId, true);
      setIsPublished(flow.is_published);
      setError(null);
      alert('Flow published successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish flow');
    } finally {
      setSaving(false);
    }
  };

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 25,
      };

      addNode(type, position);
    },
    [addNode]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{flowName}</h1>
            <div className="flex items-center gap-2 text-xs">
              {isDirty && <span className="text-amber-600">Unsaved changes</span>}
              {isPublished && (
                <span className="text-green-600 font-medium">Published</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-red-600 mr-2">{error}</span>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Upload size={18} />
            Publish
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-5xl mx-auto grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flow Name
              </label>
              <input
                type="text"
                value={flowName}
                onChange={(e) => {
                  setFlowName(e.target.value);
                  setDirty(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="My Flow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Type
              </label>
              <select
                value={triggerType}
                onChange={(e) => {
                  setTriggerType(e.target.value as 'keyword' | 'any_message');
                  setDirty(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="keyword">Keyword</option>
                <option value="any_message">Any Message</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Keywords
              </label>
              <input
                type="text"
                value={triggerValue}
                onChange={(e) => {
                  setTriggerValue(e.target.value);
                  setDirty(true);
                }}
                disabled={triggerType !== 'keyword'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                placeholder="DEMO, START, HI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <select
                value={configId}
                onChange={(e) => {
                  setConfigId(e.target.value);
                  setDirty(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select a number...</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.phone_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Analytics
              </label>
              <button
                onClick={() => flowId && navigate(`/editor/${flowId}/logs`)}
                disabled={!flowId}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BarChart3 size={16} />
                View All Time Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Node palette */}
        <NodePalette />

        {/* Canvas */}
        <div
          className="flex-1 relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlowProvider>
            <FlowCanvas />
          </ReactFlowProvider>
        </div>

        {/* Right sidebar - Properties */}
        <PropertyPanel />
      </div>
    </div>
  );
}
