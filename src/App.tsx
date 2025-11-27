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
  Settings as SettingsIcon
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

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, isLoading: settingsLoading } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>('chat');
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

  // Load conversations & messages
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

  // Send message
  const sendMessage = async (content: string) => {
    if (!settings.apiKey || isSending) return;
    const userMsg: Message = { role: 'user', content, timestamp: Date.now() };
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
    });
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
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
        onSelectProject={(id) => { setCurrentProjectId(id); const p = projects.find(x => x.id === id); setCurrentProjectName(p?.title || ''); }}
        onSelectConversation={setCurrentConvId}
        onCreateProject={handleCreateProject}
        onCreateConversation={handleCreateConversation}
        onOpenSettings={() => navigate('/settings')}
        userName="You"
      />

      {/* Right Panel with Bolt.new-style tabs */}
      <div className="flex-1 flex flex-col lg:ml-80">

        {/* Bolt.new-style Tab Bar */}
        <div className="bg-white border-b border-gray-200 flex items-center px-2 py-2">
          <div className="flex gap-1">
            <TabButton
              active={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              icon={<MessageSquare size={18} />}
              label="Chat"
            />
            <TabButton
              active={activeTab === 'files'}
              onClick={() => setActiveTab('files')}
              icon={<FolderOpen size={18} />}
              label="Files"
            />
            <TabButton
              active={activeTab === 'terminal'}
              onClick={() => setActiveTab('terminal')}
              icon={<Terminal size={18} />}
              label="Terminal"
            />
            <TabButton
              active={activeTab === 'preview'}
              onClick={() => setActiveTab('preview')}
              icon={<Code2 size={18} />}
              label="Preview"
              badge="Live"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setIsModelSelectorOpen(true)}
              className="px-4 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
            >
              {settings.model === 'auto' ? 'Auto' : settings.model}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden bg-gray-50">

          {/* CHAT TAB – Your perfect chat stays 100% untouched */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="bg-white border-b px-6 py-4 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800">
                  {conversations.find(c => c.id === currentConvId)?.title || 'New Chat'}
                </h2>
                <p className="text-sm text-gray-500">
                  {currentProjectName ? `in ${currentProjectName}` : 'Code Guru – Your AI Coding Assistant'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-8 px-6 py-8">
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
          )}

          {/* FILES TAB – Placeholder (Bolt.new style) */}
          {activeTab === 'files' && (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FolderOpen size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-xl text-gray-500">File browser coming soon</p>
              </div>
            </div>
          )}

          {/* TERMINAL TAB – Placeholder */}
          {activeTab === 'terminal' && (
            <div className="h-full flex items-center justify-center bg-gray-900 text-green-400 font-mono">
              <div className="text-center">
                <Terminal size={64} className="mx-auto mb-4" />
                <p className="text-2xl">$ Terminal integration in progress...</p>
              </div>
            </div>
          )}

          {/* PREVIEW TAB – Live preview placeholder */}
          {activeTab === 'preview' && (
            <div className="h-full bg-white flex flex-col">
              <div className="bg-gray-100 border-b px-4 py-2 text-sm text-gray-600">
                Live Preview • http://localhost:3000
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Sparkles size={64} className="mx-auto text-purple-500 mb-4" />
                  <p className="text-2xl font-medium text-gray-700">Your app will appear here</p>
                  <p className="text-gray-500 mt-2">Real-time preview powered by Code Guru</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentModel={settings.model}
        onSelectModel={(model) => useSettings.getState().setSettings({ model })}
      />

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
          <AlertCircle size={24} />
          {error}
        </div>
      )}
    </div>
  );
}

// Reusable Tab Button (Bolt.new style)
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
      ${active 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100'
      }
    `}
  >
    {icon}
    {label}
    {badge && (
      <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

export default App;