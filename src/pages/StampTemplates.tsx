import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Stamp,
  Copy,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { stampTemplatesApi, type StampCardTemplate } from '@/lib/api';

const STAMP_SERVER_URL = 'https://stampgen.thepotentialcompany.com';

const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Slate', value: '#475569' },
];

const ACCENT_COLORS = [
  { name: 'Lime', value: '#ccff00' },
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Orange', value: '#fb923c' },
];

const STAMP_ICONS = [
  { name: 'Cup', value: 'cup' },
  { name: 'Star', value: 'star' },
  { name: 'Heart', value: 'heart' },
  { name: 'Check', value: 'check' },
];

interface TemplateFormData {
  name: string;
  title: string;
  subtitle: string;
  total_stamps: number;
  stamp_icon: string;
  background_color: string;
  accent_color: string;
  logo_url: string;
  reward_text: string;
}

const defaultFormData: TemplateFormData = {
  name: '',
  title: 'LOYALTY CARD',
  subtitle: 'Collect stamps to earn rewards!',
  total_stamps: 10,
  stamp_icon: 'cup',
  background_color: '#000000',
  accent_color: '#ccff00',
  logo_url: '',
  reward_text: 'FREE ITEM',
};

function StampCardPreview({
  template,
  stampCount = 3,
  customerName = 'Customer',
}: {
  template: TemplateFormData;
  stampCount?: number;
  customerName?: string;
}) {
  const [imageKey, setImageKey] = useState(0);

  // Force refresh when template changes
  useEffect(() => {
    setImageKey(prev => prev + 1);
  }, [template.title, template.subtitle, template.total_stamps, template.background_color, template.accent_color, template.reward_text, stampCount]);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({
      n: String(stampCount),
      name: customerName,
      title: template.title || 'LOYALTY CARD',
      subtitle: template.subtitle || '',
      total: String(template.total_stamps || 10),
      bg: template.background_color || '#000000',
      accent: template.accent_color || '#ccff00',
      _t: String(imageKey), // Cache buster
    });
    if (template.reward_text) params.set('reward', template.reward_text);
    return `${STAMP_SERVER_URL}/generate-card?${params.toString()}`;
  }, [template, stampCount, customerName, imageKey]);

  return (
    <div className="relative">
      <img
        key={imageKey}
        src={previewUrl}
        alt="Stamp Card Preview"
        className="w-full rounded-lg shadow-lg"
        style={{ maxWidth: '400px' }}
      />
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        Preview: {stampCount}/{template.total_stamps} stamps
      </div>
    </div>
  );
}

export function StampTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<StampCardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewStampCount, setPreviewStampCount] = useState(3);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { templates } = await stampTemplatesApi.list();
      setTemplates(templates);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await stampTemplatesApi.update(editingId, formData);
      } else {
        await stampTemplatesApi.create(formData);
      }
      await loadTemplates();
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: StampCardTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      title: template.title,
      subtitle: template.subtitle,
      total_stamps: template.total_stamps,
      stamp_icon: template.stamp_icon,
      background_color: template.background_color,
      accent_color: template.accent_color,
      logo_url: template.logo_url || '',
      reward_text: template.reward_text,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await stampTemplatesApi.delete(id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(defaultFormData);
  };

  const copyTemplateId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            <h1 className="text-xl font-bold text-white">Stamp Card Templates</h1>
            <p className="text-sm text-white/70">
              Create and manage loyalty card designs
            </p>
          </div>
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Template Form */}
        {showForm ? (
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#075E54]">
                {editingId ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    placeholder="e.g., Coffee Shop Rewards"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    placeholder="LOYALTY CARD"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    placeholder="Collect stamps to earn rewards!"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stamp Icon
                    </label>
                    <select
                      value={formData.stamp_icon}
                      onChange={(e) => setFormData({ ...formData, stamp_icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    >
                      {STAMP_ICONS.map((icon) => (
                        <option key={icon.value} value={icon.value}>
                          {icon.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, background_color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.background_color === color.value
                            ? 'border-[#25D366] scale-110'
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormData({ ...formData, accent_color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.accent_color === color.value
                            ? 'border-[#25D366] scale-110'
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reward Text
                  </label>
                  <input
                    type="text"
                    value={formData.reward_text}
                    onChange={(e) => setFormData({ ...formData, reward_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    placeholder="FREE ITEM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-white bg-[#25D366] rounded-md hover:bg-[#128C7E] disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Eye size={18} />
                    Live Preview
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Stamps:</label>
                    <input
                      type="range"
                      min="0"
                      max={formData.total_stamps}
                      value={previewStampCount}
                      onChange={(e) => setPreviewStampCount(parseInt(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm font-medium w-8">{previewStampCount}</span>
                  </div>
                </div>
                <StampCardPreview
                  template={formData}
                  stampCount={previewStampCount}
                  customerName="John Doe"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#075E54]">
                Templates ({templates.length})
              </h2>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-[#25D366] hover:bg-[#128C7E] rounded-lg transition-colors"
              >
                <Plus size={16} />
                Create Template
              </button>
            </div>

            {/* Template list */}
            <div className="divide-y divide-gray-100">
              {loading && templates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Stamp className="mx-auto mb-2 text-[#128C7E]/30" size={40} />
                  <p>No templates created yet</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-2 text-[#25D366] hover:text-[#128C7E]"
                  >
                    Create your first template
                  </button>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Mini Preview */}
                      <div className="flex-shrink-0 w-32 h-20 rounded overflow-hidden bg-gray-100">
                        <img
                          src={`${STAMP_SERVER_URL}/generate-card?n=5&name=Preview&title=${encodeURIComponent(template.title)}&total=${template.total_stamps}&bg=${encodeURIComponent(template.background_color)}&accent=${encodeURIComponent(template.accent_color)}`}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[#075E54] truncate">
                            {template.name}
                          </h3>
                          {!template.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{template.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{template.total_stamps} stamps</span>
                          <span>•</span>
                          <button
                            onClick={() => copyTemplateId(template.id)}
                            className="flex items-center gap-1 hover:text-[#25D366]"
                          >
                            {copiedId === template.id ? (
                              <>
                                <Check size={12} className="text-[#25D366]" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                Copy ID
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 text-gray-500 hover:text-[#25D366] hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-[#DCF8C6] rounded-lg border border-[#128C7E]/20">
          <h3 className="font-medium text-[#075E54] mb-2">How to use templates:</h3>
          <ol className="text-sm text-[#075E54]/80 space-y-1 list-decimal list-inside">
            <li>Create a template with your brand colors and settings</li>
            <li>Copy the template ID</li>
            <li>In your flow, add a "Send Stamp Card" node</li>
            <li>Select your template from the dropdown</li>
            <li>The card will be generated with dynamic stamp count and customer name</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
