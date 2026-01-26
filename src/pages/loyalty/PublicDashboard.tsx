import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Stamp,
  Gift,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { publicDashboardApi, type PublicDashboardData } from '@/lib/api';

// Segment definitions
const SEGMENTS = [
  { key: 'new', label: 'New', color: 'bg-blue-500', description: '0-1 stamps' },
  { key: 'regular', label: 'Regular', color: 'bg-green-500', description: '2-4 stamps' },
  { key: 'almost_there', label: 'Almost There', color: 'bg-yellow-500', description: '5-7 stamps' },
  { key: 'reward_ready', label: 'Reward Ready', color: 'bg-purple-500', description: '8+ stamps' },
  { key: 'lapsed', label: 'Lapsed', color: 'bg-gray-400', description: 'No visit 30+ days' },
];

export function PublicDashboard() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const loadDashboard = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const dashboardData = await publicDashboardApi.get(token);
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Calculate segment percentages
  const getSegmentPercentage = (segmentKey: string): number => {
    if (!data?.stats?.segments) return 0;
    const segments = data.stats.segments as Record<string, number>;
    const total = Object.values(segments).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    return Math.round((segments[segmentKey] || 0) / total * 100);
  };

  const getSegmentCount = (segmentKey: string): number => {
    if (!data?.stats?.segments) return 0;
    const segments = data.stats.segments as Record<string, number>;
    return segments[segmentKey] || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 animate-spin text-purple-600" size={40} />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="p-4 bg-red-100 rounded-full inline-block mb-4">
            <AlertCircle className="text-red-600" size={40} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Not Found</h1>
          <p className="text-gray-600">
            {error || 'This dashboard link may be invalid or expired. Please check the URL and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="py-8 px-4"
        style={{ backgroundColor: data.program.background_color }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: data.program.accent_color }}
          >
            {data.program.business_name}
          </h1>
          <p
            className="text-lg opacity-80"
            style={{ color: data.program.accent_color }}
          >
            Loyalty Program Dashboard
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 -mt-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.total_customers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Active Cards</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.active_cards}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Stamp className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Stamps</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.total_stamps}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Gift className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Rewards</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.completed_cards}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-gray-500" />
              Customer Segments
            </h2>
            <TrendingUp size={20} className="text-green-500" />
          </div>

          <div className="space-y-4">
            {SEGMENTS.map((segment) => {
              const count = getSegmentCount(segment.key);
              const percentage = getSegmentPercentage(segment.key);
              return (
                <div key={segment.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${segment.color}`} />
                      <span className="text-sm font-medium text-gray-700">{segment.label}</span>
                      <span className="text-xs text-gray-400">({segment.description})</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${segment.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.stamps_this_week || 0}
                </p>
                <p className="text-xs text-gray-500 uppercase">Stamps This Week</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.new_customers_this_week || 0}
                </p>
                <p className="text-xs text-gray-500 uppercase">New Customers This Week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Program Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Program Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Stamps to Reward</p>
              <p className="text-lg font-semibold text-gray-900">{data.program.total_stamps}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Reward</p>
              <p className="text-lg font-semibold text-gray-900">{data.program.reward_text}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Trigger Keyword</p>
              <p className="text-lg font-semibold text-gray-900">{data.program.trigger_keyword}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Plan</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{data.program.tier}</p>
            </div>
          </div>
        </div>

        {/* Upgrade CTA (if free tier) */}
        {data.program.tier === 'free' && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Crown size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">Upgrade to Pro</h3>
                <p className="text-white/80">
                  Unlock unlimited customers, advanced analytics, custom branding, and priority support.
                </p>
              </div>
              <button className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-md">
                Upgrade Now
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div className="p-2 bg-white/10 rounded-lg">
                <p className="font-semibold">Unlimited</p>
                <p className="text-white/70 text-xs">Customers</p>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <p className="font-semibold">Advanced</p>
                <p className="text-white/70 text-xs">Analytics</p>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <p className="font-semibold">Priority</p>
                <p className="text-white/70 text-xs">Support</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by WhatsApp Flow Builder</p>
          <p className="text-xs mt-1">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </main>
    </div>
  );
}
