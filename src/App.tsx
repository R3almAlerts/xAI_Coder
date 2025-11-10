// src/App.tsx
import { useRef, useEffect, useState } from 'react'
import {
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  Menu,
  X,
  Search,
  FileText,
  MessageSquare,
  Upload,
  Trash2,
  Folder,
  Download,
  File,
  Check,
  XCircle,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [configProject, setConfigProject] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'instructions' | 'files' | 'history'>('instructions')
  const [instructions, setInstructions] = useState('')
  const [projectFiles, setProjectFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) await supabase.auth.signInAnonymously()
    }
    init()
  }, [])

  const openConfig = async (project: any) => {
    setConfigProject(project)
    setActiveTab('instructions')
    setProjectFiles([])
    setInstructions('')

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('instructions')
        .eq('id', project.id)
        .maybeSingle()

      if (!error || error.code === 'PGRST116') {
        setInstructions(data?.instructions || '')
      }
    } catch (err) {
      console.error(err)
    }

    if (activeTab === 'files') {
      loadProjectFiles(project.id)
    }
  }

  const loadProjectFiles = async (projectId: string) => {
    const { data, error } = await supabase.storage
      .from('project-files')
      .list(`project_${projectId}`, { limit: 100 })

    if (error) {
      console.error('Load files error:', error)
      return
    }

    setProjectFiles(data || [])
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !configProject) return
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const filePath = `project_${configProject.id}/${Date.now()}_${file.name}`

      const { error } = await supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          upsert: true,
        })

      if (error) {
        setError(`Failed to upload ${file.name}`)
        console.error(error)
      }
    }

    await loadProjectFiles(configProject.id)
    setUploading(false)
  }

  const deleteFile = async (fileName: string) => {
    if (!configProject) return

    const { error } = await supabase.storage
      .from('project-files')
      .remove([`project_${configProject.id}/${fileName}`])

    if (error) {
      setError('Failed to delete file')
    } else {
      setProjectFiles(prev => prev.filter(f => f.name !== fileName))
    }
  }

  const downloadFile = async (fileName: string) => {
    if (!configProject) return

    const { data, error } = await supabase.storage
      .from('project-files')
      .download(`project_${configProject.id}/${fileName}`)

    if (error || !data) {
      setError('Download failed')
      return
    }

    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveInstructions = async () => {
    if (!configProject) return

    const { error } = await supabase
      .from('projects')
      .update({ 
        instructions,
        updated_at: new Date().toISOString()
      })
      .eq('id', configProject.id)

    if (error) {
      setError('Save failed')
    } else {
      setError(null)
    }
  }

  // ... [rest of handlers unchanged] ...

  const sendMessage = async (content: string, attachments?: FileAttachment[]) => {
    // unchanged
  }

  const hasApiKey = Boolean(settings.apiKey)

  if (isLoadingSettings || isLoadingMessages) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* HEADER & SIDEBAR - unchanged */}
      {/* ... same as before ... */}

      {/* CONFIG PANEL WITH FILE UPLOAD */}
      {configProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfigProject(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{configProject.title}</h2>
                <p className="text-sm text-gray-500">Project Configuration</p>
              </div>
              <button onClick={() => setConfigProject(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="flex border-b">
              <button
                onClick={() => { setActiveTab('instructions'); }}
                className={`px-6 py-3 font-medium transition-colors ${activeTab === 'instructions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Instructions
              </button>
              <button
                onClick={() => { setActiveTab('files'); loadProjectFiles(configProject.id); }}
                className={`px-6 py-3 font-medium transition-colors ${activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Files ({projectFiles.length})
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'instructions' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Instructions
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={15}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="You are a senior full-stack engineer..."
                  />
                </div>
              )}

              {activeTab === 'files' && (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleFileUpload(e.dataTransfer.files)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium">Drop files here or click to upload</p>
                    <p className="text-sm text-gray-500 mt-2">Supports any file type</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </div>

                  {uploading && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">Uploading files...</p>
                    </div>
                  )}

                  {projectFiles.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h3 className="font-medium text-gray-900">Uploaded Files</h3>
                      {projectFiles.map((file) => (
                        <div key={file.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <File size={20} className="text-gray-500" />
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => downloadFile(file.name)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => deleteFile(file.name)}
                              className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeTab === 'instructions' && (
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setConfigProject(null)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                  Cancel
                </button>
                <button onClick={saveInstructions} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REST OF APP - unchanged */}
      {/* Delete modal, alerts, etc. */}
    </div>
  )
}

export default App