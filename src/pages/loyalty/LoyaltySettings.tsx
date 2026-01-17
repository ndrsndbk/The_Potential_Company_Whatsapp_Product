import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Settings,
  Palette,
  Gift,
  MessageSquare,
  Link2,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  X,
  Coffee,
  Star,
  Heart,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { stampProgramsApi, type StampProgram } from '@/lib/api';

const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Teal', value: '#0d9488' },
];

const ACCENT_COLORS = [
  { name: 'Lime', value: '#ccff00' },
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Pink', value: '#f472b6' },
];

const STAMP_ICONS = [
  { name: 'Cup', value: 'cup', icon: Coffee },
  { name: 'Star', value: 'star', icon: Star },
  { name: 'Heart', value: 'heart', icon: Heart },
  { name: 'Check', value: 'check', icon: CheckCircle },
];

interface FormData {
  business_name: string;
  total_stamps: number;
  stamp_icon: string;
  background_color: string;
  accent_color: string;
  reward_text: string;
  trigger_keyword: string;
}

const defaultFormData: FormData = {
  business_name: '',
  total_stamps: 10,
  stamp_icon: 'cup',
  background_color: '#000000',
  accent_color: '#ccff00',
  reward_text: 'FREE ITEM',
  trigger_keyword: 'loyalty',
};

