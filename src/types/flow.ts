import type { Node, Edge, BuiltInNode } from '@xyflow/react';

// Node types
export type NodeType =
  | 'trigger'
  | 'sendText'
  | 'sendImage'
  | 'sendButtons'
  | 'sendList'
  | 'waitForReply'
  | 'condition'
  | 'setVariable'
  | 'apiCall'
  | 'delay'
  | 'loop'
  | 'end'
  // New send message nodes
  | 'sendTextEnhanced'
  | 'sendVideo'
  | 'sendAudio'
  | 'sendDocument'
  | 'sendLocation'
  | 'sendContact'
  | 'sendSticker'
  // User data nodes
  | 'getCustomerPhone'
  | 'getCustomerName'
  | 'getCustomerCountry'
  | 'getMessageTimestamp'
  // Utility nodes
  | 'formatPhoneNumber'
  | 'randomChoice'
  | 'dateTime'
  | 'mathOperation'
  | 'textOperation'
  | 'markAsRead'
  // Stamp card
  | 'sendStampCard';

// Node configurations
export interface TriggerConfig {
  keywords: string[];
  caseSensitive: boolean;
}

export interface SendTextConfig {
  message: string;
}

export interface SendImageConfig {
  imageUrl: string;
  caption: string;
}

export interface ButtonItem {
  id: string;
  title: string;
}

export interface SendButtonsConfig {
  bodyText: string;
  headerText?: string;
  footerText?: string;
  buttons: ButtonItem[];
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface SendListConfig {
  bodyText: string;
  buttonText: string;
  sections: ListSection[];
}

export interface WaitForReplyConfig {
  variableName: string;
  expectedType: 'text' | 'button' | 'list' | 'image' | 'any';
  timeoutSeconds?: number;
}

export interface ConditionRule {
  variable: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'regex' | 'exists' | 'not_exists';
  value: string;
  outputHandle: string;
}

export interface ConditionConfig {
  conditions: ConditionRule[];
  defaultHandle: string;
  showDefaultHandle?: boolean;
}

export interface VariableAssignment {
  variableName: string;
  valueType: 'static' | 'expression' | 'from_variable';
  value: string;
}

export interface SetVariableConfig {
  assignments: VariableAssignment[];
}

export interface ResponseMapping {
  jsonPath: string;
  variableName: string;
}

export interface ApiCallConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: string;
  responseMapping: ResponseMapping[];
  timeoutMs: number;
}

export interface DelayConfig {
  delaySeconds: number;
}

export interface LoopConfig {
  loopType: 'count' | 'while' | 'foreach';
  maxIterations: number;
  collection?: string;
  itemVariable?: string;
}

export interface EndConfig {
  endType: 'complete' | 'error';
}

// New send message configs
export interface SendTextEnhancedConfig {
  bodyText: string;
  headerText?: string;
  footerText?: string;
}

export interface SendVideoConfig {
  videoUrl: string;
  caption?: string;
}

export interface SendAudioConfig {
  audioUrl: string;
}

export interface SendDocumentConfig {
  documentUrl: string;
  filename?: string;
  caption?: string;
}

export interface SendLocationConfig {
  latitude: string;
  longitude: string;
  name?: string;
  address?: string;
}

