import { type DragEvent, useState, useMemo } from 'react';
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
  ChevronRight,
  Search,
  X,
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
  { id: 'triggers', label: 'Triggers', icon: <Zap size={16} />, color: '#22c55e' },
  { id: 'messages', label: 'Messages', icon: <MessageSquare size={16} />, color: '#3b82f6' },
  { id: 'userData', label: 'User Data', icon: <User size={16} />, color: '#0891b2' },
  { id: 'logic', label: 'Logic', icon: <GitBranch size={16} />, color: '#6366f1' },
  { id: 'utilities', label: 'Utilities', icon: <Calculator size={16} />, color: '#64748b' },
  { id: 'actions', label: 'Actions', icon: <Globe size={16} />, color: '#f97316' },
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
        className="flex items-center justify-center w-7 h-7 rounded-md text-white flex-shrink-0"
        style={{ backgroundColor: node.color }}
      >
        {node.icon}
      </div>
      <span className="text-sm font-medium text-gray-700 truncate">{node.label}</span>
    </div>
  );
}

interface AccordionProps {
  category: typeof categories[number];
  nodes: NodeDefinition[];
  isOpen: boolean;
  onToggle: () => void;
}

function CategoryAccordion({ category, nodes, isOpen, onToggle }: AccordionProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-6 h-6 rounded text-white"
            style={{ backgroundColor: category.color }}
          >
            {category.icon}
          </div>
          <span className="text-sm font-medium text-gray-700">{category.label}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {nodes.length}
          </span>
        </div>
        <ChevronRight
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-6 pr-1 pb-2 pt-1 space-y-1.5">
            {nodes.map((node) => (
              <DraggableNode key={node.type} node={node} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NodePalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['triggers', 'messages', 'logic'])
  );

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodeDefinitions;
    const query = searchQuery.toLowerCase();
    return nodeDefinitions.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Nodes</h2>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {hasSearchQuery ? (
          // Show flat list when searching
          filteredNodes.length > 0 ? (
            <div className="space-y-1.5">
              {filteredNodes.map((node) => (
                <DraggableNode key={node.type} node={node} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              No nodes found for "{searchQuery}"
            </div>
          )
        ) : (
          // Show accordions when not searching
          categories.map((category) => {
            const categoryNodes = filteredNodes.filter(
              (node) => node.category === category.id
            );
            return (
              <CategoryAccordion
                key={category.id}
                category={category}
                nodes={categoryNodes}
                isOpen={expandedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
