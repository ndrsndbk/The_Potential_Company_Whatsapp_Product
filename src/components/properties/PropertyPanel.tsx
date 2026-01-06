import { useState, useEffect } from 'react';
import { useFlowStore } from '@/stores/flowStore';
import { X, Plus, Trash2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import type {
  FlowNodeData,
  TriggerConfig,
  SendTextConfig,
  SendImageConfig,
  SendButtonsConfig,
  WaitForReplyConfig,
  ConditionConfig,
  DelayConfig,
  ApiCallConfig,
  SendTextEnhancedConfig,
  SendVideoConfig,
  SendAudioConfig,
  SendDocumentConfig,
  SendLocationConfig,
  SendContactConfig,
  SendStickerConfig,
  GetCustomerPhoneConfig,
  GetCustomerNameConfig,
  GetCustomerCountryConfig,
  GetMessageTimestampConfig,
  FormatPhoneNumberConfig,
  RandomChoiceConfig,
  DateTimeConfig,
  MathOperationConfig,
  TextOperationConfig,
  SendStampCardConfig,
} from '@/types/flow';

// Helper to generate friendly step ID
function getFriendlyStepId(flowName: string | undefined, nodeType: string, nodeId: string): string {
  const flowSlug = (flowName || 'flow').toLowerCase().replace(/\s+/g, '_').slice(0, 20);
  const shortId = nodeId.slice(-4);
  return `${flowSlug}.${nodeType}.${shortId}`;
}

// Copyable Step Info component
function StepInfo({ flowName, nodeType, nodeId }: { flowName: string | undefined; nodeType: string; nodeId: string }) {
  const [copied, setCopied] = useState(false);
  const friendlyId = getFriendlyStepId(flowName, nodeType, nodeId);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(friendlyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4 p-2 bg-gray-100 rounded-md">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Step ID</span>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Copy step ID"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
        </button>
      </div>
      <code className="text-xs text-gray-700 font-mono break-all">{friendlyId}</code>
    </div>
  );
}

// WhatsApp message preview component
function WhatsAppPreview({
  message,
  headerText,
  footerText,
  buttons,
  imageUrl,
  caption,
}: {
  message?: string;
  headerText?: string;
  footerText?: string;
  buttons?: { id: string; title: string }[];
  imageUrl?: string;
  caption?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);

  const displayText = message || caption || '';

  return (
    <div className="mt-3">
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
      >
        {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
        {showPreview ? 'Hide Preview' : 'Show Preview'}
      </button>

      {showPreview && (
        <div className="mt-2 p-3 bg-[#e5ddd5] rounded-lg">
          {/* WhatsApp chat bubble */}
          <div className="max-w-[220px] ml-auto">
            <div className="bg-[#dcf8c6] rounded-lg overflow-hidden shadow-sm">
              {imageUrl && (
                <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-500">Image Preview</span>
                </div>
              )}
              <div className="p-2">
                {headerText && (
                  <p className="text-sm font-bold text-gray-900 mb-1">{headerText}</p>
                )}
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {displayText || 'No message content'}
                </p>
                {footerText && (
                  <p className="text-xs text-gray-500 mt-1 italic">{footerText}</p>
                )}
                <div className="text-right mt-1">
                  <span className="text-[10px] text-gray-500">12:00</span>
                </div>
              </div>
              {buttons && buttons.length > 0 && (
                <div className="border-t border-gray-200">
                  {buttons.map((btn, i) => (
                    <div
                      key={btn.id}
                      className={`text-center py-2 text-sm text-blue-500 ${i > 0 ? 'border-t border-gray-200' : ''}`}
                    >
                      {btn.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertyPanel() {
  const flow = useFlowStore((state) => state.flow);
  const nodes = useFlowStore((state) => state.nodes);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const updateNodeConfig = useFlowStore((state) => state.updateNodeConfig);
  const updateNodeLabel = useFlowStore((state) => state.updateNodeLabel);
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const selectNode = useFlowStore((state) => state.selectNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 h-full bg-gray-50 border-l border-gray-200 p-4">
        <p className="text-sm text-gray-500">Select a node to edit its properties</p>
      </div>
    );
  }

  const data = selectedNode.data as FlowNodeData;

  return (
    <div className="w-80 h-full bg-gray-50 border-l border-gray-200 overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{data.label}</h2>
          <button
            onClick={() => selectNode(null)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Label */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Step Info */}
        <StepInfo flowName={flow?.name} nodeType={data.nodeType} nodeId={selectedNode.id} />

        {/* Node-specific config */}
        <div className="space-y-4">
          {data.nodeType === 'trigger' && (
            <TriggerConfigForm
              config={data.config as TriggerConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendText' && (
            <SendTextConfigForm
              config={data.config as SendTextConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendImage' && (
            <SendImageConfigForm
              config={data.config as SendImageConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendButtons' && (
            <SendButtonsConfigForm
              config={data.config as SendButtonsConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'waitForReply' && (
            <WaitForReplyConfigForm
              config={data.config as WaitForReplyConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'condition' && (
            <ConditionConfigForm
              config={data.config as ConditionConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'delay' && (
            <DelayConfigForm
              config={data.config as DelayConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'apiCall' && (
            <ApiCallConfigForm
              config={data.config as ApiCallConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {/* New send message nodes */}
          {data.nodeType === 'sendTextEnhanced' && (
            <SendTextEnhancedConfigForm
              config={data.config as SendTextEnhancedConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendVideo' && (
            <SendVideoConfigForm
              config={data.config as SendVideoConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendAudio' && (
            <SendAudioConfigForm
              config={data.config as SendAudioConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendDocument' && (
            <SendDocumentConfigForm
              config={data.config as SendDocumentConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendLocation' && (
            <SendLocationConfigForm
              config={data.config as SendLocationConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendContact' && (
            <SendContactConfigForm
              config={data.config as SendContactConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'sendSticker' && (
            <SendStickerConfigForm
              config={data.config as SendStickerConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {/* User data nodes */}
          {data.nodeType === 'getCustomerPhone' && (
            <GetCustomerPhoneConfigForm
              config={data.config as GetCustomerPhoneConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'getCustomerName' && (
            <GetCustomerNameConfigForm
              config={data.config as GetCustomerNameConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'getCustomerCountry' && (
            <GetCustomerCountryConfigForm
              config={data.config as GetCustomerCountryConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'getMessageTimestamp' && (
            <GetMessageTimestampConfigForm
              config={data.config as GetMessageTimestampConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {/* Utility nodes */}
          {data.nodeType === 'formatPhoneNumber' && (
            <FormatPhoneNumberConfigForm
              config={data.config as FormatPhoneNumberConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'randomChoice' && (
            <RandomChoiceConfigForm
              config={data.config as RandomChoiceConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'dateTime' && (
            <DateTimeConfigForm
              config={data.config as DateTimeConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'mathOperation' && (
            <MathOperationConfigForm
              config={data.config as MathOperationConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'textOperation' && (
            <TextOperationConfigForm
              config={data.config as TextOperationConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
          {data.nodeType === 'markAsRead' && (
            <div className="text-sm text-gray-500">
              This node marks the last received message as read. No configuration needed.
            </div>
          )}
          {/* Stamp card */}
          {data.nodeType === 'sendStampCard' && (
            <SendStampCardConfigForm
              config={data.config as SendStampCardConfig}
              onChange={(c) => updateNodeConfig(selectedNode.id, c)}
            />
          )}
        </div>

        {/* Delete button */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <button
            onClick={() => deleteNode(selectedNode.id)}
            className="w-full px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
}

// Config forms
function TriggerConfigForm({
  config,
  onChange,
}: {
  config: TriggerConfig;
  onChange: (c: Partial<TriggerConfig>) => void;
}) {
  const keywords = config.keywords || ['START'];
  const isMultiple = keywords.length > 1;

  const toggleMode = () => {
    if (isMultiple) {
      // Switch to single: keep first keyword
      onChange({ keywords: [keywords[0] || 'START'] });
    } else {
      // Switch to multiple: add empty keyword
      onChange({ keywords: [...keywords, ''] });
    }
  };

  const addKeyword = () => {
    onChange({ keywords: [...keywords, ''] });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    onChange({ keywords: newKeywords });
  };

  const removeKeyword = (index: number) => {
    if (keywords.length <= 1) return;
    onChange({ keywords: keywords.filter((_, i) => i !== index) });
  };

  return (
    <>
      {/* Single/Multiple Toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Trigger Keywords</span>
        <button
          onClick={toggleMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isMultiple ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isMultiple ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {isMultiple ? 'Multiple triggers' : 'Single trigger'}
      </div>

      {/* Keywords List */}
      <div className="space-y-2">
        {keywords.map((keyword, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => updateKeyword(i, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Keyword ${i + 1}`}
            />
            {isMultiple && (
              <button
                onClick={() => removeKeyword(i)}
                disabled={keywords.length <= 1}
                className="px-2 text-red-500 hover:bg-red-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Button */}
      {isMultiple && (
        <button
          onClick={addKeyword}
          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Plus size={14} /> Add Keyword
        </button>
      )}

      {/* Case Sensitive */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
        <input
          type="checkbox"
          id="caseSensitive"
          checked={config.caseSensitive || false}
          onChange={(e) => onChange({ caseSensitive: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="caseSensitive" className="text-sm text-gray-700">
          Case sensitive
        </label>
      </div>
    </>
  );
}

function SendTextConfigForm({
  config,
  onChange,
}: {
  config: SendTextConfig;
  onChange: (c: Partial<SendTextConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          value={config.message || ''}
          onChange={(e) => onChange({ message: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Hello {{name}}! Welcome..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Use {'{{variable}}'} for dynamic content
        </p>
      </div>
      <WhatsAppPreview message={config.message} />
    </>
  );
}

function SendImageConfigForm({
  config,
  onChange,
}: {
  config: SendImageConfig;
  onChange: (c: Partial<SendImageConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image
        </label>
        <ImageUploader
          value={config.imageUrl || ''}
          onChange={(url) => onChange({ imageUrl: url })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Caption (optional)
        </label>
        <input
          type="text"
          value={config.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <WhatsAppPreview imageUrl={config.imageUrl} caption={config.caption} />
    </>
  );
}

function SendButtonsConfigForm({
  config,
  onChange,
}: {
  config: SendButtonsConfig;
  onChange: (c: Partial<SendButtonsConfig>) => void;
}) {
  const addButton = () => {
    if ((config.buttons?.length || 0) >= 3) return;
    const newButtons = [
      ...(config.buttons || []),
      { id: `btn_${Date.now()}`, title: 'New Button' },
    ];
    onChange({ buttons: newButtons });
  };

  const updateButton = (index: number, title: string) => {
    const newButtons = [...(config.buttons || [])];
    newButtons[index] = { ...newButtons[index], title };
    onChange({ buttons: newButtons });
  };

  const removeButton = (index: number) => {
    const newButtons = config.buttons?.filter((_, i) => i !== index) || [];
    onChange({ buttons: newButtons });
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Body Text
        </label>
        <textarea
          value={config.bodyText || ''}
          onChange={(e) => onChange({ bodyText: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buttons (max 3)
        </label>
        <div className="space-y-2">
          {config.buttons?.map((btn, i) => (
            <div key={btn.id} className="flex gap-2">
              <input
                type="text"
                value={btn.title}
                onChange={(e) => updateButton(i, e.target.value)}
                maxLength={20}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeButton(i)}
                className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-md"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        {(config.buttons?.length || 0) < 3 && (
          <button
            onClick={addButton}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Button
          </button>
        )}
      </div>
      <WhatsAppPreview message={config.bodyText} buttons={config.buttons} />
    </>
  );
}

function WaitForReplyConfigForm({
  config,
  onChange,
}: {
  config: WaitForReplyConfig;
  onChange: (c: Partial<WaitForReplyConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Variable Name
        </label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="user_response"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expected Type
        </label>
        <select
          value={config.expectedType || 'any'}
          onChange={(e) =>
            onChange({ expectedType: e.target.value as WaitForReplyConfig['expectedType'] })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="any">Any</option>
          <option value="text">Text</option>
          <option value="button">Button Reply</option>
          <option value="list">List Reply</option>
          <option value="image">Image</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timeout (seconds)
        </label>
        <input
          type="number"
          value={config.timeoutSeconds || ''}
          onChange={(e) => onChange({ timeoutSeconds: Number(e.target.value) || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="3600"
        />
      </div>
    </>
  );
}

function ConditionConfigForm({
  config,
  onChange,
}: {
  config: ConditionConfig;
  onChange: (c: Partial<ConditionConfig>) => void;
}) {
  const updateCondition = (index: number, field: string, value: string) => {
    const newConditions = [...(config.conditions || [])];
    newConditions[index] = { ...newConditions[index], [field]: value };
    onChange({ conditions: newConditions });
  };

  const addCondition = () => {
    const newConditions = [
      ...(config.conditions || []),
      { variable: '', operator: 'equals' as const, value: '', outputHandle: 'match' },
    ];
    onChange({ conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    const newConditions = config.conditions?.filter((_, i) => i !== index) || [];
    onChange({ conditions: newConditions });
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conditions
        </label>
        <div className="space-y-3">
          {config.conditions?.map((cond, i) => (
            <div key={i} className="p-3 bg-white border border-gray-200 rounded-md space-y-2">
              <input
                type="text"
                value={cond.variable}
                onChange={(e) => updateCondition(i, 'variable', e.target.value)}
                placeholder="Variable name"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="gt">Greater than</option>
                <option value="lt">Less than</option>
                <option value="regex">Regex</option>
                <option value="exists">Exists</option>
              </select>
              <input
                type="text"
                value={cond.value}
                onChange={(e) => updateCondition(i, 'value', e.target.value)}
                placeholder="Value"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cond.outputHandle}
                  onChange={(e) => updateCondition(i, 'outputHandle', e.target.value)}
                  placeholder="Output handle"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <button
                  onClick={() => removeCondition(i)}
                  className="px-2 text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addCondition}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add Condition
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Default Handle (Else)
          </label>
          <button
            type="button"
            onClick={() => onChange({ showDefaultHandle: !(config.showDefaultHandle !== false) })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.showDefaultHandle !== false ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.showDefaultHandle !== false ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {config.showDefaultHandle !== false && (
          <input
            type="text"
            value={config.defaultHandle || 'else'}
            onChange={(e) => onChange({ defaultHandle: e.target.value })}
            placeholder="Handle name (e.g., else, default)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        )}
        <p className="text-xs text-gray-500">
          The default handle catches all cases that don't match any condition.
        </p>
      </div>
    </>
  );
}

function DelayConfigForm({
  config,
  onChange,
}: {
  config: DelayConfig;
  onChange: (c: Partial<DelayConfig>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Delay (seconds)
      </label>
      <input
        type="number"
        value={config.delaySeconds || 0}
        onChange={(e) => onChange({ delaySeconds: Number(e.target.value) })}
        min={0}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function ApiCallConfigForm({
  config,
  onChange,
}: {
  config: ApiCallConfig;
  onChange: (c: Partial<ApiCallConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Method
        </label>
        <select
          value={config.method || 'GET'}
          onChange={(e) => onChange({ method: e.target.value as ApiCallConfig['method'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <input
          type="text"
          value={config.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://api.example.com/endpoint"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Body (JSON)
        </label>
        <textarea
          value={config.body || ''}
          onChange={(e) => onChange({ body: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder='{"key": "{{value}}"}'
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timeout (ms)
        </label>
        <input
          type="number"
          value={config.timeoutMs || 5000}
          onChange={(e) => onChange({ timeoutMs: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}

// New send message node forms
function SendTextEnhancedConfigForm({
  config,
  onChange,
}: {
  config: SendTextEnhancedConfig;
  onChange: (c: Partial<SendTextEnhancedConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Header (optional)</label>
        <input
          type="text"
          value={config.headerText || ''}
          onChange={(e) => onChange({ headerText: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Bold header text"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
        <textarea
          value={config.bodyText || ''}
          onChange={(e) => onChange({ bodyText: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Main message content..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Footer (optional)</label>
        <input
          type="text"
          value={config.footerText || ''}
          onChange={(e) => onChange({ footerText: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Italic footer text"
        />
      </div>
      <WhatsAppPreview
        message={config.bodyText}
        headerText={config.headerText}
        footerText={config.footerText}
      />
    </>
  );
}

function SendVideoConfigForm({
  config,
  onChange,
}: {
  config: SendVideoConfig;
  onChange: (c: Partial<SendVideoConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
        <input
          type="url"
          value={config.videoUrl || ''}
          onChange={(e) => onChange({ videoUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/video.mp4"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
        <input
          type="text"
          value={config.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}

function SendAudioConfigForm({
  config,
  onChange,
}: {
  config: SendAudioConfig;
  onChange: (c: Partial<SendAudioConfig>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Audio URL</label>
      <input
        type="url"
        value={config.audioUrl || ''}
        onChange={(e) => onChange({ audioUrl: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="https://example.com/audio.mp3"
      />
    </div>
  );
}

function SendDocumentConfigForm({
  config,
  onChange,
}: {
  config: SendDocumentConfig;
  onChange: (c: Partial<SendDocumentConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Document URL</label>
        <input
          type="url"
          value={config.documentUrl || ''}
          onChange={(e) => onChange({ documentUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/document.pdf"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Filename (optional)</label>
        <input
          type="text"
          value={config.filename || ''}
          onChange={(e) => onChange({ filename: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="report.pdf"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
        <input
          type="text"
          value={config.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}

function SendLocationConfigForm({
  config,
  onChange,
}: {
  config: SendLocationConfig;
  onChange: (c: Partial<SendLocationConfig>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="text"
            value={config.latitude || ''}
            onChange={(e) => onChange({ latitude: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="37.7749"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
          <input
            type="text"
            value={config.longitude || ''}
            onChange={(e) => onChange({ longitude: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="-122.4194"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name (optional)</label>
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Our Office"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
        <input
          type="text"
          value={config.address || ''}
          onChange={(e) => onChange({ address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="123 Main St, City"
        />
      </div>
    </>
  );
}

function SendContactConfigForm({
  config,
  onChange,
}: {
  config: SendContactConfig;
  onChange: (c: Partial<SendContactConfig>) => void;
}) {
  const addContact = () => {
    onChange({ contacts: [...(config.contacts || []), { name: '', phone: '' }] });
  };

  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...(config.contacts || [])];
    newContacts[index] = { ...newContacts[index], [field]: value };
    onChange({ contacts: newContacts });
  };

  const removeContact = (index: number) => {
    onChange({ contacts: config.contacts?.filter((_, i) => i !== index) || [] });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Contacts</label>
      {config.contacts?.map((contact, i) => (
        <div key={i} className="mb-3 p-3 bg-white border rounded-md space-y-2">
          <input
            type="text"
            value={contact.name}
            onChange={(e) => updateContact(i, 'name', e.target.value)}
            placeholder="Full Name"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <input
            type="text"
            value={contact.phone || ''}
            onChange={(e) => updateContact(i, 'phone', e.target.value)}
            placeholder="Phone (+1234567890)"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <input
            type="email"
            value={contact.email || ''}
            onChange={(e) => updateContact(i, 'email', e.target.value)}
            placeholder="Email (optional)"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <button onClick={() => removeContact(i)} className="text-red-500 text-sm flex items-center gap-1">
            <Trash2 size={14} /> Remove
          </button>
        </div>
      ))}
      <button onClick={addContact} className="text-sm text-blue-600 flex items-center gap-1">
        <Plus size={14} /> Add Contact
      </button>
    </div>
  );
}

function SendStickerConfigForm({
  config,
  onChange,
}: {
  config: SendStickerConfig;
  onChange: (c: Partial<SendStickerConfig>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Sticker URL</label>
      <input
        type="url"
        value={config.stickerUrl || ''}
        onChange={(e) => onChange({ stickerUrl: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="https://example.com/sticker.webp"
      />
      <p className="mt-1 text-xs text-gray-500">Must be .webp format (512x512 static or 512x512 animated)</p>
    </div>
  );
}

// User data node forms
function GetCustomerPhoneConfigForm({
  config,
  onChange,
}: {
  config: GetCustomerPhoneConfig;
  onChange: (c: Partial<GetCustomerPhoneConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="customer_phone"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
        <select
          value={config.format || 'e164'}
          onChange={(e) => onChange({ format: e.target.value as GetCustomerPhoneConfig['format'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="e164">E.164 (+14155551234)</option>
          <option value="local">Local (4155551234)</option>
          <option value="international">International (+1 415 555 1234)</option>
        </select>
      </div>
    </>
  );
}

function GetCustomerNameConfigForm({
  config,
  onChange,
}: {
  config: GetCustomerNameConfig;
  onChange: (c: Partial<GetCustomerNameConfig>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
      <input
        type="text"
        value={config.variableName || ''}
        onChange={(e) => onChange({ variableName: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="customer_name"
      />
    </div>
  );
}

function GetCustomerCountryConfigForm({
  config,
  onChange,
}: {
  config: GetCustomerCountryConfig;
  onChange: (c: Partial<GetCustomerCountryConfig>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
      <input
        type="text"
        value={config.variableName || ''}
        onChange={(e) => onChange({ variableName: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="customer_country"
      />
      <p className="mt-1 text-xs text-gray-500">Returns ISO country code (e.g., US, GB, IN)</p>
    </div>
  );
}

function GetMessageTimestampConfigForm({
  config,
  onChange,
}: {
  config: GetMessageTimestampConfig;
  onChange: (c: Partial<GetMessageTimestampConfig>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
      <input
        type="text"
        value={config.variableName || ''}
        onChange={(e) => onChange({ variableName: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="message_timestamp"
      />
    </div>
  );
}

// Utility node forms
function FormatPhoneNumberConfigForm({
  config,
  onChange,
}: {
  config: FormatPhoneNumberConfig;
  onChange: (c: Partial<FormatPhoneNumberConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source Variable</label>
        <input
          type="text"
          value={config.sourceVariable || ''}
          onChange={(e) => onChange({ sourceVariable: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="customer_phone"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="formatted_phone"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
        <select
          value={config.format || 'e164'}
          onChange={(e) => onChange({ format: e.target.value as FormatPhoneNumberConfig['format'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="e164">E.164 (+14155551234)</option>
          <option value="local">Local (4155551234)</option>
          <option value="international">International (+1 415 555 1234)</option>
        </select>
      </div>
    </>
  );
}

function RandomChoiceConfigForm({
  config,
  onChange,
}: {
  config: RandomChoiceConfig;
  onChange: (c: Partial<RandomChoiceConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Choices (comma-separated)</label>
        <input
          type="text"
          value={config.choices?.join(', ') || ''}
          onChange={(e) => onChange({ choices: e.target.value.split(',').map((c) => c.trim()) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="a, b, c"
        />
        <p className="mt-1 text-xs text-gray-500">Each choice creates an output handle for branching</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Save Choice to Variable (optional)</label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="random_choice"
        />
      </div>
    </>
  );
}

function DateTimeConfigForm({
  config,
  onChange,
}: {
  config: DateTimeConfig;
  onChange: (c: Partial<DateTimeConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="current_date"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select
          value={config.operation || 'now'}
          onChange={(e) => onChange({ operation: e.target.value as DateTimeConfig['operation'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="now">Current Date/Time</option>
          <option value="today">Today (midnight)</option>
          <option value="addDays">Add Days</option>
          <option value="addHours">Add Hours</option>
        </select>
      </div>
      {config.operation === 'addDays' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Days to Add</label>
          <input
            type="number"
            value={config.days || 0}
            onChange={(e) => onChange({ days: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      {config.operation === 'addHours' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours to Add</label>
          <input
            type="number"
            value={config.hours || 0}
            onChange={(e) => onChange({ hours: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
        <select
          value={config.format || 'iso'}
          onChange={(e) => onChange({ format: e.target.value as DateTimeConfig['format'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="iso">ISO 8601</option>
          <option value="date">Date only (YYYY-MM-DD)</option>
          <option value="time">Time only (HH:MM:SS)</option>
          <option value="timestamp">Unix timestamp</option>
          <option value="readable">Human readable</option>
        </select>
      </div>
    </>
  );
}

function MathOperationConfigForm({
  config,
  onChange,
}: {
  config: MathOperationConfig;
  onChange: (c: Partial<MathOperationConfig>) => void;
}) {
  const needsTwoValues = ['add', 'subtract', 'multiply', 'divide', 'modulo', 'min', 'max'].includes(config.operation || 'add');

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="result"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select
          value={config.operation || 'add'}
          onChange={(e) => onChange({ operation: e.target.value as MathOperationConfig['operation'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="add">Add (+)</option>
          <option value="subtract">Subtract (-)</option>
          <option value="multiply">Multiply (*)</option>
          <option value="divide">Divide (/)</option>
          <option value="modulo">Modulo (%)</option>
          <option value="round">Round</option>
          <option value="floor">Floor</option>
          <option value="ceil">Ceiling</option>
          <option value="abs">Absolute Value</option>
          <option value="min">Minimum</option>
          <option value="max">Maximum</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Value A</label>
        <input
          type="text"
          value={config.valueA || ''}
          onChange={(e) => onChange({ valueA: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="10 or {{variable}}"
        />
      </div>
      {needsTwoValues && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value B</label>
          <input
            type="text"
            value={config.valueB || ''}
            onChange={(e) => onChange({ valueB: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="5 or {{variable}}"
          />
        </div>
      )}
    </>
  );
}

function TextOperationConfigForm({
  config,
  onChange,
}: {
  config: TextOperationConfig;
  onChange: (c: Partial<TextOperationConfig>) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="result"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select
          value={config.operation || 'uppercase'}
          onChange={(e) => onChange({ operation: e.target.value as TextOperationConfig['operation'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="uppercase">UPPERCASE</option>
          <option value="lowercase">lowercase</option>
          <option value="capitalize">Capitalize</option>
          <option value="trim">Trim whitespace</option>
          <option value="length">Get length</option>
          <option value="substring">Substring</option>
          <option value="replace">Replace</option>
          <option value="split">Split to array</option>
          <option value="join">Join array</option>
          <option value="contains">Contains (true/false)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Input Text</label>
        <input
          type="text"
          value={config.text || ''}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="{{variable}} or static text"
        />
      </div>
      {config.operation === 'substring' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <input
              type="number"
              value={config.start || 0}
              onChange={(e) => onChange({ start: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
            <input
              type="number"
              value={config.end || 0}
              onChange={(e) => onChange({ end: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
      {config.operation === 'replace' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={config.search || ''}
              onChange={(e) => onChange({ search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Replace With</label>
            <input
              type="text"
              value={config.replaceWith || ''}
              onChange={(e) => onChange({ replaceWith: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}
      {(config.operation === 'split' || config.operation === 'join') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delimiter</label>
          <input
            type="text"
            value={config.delimiter || ','}
            onChange={(e) => onChange({ delimiter: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      {config.operation === 'join' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Array Variable</label>
          <input
            type="text"
            value={config.arrayVariable || ''}
            onChange={(e) => onChange({ arrayVariable: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      {config.operation === 'contains' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search For</label>
          <input
            type="text"
            value={config.search || ''}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </>
  );
}

// Stamp card config form
function SendStampCardConfigForm({
  config,
  onChange,
}: {
  config: SendStampCardConfig;
  onChange: (c: Partial<SendStampCardConfig>) => void;
}) {
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    title: string;
    total_stamps: number;
    background_color: string;
    accent_color: string;
  }>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const token = localStorage.getItem('sb-auth-token') || '';
        const response = await fetch('/api/stamp-templates', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const selectedTemplate = templates.find(t => t.id === config.templateId);
  const STAMP_SERVER_URL = config.stampServerUrl || 'https://stampgen.thepotentialcompany.com';

  return (
    <>
      {/* Template Selection Toggle */}
      <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <input
          type="checkbox"
          id="useTemplate"
          checked={config.useTemplate || false}
          onChange={(e) => onChange({ useTemplate: e.target.checked, useCustomTemplate: false })}
          className="rounded text-purple-600"
        />
        <label htmlFor="useTemplate" className="text-sm font-medium text-purple-800">
          Use saved template
        </label>
      </div>

      {config.useTemplate ? (
        <>
          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
            <select
              value={config.templateId || ''}
              onChange={(e) => onChange({ templateId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loadingTemplates}
            >
              <option value="">
                {loadingTemplates ? 'Loading...' : '-- Select a template --'}
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.total_stamps} stamps)
                </option>
              ))}
            </select>
            {templates.length === 0 && !loadingTemplates && (
              <p className="mt-1 text-xs text-gray-500">
                No templates found. <a href="/stamp-templates" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Create one</a>
              </p>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Template Preview (with 5 stamps)</p>
              <img
                src={`${STAMP_SERVER_URL}/generate-card?n=5&name=Customer&title=${encodeURIComponent(selectedTemplate.title)}&total=${selectedTemplate.total_stamps}&bg=${encodeURIComponent(selectedTemplate.background_color)}&accent=${encodeURIComponent(selectedTemplate.accent_color)}`}
                alt="Template Preview"
                className="w-full rounded shadow-sm"
                style={{ maxHeight: '150px', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Dynamic Variables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stamp Count</label>
            <input
              type="text"
              value={config.stampCount || ''}
              onChange={(e) => onChange({ stampCount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="{{stamp_count}} or 5"
            />
            <p className="mt-1 text-xs text-gray-500">Use {'{{variable}}'} for dynamic value</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={config.customerName || ''}
              onChange={(e) => onChange({ customerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="{{customer_name}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={config.caption || ''}
              onChange={(e) => onChange({ caption: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your loyalty card"
            />
          </div>
        </>
      ) : (
        <>
          {/* Manual Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stamp Server URL</label>
            <input
              type="text"
              value={config.stampServerUrl || ''}
              onChange={(e) => onChange({ stampServerUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://stampgen.thepotentialcompany.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stamp Count</label>
            <input
              type="text"
              value={config.stampCount || ''}
              onChange={(e) => onChange({ stampCount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="{{stamp_count}} or 5"
            />
            <p className="mt-1 text-xs text-gray-500">Number 0-10 or use {'{{variable}}'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={config.customerName || ''}
              onChange={(e) => onChange({ customerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="{{customer_name}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => onChange({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ORIGIN JUICE BAR (default)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (optional)</label>
            <input
              type="text"
              value={config.subtitle || ''}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Get 10 stamps to earn 1 free drink (default)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={config.caption || ''}
              onChange={(e) => onChange({ caption: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your loyalty card"
            />
          </div>

          {/* Custom template toggle */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 mt-2">
            <input
              type="checkbox"
              id="useCustomTemplate"
              checked={config.useCustomTemplate || false}
              onChange={(e) => onChange({ useCustomTemplate: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="useCustomTemplate" className="text-sm text-gray-700">
              Use custom HTML template
            </label>
          </div>

          {config.useCustomTemplate && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom HTML</label>
                <textarea
                  value={config.customHtml || ''}
                  onChange={(e) => onChange({ customHtml: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  placeholder="<!DOCTYPE html>..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use {'{{n}}'} for stamp count, {'{{name}}'} for customer name
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom CSS (optional)</label>
                <textarea
                  value={config.customStyle || ''}
                  onChange={(e) => onChange({ customStyle: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  placeholder=".card { background: #000; }"
                />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
