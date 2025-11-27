// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  Bot, 
  MessageSquare, 
  FolderOpen,
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Save,
  Check,
  FileCode,
  FileJson,
  Package
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
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('');

  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [creatingFileIn, setCreatingFileIn] = useState<string>('');

  const [globalLoading, setGlobalLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === LOAD FILES FROM SUPABASE ===
  const loadFiles = async () => {
    if (!currentProjectId) {
      setFiles([]);
      return;
    }

    const { data, error } = await supabase.storage
      .from('project-files')
      .list(`${currentProjectId}/`, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error('Failed to load files:', error);
      return;
    }

    const root: FileNode[] = [];
    const map = new Map<string, FileNode>();

    // Sort to process folders first
    const items = (data || []).filter(item => !item.name.endsWith('/.keep'));

    items.forEach(item => {
      const fullPath = item.name;
      const parts = fullPath.split('/');
      let currentPath = '';
      let parent: FileNode[] = root;

      parts.forEach((part, i) => {
        if (!part) return;
        currentPath += (currentPath ? '/' : '') + part;

        if (i === parts.length - 1) {
          // File
          const node: FileNode = {
            id: currentPath,
            name: part,
            type: 'file',
            path: currentPath,
          };
          parent.push(node);
          map.set(currentPath, node);
        } else {
          // Folder
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

    // Sort children
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
      nodes.forEach(node => {
        if (node.children) sortNodes(node.children);
      });
    };

    sortNodes(root);
    setFiles(root);
  };

  // Load files when project changes
  useEffect(() => {
    loadFiles();
  }, [currentProjectId]);

  // === CREATE FILE OR FOLDER ===
  const createFileOrFolder = async (type: 'file' | 'folder') => {
    if (!currentProjectId) return;

    const name = prompt(`Enter ${type === 'file' ? 'file' : 'folder'} name:`);
    if (!name) return;

    const prefix = creatingFileIn || '';
    const fullPath = prefix ? `${prefix}/${name}` : name;
    const storagePath = `${currentProjectId}/${fullPath}`;

    try {
      if (type === 'file') {
        const template = name.endsWith('.tsx')
          ? `export default function ${name.replace('.tsx', '')}() {\n  return <div className="p-8 text-2xl">Hello from ${name}!</div>\n}`
          : name.endsWith('.ts')
          ? `console.log('Hello from ${name}');\n`
          : '';

        const { error } = await supabase.storage
          .from('project-files')
          .upload(storagePath, new Blob([template], { type: 'text/plain' }), {
            upsert: true
          });

        if (error) throw error;
      } else {
        const { error } = await supabase.storage
          .from('project-files')
          .upload(`${storagePath}/.keep`, new Blob([]), { upsert: true });

        if (error) throw error;
      }

      // INSTANT REFRESH
      await loadFiles();

      // Auto-expand parent folder
      if (prefix) {
        setExpandedFolders(prev => new Set(prev).add(prefix));
      }

      alert(`${type === 'file' ? 'File' : 'Folder'} created: ${name}`);
    } catch (err: any) {
      setError(`Failed to create ${type}: ${err.message}`);
      console.error(err);
    }
  };

  // === SAVE FILE ===
  const saveFile = async () => {
    if (!selectedFile || selectedFile.type === 'folder' || !currentProjectId) return;

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
      setError('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  // === LOAD FILE CONTENT ===
  useEffect(() => {
    if (!selectedFile || selectedFile.type === 'folder') {
      setFileContent('');
      return;
    }

    const load = async () => {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(`${currentProjectId}/${selectedFile.path}`);

      if (error || !data) {
        setFileContent('// File not found or empty');
        return;
      }

      const text = await data.text();
      setFileContent(text);
    };

    load();
  }, [selectedFile, currentProjectId]);

  // === FILE TREE RENDERING ===
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

  const renderFileTree = (nodes: FileNode[], level = 0): JSX.Element[] => {
    return nodes.map(node => (
      <React.Fragment key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer select-none ${
            selectedFile?.id === node.id ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
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
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {node.type === 'folder' && node.children && expandedFolders.has(node.path) && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </React.Fragment>
    ));
  };

  // === INITIAL LOAD ===
  useEffect(() => {
    const init = async () => {
      const userId = await getUserId();
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data?.[0]) {
        setProjects(data || []);
        setCurrentProjectId(data[0].id);
        setCurrentProjectName(data[0].title);
      }
      setGlobalLoading(false);
    };
    init();
  }, []);

  if (location.pathname === '/settings') return <SettingsPage />;
  if (globalLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
        <p className="ml-6 text-xl">Loading Code Guru...</p>
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
          const p = projects.find(x => x.id === id);
          setCurrentProjectId(id);
          setCurrentProjectName(p?.title || '');
          setActiveTab('files');
        }}
        onSelectConversation={setCurrentConvId}
        onCreateProject={async () => {
          const title = prompt('Project name:');
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
        <div className="bg-white border-b flex items-center px-4 py-3 gap-4">
          <button onClick={() => setActiveTab('chat')} className={`px-5 py-2 rounded-lg font-medium ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Chat
          </button>
          <button onClick={() => setActiveTab('files')} className={`px-5 py-2 rounded-lg font-medium ${activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Files
          </button>
        </div>

        {activeTab === 'files' && (
          <div className="flex h-full">
            {/* EXPLORER */}
            <div className="w-72 bg-white border-r flex flex-col">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">EXPLORER</h3>
                <div className="flex gap-1">
                  <button onClick={() => createFileOrFolder('file')} className="p-1.5 hover:bg-gray-100 rounded" title="New File">
                    <FilePlus size={18} />
                  </button>
                  <button onClick={() => createFileOrFolder('folder')} class="p-1.5 hover:bg-gray-100 rounded" title="New Folder">
                    <FolderPlus size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {files.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <FolderOpen size={48} className="mx-auto mb-3" />
                    <p>No files yet</p>
                    <p className="text-xs mt-2">Click + to create</p>
                  </div>
                ) : (
                  <div className="py-2">{renderFileTree(files)}</div>
                )}
              </div>
            </div>

            {/* EDITOR */}
            <div className="flex-1 flex flex-col bg-white">
              {selectedFile && selectedFile.type === 'file' ? (
                <>
                  <div className="px-5 py-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(selectedFile.name)}
                      <span className="font-medium">{selectedFile.name}</span>
                      {isSaving && <Loader2 size={14} className="animate-spin" />}
                      {lastSaved && !isSaving && <Check size={16} className="text-green-600" />}
                    </div>
                    <button
                      onClick={saveFile}
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save size={14} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <textarea
                    className="flex-1 p-6 font-mono text-sm bg-gray-50 resize-none focus:outline-none"
                    value={fileContent}
                    onChange={e => setFileContent(e.target.value)}
                    spellCheck={false}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <FileText size={64} className="mx-auto mb-4" />
                    <p className="text-lg">Select a file to edit</p>
                    <p className="text-sm mt-2">or create a new one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50">
          <AlertCircle size={24} />
          {error}
          <button onClick={() => setError(null)} className="ml-4">×</button>
        </div>
      )}
    </div>
  );
}

export default App;