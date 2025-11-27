// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Bot } from 'lucide-react'; // ← THIS LINE WAS MISSING
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
  const { settings, isLoading: settingsLoading } = useSettings();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('');

  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );

        const load = async () => {
          const userId = await getUserId();
          const { data: projectData } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (cancelled) return;
          setProjects(projectData || []);

          if (projectData && projectData.length > 0) {
            const first = projectData[0];
            setCurrentProjectId(first.id);
            setCurrentProjectName(first.title);
          }
        };

        await Promise.race([load(), timeout]);
      } catch (err) {
        console.warn('Initial load slow, continuing...', err);
      } finally {
        if (!cancelled) setGlobalLoading(false);
      }
    };

    loadInitialData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentProjectId) return;

    const loadConvs = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('updated_at', { ascending: false });

      setConversations(data || []);
      if (data && data.length > 0 && !currentConvId) {
        setCurrentConvId(data[0].id);
      }
    };
    loadConvs();
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentConvId) return;

    const loadMsgs = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConvId)
        .order('timestamp', { ascending: true });

      setMessages(data || []);
    };
    loadMsgs();
  }, [currentConvId]);

  const sendMessage = async (content: string, attachments?: any[]) => {
    if (!settings.apiKey || isSending) return;

    const userMsg: Message = { role: 'user', content, timestamp: Date.now(), attachments };
    setMessages(m => [...m, userMsg]);
    setIsSending(true);
    setError(null);

    try {
      const model = settings.model === 'auto' ? 'grok-2-latest' : settings.model;
      const res = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content }],
          temperature: 0.7,
        }),
      });

      if (!res.ok) throw new Error('API error');

      const json = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: json.choices[0].message.content,
        timestamp: Date.now(),
      };
      setMessages(m => [...m, assistantMsg]);
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectProject = (id: string) => {
    setCurrentProjectId(id);
    const p = projects.find(x => x.id === id);
    setCurrentProjectName(p?.title || '');
    setCurrentConvId(null);
  };

  const handleCreateProject = async () => {
    const title = prompt('Project name:')?.trim();
    if (!title) return;
    const userId = await getUserId();
    const { data } = await supabase
      .from('projects')
      .insert({ title, user_id: userId })
      .select()
      .single();
    if (data) {
      setProjects(p => [data, ...p]);
      setCurrentProjectId(data.id);
      setCurrentProjectName(data.title);
    }
  };

  const handleCreateConversation = async () => {
    if (!currentProjectId) return;
    const userId = await getUserId();
    const { data } = await supabase
      .from('conversations')
      .insert({ title: 'New Chat', project_id: currentProjectId, user_id: userId })
      .select()
      .single();
    if (data) {
      setConversations(c => [data, ...c]);
      setCurrentConvId(data.id);
    }
  };

  if (location.pathname === '/settings') return <SettingsPage />;

  if (globalLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-6" />
          <p className="text-xl font-medium text-gray-700">Launching Code Guru...</p>
        </div>
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
        onSelectProject={handleSelectProject}
        onSelectConversation={setCurrentConvId}
        onCreateProject={handleCreateProject}
        onCreateConversation={handleCreateConversation}
        onOpenSettings={() => navigate('/settings')}
        userName="You"
      />

      <div className="flex-1 flex flex-col lg:ml-80">
        <div className="bg-white border-b px-6 py-5 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {conversations.find(c => c.id === currentConvId)?.title || 'New Chat'}
            </h2>
            <p className="text-sm text-gray-500">
              {currentProjectName ? `in ${currentProjectName}` : 'Code Guru – Your AI Coding Assistant'}
            </p>
          </div>
          <button
            onClick={() => setIsModelSelectorOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-medium rounded-xl hover:from-indigo-200 hover:to-purple-200 transition-all ml-auto"
          >
            {settings.model === 'auto' ? 'Auto' : settings.model}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center mt-32">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Bot size={48} className="text-indigo-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Code Guru</h1>
              <p className="text-xl text-gray-600">Ask me anything about code, debugging, or architecture.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {isSending && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-5 py-3 text-gray-700">Thinking...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t bg-white px-6 py-5">
          <ChatInput
            onSend={sendMessage}
            disabled={isSending || !currentConvId}
            currentModel={settings.model}
            onOpenModelSelector={() => setIsModelSelectorOpen(true)}
          />
        </div>
      </div>

      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentModel={settings.model}
        onSelectModel={(model) => useSettings.getState().setSettings({ model })}
      />

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <AlertCircle size={24} />
          {error}
        </div>
      )}
    </div>
  );
}

export default App;