export function LoyaltySettings() {
  const navigate = useNavigate();
  const [program, setProgram] = useState<StampProgram | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [previewStamps, setPreviewStamps] = useState(3);

  useEffect(() => {
    loadProgram();
  }, []);

  const loadProgram = async () => {
    try {
      setLoading(true);
      setError(null);

      const { programs } = await stampProgramsApi.list();

      if (programs.length > 0) {
        const prog = programs[0];
        setProgram(prog);
        setFormData({
          business_name: prog.business_name,
          total_stamps: prog.total_stamps,
          stamp_icon: prog.stamp_icon,
          background_color: prog.background_color,
          accent_color: prog.accent_color,
          reward_text: prog.reward_text,
          trigger_keyword: prog.trigger_keyword,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.business_name.trim()) {
      setError('Business name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (program) {
        // Update existing program
        await stampProgramsApi.update(program.id, formData);
        setSuccess('Settings saved successfully');
      } else {
        // Create new program
        const { program: newProgram } = await stampProgramsApi.create(formData);
        setProgram(newProgram);
        setSuccess('Loyalty program created successfully');
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!program) return;

    try {
      setSaving(true);
      await stampProgramsApi.delete(program.id);
      setProgram(null);
      setFormData(defaultFormData);
      setShowDeactivateConfirm(false);
      setSuccess('Program deactivated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate program');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const dashboardUrl = program?.dashboard_token
    ? `${window.location.origin}/d/${program.dashboard_token}`
    : null;

  // Get icon component
  const getStampIcon = (iconType: string, size: number = 16, color: string = 'currentColor') => {
    const IconComponent = STAMP_ICONS.find((i) => i.value === iconType)?.icon || Coffee;
    return <IconComponent size={size} color={color} />;
  };

  return (
    <div className="min-h-screen bg-[#ECE5DD]">
      {/* Header */}
      <header className="bg-[#075E54]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/loyalty')}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Loyalty Program Settings</h1>
            <p className="text-sm text-white/70">
              {program ? 'Edit your program settings' : 'Create a new loyalty program'}
            </p>
          </div>
          <button
            onClick={loadProgram}
            disabled={loading}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              {error}
            </div>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
            <Check size={20} />
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto mb-4 animate-spin text-[#25D366]" size={40} />
            <p className="text-gray-600">Loading settings...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Form */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2 mb-4">
                  <Settings size={20} />
                  Basic Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                      placeholder="Your Business Name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Stamps
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.total_stamps}
                        onChange={(e) =>
                          setFormData({ ...formData, total_stamps: parseInt(e.target.value) || 10 })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stamp Icon
                      </label>
                      <select
                        value={formData.stamp_icon}
                        onChange={(e) => setFormData({ ...formData, stamp_icon: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                      >
                        {STAMP_ICONS.map((icon) => (
                          <option key={icon.value} value={icon.value}>
                            {icon.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2 mb-4">
                  <Palette size={20} />
                  Colors
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setFormData({ ...formData, background_color: color.value })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.background_color === color.value
                              ? 'border-[#25D366] scale-110 shadow-md'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                        title="Custom color"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setFormData({ ...formData, accent_color: color.value })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.accent_color === color.value
                              ? 'border-[#25D366] scale-110 shadow-md'
                              : 'border-gray-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                        title="Custom color"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reward */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2 mb-4">
                  <Gift size={20} />
                  Reward
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reward Text
                  </label>
                  <input
                    type="text"
                    value={formData.reward_text}
                    onChange={(e) => setFormData({ ...formData, reward_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    placeholder="e.g., FREE COFFEE"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This text will appear on the card when customers complete their stamps.
                  </p>
                </div>
              </div>

              {/* Trigger & Links */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2 mb-4">
                  <MessageSquare size={20} />
                  Trigger & Links
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trigger Keyword
                    </label>
                    <input
                      type="text"
                      value={formData.trigger_keyword}
                      onChange={(e) => setFormData({ ...formData, trigger_keyword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                      placeholder="e.g., loyalty"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Customers can type this keyword to view their stamp card.
                    </p>
                  </div>

                  {program && dashboardUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Public Dashboard URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={dashboardUrl}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(dashboardUrl, 'dashboard')}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {copiedField === 'dashboard' ? (
                            <Check size={18} className="text-green-600" />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => window.open(dashboardUrl, '_blank')}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Open dashboard"
                        >
                          <Link2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#128C7E] disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {saving ? 'Saving...' : program ? 'Save Changes' : 'Create Program'}
                </button>
              </div>

              {/* Deactivate Section */}
              {program && (
                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2 mb-2">
                    <AlertTriangle size={20} />
                    Danger Zone
                  </h2>
                  <p className="text-sm text-red-700 mb-4">
                    Deactivating your loyalty program will hide it from customers. Their stamp data will be preserved.
                  </p>
                  <button
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                    Deactivate Program
                  </button>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#075E54] flex items-center gap-2">
                    <Eye size={20} />
                    Card Preview
                  </h2>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Stamps:</label>
                    <input
                      type="range"
                      min="0"
                      max={formData.total_stamps}
                      value={previewStamps}
                      onChange={(e) => setPreviewStamps(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm font-medium w-6">{previewStamps}</span>
                  </div>
                </div>

                {/* Card Preview */}
                <div
                  className="rounded-2xl p-4 shadow-lg"
                  style={{
                    backgroundColor: formData.background_color,
                    border: `3px solid ${formData.accent_color}`,
                  }}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3
                        className="font-bold text-lg tracking-wide"
                        style={{ color: formData.accent_color }}
                      >
                        {formData.business_name || 'LOYALTY CARD'}
                      </h3>
                      <p
                        className="text-xs opacity-70"
                        style={{ color: formData.accent_color }}
                      >
                        Collect stamps to earn rewards!
                      </p>
                    </div>
                    <div style={{ color: formData.accent_color }}>
                      {getStampIcon(formData.stamp_icon, 24, formData.accent_color)}
                    </div>
                  </div>

                  {/* Stamp Grid */}
                  <div
                    className="grid gap-2 mb-3"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(5, formData.total_stamps)}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: formData.total_stamps }).map((_, index) => {
                      const isStamped = index < previewStamps;
                      return (
                        <div
                          key={index}
                          className="aspect-square rounded-full flex items-center justify-center transition-all"
                          style={{
                            backgroundColor: isStamped
                              ? formData.accent_color
                              : `${formData.accent_color}33`,
                            border: `2px solid ${formData.accent_color}`,
                          }}
                        >
                          {isStamped &&
                            getStampIcon(formData.stamp_icon, 14, formData.background_color)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: formData.accent_color }} className="opacity-70">
                      John Doe
                    </span>
                    <span style={{ color: formData.accent_color }} className="font-medium">
                      {previewStamps}/{formData.total_stamps} stamps
                    </span>
                  </div>

                  {/* Reward text */}
                  {formData.reward_text && (
                    <div
                      className="mt-2 text-center text-xs py-1 rounded"
                      style={{
                        backgroundColor: `${formData.accent_color}22`,
                        color: formData.accent_color,
                      }}
                    >
                      Reward: {formData.reward_text}
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-gray-500 mt-4">
                  This is how your stamp card will appear to customers
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Deactivate Program?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to deactivate your loyalty program? Customers will no longer be
              able to collect stamps, but their existing data will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
