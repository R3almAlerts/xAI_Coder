// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Settings, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, getUserId } from './lib/supabase';
import { NavigationMenu } from './components/NavigationMenu';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { SettingsPage } from './components/SettingsPage';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { useSettings } from './hooks/useSettings';
import { Message, Project, Conversation } from './types';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Global state
  const { settings, isLoading: settingsLoading } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar state
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('');

  // UI state
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load projects & conversations
  useEffect(() => {
    const loadData = async () => {
      const userId = await getUserId();
      if (!userId) return;

      // Load projects
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setProjects(projectData || []);

      // Set default project
      if (projectData && projectData.length > 0) {
        const defaultProject = projectData[0];
        setCurrentProjectId(defaultProject.id);
        setCurrentProjectName(defaultProject.title);
      }
    };

    loadData();
  }, []);

  // Load conversations when project changes
  useEffect(() => {
    if (!currentProjectId) return;

    const loadConversations = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('updated_at', { ascending: false });

      setConversations(data || []);

      // Auto-select first conversation
      if (data && data.length > 0 && !currentConvId) {
        setCurrentConvId(data[0].id);
      }
    };

    loadConversations();
  }, [currentProjectId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConvId) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConvId)
        .order('timestamp', { ascending: true });

      setMessages(data || []);
      setIsLoadingMessages(false);
    };

    loadMessages();
  }, [currentConvId]);

  // Handle sending message
  const sendMessage = async (content: string, attachments?: any[]) => {
    if (!settings.apiKey || isSending) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    setError(null);

    try {
      const modelToUse = settings.model === 'auto' ? 'grok-2-latest' : settings.model;

      const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConvId);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Project & Conversation handlers
  const handleSelectProject = (id: string) => {
    setCurrentProjectId(id);
    const project = projects.find(p => p.id === id);
    setCurrentProjectName(project?.title || '');
    setCurrentConvId(null);
  };

  const handleCreateProject = async () => {
    const title = prompt('Project name:');
    if (!title?.trim()) return;

    const { data } = await supabase
      .from('projects')
      .insert({ title, user_id: await getUserId() })
      .select()
      .single();

    if (data) {
      setProjects(prev => [data, ...prev]);
      setCurrentProjectId(data.id);
      setCurrentProjectName(data.title);
    }
  };

  const handleCreateConversation = async () => {
    if (!currentProjectId) return;

    const { data } = await supabase
      .from('conversations')
      .insert({
        title: 'New Conversation',
        project_id: currentProjectId,
        user_id: await getUserId(),
      })
      .select()
      .single();

    if (data) {
      setConversations(prev => [data, ...prev]);
      setCurrentConvId(data.id);
    }
  };

  const handleDeleteProject = async (project: { id: string; title: string }) => {
    if (!confirm(`Delete project "${project.title}" and all its conversations?`)) return;

    await supabase.from('conversations').delete().eq('project_id', project.id);
    await supabase.from('projects').delete().eq('id', project.id);
    setProjects(prev => prev.filter(p => p.id !== project.id));

    if (currentProjectId === project.id) {
      const remaining = projects.filter(p => p.id !== project.id);
      if (remaining.length > 0) {
        handleSelectProject(remaining[0].id);
      } else {
        setCurrentProjectId(null);
        setCurrentProjectName('');
      }
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await supabase.from('messages').delete().eq('conversation_id', id);
    await supabase.from('conversations').delete().eq('id', id);
    setConversations(prev => prev.filter(c => c.id !== id));

    if (currentConvId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setCurrentConvId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  if (location.pathname === '/settings') {
    return <SettingsPage />;
  }

  if (settingsLoading || isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation */}
      <NavigationMenu
        projects={projects}
        conversations={conversations}
        currentProjectId={currentProjectId}
        currentConvId={currentConvId}
        currentProjectName={currentProjectName}
        onSelectProject={handleSelectProject}
        onSelectConversation={setCurrentConvId}
        onCreateProject={handleCreateProject}
        onCreateConversation={handleCreateConversation}
        onDeleteProject={handleDeleteProject}
        onDeleteConversation={handleDeleteConversation}
        onUpdateProjectTitle={async (id, title) => {
          await supabase.from('projects').update({ title }).eq('id', id);
          setProjects(prev => prev.map(p => p.id === id ? { ...p, title } : p));
          if (currentProjectId === id) setCurrentProjectName(title);
        }}
        onUpdateConversationTitle={async (id, title) => {
          await supabase.from('conversations').update({ title }).eq('id', id);
          setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
        }}
        onOpenSettings={() => navigate('/settings')}
        userName="You"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col ml-0 lg:ml-80">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {conversations.find(c => c.id === currentConvId)?.title || 'New Chat'}
              </h2>
              {currentProjectName && (
                <p className="text-sm text-gray-500">in {currentProjectName}</p>
              )}
            </div>
            <button
              onClick={() => setIsModelSelectorOpen(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {settings.model === 'auto' ? 'Auto' : settings.model}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">Send a message to begin</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              {isSending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <ChatInput
            onSend={sendMessage}
            disabled={isSending || !currentConvId}
            currentModel={settings.model}
            onOpenModelSelector={() => setIsModelSelectorOpen(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentModel={settings.model}
        onSelectModel={(model) => useSettings.getState().setSettings({ model })}
      />

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
    </div>
  );
}

export default App;