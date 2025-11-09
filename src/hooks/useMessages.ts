import { useState, useEffect } from 'react'
import { supabase, getUserId } from '../lib/supabase'
import { Message, FileAttachment, Conversation } from '../types'

export function useMessages(currentConvId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null)

  useEffect(() => {
    async function initialize() {
      setIsLoading(true)
      const userId = await getUserId()
      if (!userId) {
        setIsLoading(false)
        return
      }

      await loadConversations(userId)
      if (currentConvId) {
        await switchConversation(currentConvId, userId)
      } else {
        // Default to latest or create new
        const latestConv = conversations[0]
        if (latestConv) {
          await switchConversation(latestConv.id, userId)
        } else {
          await createConversation('New Conversation', userId)
        }
      }
      setIsLoading(false)
    }

    initialize()
  }, [])

  const loadConversations = async (userId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
    } else {
      setConversations(data || [])
    }
  }

  const switchConversation = async (convId: string, userId: string) => {
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

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    } else {
      // Parse attachments from JSONB
      const parsedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).getTime(),
        attachments: JSON.parse(msg.attachments || '[]') as FileAttachment[],
      }))
      setMessages(parsedMessages)
    }
    setIsLoading(false)
  }

  const createConversation = async (title: string = 'New Conversation', userId: string) => {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title })
      .select('id, title, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return
    }

    setConversations([newConv, ...conversations])
    await switchConversation(newConv.id, userId)
  }

  const deleteConversation = async (convId: string, userId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', convId)

    if (error) {
      console.error('Error deleting conversation:', error)
      return
    }

    setConversations(conversations.filter(c => c.id !== convId))
    if (currentConv?.id === convId) {
      // Switch to another or create new
      const nextConv = conversations[0]
      if (nextConv) {
        await switchConversation(nextConv.id, userId)
      } else {
        await createConversation('New Conversation', userId)
      }
    }
  }

  const updateConversationTitle = async (convId: string, newTitle: string, userId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', convId)

    if (error) {
      console.error('Error updating conversation title:', error)
      return
    }

    setConversations(conversations.map(c => c.id === convId ? { ...c, title: newTitle } : c))
    if (currentConv?.id === convId) {
      setCurrentConv({ ...currentConv, title: newTitle })
    }
  }

  const addMessage = async (message: Omit<Message, 'id'>, userId: string) => {
    if (!currentConv) {
      throw new Error('No active conversation. Please select or create one.')
    }

    const dbMessage = {
      conversation_id: currentConv.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.timestamp),
      attachments: JSON.stringify(message.attachments || []),
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(dbMessage)
      .select()
      .single()

    if (error) {
      console.error('Error adding message:', error)
      throw error
    }

    // Add to local state with DB-generated ID
    const fullMessage: Message = { ...message, id: data.id }
    setMessages((prev) => [...prev, fullMessage])

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConv.id)

    // Refresh conversations list for updated_at
    await loadConversations(userId)
  }

  return { 
    messages, 
    conversations, 
    currentConv, 
    addMessage: (msg: Omit<Message, 'id'>) => addMessage(msg, userId), 
    isLoading,
    switchConversation: (convId: string) => switchConversation(convId, userId),
    createConversation: (title?: string) => createConversation(title || 'New Conversation', userId),
    deleteConversation: (convId: string) => deleteConversation(convId, userId),
    updateConversationTitle: (convId: string, title: string) => updateConversationTitle(convId, title, userId)
  }
}