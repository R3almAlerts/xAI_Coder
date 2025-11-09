import { useState, useEffect } from 'react'
import { supabase, getUserId } from '../lib/supabase'
import { Settings } from '../types'

// Helper to transform camelCase to snake_case for DB compatibility
const camelToSnake = (obj: any): any => {
  const snakeObj: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    snakeObj[snakeKey] = value
  }
  return snakeObj
}

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

      const loadedData = data as any // DB returns snake_case
      const loadedSettings: Settings = {
        apiKey: loadedData?.api_key || '',
        baseUrl: loadedData?.base_url || 'https://api.x.ai',
        model: loadedData?.model || 'auto',
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

    // Transform camelCase to snake_case for DB
    const dbPayload = camelToSnake({
      user_id: userId,
      ...newSettings,
    })

    const { error } = await supabase
      .from('user_settings')
      .upsert(dbPayload, { on_conflict: 'user_id' })

    if (error) {
      console.error('Error saving settings:', error)
      throw error
    }

    setSettingsLocal(newSettings)
  }

  return { settings, setSettings, isLoading }
}