// src/components/SettingsPage.tsx
import React, { useState, useRef } from 'react'
import { Upload, X, Check, Loader2, Save } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../lib/supabase'

export const SettingsPage = () => {
  const { settings, isLoading: storeLoading } = useSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Default fallback values
  const {
    apiKey = '',
    baseUrl = 'https://api.x.ai',
    model = 'auto',
    logoUrl = ''
  } = settings || {}

  const [localApiKey, setLocalApiKey] = useState(apiKey)
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl)
  const [localModel, setLocalModel] = useState(model)
  const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await useSettings.getState().setSettings({
        apiKey: localApiKey,
        baseUrl: localBaseUrl,
        model: localModel,
        logoUrl: localLogoUrl
      })
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!file) return
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
      const fileName = `logo.${fileExt}`
      const filePath = `public/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath)

      setLocalLogoUrl(data.publicUrl)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = () => {
    setLocalLogoUrl('')
  }

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure Code Guru for your workflow</p>
      </div>

      <div className="space-y-8">

        {/* API Configuration */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">xAI API Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
              />
              <p className="text-xs text-gray-500 mt-2">Get your key at <a href="https://x.ai/api" target="_blank" className="text-indigo-600 hover:underline">x.ai/api</a></p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                placeholder="https://api.x.ai"
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Model
              </label>
              <select
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500"
              >
                <option value="auto">Auto (grok-2-latest)</option>
                <option value="grok-2-latest">grok-2-latest</option>
                <option value="grok-beta">grok-beta</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Logo</h2>
          
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shadow-inner">
                {localLogoUrl ? (
                  <img src={localLogoUrl} alt="Your Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-5xl font-bold text-gray-400">CG</div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <p className="text-gray-600">
                Upload your company logo. Recommended: 512×512 PNG with transparent background.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-3 font-medium transition"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
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
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-3 font-medium transition"
                  >
                    <X size={20} />
                    Remove Logo
                  </button>
                )}

                {uploadSuccess && (
                  <div className="px-6 py-3 bg-green-100 text-green-800 rounded-xl flex items-center gap-3">
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

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition flex items-center gap-3"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
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
  )
}