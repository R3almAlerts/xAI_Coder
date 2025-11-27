// src/App.tsx
import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  FolderOpen,
  Folder as FolderClosed,
  FileText,
  FileCode,
  FileJson,
  Package,
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [creatingFileIn, setCreatingFileIn] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);

  // ──────────────────────────────────────────────────────────────
  // Helper – choose the correct icon for a file name
  // ──────────────────────────────────────────────────────────────
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'tsx' || ext === 'ts' || ext === 'jsx' || ext === 'js') {
      return <FileCode className="w-4 h-4 text-blue-600" />;
    }
    if (ext === 'json') {
      return <FileJson className="w-4 h-4 text-yellow-600" />;
    }
    if (ext === 'package' || name === 'package.json') {
      return <Package className="w-4 h-4 text-green-600" />;
    }
    return <FileText className="w-4 h-4 text-gray-600" />;
  };

  // ──────────────────────────────────────────────────────────────
  // Load files (unchanged)
  // ──────────────────────────────────────────────────────────────
  const loadFiles = async () => {
    if (!currentProjectId) {
      setFiles([]);
      return;
    }

    const { data, error } = await supabase.storage
      .from('project-files')
      .list(`${currentProjectId}/`, { limit: 1000 });

    if (error) {
      setError('Failed to load files');
      return;
    }

    const root: FileNode[] = [];
    const folderPaths = new Set<string>();

    (data || []).forEach(item => {
      if (item.name?.endsWith('/.keep')) {
        const folderPath = item.name.slice(0, -6);
        if (folderPath) folderPaths.add(folderPath);
      }
    });

    const map = new Map<string, FileNode>();

    (data || []).forEach(item => {
      if (!item.name) return;

      const isKeep = item.name.endsWith('/.keep');
      const cleanPath = isKeep ? item.name.slice(0, -6) : item.name;
      const parts = cleanPath.split('/').filter(Boolean);

      if (parts.length === 0) return;

      let currentPath = '';
      let parent: FileNode[] = root;

      parts.forEach((part, i) => {
        currentPath += (currentPath ? '/' : '') + part;

        if (i === parts.length - 1) {
          if (isKeep) return; // folder marker – ignore

          const node: FileNode = {
            id: currentPath,
            name: part,
            type: 'file',
            path: currentPath,
          };
          parent.push(node);
          map.set(currentPath, node);
        } else {
          const isFolder = folderPaths.has(currentPath) || folderPaths.has(currentPath + '/');
          if (isFolder) {
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
        }
      });
    });

    const sort = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(n => n.children && sort(n.children));
    };
    sort(root);
    setFiles(root);
  };

  // ──────────────────────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────────────────────
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
      } finally {
        setGlobalLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => { loadFiles(); }, [currentProjectId]);

  // ──────────────────────────────────────────────────────────────
  // File tree rendering
  // ──────────────────────────────────────────────────────────────
  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <React.Fragment key={node.path}>
        <div
          onClick={() => {
            if (node.type === 'folder') {
              setExpandedFolders(prev => {
                const next = new Set(prev);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              });
            } else {
              setSelectedFile(node);
              // load file content here when you implement it
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded cursor-pointer select-none ${
            selectedFile?.path === node.path ? 'bg-indigo-100 text-indigo-700' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {node.type === 'folder' ? (
            expandedFolders.has(node.path) ? 
              <FolderOpen className="w-5 h-5 text-amber-600" /> :
              <FolderClosed className="w-5 h-5 text-amber-600" />
          ) : (
            getFileIcon(node.name)
          )}

          {node.type === 'folder' && (
            expandedFolders.has(node.path) ? 
              <ChevronDown className="w-4 h-4 text-gray-500" /> : 
              <ChevronRight className="w-4 h-4 text-gray-500" />
          )}

          <span className="truncate flex-1 font-medium">{node.name}</span>
        </div>

        {node.type === 'folder' && node.children && expandedFolders.has(node.path) && (
          <div className="border-l-2 border-gray-200 ml-6">
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </React.Fragment>
    ));
  };

  // ──────────────────────────────────────────────────────────────
  // Rest of the component (unchanged)
  // ──────────────────────────────────────────────────────────────
  if (location.pathname === '/settings') return <SettingsPage />;
  if (globalLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
        <p className="ml-6 text-2xl font-medium">Launching Code Guru...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationMenu
        currentProjectId={currentProjectId}
        currentProjectName={currentProjectId}
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
          <h1 className="text-2xl font-bold text-gray-800">
            {currentProjectName || 'No Project Selected'}
          </h1>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-600">Explorer</h3>
              <div className="flex gap-2">
                <button onClick={() => createFileOrFolder('file')} className="p-2 hover:bg-gray-100 rounded-lg transition" title="New File">
                  <FilePlus className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={() => createFileOrFolder('folder')} className="p-2 hover:bg-gray-100 rounded-lg" title="New Folder">
                  <FolderPlus className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {files.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No files yet</p>
                  <p className="text-sm mt-2">Click + to create something amazing</p>
                </div>
              ) : (
                <div className="py-2">{renderFileTree(files)}</div>
              )}
            </div>
          </div>

          {/* Editor pane – unchanged */}
          <div className="flex-1 bg-white flex flex-col">
            {selectedFile?.type === 'file' ? (
              <>
                <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(selectedFile.name)}
                    <span className="font-semibold text-gray-800">{selectedFile.name}</span>
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {lastSaved && !isSaving && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <button
                    onClick={saveFile}
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
      </div>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-6 text-2xl">×</button>
        </div>
      )}
    </div>
  );
}

export default App;