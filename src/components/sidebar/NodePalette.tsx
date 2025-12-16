import { type DragEvent } from 'react';
import {
  Zap,
  MessageSquare,
  Image,
  MousePointerClick,
  List,
  Clock,
  GitBranch,
  Variable,
  Globe,
  Timer,
  Repeat,
  CircleStop,
  Video,
  Music,
  FileText,
  MapPin,
  Contact,
  Sticker,
  Phone,
  User,
  Flag,
  Calendar,
  Hash,
  Type,
  Shuffle,
  Calculator,
  CheckCheck,
  MessageSquareText,
  Stamp,
} from 'lucide-react';
import type { NodeType } from '@/types/flow';

interface NodeDefinition {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  category: 'triggers' | 'messages' | 'logic' | 'actions' | 'userData' | 'utilities';
}

const nodeDefinitions: NodeDefinition[] = [
  // Triggers
  { type: 'trigger', label: 'Trigger', icon: <Zap size={18} />, color: '#22c55e', category: 'triggers' },

  // Messages
  { type: 'sendText', label: 'Send Text', icon: <MessageSquare size={18} />, color: '#3b82f6', category: 'messages' },
  { type: 'sendTextEnhanced', label: 'Text + Header/Footer', icon: <MessageSquareText size={18} />, color: '#2563eb', category: 'messages' },
  { type: 'sendImage', label: 'Send Image', icon: <Image size={18} />, color: '#8b5cf6', category: 'messages' },
  { type: 'sendVideo', label: 'Send Video', icon: <Video size={18} />, color: '#7c3aed', category: 'messages' },
  { type: 'sendAudio', label: 'Send Audio', icon: <Music size={18} />, color: '#6d28d9', category: 'messages' },
  { type: 'sendDocument', label: 'Send Document', icon: <FileText size={18} />, color: '#5b21b6', category: 'messages' },
  { type: 'sendLocation', label: 'Send Location', icon: <MapPin size={18} />, color: '#dc2626', category: 'messages' },
  { type: 'sendContact', label: 'Send Contact', icon: <Contact size={18} />, color: '#059669', category: 'messages' },
  { type: 'sendSticker', label: 'Send Sticker', icon: <Sticker size={18} />, color: '#d946ef', category: 'messages' },
  { type: 'sendButtons', label: 'Send Buttons', icon: <MousePointerClick size={18} />, color: '#f59e0b', category: 'messages' },
  { type: 'sendList', label: 'Send List', icon: <List size={18} />, color: '#ec4899', category: 'messages' },
  { type: 'sendStampCard', label: 'Send Stamp Card', icon: <Stamp size={18} />, color: '#84cc16', category: 'messages' },

  // User Data
  { type: 'getCustomerPhone', label: 'Get Phone', icon: <Phone size={18} />, color: '#0891b2', category: 'userData' },
  { type: 'getCustomerName', label: 'Get Name', icon: <User size={18} />, color: '#0d9488', category: 'userData' },
  { type: 'getCustomerCountry', label: 'Get Country', icon: <Flag size={18} />, color: '#0284c7', category: 'userData' },
  { type: 'getMessageTimestamp', label: 'Get Timestamp', icon: <Calendar size={18} />, color: '#4f46e5', category: 'userData' },

  // Logic
  { type: 'waitForReply', label: 'Wait for Reply', icon: <Clock size={18} />, color: '#06b6d4', category: 'logic' },
  { type: 'condition', label: 'Condition', icon: <GitBranch size={18} />, color: '#6366f1', category: 'logic' },
  { type: 'setVariable', label: 'Set Variable', icon: <Variable size={18} />, color: '#14b8a6', category: 'logic' },
  { type: 'loop', label: 'Loop', icon: <Repeat size={18} />, color: '#a855f7', category: 'logic' },
  { type: 'randomChoice', label: 'Random Choice', icon: <Shuffle size={18} />, color: '#be185d', category: 'logic' },

  // Utilities
  { type: 'formatPhoneNumber', label: 'Format Phone', icon: <Hash size={18} />, color: '#64748b', category: 'utilities' },
  { type: 'dateTime', label: 'Date/Time', icon: <Calendar size={18} />, color: '#475569', category: 'utilities' },
  { type: 'mathOperation', label: 'Math', icon: <Calculator size={18} />, color: '#334155', category: 'utilities' },
  { type: 'textOperation', label: 'Text Transform', icon: <Type size={18} />, color: '#1e293b', category: 'utilities' },
  { type: 'markAsRead', label: 'Mark as Read', icon: <CheckCheck size={18} />, color: '#16a34a', category: 'utilities' },

  // Actions
  { type: 'apiCall', label: 'API Call', icon: <Globe size={18} />, color: '#f97316', category: 'actions' },
  { type: 'delay', label: 'Delay', icon: <Timer size={18} />, color: '#78716c', category: 'actions' },
  { type: 'end', label: 'End', icon: <CircleStop size={18} />, color: '#6b7280', category: 'actions' },
];

const categories = [
  { id: 'triggers', label: 'Triggers' },
  { id: 'messages', label: 'Messages' },
  { id: 'userData', label: 'User Data' },
  { id: 'logic', label: 'Logic' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'actions', label: 'Actions' },
] as const;

function DraggableNode({ node }: { node: NodeDefinition }) {
  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-gray-300 hover:shadow-sm transition-all"
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
    >
      <div
        className="flex items-center justify-center w-8 h-8 rounded-md text-white"
        style={{ backgroundColor: node.color }}
      >
        {node.icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{node.label}</span>
    </div>
  );
}

export function NodePalette() {
  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Nodes
        </h2>

        {categories.map((category) => (
          <div key={category.id} className="mb-6">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {category.label}
            </h3>
            <div className="space-y-2">
              {nodeDefinitions
                .filter((node) => node.category === category.id)
                .map((node) => (
                  <DraggableNode key={node.type} node={node} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
