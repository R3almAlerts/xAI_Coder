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

  useEffect(() => {
    if (currentLogoUrl) {
      setLogoPreview(currentLogoUrl);
    }
  }, [currentLogoUrl]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    setLogoFile(file);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async () => {
    if (!logoFile) return;

    setIsUploading(true);

    try {
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `org-logo-${crypto.randomUUID()}.${fileExt}`;

      // FLAT PATH — NO SUBFOLDERS → This works 100% with your current bucket
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, logoFile, {
          upsert: true,
          contentType: logoFile.type,
        });

      if (error) throw error;

      // Get PUBLIC URL — your avatars bucket is public
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateSettings({ logoUrl: publicUrl });

      setLogoPreview(publicUrl);
      setUploadSuccess(true);
      alert('Logo uploaded successfully! 🎉');
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApiKeySave = async () => {
    if (apiKey.trim()) {
      await updateSettings({ apiKey: apiKey.trim() });
      setApiKey('');
      alert('API key saved securely');
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(currentApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative h-full flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
        aria-label="Close settings"
      >
        <X size={24} />
      </button>

      <div className="max-w-4xl mx-auto p-6 lg:p-8 flex-1 overflow-y-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your xAI Coder preferences and API keys
          </p>
        </div>

        <div className="space-y-8">
          {/* Branding */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Branding</h2>

            <div className="flex items-start gap-8">
              <div className="flex-shrink-0">
                <img
                  src={logoPreview || '/vite.svg'}
                  alt="Organization logo"
                  className="w-32 h-32 rounded-xl object-contain bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 p-2"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div>
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
                    Recommended: 512×512 PNG, JPG or SVG • Max 5MB
                  </p>
                </div>

                {logoFile && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={uploadLogo}
                      disabled={isUploading}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 font-medium"
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

                    {uploadSuccess && (
                      <span className="text-green-600 flex items-center gap-2 font-medium">
                        <Check className="w-5 h-5" />
                        Uploaded!
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">xAI API Key</h2>

            {currentApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono text-sm">
                  <code className="text-gray-700 dark:text-gray-300">
                    {currentApiKey.slice(0, 12)}••••••••{currentApiKey.slice(-8)}
                  </code>
                  <button
                    onClick={copyApiKey}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your API key is encrypted and only used to talk to Grok.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic mb-4">
                No API key configured yet
              </p>
            )}

            <div className="flex gap-3">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiKeySave()}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              Get your key from{' '}
              <a href="https://x.ai/api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                x.ai/api
              </a>
            </p>
          </div>

          {/* Appearance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
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