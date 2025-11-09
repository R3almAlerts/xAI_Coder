import { useState, useEffect } from 'react'
import { supabase, getUserId } from '../lib/supabase'
import { Settings } from '../types'

export function useSettings() {
  const [settings, setSettingsLocal] = useState<Settings>({
    apiKey: '',
    baseUrl: 'https://api.x.ai',
    model: 'auto',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)
      const userId = await getUserId()
      if (!userId) {
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error loading settings:', error)
      }

      const loadedSettings: Settings = data || {
        apiKey: '',
        baseUrl: 'https://api.x.ai',
        model: 'auto',
      }
      setSettingsLocal(loadedSettings)
      setIsLoading(false)
    }

    loadSettings()
  }, [])

  const setSettings = async (newSettings: Settings) => {
    const userId = await getUserId()
    if (!userId) {
      throw new Error('User not authenticated. Please sign in.')
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...newSettings })
      .eq('user_id', userId)

    if (error) {
      console.error('Error saving settings:', error)
      throw error
    }

    setSettingsLocal(newSettings)
  }

  return { settings, setSettings, isLoading }
}