// src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  FolderOpen,
  FileText,
  FileCode,
  Save,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, getUserId } from './lib/supabase';
import { NavigationMenu } from './components/NavigationMenu';
import { SettingsPage } from './components/SettingsPage';
import { HierarchicalSidebar } from './components/HierarchicalSidebar';
import { useSettings } from './hooks/useSettings';
import { Project, Conversation } from './types';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, isLoading: settingsLoading } = useSettings();

  // Global State
  const [userName] = useState('Developer'); // Replace with real auth later
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Untitled Project');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Load projects and conversations with fallback
  useEffect(() => {
    const loadData = async () => {
      try {
        const userId = await getUserId();
        if (!userId) throw new Error('Not authenticated');

        // Load projects (with fallback to empty array)
        let projectData: Project[] = [];
        try {
          const { data } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });
          projectData = data || [];
        } catch (projectErr) {
          console.warn('Projects load failed (tables may not exist yet):', projectErr);
        }

        // Load conversations (with fallback)
        let convData: Conversation[] = [];
        try {
          const { data } = await supabase
            .from('conversations')
            .select('*')
            .order('updated_at', { ascending: false });
          convData = data || [];
        } catch (convErr) {
          console.warn('Conversations load failed:', convErr);
        }

        setProjects(projectData);
        setConversations(convData);

        // Auto-select first project if none selected
        if (!currentProjectId && projectData.length > 0) {
          handleSelectProject(projectData[0].id);
        }
      } catch (err) {
        console.error('Global data load error:', err);
        setError('Failed to load workspace - check console for details');
      } finally {
        setGlobalLoading(false);
      }
    };

    loadData();
  }, []);

  // Load files when project changes (with fallback)
  const loadFiles = async () => {
    if (!currentProjectId) {
      setFiles([]);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .list(`${currentProjectId}/`, { limit: 1000 });

      if (error) throw error;

      // Simple flat list fallback (expand to tree if needed)
      const fileNodes: FileNode[] = (data || []).map(item => ({
        id: item.name,
        name: item.name.split('/').pop() || item.name,
        type: item.name.endsWith('/') ? 'folder' : 'file',
        path: item.name,
      }));

      setFiles(fileNodes);
    } catch (err) {
      console.warn('Files load failed:', err);
      setFiles([]); // Fallback to empty
    }
  };

  useEffect(() => {
    loadFiles();
  }, [currentProjectId]);

  // Handlers with error wrapping
  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProjectId(projectId);
      setCurrentProjectName(project.title);
      setCurrentConvId(null);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setCurrentConvId(convId);
    navigate(`/chat/${convId}`);
  };

  const handleCreateProject = async () => {
    try {
      const title = prompt('Project name:') || 'New Project';
      const { data, error } = await supabase
        .from('projects')
        .insert({ title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setProjects(prev => [data, ...prev]);
        handleSelectProject(data.id);
      }
    } catch (err) {
      console.error('Create project failed:', err);
      setError('Failed to create project - check Supabase tables');
    }
  };

  const handleCreateConversation = async (projectId?: string) => {
    if (!projectId && !currentProjectId) return;

    try {
      const pid = projectId || currentProjectId;
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: 'New Chat',
          project_id: pid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setConversations(prev => [data, ...prev]);
        handleSelectConversation(data.id);
      }
    } catch (err) {
      console.error('Create conversation failed:', err);
      setError('Failed to create conversation');
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !currentProjectId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.storage
        .from('project-files')
        .upload(`${currentProjectId}/${selectedFile.path}`, new Blob([fileContent]), {
          upsert: true,
          contentType: 'text/plain',
        });

      if (error) throw error;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Save file failed:', err);
      setError('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    navigate('/login');
  };

  const handleFileClick = (node: FileNode) => {
    setSelectedFile(node);
    // Load content placeholder - expand with real fetch
    setFileContent('// File content loads here\nconsole.log("Selected: " + node.name);');
  };

  if (globalLoading || settingsLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-6" />
          <p className="text-xl font-medium text-gray-700">Loading xAI Coder...</p>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return <SettingsPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <NavigationMenu
        projects={projects}
        conversations={conversations}
        currentProjectId={currentProjectId}
        currentConvId={currentConvId}
        currentProjectName={currentProjectName}
        onSelectProject={handleSelectProject}
        onSelectConversation={handleSelectConversation}
        onCreateProject={handleCreateProject}
        onCreateConversation={handleCreateConversation}
        onOpenSettings={() => setShowSettings(true)}
        userName={userName}
        onLogout={handleLogout}
      />

      {/* Main Layout */}
      <div className="pt-16 flex h-[calc(100vh-4rem)]">
        {/* Sidebar with fallback */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col min-h-0">
          <HierarchicalSidebar
            currentProjectId={currentProjectId}
            currentConvId={currentConvId}
            projects={projects}
            conversations={conversations}
            onSelectProject={handleSelectProject}
            onSelectConv={handleSelectConversation}
            onCreateNewProject={handleCreateProject}
            onCreateNewConv={handleCreateConversation}
            onDeleteConv={async (id) => {
              try {
                await supabase.from('conversations').delete().eq('id', id);
                setConversations(prev => prev.filter(c => c.id !== id));
              } catch (err) {
                console.error('Delete failed:', err);
              }
            }}
            onUpdateTitle={async (id, title, isProject) => {
              try {
                const table = isProject ? 'projects' : 'conversations';
                await supabase.from(table).update({ title, updated_at: new Date().toISOString() }).eq('id', id);
                if (isProject) {
                  setProjects(prev => prev.map(p => p.id === id ? { ...p, title } : p));
                  if (currentProjectId === id) setCurrentProjectName(title);
                } else {
                  setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
                }
              } catch (err) {
                console.error('Update failed:', err);
              }
            }}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {location.pathname.startsWith('/chat/') ? (
            <div className="flex-1 bg-white p-8">
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-24 h-24 mx-auto mb-6 opacity-50" />
                  <p className="text-2xl font-medium">Chat interface coming soon</p>
                  <p className="text-sm mt-2">Selected conversation: {currentConvId || 'None'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* File Tree */}
              <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Files ({files.length})</h3>
                  {files.length === 0 ? (
                    <p className="text-sm text-gray-500">No files in project</p>
                  ) : (
                    files.map(node => (
                      <button
                        key={node.id}
                        onClick={() => handleFileClick(node)}
                        className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-white rounded-lg text-left transition-colors ${
                          selectedFile?.id === node.id ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {node.type === 'folder' ? <FolderOpen className="w-5 h-5 text-indigo-600" /> : <FileText className="w-5 h-5 text-gray-600" />}
                        <span className="text-sm truncate flex-1">{node.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 bg-white flex flex-col">
                {selectedFile ? (
                  <>
                    <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-800">{selectedFile.name}</span>
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {lastSaved && !isSaving && <Check className="w-4 h-4 text-green-600" />}
                      </div>
                      <button
                        onClick={handleSaveFile}
                        disabled={isSaving}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    <textarea
                      className="flex-1 p-8 font-mono text-sm bg-gray-50 resize-none focus:outline-none leading-relaxed"
                      value={fileContent}
                      onChange={e => setFileContent(e.target.value)}
                      spellCheck={false}
                      placeholder="// Start coding..."
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FileText className="w-20 h-20 mx-auto mb-6 opacity-50" />
                      <p className="text-xl font-medium">Select a file to edit</p>
                      <p className="text-sm mt-3">or create something new</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-2">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-6 text-2xl hover:opacity-70">×</button>
        </div>
      )}
    </div>
  );
}

export default App;