import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  X,
  User,
  Phone,
  Calendar,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  AlertCircle,
  Activity,
  Filter,
  Send,
  ArrowRight,
  Cake,
  Star,
  Hash,
  Eye,
  MessageCircle,
  Zap,
  GitBranch,
  Bot,
  Settings,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { flowsApi, flowLogsApi, type Flow, type FlowLog } from '@/lib/api';

// Extended flow run type with additional details
interface FlowRun extends FlowLog {
  flow_id: string;
  flow_name: string;
}

// Recipient info type
interface RecipientInfo {
  name: string | null;
  phone: string;
  date_of_birth?: string | null;
  preferences?: string[];
  custom_fields?: Record<string, unknown>;
  visit_count?: number;
  last_messages?: { content: string; direction: 'inbound' | 'outbound'; sent_at: string }[];
}

// Node execution log type
interface NodeExecution {
  id: string;
  node_type: string;
  node_name: string;
  action: string;
  timestamp: string;
  message_content?: string;
  message_direction?: 'inbound' | 'outbound';
  error?: string;
  duration_ms?: number;
}

// Mock data for demonstration (in production, this would come from API)
const generateMockNodeExecutions = (flowRunId: string): NodeExecution[] => {
  const baseTime = new Date();
  return [
    {
      id: `${flowRunId}-1`,
      node_type: 'trigger',
      node_name: 'Message Received',
      action: 'Triggered by incoming message',
      timestamp: new Date(baseTime.getTime() - 5000).toISOString(),
      message_content: 'Hello, I want to check my order status',
      message_direction: 'inbound',
    },
    {
      id: `${flowRunId}-2`,
      node_type: 'condition',
      node_name: 'Check Intent',
      action: 'Evaluated condition: contains "order"',
      timestamp: new Date(baseTime.getTime() - 4500).toISOString(),
      duration_ms: 50,
    },
    {
      id: `${flowRunId}-3`,
      node_type: 'api',
      node_name: 'Fetch Order',
      action: 'API call to order service',
      timestamp: new Date(baseTime.getTime() - 4000).toISOString(),
      duration_ms: 800,
    },
    {
      id: `${flowRunId}-4`,
      node_type: 'message',
      node_name: 'Send Response',
      action: 'Sent order status message',
      timestamp: new Date(baseTime.getTime() - 3000).toISOString(),
      message_content: 'Your order #12345 is on its way! Expected delivery: Tomorrow by 5 PM.',
      message_direction: 'outbound',
    },
  ];
};

const generateMockRecipientInfo = (phone: string, name: string | null): RecipientInfo => ({
  name,
  phone,
  date_of_birth: Math.random() > 0.5 ? '1990-05-15' : null,
  preferences: Math.random() > 0.3 ? ['Email notifications', 'SMS updates', 'Weekly digest'] : undefined,
  custom_fields: {
    loyalty_tier: 'Gold',
    account_id: 'ACC-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    region: 'Southeast Asia',
  },
  visit_count: Math.floor(Math.random() * 50) + 1,
  last_messages: [
    { content: 'Thanks for your help!', direction: 'inbound', sent_at: new Date(Date.now() - 86400000).toISOString() },
    { content: 'You\'re welcome! Let us know if you need anything else.', direction: 'outbound', sent_at: new Date(Date.now() - 86400000 + 60000).toISOString() },
  ],
});

