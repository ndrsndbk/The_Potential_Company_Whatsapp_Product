import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Stamp,
  Clock,
  Phone,
  User,
} from 'lucide-react';
import { stampProgramsApi, type StampProgram, type LoyaltyCustomer } from '@/lib/api';

// Segment definitions with colors
const SEGMENTS = [
  { key: 'all', label: 'All', color: 'bg-gray-500' },
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'regular', label: 'Regular', color: 'bg-green-500' },
  { key: 'almost_there', label: 'Almost There', color: 'bg-yellow-500' },
  { key: 'reward_ready', label: 'Reward Ready', color: 'bg-purple-500' },
  { key: 'lapsed', label: 'Lapsed', color: 'bg-gray-400' },
];

const PAGE_SIZE = 20;

export function LoyaltyCustomers() {
  const navigate = useNavigate();
  const [program, setProgram] = useState<StampProgram | null>(null);
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (program) {
      loadCustomers();
    }
  }, [program, currentPage, segmentFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { programs } = await stampProgramsApi.list();
      if (programs.length === 0) {
        setProgram(null);
        return;
      }

      setProgram(programs[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    if (!program) return;

    try {
      setLoading(true);
      const { customers: data, pagination } = await stampProgramsApi.getCustomers(program.id, {
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        segment: segmentFilter === 'all' ? undefined : segmentFilter,
        search: searchQuery || undefined,
      });
      setCustomers(data);
      setTotalCount(pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Filter customers by search (client-side for quick filtering)
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(query) ||
        customer.phone.includes(query)
    );
  }, [customers, searchQuery]);

  // Search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      loadCustomers();
    }
  };

  // Format phone number with masking (show last 4 digits)
  const maskPhone = (phone: string): string => {
    if (phone.length <= 4) return phone;
    const visible = phone.slice(-4);
    const masked = '*'.repeat(phone.length - 4);
    return masked + visible;
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Get segment badge color
  const getSegmentColor = (segment: string): string => {
    const seg = SEGMENTS.find((s) => s.key === segment);
    return seg?.color || 'bg-gray-500';
  };

  // Get segment label
  const getSegmentLabel = (segment: string): string => {
    const seg = SEGMENTS.find((s) => s.key === segment);
    return seg?.label || segment;
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="min-h-screen bg-[#ECE5DD]">
      {/* Header */}
      <header className="bg-[#075E54]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/loyalty')}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Loyalty Customers</h1>
            <p className="text-sm text-white/70">
              {totalCount} customer{totalCount !== 1 ? 's' : ''} in your program
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentPage(1);
              loadCustomers();
            }}
            disabled={loading}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#25D366]"
              />
            </div>

            {/* Segment Filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
              {SEGMENTS.map((segment) => (
                <button
                  key={segment.key}
                  onClick={() => {
                    setSegmentFilter(segment.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    segmentFilter === segment.key
                      ? 'bg-white text-[#075E54] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {segment.key !== 'all' && (
                    <span className={`w-2 h-2 rounded-full ${segment.color}`} />
                  )}
                  {segment.label}
                </button>
              ))}
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {!program ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Users className="mx-auto mb-4 text-[#128C7E]/30" size={64} />
            <h2 className="text-xl font-semibold text-[#075E54] mb-2">No Loyalty Program</h2>
            <p className="text-gray-600 mb-6">
              Create a loyalty program first to start tracking customers.
            </p>
            <button
              onClick={() => navigate('/loyalty/settings')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors"
            >
              Create Program
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading && customers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="mx-auto mb-2 animate-spin text-[#25D366]" size={32} />
                <p>Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="mx-auto mb-2 text-[#128C7E]/30" size={48} />
                <p className="font-medium">No customers found</p>
                <p className="text-sm mt-1">
                  {searchQuery
                    ? 'No customers match your search'
                    : 'Customers will appear here when they start collecting stamps'}
                </p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stamps
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Segment
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Visit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCustomers.map((customer) => (
                        <tr
                          key={customer.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#DCF8C6] flex items-center justify-center flex-shrink-0">
                                <User className="text-[#075E54]" size={18} />
                              </div>
                              <span className="font-medium text-gray-900">
                                {customer.name || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone size={14} />
                              {maskPhone(customer.phone)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Stamp size={16} className="text-[#25D366]" />
                              <span className="font-semibold text-[#075E54]">
                                {customer.current_stamps}
                              </span>
                              <span className="text-gray-400 text-sm">
                                / {program.total_stamps}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-[#25D366] rounded-full"
                                style={{
                                  width: `${Math.min(
                                    (customer.current_stamps / program.total_stamps) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white rounded-full ${getSegmentColor(
                                customer.segment
                              )}`}
                            >
                              {getSegmentLabel(customer.segment)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock size={14} />
                              {formatDate(customer.last_visit)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
                      {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} customers
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => p - 1)}
                        disabled={!canGoPrev}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-sm text-gray-600 px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={!canGoNext}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
