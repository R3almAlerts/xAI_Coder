// src/App.tsx
import { useRef, useEffect, useState } from 'react'
import {
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react'
import { Message, FileAttachment } from './types'
import { useSettings } from './hooks/useSettings'
import { useMessages } from './hooks/useMessages'
import { ModelSelectorModal } from './components/ModelSelectorModal'
import { ProjectsList } from './components/ProjectsList'
import { ConversationsList } from './components/ConversationsList'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { SettingsPage } from './components/SettingsPage'
import {
  useLocation,
  useNavigate,
  Routes,
  Route,
  Link,
} from 'react-router-dom'
import { supabase } from './lib/supabase'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)

  // These two pieces of state control which project/conversation is active
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { settings, setSettings, isLoading: isLoadingSettings } = useSettings()

  // Pass the setters into the hook – this is what fixes the ReferenceError
  const {
    messages,
    conversations,
    currentConv,
    projects,
    currentProject,
    addMessage,
    isLoading: isLoadingMessages,
    switchConversation,
    switchProject,
    createConversation,
    createProject,
    deleteConversation,
    updateConversationTitle,
  } = useMessages(currentConvId, currentProjectId, {
    setCurrentProjectId,
    setCurrentConvId,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const isSettingsPage = location.pathname === '/settings'

  // -----------------------------------------------------------------
  // Anonymous auth (runs once)
  // -----------------------------------------------------------------
  useEffect(() => {
    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) console.warn('Anonymous auth disabled:', error.message)
      }
    }
    initAuth()
  }, [])

  // -----------------------------------------------------------------
  // Scroll to bottom on new messages
  // -----------------------------------------------------------------
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages])

  // -----------------------------------------------------------------
  // Sidebar handlers
  // -----------------------------------------------------------------
  const handleSelectProject = (projectId: string) => {
    setCurrentProjectId(projectId)
    setCurrentConvId(null)
    setIsSidebarOpen(false)
  }

  const handleSelectConv = (convId: string) => {
    setCurrentConvId(convId)
    setIsSidebarOpen(false)
  }

  const handleCreateNewProject = () => createProject()
  const handleCreateNewConv = () => createConversation()

  const handleDeleteConv = (convId: string) => deleteConversation(convId)

  const handleUpdateTitle = (
    itemId: string,
    newTitle: string,
    isProject: boolean
  ) => {
    if (isProject) {
      console.log('TODO: update project title', itemId, newTitle)
    } else {
      updateConversationTitle(itemId, newTitle)
    }
  }

  const handleDeleteProject = (projectId: string) => {
    if (
      confirm(
        'Delete this project? All conversations will be moved to the default project.'
      )
    ) {
      console.log('TODO: delete project', projectId)
    }
  }

  const handleUpdateProjectTitle = (projectId: string, newTitle: string) => {
    console.log('TODO: update project title', projectId, newTitle)
  }

  // -----------------------------------------------------------------
  // Send message to Grok
  // -----------------------------------------------------------------
  const sendMessage = async (
    content: string,
    attachments?: FileAttachment[]
  ) => {
    if (!settings.apiKey) {
      setError('Please configure your API key in Settings')
      navigate('/settings')
      return
    }

    if (!currentConv) {
      setError('No active conversation')
      return
    }

    const userMsg: Omit<Message, 'id'> = {
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments,
    }

    try {
      await addMessage(userMsg)
    } catch (e) {
      setError('Failed to save message')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = `${settings.baseUrl}/v1/chat/completions`
      const model =
        settings.model === 'auto' ? 'grok-2-latest' : settings.model

      const apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      let finalContent = content
      // (attachment handling kept simple – you already have it working)

      const payload = {
        model,
        messages: [...apiMessages, { role: 'user', content: finalContent }],
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `API error ${res.status}`)
      }

      const data = await res.json()
      const assistantMsg: Omit<Message, 'id'> = {
        role: 'assistant',
        content:
          data.choices?.[0]?.message?.content || 'No response from Grok',
        timestamp: Date.now(),
      }

      await addMessage(assistantMsg)
    } catch (e: any) {
      setError(e.message || 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const hasApiKey = Boolean(settings.apiKey)

  // -----------------------------------------------------------------
  // Loading screen
  // -----------------------------------------------------------------
  if (isLoadingSettings || isLoadingMessages) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  // -----------------------------------------------------------------
  // Main UI
  // -----------------------------------------------------------------
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* HEADER */}
      {!isSettingsPage && (
        <header className="bg-white border-b shadow-sm flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-900">Grok Chat</h1>
              <p className="text-sm text-gray-500">Powered by xAI</p>
            </div>
          </div>

          <Link
            to="/settings"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon size={24} className="text-gray-600" />
          </Link>
        </header>
      )}

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 transition-transform duration-200 ease-in-out`}
        >
          <div className="flex h-full">
            <ProjectsList
              currentProjectId={currentProjectId}
              projects={projects}
              onSelectProject={handleSelectProject}
              onCreateNew={handleCreateNewProject}
              onDeleteProject={handleDeleteProject}
              onUpdateTitle={handleUpdateProjectTitle}
            />
            <ConversationsList
              currentConvId={currentConvId}
              conversations={conversations}
              onSelectConv={handleSelectConv}
              onCreateNew={handleCreateNewConv}
              onDeleteConv={handleDeleteConv}
              onUpdateTitle={handleUpdateTitle}
            />
          </div>
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* CHAT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isSettingsPage && (
            <div className="border-b border-gray-200 bg-white">
              <div className="max-w-4xl mx-auto px-4 py-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentConv?.title || 'New Conversation'}
                </h2>
              </div>
            </div>
          )}

          <Routes>
            <Route
              path="/"
              element={
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-4xl mx-auto px-4 py-6">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                            <span className="text-white font-bold text-4xl">
                              G
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Start a conversation
                          </h2>
                          <p className="text-gray-500 max-w-md">
                            Ask me anything! I'm Grok, powered by xAI's
                            advanced language model.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {messages.map((msg, i) => (
                          <ChatMessage key={msg.id || i} message={msg} />
                        ))}

                        {isLoading && (
                          <div className="flex gap-3 justify-start">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                              <Loader2
                                size={20}
                                className="text-white animate-spin"
                              />
                            </div>
                            <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </div>
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>

          {/* INPUT */}
          {!isSettingsPage && (
            <ChatInput
              onSend={sendMessage}
              disabled={isLoading || !hasApiKey}
              currentModel={settings.model}
              onOpenModelSelector={() => setIsModelSelectorOpen(true)}
              currentProjectId={currentProjectId}
            />
          )}
        </div>
      </div>

      {/* ALERT BANNERS */}
      {!isSettingsPage && !hasApiKey && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3 text-yellow-800">
            <AlertCircle size={20} />
            <p className="text-sm">
              Please configure your API key in Settings to start chatting.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="ml-auto text-yellow-600 hover:text-yellow-700 font-medium text-sm underline"
            >
              Go to Settings
            </button>
          </div>
        </div>
      )}

      {!isSettingsPage && error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3 text-red-800">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MODEL SELECTOR MODAL */}
      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentModel={settings.model}
        onSelectModel={model => setSettings({ ...settings, model })}
      />
    </div>
  )
}

export default App