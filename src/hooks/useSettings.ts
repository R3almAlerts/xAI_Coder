// src/hooks/useSettings.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface Settings {
  apiKey: string
  baseUrl: string
  model: string
  logoUrl: string
}

interface SettingsStore {
  settings: Settings
  isLoading: boolean
  isInitialized: boolean
  setSettings: (updates: Partial<Settings>) => Promise<void>
  loadSettings: () => Promise<void>
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: 'https://api.x.ai',
  model: 'auto',
  logoUrl: '',
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isInitialized: false,

  setSettings: async (updates) => {
    const updated = { ...get().settings, ...updates }
    set({ settings: updated })

    try {
      await supabase
        .from('settings')
        .upsert({ id: 'global', ...updated }, { onConflict: 'id' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      // Still update locally — user experience matters
    }
  },

  loadSettings: async () => {
    if (get().isInitialized) return

    set({ isLoading: true })

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      set({
        settings: data || DEFAULT_SETTINGS,
        isLoading: false,
        isInitialized: true,
      })
    } catch (err) {
      console.error('Settings load failed:', err)
      set({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        isInitialized: true,
      })
    }
  },
}))

// Auto-load settings when app starts
// This is safe to call multiple times
useSettings.getState().loadSettings()