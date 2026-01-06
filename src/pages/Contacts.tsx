import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  Archive,
  Columns,
  Send,
  X,
  Check,
  ChevronDown,
  Minus,
} from 'lucide-react';
import { conversationsApi, configsApi } from '@/lib/api';
import type { Conversation, WhatsAppConfig } from '@/lib/api';

// Column definition type
interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
}

// Default columns configuration
const defaultColumns: ColumnDef[] = [
  { id: 'select', label: 'Select', visible: true },
  { id: 'contact', label: 'Contact', visible: true },
  { id: 'phone', label: 'Phone', visible: true },
  { id: 'lastMessage', label: 'Last Message', visible: true },
  { id: 'lastMessageAt', label: 'Last Activity', visible: true },
  { id: 'windowStatus', label: 'Window Status', visible: true },
  { id: 'unreadCount', label: 'Unread', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'config', label: 'Config', visible: false },
];

export function Contacts() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('all');
  const [configFilter, setConfigFilter] = useState<string>('');
  const [windowFilter, setWindowFilter] = useState<'all' | 'in_window' | 'outside_window'>('all');

  // Column visibility
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState<'none' | 'some' | 'all'>('none');

  // Bulk message modal
  const [showBulkMessage, setShowBulkMessage] = useState(false);
  const [bulkMessageText, setBulkMessageText] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, [statusFilter, configFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [statusFilter, configFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadConversations(), loadConfigs()]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { conversations } = await conversationsApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        config_id: configFilter || undefined,
        limit: 500,
      });
      setConversations(conversations);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const { configs } = await configsApi.list();
      setConfigs(configs);
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  };

  // Apply all filters
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          conv.contact_phone.toLowerCase().includes(query) ||
          (conv.contact_name?.toLowerCase().includes(query) ?? false) ||
          (conv.last_message_preview?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // Window status filter
      if (windowFilter === 'in_window' && !conv.in_free_window) return false;
      if (windowFilter === 'outside_window' && conv.in_free_window) return false;

      return true;
    });
  }, [conversations, searchQuery, windowFilter]);

  // Handle selection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    updateSelectAllState(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectAll === 'all') {
      setSelectedIds(new Set());
      setSelectAll('none');
    } else {
      const allIds = new Set(filteredConversations.map((c) => c.id));
      setSelectedIds(allIds);
      setSelectAll('all');
    }
  };

  const updateSelectAllState = (selected: Set<string>) => {
    if (selected.size === 0) {
      setSelectAll('none');
    } else if (selected.size === filteredConversations.length) {
      setSelectAll('all');
    } else {
      setSelectAll('some');
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAll('none');
  };

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setColumns(
      columns.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // Bulk send messages
  const sendBulkMessages = async () => {
    if (!bulkMessageText.trim() || selectedIds.size === 0) return;

    setSendingBulk(true);
    setBulkProgress({ sent: 0, failed: 0, total: selectedIds.size });

    const selectedConversations = filteredConversations.filter((c) =>
      selectedIds.has(c.id)
    );

    let sent = 0;
    let failed = 0;

    for (const conv of selectedConversations) {
      try {
        await conversationsApi.sendMessage(conv.id, bulkMessageText, 'text');
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${conv.contact_phone}:`, err);
        failed++;
      }
      setBulkProgress({ sent, failed, total: selectedIds.size });
    }

    setSendingBulk(false);

    if (failed === 0) {
      setShowBulkMessage(false);
      setBulkMessageText('');
      clearSelection();
      loadConversations();
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getWindowTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);

    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getConfigName = (configId: string) => {
    const config = configs.find((c) => c.id === configId);
    return config ? config.name : 'Unknown';
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find((c) => c.id === columnId)?.visible ?? false;
  };

  return (
    <div className="min-h-screen bg-[#ECE5DD]">
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
            <h1 className="text-xl font-bold text-white">Contacts</h1>
            <p className="text-sm text-white/70">
              {filteredConversations.length} contact{filteredConversations.length !== 1 ? 's' : ''}
              {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => setShowBulkMessage(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#20BD5A] transition-colors"
                >
                  <Send size={16} />
                  <span className="text-sm font-medium">Send to {selectedIds.size}</span>
                </button>
                <button
                  onClick={clearSelection}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                  title="Clear selection"
                >
                  <X size={20} />
                </button>
              </>
            )}
            <button
              onClick={() => loadConversations()}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search contacts, phone, messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#25D366]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-[#075E54] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-white text-[#075E54] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('archived')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  statusFilter === 'archived'
                    ? 'bg-white text-[#075E54] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Archived
              </button>
            </div>

            {/* Window Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setWindowFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  windowFilter === 'all'
                    ? 'bg-white text-[#075E54] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Windows
              </button>
              <button
                onClick={() => setWindowFilter('in_window')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                  windowFilter === 'in_window'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Free Window
              </button>
              <button
                onClick={() => setWindowFilter('outside_window')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                  windowFilter === 'outside_window'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Template Only
              </button>
            </div>

            {/* Config Filter */}
            {configs.length > 1 && (
              <select
                value={configFilter}
                onChange={(e) => setConfigFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#25D366]"
              >
                <option value="">All Numbers</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.phone_number})
                  </option>
                ))}
              </select>
            )}

            {/* Column Picker Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                  showColumnPicker
                    ? 'border-[#25D366] bg-[#25D366]/10 text-[#075E54]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Columns size={16} />
                Columns
                <ChevronDown size={14} />
              </button>

              {showColumnPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 px-2 py-1">Show/Hide Columns</p>
                    {columns.filter(col => col.id !== 'select').map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => toggleColumn(col.id)}
                          className="w-4 h-4 text-[#25D366] rounded border-gray-300 focus:ring-[#25D366]"
                        />
                        <span className="text-sm text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="mx-auto mb-2 animate-spin text-[#25D366]" size={32} />
              <p>Loading contacts...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="mx-auto mb-2 text-[#128C7E]/30" size={48} />
              <p className="font-medium">No contacts found</p>
              <p className="text-sm mt-1">
                {searchQuery
                  ? 'No contacts match your search'
                  : 'Contacts will appear here when customers message you'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {isColumnVisible('select') && (
                      <th className="px-4 py-3 text-left w-12">
                        <button
                          onClick={toggleSelectAll}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectAll === 'all'
                              ? 'bg-[#25D366] border-[#25D366] text-white'
                              : selectAll === 'some'
                              ? 'bg-[#25D366]/50 border-[#25D366] text-white'
                              : 'border-gray-300 hover:border-[#25D366]'
                          }`}
                        >
                          {selectAll === 'all' && <Check size={14} />}
                          {selectAll === 'some' && <Minus size={14} />}
                        </button>
                      </th>
                    )}
                    {isColumnVisible('contact') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    )}
                    {isColumnVisible('phone') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                    )}
                    {isColumnVisible('lastMessage') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Message
                      </th>
                    )}
                    {isColumnVisible('lastMessageAt') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    )}
                    {isColumnVisible('windowStatus') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Window
                      </th>
                    )}
                    {isColumnVisible('unreadCount') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unread
                      </th>
                    )}
                    {isColumnVisible('status') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    {isColumnVisible('config') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Config
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredConversations.map((conversation) => (
                    <tr
                      key={conversation.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedIds.has(conversation.id) ? 'bg-[#25D366]/5' : ''
                      }`}
                    >
                      {isColumnVisible('select') && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleSelect(conversation.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedIds.has(conversation.id)
                                ? 'bg-[#25D366] border-[#25D366] text-white'
                                : 'border-gray-300 hover:border-[#25D366]'
                            }`}
                          >
                            {selectedIds.has(conversation.id) && <Check size={14} />}
                          </button>
                        </td>
                      )}
                      {isColumnVisible('contact') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DCF8C6] flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-[#075E54]">
                                {(conversation.contact_name || conversation.contact_phone)[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[150px]">
                              {conversation.contact_name || '-'}
                            </span>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('phone') && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {conversation.contact_phone}
                        </td>
                      )}
                      {isColumnVisible('lastMessage') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 max-w-[200px]">
                            {conversation.last_message_direction === 'outbound' && (
                              <CheckCircle2 size={14} className="text-[#25D366] flex-shrink-0" />
                            )}
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.last_message_preview || '-'}
                            </p>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('lastMessageAt') && (
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatTime(conversation.last_message_at)}
                        </td>
                      )}
                      {isColumnVisible('windowStatus') && (
                        <td className="px-4 py-3">
                          {conversation.in_free_window ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                              <Clock size={12} />
                              {getWindowTimeRemaining(conversation.window_expires_at) || 'Active'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                              <Clock size={12} />
                              Template
                            </span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('unreadCount') && (
                        <td className="px-4 py-3">
                          {conversation.unread_count > 0 ? (
                            <span className="px-2 py-0.5 text-xs font-bold text-white bg-[#25D366] rounded-full">
                              {conversation.unread_count}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">0</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('status') && (
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                              conversation.status === 'active'
                                ? 'text-green-700 bg-green-100'
                                : conversation.status === 'archived'
                                ? 'text-gray-700 bg-gray-100'
                                : 'text-red-700 bg-red-100'
                            }`}
                          >
                            {conversation.status === 'archived' && <Archive size={12} />}
                            {conversation.status}
                          </span>
                        </td>
                      )}
                      {isColumnVisible('config') && (
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {getConfigName(conversation.whatsapp_config_id)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Message Modal */}
      {showBulkMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Send Bulk Message
              </h3>
              <button
                onClick={() => setShowBulkMessage(false)}
                disabled={sendingBulk}
                className="p-1 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Sending to <strong>{selectedIds.size}</strong> contact{selectedIds.size !== 1 ? 's' : ''}.
                {windowFilter !== 'in_window' && (
                  <span className="text-orange-600 block mt-1">
                    Note: Contacts outside the free window will require template messages.
                  </span>
                )}
              </p>

              <textarea
                value={bulkMessageText}
                onChange={(e) => setBulkMessageText(e.target.value)}
                placeholder="Type your message here..."
                disabled={sendingBulk}
                className="w-full h-32 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-[#25D366] disabled:bg-gray-50"
              />

              {sendingBulk && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Sending...</span>
                    <span>
                      {bulkProgress.sent + bulkProgress.failed} / {bulkProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#25D366] transition-all duration-300"
                      style={{
                        width: `${((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  {bulkProgress.failed > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      {bulkProgress.failed} message{bulkProgress.failed !== 1 ? 's' : ''} failed
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowBulkMessage(false)}
                disabled={sendingBulk}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={sendBulkMessages}
                disabled={sendingBulk || !bulkMessageText.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#25D366] hover:bg-[#20BD5A] rounded-lg transition-colors disabled:opacity-50"
              >
                <Send size={16} />
                {sendingBulk ? 'Sending...' : `Send to ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
