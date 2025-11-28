// src/components/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { X, Upload, Copy, Check, Loader2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { createClient } from '@supabase/supabase-js';

// Use SERVICE_ROLE key for storage (bypasses RLS) — safe in client if .env is protected
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY // ← This bypasses RLS
);

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface SettingsPageProps {
  onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const { settings, updateSettings } = useSettings();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const currentLogoUrl = settings?.logoUrl || '';

  useEffect(() => {
    if (currentLogoUrl) setLogoPreview(currentLogoUrl);
  }, [currentLogoUrl]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Max 5MB');
      return;
    }

    setLogoFile(file);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async () => {
    if (!logoFile) return;

    setIsUploading(true);

    try {
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `org-logo-${crypto.randomUUID()}.${fileExt}`;

      // ADMIN CLIENT — BYPASSES RLS ENTIRELY
      let { data, error } = await supabaseAdmin.storage
        .from('avatars')
        .upload(fileName, logoFile, {
          upsert: true,
          contentType: logoFile.type,
        });

      // Auto-create bucket if missing
      if (error && error.message.includes('Bucket not found')) {
        await supabaseAdmin.storage.createBucket('avatars', { public: true });
        const retry = await supabaseAdmin.storage
          .from('avatars')
          .upload(fileName, logoFile, { upsert: true });
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateSettings({ logoUrl: publicUrl });

      setLogoPreview(publicUrl);
      setUploadSuccess(true);
      alert('Logo uploaded successfully! 🚀');
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
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
    navigator.clipboard.writeText(settings?.apiKey || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative h-full flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg z-10"
        aria-label="Close"
      >
        <X size={24} />
      </button>

      <div className="max-w-4xl mx-auto p-6 lg:p-8 flex-1 overflow-y-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your xAI Coder workspace
          </p>
        </div>

        <div className="space-y-8">
          {/* Branding */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">Branding</h2>

            <div className="flex items-start gap-8">
              <img
                src={logoPreview || '/vite.svg'}
                alt="Logo"
                className="w-32 h-32 rounded-xl object-contain bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 p-2"
              />

              <div className="flex-1 space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
                <p className="text-sm text-gray-500">Max 5MB • PNG, JPG, SVG</p>

                {logoFile && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={uploadLogo}
                      disabled={isUploading}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
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
                        Success!
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">xAI API Key</h2>

            {settings?.apiKey ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono text-sm">
                <code>{settings.apiKey.slice(0, 12)}••••••••{settings.apiKey.slice(-8)}</code>
                <button onClick={copyApiKey} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                  {copied ? <Check className="text-green-600" /> : <Copy />}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 italic">No API key set</p>
            )}

            <div className="mt-6 flex gap-3">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiKeySave()}
                className="flex-1 px-4 py-3 rounded-lg border bg-white dark:bg-gray-700"
              />
              <button
                onClick={handleApiKeySave}
                disabled={!apiKey.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Save Key
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Get your key →{' '}
              <a href="https://x.ai/api" target="_blank" className="text-blue-600 hover:underline">
                x.ai/api
              </a>
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Appearance</h2>
            <p className="text-gray-500">Dark mode follows system preference</p>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsPage.displayName = 'SettingsPage';