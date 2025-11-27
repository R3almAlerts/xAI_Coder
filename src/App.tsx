// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  Bot, 
  MessageSquare, 
  FolderOpen, 
  Terminal,
  Code2,
  Sparkles,
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Save,
  Check
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, getUserId } from './lib/supabase';
import { NavigationMenu } from './components/NavigationMenu';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { SettingsPage } from './components/SettingsPage';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { useSettings } from './hooks/useSettings';
import { Message, Project, Conversation } from './types';

type Tab = 'chat' | 'files' | 'terminal' | 'preview';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileNode[];
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, isLoading: settingsLoading } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('');

  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [creatingFileIn, setCreatingFileIn] = useState<string>('');

  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load projects
  useEffect(() => {
    let cancelled = false;
    const loadInitialData = async () => {
      try {
        const userId = await getUserId();
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        setProjects(data || []);
        if (data?.[0]) {
          setCurrentProjectId(data[0].id);
          setCurrentProjectName(data[0].title);
        }
      } catch (err) {
        console.warn('Failed to load projects', err);
      } finally {
        if (!cancelled) setGlobalLoading(false);
      }
    };
    loadInitialData();
    return () => { cancelled = true; };
  }, []);

  // Load conversations
  useEffect(() => {
    if (!currentProjectId) return;
    const load = async () => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('updated_at', { ascending: false });
      setConversations(convs || []);
      if (convs?.[0] && !currentConvId) setCurrentConvId(convs[0].id);
    };
    load();
  }, [currentProjectId]);

  // Load messages
  useEffect(() => {
    if (!currentConvId) return;
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConvId)
        .order('timestamp', { ascending: true });
      setMessages(data || []);
    };
    load();
  }, [currentConvId]);

  // Load files from Supabase
  const loadFiles = async () => {
    if (!currentProjectId) {
      setFiles([]);
      return;
    }

    const { data, error } = await supabase.storage
      .from('project-files')
      .list(`${currentProjectId}/`, { limit: 1000, deep: true });

    if (error) {
      console.error('Error loading files:', error);
      return;
    }

    const buildTree = (items: any[]): FileNode[] => {
      const root: FileNode[] = [];
      const map = new Map<string, FileNode>();

      items.forEach(item => {
        const fullPath = item.name;
        if (fullPath.endsWith('/.keep')) return; // Skip placeholder
        const parts = fullPath.split('/');
        let currentPath = '';
        let parent: FileNode[] = root;

        parts.forEach((part, i) => {
          if (!part || part === '.') return;
          currentPath += (currentPath ? '/' : '') + part;

          if (i === parts.length - 1 && !fullPath.endsWith('/')) {
            const node: FileNode = {
              id: currentPath,
              name: part,
              type: 'file',
              path: currentPath,
            };
            parent.push(node);
            map.set(currentPath, node);
          } else {
            let folder = map.get(currentPath);
            if (!folder) {
              folder = {
                id: currentPath,
                name: part,
                type: 'folder',
                path: currentPath,
                children: [],
              };
              parent.push(folder);
              map.set(currentPath, folder);
            }
            parent = folder.children!;
          }
        });
      });

      return root;
    };

    const tree = buildTree(data || []);
    setFiles(tree);
  };

  useEffect(() => {
    loadFiles();
  }, [currentProjectId]);

  const saveFile = async () => {
    if (!selectedFile || !currentProjectId || selectedFile.type === 'folder') return;

    setIsSaving(true);
    try {
      const { error } = await supabase.storage
        .from('project-files')
        .upload(`${currentProjectId}/${selectedFile.path}`, new Blob([fileContent]), {
          upsert: true,
          contentType: 'text/plain'
        });

      if (error) throw error;
      setLastSaved(new Date());
    } catch (err: any) {
      setError('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const createFileOrFolder = async (type: 'file' | 'folder') => {
    if (!currentProjectId) return;

    const name = prompt(`Enter ${type === 'file' ? 'file' : 'folder'} name:`);
    if (!name) return;

    const pathPrefix = creatingFileIn || '';
    const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name;
    const storagePath = `${currentProjectId}/${fullPath}`;

    try {
      if (type === 'file') {
        const defaultContent = name.endsWith('.tsx') 
          ? `export default function ${name.replace('.tsx', '')}() {\n  return <div className="p-8">Hello from ${name}!</div>\n}`
          : '';

        await supabase.storage
          .from('project-files')
          .upload(storagePath, new Blob([defaultContent]), { upsert: true });
      } else {
        await supabase.storage
          .from('project-files')
          .upload(`${storagePath}/.keep`, new Blob([]), { upsert: true });
      }

      await loadFiles(); // Instant refresh — no reload!
      alert(`${type === 'file' ? 'File' : 'Folder'} created: ${name}`);
    } catch (err: any) {
      setError(`Failed to create ${type}`);
    }
  };

  useEffect(() => {
    if (!selectedFile || selectedFile.type === 'folder') {
      setFileContent('');
      return;
    }

    const loadContent = async () => {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(`${currentProjectId}/${selectedFile.path}`);

      if (error || !data) {
        setFileContent('');
        return;
      }

      const text = await data.text();
      setFileContent(text);
    };

    loadContent();
  }, [selectedFile, currentProjectId]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return <FileCode size={16} className="text-blue-500" />;
    if (ext === 'json') return <FileJson size={16} className="text-yellow-500" />;
    if (name === 'package.json') return <Package size={16} className="text-red-500" />;
    return <FileText size={16} className="text-gray-500" />;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer select-none ${
            selectedFile?.id === node.id ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
              setCreatingFileIn(node.path);
            } else {
              setSelectedFile(node);
              setCreatingFileIn('');
            }
          }}
        >
          {node.type === 'folder' ? (
            expandedFolders.has(node.path) ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <div className="w-4" />
          )}
          {node.type === 'folder' ? (
            <Folder size={16} className={expandedFolders.has(node.path) ? "text-yellow-600" : "text-yellow-500"} />
          ) : (
            getFileIcon(node.name)
          )}
          <span className="text-sm">{node.name}</span>
        </div>
        {node.type === 'folder' && node.children && expandedFolders.has(node.path) && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  if (location.pathname === '/settings') return <SettingsPage />;

  if (globalLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
        <p className="ml-4 text-xl font-medium text-gray-700">Launching Code Guru...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationMenu
        projects={projects}
        conversations={conversations}
        currentProjectId={currentProjectId}
        currentConvId={currentConvId}
        currentProjectName={currentProjectName}
        onSelectProject={(id) => { 
          setCurrentProjectId(id); 
          const p = projects.find(x => x.id === id); 
          setCurrentProjectName(p?.title || ''); 
          setActiveTab('files');
        }}
        onSelectConversation={setCurrentConvId}
        onCreateProject={async () => {
          const title = prompt('Project name:')?.trim();
          if (!title) return;
          const userId = await getUserId();
          const { data } = await supabase.from('projects').insert({ title, user_id: userId }).select().single();
          if (data) {
            setProjects(p => [data, ...p]);
            setCurrentProjectId(data.id);
            setCurrentProjectName(data.title);
          }
        }}
        onCreateConversation={async () => {
          if (!currentProjectId) return;
          const userId = await getUserId();
          const { data } = await supabase.from('conversations').insert({ title: 'New Chat', project_id: currentProjectId, user_id: userId }).select().single();
          if (data) {
            setConversations(c => [data, ...c]);
            setCurrentConvId(data.id);
          }
        }}
        onOpenSettings={() => navigate('/settings')}
        userName="You"
      />

      <div className="flex-1 flex flex-col lg:ml-80">
        <div className="bg-white border-b border-gray-200 flex items-center px-2 py-2">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <MessageSquare size={18} /> Chat
            </button>
            <button onClick={() => setActiveTab('files')} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <FolderOpen size={18} /> Files
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-50">
          {activeTab === 'files' && (
            <div className="flex h-full">
              <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700">EXPLORER</h3>
                  <div className="flex gap-1">
                    <button onClick={() => createFileOrFolder('file')} className="p-1 hover:bg-gray-100 rounded" title="New File">
                      <FilePlus size={16} />
                    </button>
                    <button onClick={() => createFileOrFolder('folder')} className="p-1 hover:bg-gray-100 rounded" title="New Folder">
                      <FolderPlus size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {files.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FolderOpen size={48} className="mx-auto mb-2" />
                      <p className="text-sm">No files yet</p>
                      <p className="text-xs mt-2">Click + to create</p>
                    </div>
                  ) : (
                    renderFileTree(files)
                  )}
                </div>
              </div>

              <div className="flex-1 bg-white flex flex-col">
                {selectedFile && selectedFile.type === 'file' ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(selectedFile.name)}
                        <span className="font-medium text-sm">{selectedFile.name}</span>
                        {isSaving && <Loader2 size={14} className="animate-spin text-gray-500" />}
                        {lastSaved && <Check size={14} className="text-green-500" />}
                      </div>
                      <button
                        onClick={saveFile}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    <textarea
                      className="flex-1 p-4 font-mono text-sm bg-gray-50 resize-none focus:outline-none"
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FileText size={64} className="mx-auto mb-4" />
                      <p>Select a file to edit</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
          <AlertCircle size={24} />
          {error}
        </div>
      )}
    </div>
  );
}

export default App;