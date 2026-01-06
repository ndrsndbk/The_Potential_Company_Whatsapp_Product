import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  User,
  Phone,
  Calendar,
  MessageSquare,
  Loader2,
  Play,
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
} from 'lucide-react';
import { flowLogsApi, flowRunsApi, conversationsApi, type FlowLog, type DailyStats, type FlowLogStats } from '@/lib/api';
import { useChatWindowsStore } from '@/stores/chatWindowsStore';
import { ChatWindow } from '@/components/conversations/ChatWindow';

// Recipient info type
interface RecipientInfo {
  name: string | null;
  phone: string;
  date_of_birth?: string | null;
  preferences?: Record<string, unknown>;
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

// Simple line chart component
function LineChart({ data }: { data: DailyStats[] }) {
  const maxValue = Math.max(...data.map(d => d.executions), 1);
  const height = 200;
  const width = 100;
  const padding = 20;

  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const points = data.map((d, i) => ({
    x: data.length === 1 ? width / 2 : (i / (data.length - 1)) * (width - padding * 2) + padding,
    y: height - padding - (d.executions / maxValue) * (height - padding * 2),
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full h-[200px] relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={height - padding - ratio * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - ratio * (height - padding * 2)}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="url(#gradient)"
          opacity="0.3"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#25D366"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.5"
            fill="#25D366"
          />
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#25D366" />
            <stop offset="100%" stopColor="#25D366" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs text-gray-500">
        {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map((d) => (
          <span key={d.date}>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ))}
      </div>
    </div>
  );
}

export function FlowLogs() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Chat window store
  const openWindows = useChatWindowsStore((state) => state.openWindows);
  const openWindow = useChatWindowsStore((state) => state.openWindow);

  // Data states
  const [logs, setLogs] = useState<FlowLog[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [stats, setStats] = useState<FlowLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'in_progress'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Accordion states
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<FlowLog | null>(null);
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecution[]>([]);
  const [nodesLogExpanded, setNodesLogExpanded] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Chat window state
  const [chatOpen, setChatOpen] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await flowLogsApi.get(id);
      setLogs(response.logs);
      setDailyStats(response.daily_stats);
      setStats(response.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Status filter
      if (statusFilter !== 'all' && log.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        if (new Date(log.executed_at) < startDate) return false;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(log.executed_at) > endDate) return false;
      }

      return true;
    });
  }, [logs, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Handle accordion click
  const handleAccordionClick = async (log: FlowLog) => {
    if (expandedLogId === log.id) {
      setExpandedLogId(null);
      setSidebarOpen(false);
      setSelectedLog(null);
      setChatOpen(false);
    } else {
      setExpandedLogId(log.id);
      setSelectedLog(log);
      setSidebarOpen(true);
      setLoadingDetails(true);
      setChatOpen(false);

      // Try to load detailed info from API
      try {
        const { flow_run } = await flowRunsApi.get(log.id);

        // Map customer info to recipient info (API returns 'customer' not 'customer_profile')
        if (flow_run.customer) {
          setRecipientInfo({
            name: flow_run.customer.name,
            phone: flow_run.customer.phone,
            date_of_birth: flow_run.customer.dob,
            preferences: flow_run.customer.preferences,
            custom_fields: flow_run.customer.custom_fields,
            visit_count: flow_run.customer.visit_count,
            // Get last messages from conversation_messages
            last_messages: flow_run.conversation_messages?.slice(-5).map(msg => ({
              content: msg.content || '',
              direction: msg.direction,
              sent_at: msg.sent_at,
            })),
          });
        } else {
          // Fallback to basic info from log
          setRecipientInfo({
            name: log.customer_name,
            phone: log.customer_phone,
          });
        }

        // Map execution logs to node executions
        if (flow_run.execution_logs && flow_run.execution_logs.length > 0) {
          setNodeExecutions(flow_run.execution_logs.map(execLog => ({
            id: execLog.id,
            node_type: (execLog.data as Record<string, unknown>)?.node_type as string || 'action',
            node_name: (execLog.data as Record<string, unknown>)?.node_name as string || execLog.action,
            action: execLog.action,
            timestamp: execLog.created_at,
            message_content: (execLog.data as Record<string, unknown>)?.message_content as string | undefined,
            message_direction: (execLog.data as Record<string, unknown>)?.message_direction as 'inbound' | 'outbound' | undefined,
            error: (execLog.data as Record<string, unknown>)?.error as string | undefined,
            duration_ms: (execLog.data as Record<string, unknown>)?.duration_ms as number | undefined,
          })));
        } else {
          setNodeExecutions([]);
        }
      } catch (err) {
        console.error('Failed to load run details:', err);
        // Fallback to basic info from log
        setRecipientInfo({
          name: log.customer_name,
          phone: log.customer_phone,
        });
        setNodeExecutions([]);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  // Close sidebar
  const closeSidebar = () => {
    setSidebarOpen(false);
    setExpandedLogId(null);
    setSelectedLog(null);
    setChatOpen(false);
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

  const getStatusBadge = (status: FlowLog['status']) => {
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

  const openChat = async () => {
    if (!selectedLog || chatOpen) return;

    setLoadingChat(true);
    try {
      // Search for conversation by phone number
      const { conversations } = await conversationsApi.list({ limit: 100 });
      const conversation = conversations.find(
        (c) => c.contact_phone === selectedLog.customer_phone
      );

      if (conversation) {
        openWindow(conversation);
        setChatOpen(true);
      } else {
        // No conversation found, open conversations page with filter
        navigate(`/conversations?phone=${encodeURIComponent(selectedLog.customer_phone)}`);
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
      // Fallback to navigation
      navigate(`/conversations?phone=${encodeURIComponent(selectedLog.customer_phone)}`);
    } finally {
      setLoadingChat(false);
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
              onClick={() => navigate(`/editor/${id}`)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Flow Analytics</h1>
              <p className="text-sm text-white/70">
                {filteredLogs.length} execution{filteredLogs.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#DCF8C6] rounded-lg">
                  <Activity size={20} className="text-[#075E54]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Executions</p>
                  <p className="text-2xl font-bold text-[#075E54]">{stats?.total ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#DCF8C6] rounded-lg">
                  <CheckCircle2 size={20} className="text-[#25D366]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold text-[#25D366]">{stats?.success_rate ?? '0'}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.failed ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#DCF8C6] rounded-lg">
                  <Clock size={20} className="text-[#128C7E]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Duration</p>
                  <p className="text-2xl font-bold text-[#128C7E]">
                    {stats?.avg_duration_ms ? (stats.avg_duration_ms / 1000).toFixed(2) : '0'}s
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#DCF8C6] rounded-lg">
                  <Users size={20} className="text-[#075E54]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unique Users</p>
                  <p className="text-2xl font-bold text-[#075E54]">{stats?.unique_customers ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-[#25D366]" />
              <h2 className="text-lg font-semibold text-[#075E54]">Execution Trends (Last 14 Days)</h2>
            </div>
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <LineChart data={dailyStats} />
            )}
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
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

          {/* Execution Logs List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#075E54]">Execution Logs</h2>
            </div>

            {loading && logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="mx-auto mb-2 animate-spin text-[#25D366]" size={32} />
                <p>Loading execution logs...</p>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="mx-auto mb-2 text-[#128C7E]/30" size={48} />
                <p className="font-medium">No execution logs found</p>
                <p className="text-sm mt-1">
                  {statusFilter !== 'all' || dateRange.start || dateRange.end
                    ? 'Try adjusting your filters'
                    : 'Logs will appear here when customers interact with this flow'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginatedLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`transition-colors ${expandedLogId === log.id ? 'bg-[#25D366]/5' : ''}`}
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => handleAccordionClick(log)}
                      className="w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Expand Icon */}
                      <div className="flex-shrink-0 text-gray-400">
                        {expandedLogId === log.id ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </div>

                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {log.customer_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {log.customer_phone}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(log.status)}
                      </div>

                      {/* Executed At */}
                      <div className="flex-shrink-0 text-right hidden sm:block">
                        <p className="text-sm text-gray-600">{formatDate(log.executed_at)}</p>
                      </div>

                      {/* Duration */}
                      <div className="flex-shrink-0 w-20 text-right hidden md:block">
                        <p className="text-sm text-gray-600">{formatDuration(log.duration_ms)}</p>
                      </div>

                      {/* Nodes Executed */}
                      <div className="flex-shrink-0 w-16 text-right hidden lg:block">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Activity size={14} />
                          {log.nodes_executed}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Content (Summary) */}
                    {expandedLogId === log.id && (
                      <div className="px-4 pb-4 pl-12 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">{log.customer_phone}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Executed</p>
                            <p className="font-medium text-gray-900">{formatFullDate(log.executed_at)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium text-gray-900">{formatDuration(log.duration_ms)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Nodes Executed</p>
                            <p className="font-medium text-gray-900">{log.nodes_executed} nodes</p>
                          </div>
                        </div>
                        {log.error_message && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                            <p className="text-sm text-red-700">
                              <strong>Error:</strong> {log.error_message}
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
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
        {selectedLog && (
          <>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#075E54]">
              <h2 className="text-lg font-semibold text-white">Execution Details</h2>
              <button
                onClick={closeSidebar}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingDetails ? (
                <div className="p-8 text-center">
                  <Loader2 size={32} className="animate-spin text-[#25D366] mx-auto mb-2" />
                  <p className="text-gray-500">Loading details...</p>
                </div>
              ) : (
                <>
                  {/* Recipient Info Section */}
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Recipient Info
                    </h3>

                    <div className="space-y-3">
                      {/* Name */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${recipientInfo?.name ? 'bg-[#DCF8C6]' : 'bg-gray-100'}`}>
                          <User size={20} className={recipientInfo?.name ? 'text-[#075E54]' : 'text-gray-400'} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className={`font-medium ${recipientInfo?.name ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                            {recipientInfo?.name || 'Not available'}
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
                          <p className="font-medium text-gray-900">{recipientInfo?.phone}</p>
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${recipientInfo?.date_of_birth ? 'bg-pink-100' : 'bg-gray-100'}`}>
                          <Cake size={20} className={recipientInfo?.date_of_birth ? 'text-pink-600' : 'text-gray-400'} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className={`font-medium ${recipientInfo?.date_of_birth ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                            {recipientInfo?.date_of_birth
                              ? new Date(recipientInfo.date_of_birth).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Not available'}
                          </p>
                        </div>
                      </div>

                      {/* Preferences */}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${recipientInfo?.preferences && Object.keys(recipientInfo.preferences).length > 0 ? 'bg-purple-100' : 'bg-gray-100'}`}>
                          <Star size={20} className={recipientInfo?.preferences && Object.keys(recipientInfo.preferences).length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 mb-1">Preferences</p>
                          {recipientInfo?.preferences && Object.keys(recipientInfo.preferences).length > 0 ? (
                            <div className="space-y-1">
                              {Object.entries(recipientInfo.preferences).map(([key, value]) => (
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
                          ) : (
                            <p className="text-gray-400 italic text-sm">Not available</p>
                          )}
                        </div>
                      </div>

                      {/* Custom Fields */}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${recipientInfo?.custom_fields && Object.keys(recipientInfo.custom_fields).length > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                          <Hash size={20} className={recipientInfo?.custom_fields && Object.keys(recipientInfo.custom_fields).length > 0 ? 'text-orange-600' : 'text-gray-400'} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 mb-1">Custom Fields</p>
                          {recipientInfo?.custom_fields && Object.keys(recipientInfo.custom_fields).length > 0 ? (
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
                          ) : (
                            <p className="text-gray-400 italic text-sm">Not available</p>
                          )}
                        </div>
                      </div>

                      {/* Visit Count */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${recipientInfo?.visit_count !== undefined ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Eye size={20} className={recipientInfo?.visit_count !== undefined ? 'text-green-600' : 'text-gray-400'} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Visit Count</p>
                          <p className={`font-medium ${recipientInfo?.visit_count !== undefined ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                            {recipientInfo?.visit_count !== undefined ? `${recipientInfo.visit_count} visits` : 'Not available'}
                          </p>
                        </div>
                      </div>

                      {/* Last Messages Preview */}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${recipientInfo?.last_messages && recipientInfo.last_messages.length > 0 ? 'bg-[#DCF8C6]' : 'bg-gray-100'}`}>
                          <MessageCircle size={20} className={recipientInfo?.last_messages && recipientInfo.last_messages.length > 0 ? 'text-[#075E54]' : 'text-gray-400'} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 mb-2">Recent Messages</p>
                          {recipientInfo?.last_messages && recipientInfo.last_messages.length > 0 ? (
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
                          ) : (
                            <p className="text-gray-400 italic text-sm">Not available</p>
                          )}
                        </div>
                      </div>
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
                        {nodeExecutions.length === 0 ? (
                          <div className="text-center text-gray-400 py-4">
                            <Activity size={24} className="mx-auto mb-2" />
                            <p className="text-sm">No execution logs available</p>
                          </div>
                        ) : (
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
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={openChat}
                disabled={loadingChat || chatOpen}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors ${
                  chatOpen
                    ? 'bg-gray-200 text-gray-500 cursor-default'
                    : 'bg-[#25D366] text-white hover:bg-[#20BD5A]'
                } disabled:opacity-70`}
              >
                {loadingChat ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Loading Chat...
                  </>
                ) : chatOpen ? (
                  <>
                    <MessageCircle size={18} />
                    Chat Open
                  </>
                ) : (
                  <>
                    <ExternalLink size={18} />
                    Open Chat
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Chat Windows - positioned to the left of sidebar */}
      {chatOpen && openWindows.length > 0 && (
        <div className="fixed bottom-0 right-[416px] flex items-end gap-2 p-4 pointer-events-none z-30">
          {openWindows.map((window) => (
            <ChatWindow key={window.id} window={window} />
          ))}
        </div>
      )}

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