export interface ContactItem {
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface SendContactConfig {
  contacts: ContactItem[];
}

export interface SendStickerConfig {
  stickerUrl: string;
}

// User data configs
export interface GetCustomerPhoneConfig {
  variableName: string;
  format: 'e164' | 'local' | 'international';
}

export interface GetCustomerNameConfig {
  variableName: string;
}

export interface GetCustomerCountryConfig {
  variableName: string;
}

export interface GetMessageTimestampConfig {
  variableName: string;
}

// Utility configs
export interface FormatPhoneNumberConfig {
  sourceVariable: string;
  variableName: string;
  format: 'e164' | 'local' | 'international';
}

export interface RandomChoiceConfig {
  choices: string[];
  variableName?: string;
}

export interface DateTimeConfig {
  variableName: string;
  operation: 'now' | 'today' | 'addDays' | 'addHours';
  format: 'iso' | 'date' | 'time' | 'timestamp' | 'readable';
  days?: number;
  hours?: number;
}

export interface MathOperationConfig {
  variableName: string;
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'modulo' | 'round' | 'floor' | 'ceil' | 'abs' | 'min' | 'max';
  valueA: string;
  valueB?: string;
}

export interface TextOperationConfig {
  variableName: string;
  operation: 'uppercase' | 'lowercase' | 'trim' | 'length' | 'substring' | 'replace' | 'split' | 'join' | 'capitalize' | 'contains';
  text: string;
  start?: number;
  end?: number;
  search?: string;
  replaceWith?: string;
  delimiter?: string;
  arrayVariable?: string;
}

export interface MarkAsReadConfig {
  // No config needed, already handled by webhook
}

// Stamp card config
export interface SendStampCardConfig {
  stampServerUrl: string;
  stampCount: string; // Can use {{variable}}
  customerName: string; // Can use {{variable}}
  title?: string; // Optional title override
  subtitle?: string; // Optional subtitle override
  useCustomTemplate: boolean;
  customHtml?: string; // Full HTML template when useCustomTemplate is true
  customStyle?: string; // Additional CSS styles
  caption?: string; // WhatsApp image caption
  // Template selection
  templateId?: string; // Selected template ID
  useTemplate: boolean; // Whether to use a saved template
}

export type NodeConfig =
  | TriggerConfig
  | SendTextConfig
  | SendImageConfig
  | SendButtonsConfig
  | SendListConfig
  | WaitForReplyConfig
  | ConditionConfig
  | SetVariableConfig
  | ApiCallConfig
  | DelayConfig
  | LoopConfig
  | EndConfig
  | SendTextEnhancedConfig
  | SendVideoConfig
  | SendAudioConfig
  | SendDocumentConfig
  | SendLocationConfig
  | SendContactConfig
  | SendStickerConfig
  | GetCustomerPhoneConfig
  | GetCustomerNameConfig
  | GetCustomerCountryConfig
  | GetMessageTimestampConfig
  | FormatPhoneNumberConfig
  | RandomChoiceConfig
  | DateTimeConfig
  | MathOperationConfig
  | TextOperationConfig
  | MarkAsReadConfig
  | SendStampCardConfig;

// Flow node data - must extend Record<string, unknown> for React Flow
export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  config: NodeConfig;
}

// Custom node types for React Flow
export type TriggerNodeType = Node<FlowNodeData, 'trigger'>;
export type SendTextNodeType = Node<FlowNodeData, 'sendText'>;
export type SendImageNodeType = Node<FlowNodeData, 'sendImage'>;
export type SendButtonsNodeType = Node<FlowNodeData, 'sendButtons'>;
export type SendListNodeType = Node<FlowNodeData, 'sendList'>;
export type WaitForReplyNodeType = Node<FlowNodeData, 'waitForReply'>;
export type ConditionNodeType = Node<FlowNodeData, 'condition'>;
export type SetVariableNodeType = Node<FlowNodeData, 'setVariable'>;
export type ApiCallNodeType = Node<FlowNodeData, 'apiCall'>;
export type DelayNodeType = Node<FlowNodeData, 'delay'>;
export type LoopNodeType = Node<FlowNodeData, 'loop'>;
export type EndNodeType = Node<FlowNodeData, 'end'>;

export type FlowNode =
  | TriggerNodeType
  | SendTextNodeType
  | SendImageNodeType
  | SendButtonsNodeType
  | SendListNodeType
  | WaitForReplyNodeType
  | ConditionNodeType
  | SetVariableNodeType
  | ApiCallNodeType
  | DelayNodeType
  | LoopNodeType
  | EndNodeType
  | BuiltInNode;

export type FlowEdge = Edge;

// Flow definition
export interface Flow {
  id: string;
  name: string;
  description?: string;
  whatsappConfigId?: string;
  isActive: boolean;
  isPublished: boolean;
  triggerType: 'keyword' | 'any_message';
  triggerValue?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// WhatsApp config
export interface WhatsAppConfig {
  id: string;
  name: string;
  phoneNumberId: string;
  phoneNumber: string;
  accessToken: string;
  verifyToken: string;
  isActive: boolean;
  createdAt: string;
}
