import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Phone, RefreshCw, Copy, Check } from 'lucide-react';
import { configsApi, type WhatsAppConfig } from '@/lib/api';

export function Settings() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState<{
    name?: string;
    phone_number?: string;
    phone_number_id?: string;
    access_token?: string;
    verify_token?: string;
  }>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { configs } = await configsApi.list();
      setConfigs(configs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.name || !newConfig.phone_number_id || !newConfig.access_token || !newConfig.verify_token) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      await configsApi.create({
        name: newConfig.name,
        phone_number_id: newConfig.phone_number_id,
        phone_number: newConfig.phone_number || '',
        access_token: newConfig.access_token,
        verify_token: newConfig.verify_token,
      });
      await loadConfigs();
      setNewConfig({});
      setShowAddForm(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add config');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await configsApi.delete(id);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete config');
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await configsApi.update(id, { is_active: !currentState });
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
    }
  };

  const copyWebhookUrl = (configId: string) => {
    const url = `${window.location.origin}/webhook/${configId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(configId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#ECE5DD]">
      {/* Header */}
      <header className="bg-[#075E54]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-sm text-white/70">Manage WhatsApp API configurations</p>
          </div>
          <button
            onClick={loadConfigs}
            disabled={loading}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#075E54]">
              WhatsApp Numbers ({configs.length}/2)
            </h2>
            {configs.length < 2 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#25D366] hover:bg-[#DCF8C6] rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Number
              </button>
            )}
          </div>

          {/* Config list */}
          <div className="divide-y divide-gray-200">
            {loading && configs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              configs.map((config) => (
                <div key={config.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#DCF8C6] rounded-lg">
                        <Phone className="text-[#25D366]" size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-[#075E54]">{config.name}</div>
                        <div className="text-sm text-gray-500">{config.phone_number}</div>
                        <div className="text-xs text-gray-400">
                          ID: {config.phone_number_id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyWebhookUrl(config.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                        title="Copy webhook URL"
                      >
                        {copiedId === config.id ? (
                          <Check size={14} className="text-[#25D366]" />
                        ) : (
                          <Copy size={14} />
                        )}
                        Webhook
                      </button>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.is_active}
                          onChange={() => handleToggleActive(config.id, config.is_active)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-600">Active</span>
                      </label>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {!loading && configs.length === 0 && !showAddForm && (
              <div className="p-8 text-center text-gray-500">
                <Phone className="mx-auto mb-2 text-[#128C7E]/30" size={40} />
                <p>No WhatsApp numbers configured</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-[#25D366] hover:text-[#128C7E]"
                >
                  Add your first number
                </button>
              </div>
            )}
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <h3 className="font-medium text-gray-800 mb-3">Add WhatsApp Number</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newConfig.name || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Sales Number"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newConfig.phone_number || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Phone Number ID (from Meta) *
                  </label>
                  <input
                    type="text"
                    value={newConfig.phone_number_id || ''}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, phone_number_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="858272234034248"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Access Token *</label>
                  <input
                    type="password"
                    value={newConfig.access_token || ''}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, access_token: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Your WhatsApp Cloud API token"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Verify Token *</label>
                  <input
                    type="text"
                    value={newConfig.verify_token || ''}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, verify_token: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="myverifytoken"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddConfig}
                    disabled={saving}
                    className="px-4 py-2 text-white bg-[#25D366] rounded-md hover:bg-[#128C7E] disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Number'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewConfig({});
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-[#DCF8C6] rounded-lg border border-[#128C7E]/20">
          <h3 className="font-medium text-[#075E54] mb-2">How to get these values:</h3>
          <ol className="text-sm text-[#075E54]/80 space-y-1 list-decimal list-inside">
            <li>Go to Meta for Developers &gt; WhatsApp &gt; API Setup</li>
            <li>Copy the Phone Number ID and generate a permanent Access Token</li>
            <li>Set up webhook URL: <code className="bg-[#128C7E]/10 px-1 rounded">https://yourdomain.com/webhook/[config-id]</code></li>
            <li>Subscribe to messages webhook events</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
