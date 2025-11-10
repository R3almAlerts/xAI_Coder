// src/hooks/useSettings.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface Settings {
  apiKey: string
  baseUrl: string
  model: string
  logoUrl: string
}

export const useSettings = create<{
  settings: Settings
  isLoading: boolean
  setSettings: (s: Partial<Settings>) => Promise<void>
}>((set) => ({
  settings: {
    apiKey: '',
    baseUrl: 'https://api.x.ai',
    model: 'auto',
    logoUrl: ''
  },
  isLoading: true,

  setSettings: async (newSettings) => {
    const updated = { ...useSettings.getState().settings, ...newSettings }
    set({ settings: updated })

    await supabase
      .from('settings')
      .upsert({ id: 'global', ...updated })
  },

  init: async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .single()

      if (data) {
        set({ settings: data, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (err) {
      console.error('Settings load failed:', err)
      set({ isLoading: false })
    }
  }
}))

// Auto-init
useSettings.getState().init()