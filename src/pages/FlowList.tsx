import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Workflow, RefreshCw, Trash2, Building2, Users, LogOut, BookOpen } from 'lucide-react';
import { flowsApi, type Flow } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function FlowList() {
  const navigate = useNavigate();
  const { logout, isSuperAdmin } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const { flows } = await flowsApi.list();
      setFlows(flows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  const createNewFlow = async () => {
    try {
      const { flow } = await flowsApi.create({
        name: 'New Flow',
        trigger_type: 'keyword',
        trigger_value: '',
      });
      navigate(`/editor/${flow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flow');
    }
  };

  const deleteFlow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this flow?')) return;

    try {
      await flowsApi.delete(id);
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flow');
    }
  };

  const editFlow = (id: string) => {
    navigate(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Workflow className="text-green-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">WhatsApp Flow Builder</h1>
              <p className="text-sm text-gray-500">Create and manage your conversation flows</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadFlows}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <a
              href="/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
              title="Documentation"
            >
              <BookOpen size={20} />
            </a>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            {isSuperAdmin() && (
              <>
                <button
                  onClick={() => navigate('/admin/organizations')}
                  className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-100 rounded-lg"
                  title="Organizations"
                >
                  <Building2 size={20} />
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg"
                  title="Users"
                >
                  <Users size={20} />
                </button>
              </>
            )}
            <button
              onClick={createNewFlow}
              className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={18} />
              New Flow
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-800">{flows.length}</div>
            <div className="text-sm text-gray-500">Total Flows</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {flows.filter((f) => f.is_active).length}
            </div>
            <div className="text-sm text-gray-500">Active Flows</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {flows.filter((f) => f.is_published).length}
            </div>
            <div className="text-sm text-gray-500">Published</div>
          </div>
        </div>

        {/* Flows grid */}
        {loading && flows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Loading flows...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flows.map((flow) => (
              <div
                key={flow.id}
                onClick={() => editFlow(flow.id)}
                className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{flow.name}</h3>
                  <div className="flex gap-1 items-center">
                    {flow.is_active && (
                      <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        Active
                      </span>
                    )}
                    {flow.is_published && (
                      <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                        Published
                      </span>
                    )}
                    <button
                      onClick={(e) => deleteFlow(e, flow.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <div>Trigger: {flow.trigger_value || 'Not set'}</div>
                  {flow.whatsapp_configs && (
                    <div>Phone: {flow.whatsapp_configs.name}</div>
                  )}
                  <div>Updated: {new Date(flow.updated_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}

            {/* Empty state / New flow card */}
            <div
              onClick={createNewFlow}
              className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all flex flex-col items-center justify-center min-h-[120px]"
            >
              <Plus className="text-gray-400 mb-2" size={24} />
              <span className="text-sm text-gray-500">Create New Flow</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
