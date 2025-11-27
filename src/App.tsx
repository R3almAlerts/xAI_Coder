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

  // User & State
  const [userName] = useState('Developer');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Untitled Project');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Determine active view for sidebar highlighting
  const currentView = location.pathname.startsWith('/chat/')
    ? 'chat'
    : location.pathname === '/settings'
    ? 'settings'
    : 'home';

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const [projRes, convRes] = await Promise.all([
          supabase.from('projects').select('*').order('updated_at', { ascending: false }),
          supabase.from('conversations').select('*').order('updated_at', { ascending: false })
        ]);

        setProjects(projRes.data || []);
        setConversations(convRes.data || []);

        // Auto-select first project if exists
        if (!currentProjectId && projRes.data?.length) {
          const first = projRes.data[0];
          setCurrentProjectId(first.id);
          setCurrentProjectName(first.title);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setGlobalLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  // Handlers
  const handleSelectProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProjectId(id);
      setCurrentProjectName(project.title);
      setCurrentConvId(null);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConvId(id);
    navigate(`/chat/${id}`);
  };

  const handleCreateProject = async () => {
    const title = prompt('Project name:', 'New Project') || 'New Project';
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

  // Loading screen
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

  // Settings page
  if (showSettings) {
    return <SettingsPage />;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Main Left Sidebar */}
      <NavigationMenu
        currentView={currentView}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        userName={userName}
      />

      {/* Projects & Conversations Sidebar */}
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
            if (currentConvId === id) {
              setCurrentConvId(null);
              navigate('/');
            }
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

      {/* Main Content Area */}
      <main className="flex-1 bg-white overflow-hidden flex items-center justify-center">
        {location.pathname.startsWith('/chat/') ? (
          <div className="text-center max-w-2xl px-8">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-32 h-32 rounded-3xl mx-auto mb-8 shadow-2xl" />
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Grok-Powered Chat
            </h1>
            <p className="text-2xl text-gray-600 mb-2">
              Streaming • Real-time Code • File Uploads • Markdown
            </p>
            <p className="text-lg text-gray-500">
              Ready to build the future.
            </p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32 mx-auto mb-8" />
            <h2 className="text-3xl font-semibold mb-2">Welcome to xAI Coder</h2>
            <p className="text-xl">Select a project or start a new chat</p>
          </div>
        )}
      </main>

      {/* Error Toast */}
      {/* Add your error toast here if needed */}
    </div>
  );
}

export default App;