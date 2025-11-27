// src/App.tsx
import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  AlertCircle, 
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
import { SettingsPage } from './components/SettingsPage';
import { useSettings } from './hooks/useSettings';

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

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [creatingFileIn, setCreatingFileIn] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);

  // Load files from Supabase
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
      });

    if (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files');
      return;
    }

    const root: FileNode[] = [];
    const map = new Map<string, FileNode>();

    (data || [])
      .filter(item => item.name && !item.name.endsWith('/.keep'))
      .forEach(item => {
        const parts = item.name.split('/');
        let currentPath = '';
        let parent: FileNode[] = root;

        parts.forEach((part, i) => {
          if (!part) return;
          currentPath += (currentPath ? '/' : '') + part;

          if (i === parts.length - 1) {
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

    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => node.children && sortNodes(node.children));
    };

    sortNodes(root);
    setFiles(root);
  };

  // Initial project load
  useEffect(() => {
    const init = async () => {
      try {
        const userId = await getUserId();
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (data?.[0]) {
          setCurrentProjectId(data[0].id);
          setCurrentProjectName(data[0].title);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setGlobalLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    loadFiles();
  }, [currentProjectId]);

  // FIXED: Create file or folder (no more Blob errors!)
  const createFileOrFolder = async (type: 'file' | 'folder') => {
    if (!currentProjectId) return;

    const name = prompt(`Enter ${type === 'file' ? 'file' : 'folder'} name:`);
    if (!name) return;

    const prefix = creatingFileIn || '';
    const fullPath = prefix ? `${prefix}/${name}` : name;
    const storagePath = `${currentProjectId}/${fullPath}${type === 'folder' ? '/.keep' : ''}`;

    try {
      let content: string | Blob = '';

      if (type === 'file') {
        if (name.endsWith('.tsx')) {
          content = `import React from 'react';

export default function ${name.replace('.tsx', '')}() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Hello from ${name.replace('.tsx', '')}!</h1>
    </div>
  );
}`;
        } else if (name.endsWith('.ts')) {
          content = `console.log('Hello from ${name}');\n`;
        } else if (name.endsWith('.json')) {
          content = JSON.stringify({ message: `Hello from ${name}` }, null, 2);
        } else {
          content = '';
        }
      } else {
        // Folder: use proper empty Blob
        content = new Blob([''], { type: 'application/octet-stream' });
      }

      const { error } = await supabase.storage
        .from('project-files')
        .upload(storagePath, content, {
          upsert: true,
          contentType: type === 'file' ? 'text/plain' : undefined
        });

      if (error) throw error;

      await loadFiles();

      if (prefix) {
        setExpandedFolders(prev => new Set(prev).add(prefix));
      }

      alert(`${type === 'file' ? 'File' : 'Folder'} created: ${name}`);
    } catch (err: any) {
      console.error('Create failed:', err);
      setError(`Failed to create ${type}: ${err.message}`);
    }
  };

  // Save file
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
      setError('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Load file content
  useEffect(() => {
    if (!selectedFile || selectedFile.type === 'folder') {
      setFileContent('');
      return;
    }
    const load = async () => {
      const { data } = await supabase.storage
        .from('project-files')
        .download(`${currentProjectId}/${selectedFile.path}`);
      if (data) setFileContent(await data.text());
    };
    load();
  }, [selectedFile, currentProjectId]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return <FileCode className="w-4 h-4 text-blue-500" />;
    if (ext === 'json') return <FileJson className="w-4 h-4 text-yellow-500" />;
    if (name === 'package.json') return <Package className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <React.Fragment key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer select-none text-sm ${
            selectedFile?.id === node.id ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 16}px` }}
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
            expandedFolders.has(node.path) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : <div className="w-4" />}
          {node.type === 'folder' ? (
            <Folder className={expandedFolders.has(node.path) ? "w-4 h-4 text-yellow-600" : "w-4 h-4 text-yellow-500"} />
          ) : getFileIcon(node.name)}
          <span className="truncate">{node.name}</span>
        </div>
        {node.type === 'folder' && node.children && expandedFolders.has(node.path) && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </React.Fragment>
    ));
  };

  if (location.pathname === '/settings') return <SettingsPage />;
  if (globalLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
        <p className="ml-6 text-2xl font-medium text-gray-700">Launching Code Guru...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationMenu
        currentProjectId={currentProjectId}
        currentProjectName={currentProjectName}
        onSelectProject={(id, name) => {
          setCurrentProjectId(id);
          setCurrentProjectName(name);
        }}
        onOpenSettings={() => navigate('/settings')}
        userName="You"
      />

      <div className="flex-1 flex flex-col lg:ml-80">
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">{currentProjectName || 'No Project Selected'}</h1>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Explorer Sidebar */}
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-700">EXPLORER</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => createFileOrFolder('file')}
                  className="p-1.5 hover:bg-gray-100 rounded transition"
                  title="New File"
                >
                  <FilePlus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => createFileOrFolder('folder')}
                  className="p-1.5 hover:bg-gray-100 rounded transition"
                  title="New Folder"
                >
                  <FolderPlus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {files.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs mt-2 text-gray-500">Click + to create</p>
                </div>
              ) : (
                <div className="py-2">{renderFileTree(files)}</div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 bg-white flex flex-col">
            {selectedFile?.type === 'file' ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getFileIcon(selectedFile.name)}
                    <span className="font-medium text-gray-800">{selectedFile.name}</span>
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-600" />}
                    {lastSaved && !isSaving && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <button
                    onClick={saveFile}
                    disabled={isSaving}
                    className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <textarea
                  className="flex-1 p-6 font-mono text-sm bg-gray-50 resize-none focus:outline-none"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  spellCheck={false}
                  placeholder="// Start coding..."
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a file to edit</p>
                  <p className="text-sm mt-2">or create a new one with the + button</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-pulse">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-xl font-bold">×</button>
        </div>
      )}
    </div>
  );
}

export default App;