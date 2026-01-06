import { useState, useRef, useCallback } from 'react';
import { Upload, Link, FolderOpen, X, Loader2, Image as ImageIcon, Check } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  orgId?: string;
}

type TabType = 'url' | 'upload' | 'library';

interface CdnFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  modified: string;
}

export function ImageUploader({ value, onChange, orgId }: ImageUploaderProps) {
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<CdnFile[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load library files when tab is selected
  const loadLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const url = orgId ? `/api/cdn/list?orgId=${orgId}` : '/api/cdn/list';
      const response = await fetch(url);
      const data = await response.json();
      if (data.files) {
        // Filter to only show images
        const imageFiles = data.files.filter((f: CdnFile) =>
          f.mimeType?.startsWith('image/')
        );
        setLibraryFiles(imageFiles);
      }
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [orgId]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'library') {
      loadLibrary();
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (orgId) {
        formData.append('orgId', orgId);
      }

      const response = await fetch('/api/cdn/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      onChange(result.url);
      setActiveTab('url'); // Switch to URL tab to show the result
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    } else {
      setUploadError('Please drop an image file');
    }
  };

  const handleLibrarySelect = (file: CdnFile) => {
    onChange(file.url);
    setActiveTab('url');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('url')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'url'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link size={14} />
          URL
        </button>
        <button
          onClick={() => handleTabChange('upload')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'upload'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload size={14} />
          Upload
        </button>
        <button
          onClick={() => handleTabChange('library')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'library'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderOpen size={14} />
          Library
        </button>
      </div>

      {/* URL Tab */}
      {activeTab === 'url' && (
        <div>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.png"
          />
          {value && (
            <div className="mt-2 relative">
              <img
                src={value}
                alt="Preview"
                className="w-full h-32 object-contain bg-gray-100 rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <button
                onClick={() => onChange('')}
                className="absolute top-1 right-1 p-1 bg-white rounded-full shadow hover:bg-gray-100"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to select or drag & drop
                </span>
                <span className="text-xs text-gray-400">
                  PNG, JPG, GIF, WebP up to 50MB
                </span>
              </div>
            )}
          </div>
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
        </div>
      )}

      {/* Library Tab */}
      {activeTab === 'library' && (
        <div>
          {isLoadingLibrary ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : libraryFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No images in library</p>
              <p className="text-xs">Upload images to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {libraryFiles.map((file) => (
                <button
                  key={file.key}
                  onClick={() => handleLibrarySelect(file)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                    value === file.url
                      ? 'border-blue-500'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={file.url}
                    alt={file.key}
                    className="w-full h-full object-cover"
                  />
                  {value === file.url && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <Check size={20} className="text-blue-600" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                    <span className="text-[10px] text-white truncate block">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={loadLibrary}
            className="mt-2 w-full text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh Library
          </button>
        </div>
      )}
    </div>
  );
}
