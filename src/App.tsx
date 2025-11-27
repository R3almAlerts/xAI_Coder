// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { NavigationMenu } from './components/NavigationMenu';
import { SettingsPage } from './components/SettingsPage';
import { HierarchicalSidebar } from './components/HierarchicalSidebar';
import { useSettings } from './hooks/useSettings';
import { Project, Conversation } from './types';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, isLoading: settingsLoading } = useSettings();

  const [userName] = useState('Developer');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Untitled Project');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const currentView = location.pathname.startsWith('/chat/')
    ? 'chat'
    : location.pathname === '/settings'
    ? 'settings'
    : 'home';

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const [projRes, convRes] = await Promise.all([
          supabase.from('projects').select('*').order('updated_at', { ascending: false }),
          supabase.from('conversations').select('*').order('updated_at', { ascending: false })
        ]);

        setProjects(projRes.data || []);
        setConversations(convRes.data || []);

        if (!currentProjectId && projRes.data?.length) {
          setCurrentProjectId(projRes.data[0].id);
          setCurrentProjectName(projRes.data[0].title);
        }
      } catch (err) {
        console.error('Load failed:', err);
      } finally {
        setGlobalLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelectProject = (id: string) => {
    const p = projects.find(p => p.id === id);
    if (p) {
      setCurrentProjectId(id);
      setCurrentProjectName(p.title);
      setCurrentConvId(null);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConvId(id);
    navigate(`/chat/${id}`);
  };

  const handleCreateProject = async () => {
    const title = prompt('Project name:') || 'New Project';
    const { data } = await supabase
      .from('projects')
      .insert({ title })
      .select()
      .single();
    if (data) {
      setProjects(p => [data, ...p]);
      handleSelectProject(data.id);
    }
  };

  const handleCreateConversation = async () => {
    if (!currentProjectId) return;
    const { data } = await supabase
      .from('conversations')
      .insert({ title: 'New Chat', project_id: currentProjectId })
      .select()
      .single();
    if (data) {
      setConversations(c => [data, ...c]);
      handleSelectConversation(data.id);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    navigate('/login');
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

  if (showSettings) return <SettingsPage />;

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Permanent Left Sidebar */}
      <NavigationMenu
        currentView={currentView}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        userName={userName}
      />

      {/* Secondary Sidebar — Projects & Chats */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
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
            await supabase.from('conversations').delete().eq('id', id);
            setConversations(c => c.filter(x => x.id !== id));
          }}
          onUpdateTitle={async (id, title, isProject) => {
            const table = isProject ? 'projects' : 'conversations';
            await supabase.from(table).update({ title }).eq('id', id);
            if (isProject) {
              setProjects(p => p.map(x => x.id === id ? { ...x, title } : x));
              if (currentProjectId === id) setCurrentProjectName(title);
            } else {
              setConversations(c => c.map(x => x.id === id ? { ...x, title } : x));
            }
          }}
        />
      </aside>

      {/* Main Content — Ready for Chat */}
      <main className="flex-1 bg-white flex items-center justify-center">
        {location.pathname.startsWith('/chat/') ? (
          <div className="text-center max-w-lg">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32 mx-auto mb-8" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Grok-Powered Chat Interface
            </h1>
            <p className="text-xl text-gray-600">
              Streaming • Markdown • Code Execution • File Uploads
            </p>
            <p className="text-sm text-gray-500 mt-8">
              Ready when you are. Just say the word.
            </p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 mx-auto mb-6" />
            <p className="text-2xl font-medium">Select a project or start a new chat</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;