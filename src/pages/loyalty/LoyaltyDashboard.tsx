import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  CreditCard,
  Stamp,
  Gift,
  RefreshCw,
  TrendingUp,
  Settings,
  UserPlus,
  Crown,
  Clock,
  AlertCircle,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { stampProgramsApi, type StampProgram, type StampProgramStats } from '@/lib/api';

// Segment definitions
const SEGMENTS = [
  { key: 'new', label: 'New', color: 'bg-blue-500', description: '0-1 stamps' },
  { key: 'regular', label: 'Regular', color: 'bg-green-500', description: '2-4 stamps' },
  { key: 'almost_there', label: 'Almost There', color: 'bg-yellow-500', description: '5-7 stamps' },
  { key: 'reward_ready', label: 'Reward Ready', color: 'bg-purple-500', description: '8+ stamps' },
  { key: 'lapsed', label: 'Lapsed', color: 'bg-gray-400', description: 'No visit 30+ days' },
];

interface DailyStampData {
  date: string;
  stamps: number;
}

export function LoyaltyDashboard() {
  const navigate = useNavigate();
  const [program, setProgram] = useState<StampProgram | null>(null);
  const [stats, setStats] = useState<StampProgramStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyStampData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the first active program for the organization
      const { programs } = await stampProgramsApi.list();

      if (programs.length === 0) {
        setProgram(null);
        setStats(null);
        return;
      }

      const activeProgram = programs[0];
      setProgram(activeProgram);

      // Load stats for this program
      const statsData = await stampProgramsApi.getStats(activeProgram.id);
      setStats(statsData);

      // Generate mock daily data for the chart (last 7 days)
      const mockDailyData: DailyStampData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockDailyData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          stamps: Math.floor(Math.random() * 20) + 5,
        });
      }
      setDailyData(mockDailyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const maxStamps = Math.max(...dailyData.map((d) => d.stamps), 1);

  // Calculate segment percentages
  const getSegmentPercentage = (segmentKey: string): number => {
    if (!stats?.segments) return 0;
    const total = Object.values(stats.segments).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    return Math.round((stats.segments[segmentKey] || 0) / total * 100);
  };

  const getSegmentCount = (segmentKey: string): number => {
    if (!stats?.segments) return 0;
    return stats.segments[segmentKey] || 0;
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
            <h1 className="text-xl font-bold text-white">Loyalty Dashboard</h1>
            <p className="text-sm text-white/70">
              {program?.business_name || 'Manage your loyalty program'}
            </p>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/loyalty/customers')}
            className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <Users size={18} />
            <span className="text-sm">Customers</span>
          </button>
          <button
            onClick={() => navigate('/loyalty/settings')}
            className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <Settings size={18} />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto mb-4 animate-spin text-[#25D366]" size={40} />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        ) : !program ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Stamp className="mx-auto mb-4 text-[#128C7E]/30" size={64} />
            <h2 className="text-xl font-semibold text-[#075E54] mb-2">No Loyalty Program Yet</h2>
            <p className="text-gray-600 mb-6">
              Create a loyalty program to start tracking customer stamps and rewards.
            </p>
            <button
              onClick={() => navigate('/loyalty/settings')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors"
            >
              <Settings size={18} />
              Create Program
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Customers</p>
                    <p className="text-2xl font-bold text-[#075E54]">
                      {stats?.total_customers || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CreditCard className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active Cards</p>
                    <p className="text-2xl font-bold text-[#25D366]">
                      {stats?.active_cards || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Stamp className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stamps Issued</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats?.total_stamps || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Gift className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cards Completed</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.completed_cards || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart and Segments Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Stamps Trend Chart */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2">
                    <BarChart3 size={20} />
                    Stamps This Week
                  </h2>
                  <TrendingUp className="text-[#25D366]" size={20} />
                </div>

                {/* Simple Bar Chart */}
                <div className="flex items-end gap-2 h-48">
                  {dailyData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-500">{day.stamps}</span>
                      <div
                        className="w-full bg-[#25D366] rounded-t transition-all hover:bg-[#128C7E]"
                        style={{
                          height: `${(day.stamps / maxStamps) * 100}%`,
                          minHeight: '8px',
                        }}
                      />
                      <span className="text-xs text-gray-600">{day.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Segments */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2">
                    <Users size={20} />
                    Customer Segments
                  </h2>
                  <button
                    onClick={() => navigate('/loyalty/customers')}
                    className="text-sm text-[#25D366] hover:text-[#128C7E] flex items-center gap-1"
                  >
                    View All
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {SEGMENTS.map((segment) => {
                    const count = getSegmentCount(segment.key);
                    const percentage = getSegmentPercentage(segment.key);
                    return (
                      <div key={segment.key} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${segment.color}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              {segment.label}
                            </span>
                            <span className="text-sm text-gray-500">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${segment.color} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  Based on stamp count and last visit date
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => navigate('/loyalty/customers')}
                className="bg-white rounded-lg shadow-sm p-4 text-left hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#DCF8C6] rounded-lg group-hover:bg-[#25D366] transition-colors">
                    <UserPlus className="text-[#075E54] group-hover:text-white" size={20} />
                  </div>
                  <span className="font-medium text-[#075E54]">View Customers</span>
                </div>
                <p className="text-sm text-gray-500">
                  See all loyalty program members and their stamp counts
                </p>
              </button>

              <button
                onClick={() => navigate('/loyalty/settings')}
                className="bg-white rounded-lg shadow-sm p-4 text-left hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#DCF8C6] rounded-lg group-hover:bg-[#25D366] transition-colors">
                    <Settings className="text-[#075E54] group-hover:text-white" size={20} />
                  </div>
                  <span className="font-medium text-[#075E54]">Program Settings</span>
                </div>
                <p className="text-sm text-gray-500">
                  Configure rewards, colors, and trigger keywords
                </p>
              </button>

              <button
                onClick={() => {
                  if (program?.dashboard_token) {
                    window.open(`/d/${program.dashboard_token}`, '_blank');
                  }
                }}
                disabled={!program?.dashboard_token}
                className="bg-white rounded-lg shadow-sm p-4 text-left hover:shadow-md transition-shadow group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#DCF8C6] rounded-lg group-hover:bg-[#25D366] transition-colors">
                    <BarChart3 className="text-[#075E54] group-hover:text-white" size={20} />
                  </div>
                  <span className="font-medium text-[#075E54]">Public Dashboard</span>
                </div>
                <p className="text-sm text-gray-500">
                  View the shareable public dashboard
                </p>
              </button>
            </div>

            {/* Upgrade Prompt (if on free tier) */}
            {program?.tier === 'free' && (
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-sm p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Crown size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Upgrade to Pro</h3>
                    <p className="text-white/80 text-sm">
                      Get unlimited customers, advanced analytics, custom branding, and priority support.
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-100 transition-colors">
                    Upgrade Now
                  </button>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="mt-8 bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2">
                  <Clock size={20} />
                  Recent Activity
                </h2>
              </div>
              <div className="p-4">
                {stats?.recent_events && stats.recent_events.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recent_events.slice(0, 5).map((event, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                      >
                        <div className={`p-1.5 rounded-full ${
                          event.type === 'stamp' ? 'bg-green-100' :
                          event.type === 'reward' ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}>
                          {event.type === 'stamp' ? (
                            <Stamp size={14} className="text-green-600" />
                          ) : event.type === 'reward' ? (
                            <Gift size={14} className="text-yellow-600" />
                          ) : (
                            <UserPlus size={14} className="text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{event.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No recent activity. Start by adding stamps to customer cards!
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
