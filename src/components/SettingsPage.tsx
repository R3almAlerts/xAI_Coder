// src/components/SettingsPage.tsx
import React, { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, Save } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom'; // <-- add this if you use React Router
// import { useAppStore } from '../store' // <-- or however you close pages in your app

export const SettingsPage = () => {
  const navigate = useNavigate(); // optional
  // const closeSettings = useAppStore((s) => s.closeSettings); // <-- alternative

  const { settings, isLoading: storeLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default fallback values
  const {
    apiKey = '',
    baseUrl = 'https://api.x.ai',
    model = 'auto',
    logoUrl = '',
  } = settings || {};

  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
  const [localModel, setLocalModel] = useState(model);
  const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl);

  const handleClose = () => {
    // Choose ONE of these depending on your routing/state setup
    navigate(-1); // go back (works with react-router-dom)
    // closeSettings?.(); // if you have a global store
    // window.history.back();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await useSettings.getState().setSettings({
        apiKey: localApiKey,
        baseUrl: localBaseUrl,
        model: localModel,
        logoUrl: localLogoUrl,
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `logo.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath);

      setLocalLogoUrl(data.publicUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => setLocalLogoUrl('');

  if (storeLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 py-12">
      {/* Close Button – Top Right */}
      <button
        onClick={handleClose}
        className="absolute right-8 top-8 z-10 rounded-full bg-white p-3 shadow-lg transition hover:bg-gray-100"
        aria-label="Close settings"
      >
        <X className="h-6 w-6 text-gray-600" />
      </button>

      <div className="max-w-5xl mx-auto px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Configure Code Guru for your workflow</p>
        </div>

        <div className="space-y-8">
          {/* API Configuration */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <div className="p-8">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                xAI API Configuration
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-xl border border-gray-300 px-5 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 transition"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Get your key at{' '}
                    <a
                      href="https://x.ai/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      x.ai/api
                    </a>
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={localBaseUrl}
                    onChange={(e) => setLocalBaseUrl(e.target.value)}
                    placeholder="https://api.x.ai"
                    className="w-full rounded-xl border border-gray-300 px-5 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Model
                  </label>
                  <select
                    value={localModel}
                    onChange={(e) => setLocalModel(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-5 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200"
                  >
                    <option value="auto">Auto (grok-2-latest)</option>
                    <option value="grok-2-latest">grok-2-latest</option>
                    <option value="grok-beta">grok-beta</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <div className="p-8">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Application Logo
              </h2>

              <div className="flex flex-col items-start gap-10 md:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-4 border-dashed border-gray-300 bg-gray-50 shadow-inner">
                    {localLogoUrl ? (
                      <img
                        src={localLogoUrl}
                        alt="Your logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-5xl font-bold text-gray-400">CG</div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <p className="text-gray-600">
                    Upload your company logo. Recommended: 512×512 PNG with transparent background.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-3 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          Choose Image
                        </>
                      )}
                    </button>

                    {localLogoUrl && (
                      <button
                        onClick={removeLogo}
                        className="flex items-center gap-3 rounded-xl bg-red-600 px-6 py-3 font-medium text-white transition hover:bg-red-700"
                      >
                        <X size={20} />
                        Remove Logo
                      </button>
                    )}

                    {uploadSuccess && (
                      <div className="flex items-center gap-3 rounded-xl bg-green-100 px-6 py-3 text-green-800">
                        <Check size={20} />
                        Saved!
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-4 font-bold text-white text-lg shadow-lg transition hover:scale-105 hover:shadow-2xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={24} />
                  Save All Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};