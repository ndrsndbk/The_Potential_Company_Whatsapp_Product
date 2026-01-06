import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import { conversationsApi, configsApi } from '@/lib/api';
import type { Conversation, WhatsAppConfig } from '@/lib/api';
import { useChatWindowsStore } from '@/stores/chatWindowsStore';
import { ChatWindowsContainer } from '@/components/conversations/ChatWindowsContainer';

export function Conversations() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [configFilter, setConfigFilter] = useState<string>('');

  const openWindow = useChatWindowsStore((state) => state.openWindow);

  useEffect(() => {
    loadData();
  }, [statusFilter, configFilter]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations(true);
    }, 10000);
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
        limit: 100,
      });
      setConversations(conversations);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
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

  const handleConversationClick = (conversation: Conversation) => {
    openWindow(conversation);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.contact_phone.toLowerCase().includes(query) ||
      (conv.contact_name?.toLowerCase().includes(query) ?? false) ||
      (conv.last_message_preview?.toLowerCase().includes(query) ?? false)
    );
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
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

  return (
    <div className="min-h-screen bg-[#ECE5DD]">
      {/* Header */}
      <header className="bg-[#075E54]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Conversations</h1>
            <p className="text-sm text-white/70">
              {conversations.length} contact{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => loadConversations()}
            disabled={loading}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#25D366]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="mx-auto mb-2 animate-spin text-[#25D366]" size={32} />
              <p>Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="mx-auto mb-2 text-[#128C7E]/30" size={48} />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">
                {searchQuery
                  ? 'No contacts match your search'
                  : 'Conversations will appear here when customers message you'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[#DCF8C6] flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-[#075E54]">
                      {(conversation.contact_name || conversation.contact_phone)[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {conversation.contact_name || conversation.contact_phone}
                      </span>
                      {conversation.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-[#25D366] rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {conversation.last_message_direction === 'outbound' && (
                        <CheckCircle2 size={14} className="text-[#25D366] flex-shrink-0" />
                      )}
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.last_message_preview || 'No messages yet'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {conversation.contact_phone}
                    </p>
                  </div>

                  {/* Right side - time & status */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatTime(conversation.last_message_at)}
                    </span>

                    {/* 24-hour window indicator */}
                    {conversation.in_free_window ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        <Clock size={12} />
                        {getWindowTimeRemaining(conversation.window_expires_at) || 'Active'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                        <Clock size={12} />
                        Template only
                      </span>
                    )}

                    {conversation.status === 'archived' && (
                      <Archive size={14} className="text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Chat Windows */}
      <ChatWindowsContainer />
    </div>
  );
}
