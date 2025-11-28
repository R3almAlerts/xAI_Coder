// src/components/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { X, Upload, Copy, Check, Loader2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';

interface SettingsPageProps {
  onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const { settings, isLoading, updateSettings } = useSettings();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const currentApiKey = settings?.apiKey || '';
  const currentLogoUrl = settings?.logoUrl || '';

  // Load preview on mount
  useEffect(() => {
    if (currentLogoUrl) {
      setLogoPreview(currentLogoUrl);
    }
  }, [currentLogoUrl]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    setLogoFile(file);
    setUploadSuccess(false);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(currentLogoUrl);
    setUploadSuccess(false);
  };

  const uploadLogo = async () => {
    if (!logoFile) return;

    setIsUploading(true);

    try {
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${crypto.randomUUID()}.${fileExt || 'png'}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, logoFile, {
          upsert: true,
          contentType: logoFile.type,
          cacheControl: '3600',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      // Update settings
      await updateSettings({ logoUrl: publicUrl });

      setUploadSuccess(true);
      alert('Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApiKeySave = async () => {
    if (apiKey.trim()) {
      await updateSettings({ apiKey: apiKey.trim() });
      setApiKey('');
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(currentApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Close settings"
      >
        <X size={24} />
      </button>

      <div className="max-w-4xl mx-auto p-6 lg:p-8 flex-1 overflow-y-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your xAI Coder preferences and API keys
          </p>
        </div>

        <div className="space-y-8">
          {/* Branding */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Branding</h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <img
                  src={logoPreview || currentLogoUrl || '/vite.svg'}
                  alt="Current logo"
                  className="w-24 h-24 rounded-xl object-contain bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600"
                />
              </div>

              <div className="flex-1">
                <label className="block">
                  <span className="sr-only">Upload new logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </label>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Recommended: 512×512 PNG or SVG
                </p>
                {logoFile && (
                  <button
                    onClick={uploadLogo}
                    disabled={isUploading}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 text-sm font-medium"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </>
                    )}
                  </button>
                )}
                {uploadSuccess && (
                  <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Logo uploaded successfully!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">xAI API Key</h2>
            </div>

            {currentApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {currentApiKey.slice(0, 12)}••••••••{currentApiKey.slice(-8)}
                  </code>
                  <button
                    onClick={copyApiKey}
                    className="ml-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your API key is stored securely and only used to communicate with Grok.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No API key configured yet
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <input
                type="password"
                placeholder="Enter your xAI API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiKeySave()}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleApiKeySave}
                disabled={!apiKey.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Save Key
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Get your API key from{' '}
              <a
                href="https://x.ai/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                x.ai/api
              </a>
            </p>
          </div>

          {/* Appearance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Dark mode follows your system preference
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsPage.displayName = 'SettingsPage';