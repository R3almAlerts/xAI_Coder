import { useState, useEffect } from 'react'
import { supabase, getUserId } from '../lib/supabase'
import { Message, FileAttachment } from '../types'

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)

  useEffect(() => {
    async function initialize() {
      setIsLoading(true)
      const userId = await getUserId()
      if (!userId) {
        setIsLoading(false)
        return
      }

      // Fetch or create default conversation
      let { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .order('created_at', { ascending: false })

      if (convError) {
        console.error('Error fetching conversations:', convError)
        setIsLoading(false)
        return
      }

      let convId: string
      if (!conversations || conversations.length === 0) {
        const { data: newConv, error: insertError } = await supabase
          .from('conversations')
          .insert({ user_id: userId, title: 'New Conversation' })
          .select('id')
          .single()

        if (insertError) {
          console.error('Error creating conversation:', insertError)
          setIsLoading(false)
          return
        }
        convId = newConv!.id
      } else {
        convId = conversations[0].id
      }

      setCurrentConvId(convId)
      await loadMessages(convId)
    }

    initialize()
  }, [])

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

  const addMessage = async (message: Omit<Message, 'id'>) => {
    if (!currentConvId) {
      throw new Error('No active conversation. Please initialize first.')
    }

    const dbMessage = {
      conversation_id: currentConvId,
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
  }

  return { messages, addMessage, isLoading }
}