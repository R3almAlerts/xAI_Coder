// src/App.tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Settings as SettingsIcon,
  Loader2,
  Menu,
  X,
  Search,
  Upload,
  Trash2,
  Download,
  File,
  Copy,
  Check,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// BULLETPROOF MARKDOWN WITH COPY BUTTONS
const MarkdownViewer = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none"
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const codeString = String(children).replace(/\n$/, '')
          const codeId = Math.random().toString(36)

          return !inline && match ? (
            <div className="my-4 -mx-5 relative group">
              <button
                onClick={() => copyToClipboard(codeString, codeId)}
                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                {copied === codeId ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
              </button>
              <pre className="rounded-lg overflow-x-auto bg-gray-900 p-4">
                <code className={`language-${match[1]} text-xs text-gray-100`} {...props}>
                  {codeString}
                </code>
              </pre>
            </div>
          ) : (
            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono" {...props}>
              {children}
            </code>
          )
        },
      }}
    >
      {children || ''}
    </ReactMarkdown>
  )
}

// ERROR BOUNDARY - CATCHES ANY RENDER ERROR
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-red-600 p-4">Render error. Check console.</div>
    }
    return this.props.children
  }
}

const ChatMessage = ({ message }: { message: any }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">G</span>
        </div>
      )}
      <div className={`max-w-2xl ${isUser ? 'bg-blue-600 text-white' : 'bg-white'} rounded-2xl px-5 py-3 shadow-sm`}>
        <ErrorBoundary>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownViewer>{message.content}</MarkdownViewer>
          )}
        </ErrorBoundary>
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">U</span>
        </div>
      )}
    </div>
  )
}

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [configProject, setConfigProject] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'instructions' | 'files'>('instructions')
  const [instructions, setInstructions] = useState('')
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [projectIdToDelete, setProjectIdToDelete] = useState<string | null>(null)
  const [projectTitleToDelete, setProjectTitleToDelete] = useState<string>('')

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)

  const { settings, setSettings, isLoading: isLoadingSettings } = useSettings()
  const {
    messages,
    conversations,
    currentConv,
    projects,
    currentProject,
    addMessage,
    isLoading: isLoadingMessages,
    createConversation,
    createProject,
    deleteConversation,
    updateConversationTitle,
    setProjects,
    setCurrentProject,
  } = useMessages(currentConvId, currentProjectId, {
    setCurrentProjectId,
    setCurrentConvId,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isSettingsPage = location.pathname === '/settings'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) await supabase.auth.signInAnonymously()
      } catch (err) {
        console.warn('Auth init failed', err)
      }
    }
    init()
  }, [])

  const sendMessage = async (content: string) => {
    if (!settings.apiKey || !currentConv || !content.trim()) return

    await addMessage({ role: 'user', content, timestamp: Date.now() })
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model === 'auto' ? 'grok-2-latest' : settings.model,
          messages: [
            ...(instructions ? [{ role: 'system', content: instructions }] : []),
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      })

      if (!res.ok) throw new Error(`API Error ${res.status}`)
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'No response'

      await addMessage({
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      })
    } catch (err: any) {
      setError(err.message || 'Failed to send')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingSettings || isLoadingMessages) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* HEADER */}
      {!isSettingsPage && (
        <header className="bg-white border-b shadow-sm flex items-center justify-between px-4 py-3 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Grok Chat</h1>
          </div>
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
            <SettingsIcon size={24} className="text-gray-600" />
          </Link>
        </header>
      )}

      <div className="flex flex-1 relative overflow-hidden">
        {/* MAIN CHAT */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
              <Routes>
                <Route path="/" element={
                  messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div className="space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                          <span className="text-white font-bold text-4xl">G</span>
                        </div>
                        <h2 className="text-2xl font-bold">Start a conversation</h2>
                        <p className="text-gray-500">Ask me anything!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((m, i) => <ChatMessage key={m.id || i} message={m} />)}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                          <div className="bg-gray-100 rounded-2xl px-4 py-3">
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
                  )
                } />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </div>

          {!isSettingsPage && (
            <div className="bg-white border-t">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  onSend={sendMessage}
                  disabled={isLoading || !settings.apiKey}
                  currentModel={settings.model}
                  onOpenModelSelector={() => setIsModelSelectorOpen(true)}
                  currentProjectId={currentProjectId}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentModel={settings.model}
        onSelectModel={(m) => setSettings({ ...settings, model: m })}
      />
    </div>
  )
}

export default App