export function FlowRuns() {
  const navigate = useNavigate();

  // Data states
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowRuns, setFlowRuns] = useState<FlowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'in_progress'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Accordion states
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<FlowRun | null>(null);
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecution[]>([]);
  const [nodesLogExpanded, setNodesLogExpanded] = useState(true);

  useEffect(() => {
    loadFlows();
  }, []);

  useEffect(() => {
    loadFlowRuns();
  }, [selectedFlowId]);

  const loadFlows = async () => {
    try {
      const { flows } = await flowsApi.list();
      setFlows(flows);
    } catch (err) {
      console.error('Failed to load flows:', err);
    }
  };

  const loadFlowRuns = async () => {
    setLoading(true);
    setError(null);

    try {
      // If a flow is selected, load logs for that flow
      // Otherwise, load logs from all flows
      const allRuns: FlowRun[] = [];

      if (selectedFlowId) {
        const response = await flowLogsApi.get(selectedFlowId);
        const flow = flows.find(f => f.id === selectedFlowId);
        allRuns.push(
          ...response.logs.map(log => ({
            ...log,
            flow_id: selectedFlowId,
            flow_name: flow?.name || 'Unknown Flow',
          }))
        );
      } else {
        // Load logs from all flows (limited for performance)
        const flowPromises = flows.slice(0, 10).map(async (flow) => {
          try {
            const response = await flowLogsApi.get(flow.id, 50, 0);
            return response.logs.map(log => ({
              ...log,
              flow_id: flow.id,
              flow_name: flow.name,
            }));
          } catch {
            return [];
          }
        });

        const results = await Promise.all(flowPromises);
        results.forEach(logs => allRuns.push(...logs));
      }

      // Sort by execution time (newest first)
      allRuns.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());

      setFlowRuns(allRuns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flow runs');
    } finally {
      setLoading(false);
    }
  };

  // Filter flow runs
  const filteredRuns = useMemo(() => {
    return flowRuns.filter(run => {
      // Status filter
      if (statusFilter !== 'all' && run.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        if (new Date(run.executed_at) < startDate) return false;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(run.executed_at) > endDate) return false;
      }

      return true;
    });
  }, [flowRuns, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);
  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRuns.slice(start, start + itemsPerPage);
  }, [filteredRuns, currentPage, itemsPerPage]);

  // Handle accordion click
  const handleAccordionClick = (run: FlowRun) => {
    if (expandedRunId === run.id) {
      setExpandedRunId(null);
      setSidebarOpen(false);
      setSelectedRun(null);
    } else {
      setExpandedRunId(run.id);
      setSelectedRun(run);
      setSidebarOpen(true);

      // Load recipient info and node executions (mock data for now)
      setRecipientInfo(generateMockRecipientInfo(run.customer_phone, run.customer_name));
      setNodeExecutions(generateMockNodeExecutions(run.id));
    }
  };

  // Close sidebar
  const closeSidebar = () => {
    setSidebarOpen(false);
    setExpandedRunId(null);
    setSelectedRun(null);
  };

  // Format helpers
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusBadge = (status: FlowRun['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#075E54] bg-[#DCF8C6] rounded-full">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
            <XCircle size={12} />
            Failed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#128C7E] bg-[#DCF8C6]/50 rounded-full">
            <Loader2 size={12} className="animate-spin" />
            Running
          </span>
        );
    }
  };

  const getNodeTypeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'trigger':
        return <Play size={14} className="text-blue-500" />;
      case 'message':
        return <MessageSquare size={14} className="text-green-500" />;
      case 'condition':
        return <GitBranch size={14} className="text-purple-500" />;
      case 'api':
        return <Zap size={14} className="text-orange-500" />;
      case 'ai':
        return <Bot size={14} className="text-indigo-500" />;
      case 'action':
        return <Settings size={14} className="text-gray-500" />;
      default:
        return <Activity size={14} className="text-gray-500" />;
    }
  };

  const openChat = () => {
    if (selectedRun) {
      // Navigate to conversation (in production, this would find the conversation by phone)
      navigate(`/conversations?phone=${encodeURIComponent(selectedRun.customer_phone)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECE5DD] flex">
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-[400px]' : ''}`}>
        {/* Header */}
        <header className="bg-[#075E54]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Flow Runs</h1>
              <p className="text-sm text-white/70">
                {filteredRuns.length} execution{filteredRuns.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={loadFlowRuns}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Filters Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Flow Selector */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={selectedFlowId}
                  onChange={(e) => {
                    setSelectedFlowId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#25D366] min-w-[200px]"
                >
                  <option value="">All Flows</option>
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-white text-[#075E54] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                    statusFilter === 'completed'
                      ? 'bg-white text-[#075E54] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  Completed
                </button>
                <button
                  onClick={() => { setStatusFilter('failed'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                    statusFilter === 'failed'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <XCircle size={14} />
                  Failed
                </button>
                <button
                  onClick={() => { setStatusFilter('in_progress'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                    statusFilter === 'in_progress'
                      ? 'bg-white text-[#128C7E] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Loader2 size={14} />
                  Running
                </button>
              </div>

              {/* Date Range Picker */}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#25D366]"
                  placeholder="Start Date"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#25D366]"
                  placeholder="End Date"
                />
                {(dateRange.start || dateRange.end) && (
                  <button
                    onClick={() => {
                      setDateRange({ start: '', end: '' });
                      setCurrentPage(1);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Clear date filter"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Flow Runs List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading && flowRuns.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="mx-auto mb-2 animate-spin text-[#25D366]" size={32} />
                <p>Loading flow runs...</p>
              </div>
            ) : paginatedRuns.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="mx-auto mb-2 text-[#128C7E]/30" size={48} />
                <p className="font-medium">No flow runs found</p>
                <p className="text-sm mt-1">
                  {selectedFlowId || statusFilter !== 'all' || dateRange.start || dateRange.end
                    ? 'Try adjusting your filters'
                    : 'Flow runs will appear here when flows are executed'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginatedRuns.map((run) => (
                  <div
                    key={run.id}
                    className={`transition-colors ${expandedRunId === run.id ? 'bg-[#25D366]/5' : ''}`}
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => handleAccordionClick(run)}
                      className="w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Expand Icon */}
                      <div className="flex-shrink-0 text-gray-400">
                        {expandedRunId === run.id ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </div>

                      {/* Flow Name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{run.flow_name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {run.customer_name || run.customer_phone}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(run.status)}
                      </div>

                      {/* Started At */}
                      <div className="flex-shrink-0 text-right hidden sm:block">
                        <p className="text-sm text-gray-600">{formatDate(run.executed_at)}</p>
                      </div>

                      {/* Duration */}
                      <div className="flex-shrink-0 w-20 text-right hidden md:block">
                        <p className="text-sm text-gray-600">{formatDuration(run.duration_ms)}</p>
                      </div>

                      {/* Nodes Executed */}
                      <div className="flex-shrink-0 w-16 text-right hidden lg:block">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Activity size={14} />
                          {run.nodes_executed}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Content (Summary) */}
                    {expandedRunId === run.id && (
                      <div className="px-4 pb-4 pl-12 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">{run.customer_phone}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Started</p>
                            <p className="font-medium text-gray-900">{formatFullDate(run.executed_at)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium text-gray-900">{formatDuration(run.duration_ms)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Nodes Executed</p>
                            <p className="font-medium text-gray-900">{run.nodes_executed} nodes</p>
                          </div>
                        </div>
                        {run.error_message && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                            <p className="text-sm text-red-700">
                              <strong>Error:</strong> {run.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRuns.length)} of {filteredRuns.length} runs
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#25D366] text-white'
                            : 'text-gray-600 hover:bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Right Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl transform transition-transform duration-300 z-20 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedRun && recipientInfo && (
          <>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#075E54]">
              <h2 className="text-lg font-semibold text-white">Run Details</h2>
              <button
                onClick={closeSidebar}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Recipient Info Section */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Recipient Info
                </h3>

                <div className="space-y-3">
                  {/* Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#DCF8C6] flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-[#075E54]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium text-gray-900">
                        {recipientInfo.name || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Phone size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{recipientInfo.phone}</p>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  {recipientInfo.date_of_birth && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <Cake size={20} className="text-pink-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="font-medium text-gray-900">
                          {new Date(recipientInfo.date_of_birth).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Preferences */}
                  {recipientInfo.preferences && recipientInfo.preferences.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Star size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Preferences</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recipientInfo.preferences.map((pref, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full"
                            >
                              {pref}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Fields */}
                  {recipientInfo.custom_fields && Object.keys(recipientInfo.custom_fields).length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Hash size={20} className="text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">Custom Fields</p>
                        <div className="space-y-1">
                          {Object.entries(recipientInfo.custom_fields).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-gray-600 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="font-medium text-gray-900">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visit Count */}
                  {recipientInfo.visit_count !== undefined && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Eye size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Visit Count</p>
                        <p className="font-medium text-gray-900">
                          {recipientInfo.visit_count} visits
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Last Messages Preview */}
                  {recipientInfo.last_messages && recipientInfo.last_messages.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <MessageCircle size={20} className="text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">Recent Messages</p>
                        <div className="space-y-2">
                          {recipientInfo.last_messages.slice(0, 3).map((msg, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded-lg text-sm ${
                                msg.direction === 'inbound'
                                  ? 'bg-white border border-gray-200'
                                  : 'bg-[#DCF8C6]'
                              }`}
                            >
                              <p className="text-gray-900">{msg.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(msg.sent_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Flow Nodes Log Section */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setNodesLogExpanded(!nodesLogExpanded)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Flow Nodes Log
                  </h3>
                  {nodesLogExpanded ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </button>

                {nodesLogExpanded && (
                  <div className="px-4 pb-4">
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                      {/* Timeline items */}
                      <div className="space-y-4">
                        {nodeExecutions.map((node) => (
                          <div key={node.id} className="relative flex gap-3">
                            {/* Icon */}
                            <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                              {getNodeTypeIcon(node.node_type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-gray-900 truncate">
                                  {node.node_name}
                                </p>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {formatDate(node.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{node.action}</p>

                              {node.duration_ms !== undefined && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Duration: {formatDuration(node.duration_ms)}
                                </p>
                              )}

                              {/* Message Content */}
                              {node.message_content && (
                                <div
                                  className={`mt-2 p-2 rounded-lg text-sm ${
                                    node.message_direction === 'inbound'
                                      ? 'bg-white border border-gray-200'
                                      : 'bg-[#DCF8C6]'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                    {node.message_direction === 'inbound' ? (
                                      <>
                                        <ArrowRight size={12} />
                                        Inbound
                                      </>
                                    ) : (
                                      <>
                                        <Send size={12} />
                                        Outbound
                                      </>
                                    )}
                                  </div>
                                  <p className="text-gray-900">{node.message_content}</p>
                                </div>
                              )}

                              {/* Error Message */}
                              {node.error && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                                  <p className="text-sm text-red-700">{node.error}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={openChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#20BD5A] transition-colors"
              >
                <ExternalLink size={18} />
                Open Chat
              </button>
            </div>
          </>
        )}
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 lg:hidden"
          onClick={closeSidebar}
        />
      )}
    </div>
  );
}

export default FlowRuns;
