import { useState, useEffect, useRef } from 'react'
import { supabase, getUserId } from '../lib/supabase'
import { Message, FileAttachment, Conversation, Project } from '../types'

export function useMessages(currentConvId?: string, currentProjectId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const userIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  // Define all functions first to ensure scope for addMessage
  const loadProjects = async () => {
    const userId = userIdRef.current
    if (!userId) return

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading projects:', error)
      setProjects([])
    } else {
      setProjects(data || [])
    }
  }

  const loadConversations = async (projectId?: string) => {
    const userId = userIdRef.current
    if (!userId) return

    let query = supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
    } else {
      setConversations(data || [])
    }
  }

  const switchProject = async (projectId: string) => {
    const userId = userIdRef.current
    if (!userId) return

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, title, created_at, updated_at')
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.error('Error switching project:', projectError)
      return
    }

    setCurrentProject(projectData)
    await loadConversations(projectId)
    // Reset to no current conv when switching project
    setCurrentConv(null)
  }

  const switchConversation = async (convId: string) => {
    const userId = userIdRef.current
    if (!userId) return

    setIsLoading(true)
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('id', convId)
      .single()

    if (convError) {
      console.error('Error switching conversation:', convError)
      return
    }

    setCurrentConv(convData)
    await loadMessages(convId)
  }

  const loadMessages = async (convId: string)