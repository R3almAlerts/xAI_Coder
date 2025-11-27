// src/components/SettingsPage.tsx
import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Upload, Copy, Check, Settings as SettingsIcon, Key, Palette, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  // Fixed: Defensive destructuring + loading state
  const { settings, isLoading, updateSettings } = useSettings();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);

  // Safely read values only when settings exist
  const currentApiKey = settings?.apiKey || '';
  const currentLogoUrl = settings?.logoUrl || '';

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="space-y-8">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error } = await supabase.storage
      .from('public')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      return;
    }

    const { data } = supabase.storage.from('public').getPublicUrl(filePath);
    const newLogoUrl = data.publicUrl;

    await updateSettings({ logoUrl: newLogoUrl });
    setLogoFile(null);
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
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <SettingsIcon size={32} />
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your xAI Coder preferences and API keys
        </p>
      </div>

      <div className="space-y-8">

        {/* Logo Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe size={20} className="text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Branding</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <img
                src={currentLogoUrl || '/vite.svg'}
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
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key size={20} className="text-green-600" />
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
              x.ai/api →
            </a>
          </p>
        </div>

        {/* Theme (Future) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette size={20} className="text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Dark mode follows your system preference
          </p>
        </div>
      </div>
    </div>
  );
}