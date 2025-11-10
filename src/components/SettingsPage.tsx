// src/components/SettingsPage.tsx
import React, { useState, useRef } from 'react'
import { Upload, X, Check, Loader2 } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../lib/supabase'

export const SettingsPage = () => {
  const { settings, setSettings, isLoading } = useSettings()
  const [apiKey, setApiKey] = useState(settings.apiKey || '')
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || 'https://api.x.ai')
  const [model, setModel] = useState(settings.model || 'auto')
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    await setSettings({
      apiKey,
      baseUrl,
      model,
      logoUrl,
    })
  }

  const handleLogoUpload = async (file: File) => {
    if (!file) return

    setUploading(true)
    setUploadSuccess(false)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo.${fileExt}`
      const filePath = `public/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl
      setLogoUrl(publicUrl)
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
    setLogoUrl('')
    setUploadSuccess(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-8">
        {/* API Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                xAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.x.ai"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="auto">Auto (grok-2-latest)</option>
                <option value="grok-2-latest">grok-2-latest</option>
                <option value="grok-beta">grok-beta</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Application Logo</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-4xl font-bold text-gray-400">CG</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  Upload a custom logo for Code Guru (recommended: 512x512 PNG)
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Choose File
                      </>
                    )}
                  </button>
                  {logoUrl && (
                    <button
                      onClick={removeLogo}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  )}
                  {uploadSuccess && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check size={16} />
                      <span>Logo uploaded!</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}