// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
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

  // ── Core state ─────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('');

  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(true);   // ← controls spinner
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Initial data load (with timeout fallback) ───────
  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        // 8-second safety timeout
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Initial load timeout')), 8000)
        );

        const dataPromise = (async () => {
          // getUserId now has its own fallback inside supabase.ts → never hangs
          const userId = await getUserId();

          // Load projects
          const { data: projectData } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (cancelled) return;

          setProjects(projectData || []);

          // Choose first project if any
          if (projectData && projectData.length > 0) {
            const first = projectData[0];
            setCurrentProjectId(first.id);
            setCurrentProjectName(first.title);
          }
        })();

        await Promise.race([dataPromise, timeout]);
      } catch (err: any) {
        console.warn('Initial load failed or timed out:', err.message);
        // Even on error we stop the spinner – the UI will show an empty state
      } finally {
        if (!cancelled) setGlobalLoading(false);
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Load conversations when project changes ───────
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

  // ── Load messages when conversation changes ───────
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

  // ── Send message ─────────────────────────────────────
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

  // ── Handlers for sidebar actions ─────────────────────
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

  // ── Settings page route ─────────────────────────────
  if (location.pathname === '/settings') return <SettingsPage />;

  // ── Global spinner (only while we really have nothing) ─────
  if (globalLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────
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
        onDeleteProject={async (proj) => {
          if (!confirm(`Delete "${proj.title}" and all its data?`)) return;
          await supabase.from('conversations').delete().eq('project_id', proj.id);
          await supabase.from('projects').delete().eq('id', proj.id);
          setProjects(p => p.filter(x => x.id !== proj.id));
          if (currentProjectId === proj.id) {
            setCurrentProjectId(projects[0]?.id || null);
            setCurrentConvId(null);
          }
        }}
        onDeleteConversation={async (id) => {
          await supabase.from('messages').delete().eq('conversation_id', id);
          await supabase.from('conversations').delete().eq('id', id);
          setConversations(c => c.filter(x => x.id !== id));
          if (currentConvId === id) setCurrentConvId(conversations[0]?.id || null);
        }}
        onUpdateProjectTitle={async (id, title) => {
          await supabase.from('projects').update({ title }).eq('id', id);
          setProjects(p => p.map(x => (x.id === id ? { ...x, title } : x)));
          if (currentProjectId === id) setCurrentProjectName(title);
        }}
        onUpdateConversationTitle={async (id, title) => {
          await supabase.from('conversations').update({ title }).eq('id', id);
          setConversations(c => c.map(x => (x.id === id ? { ...x, title } : x)));
        }}
        onOpenSettings={() => navigate('/settings')}
        userName="You"
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col ml-0 lg:ml-80">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {conversations.find(c => c.id === currentConvId)?.title || 'New Chat'}
            </h2>
            {currentProjectName && <p className="text-sm text-gray-500">in {currentProjectName}</p>}
          </div>
          <button
            onClick={() => setIsModelSelectorOpen(true)}
            className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {settings.model === 'auto' ? 'Auto' : settings.model}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg">Start a conversation</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {isSending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">thinking…</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t bg-white px-6 py-4">
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
        onSelectModel={model => useSettings.getState().setSettings({ model })}
      />

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
    </div>
  );
}

export default App;