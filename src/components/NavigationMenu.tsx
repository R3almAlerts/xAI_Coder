// src/components/NavigationMenu.tsx
import { useState, useEffect, useRef } from 'react';
import { Menu, X, Plus, Folder, MessageSquare, Settings, LogOut, User, Search, ChevronDown } from 'lucide-react';
import { ProjectsList } from './ProjectsList';
import { ConversationsList } from './ConversationsList';
import { Project, Conversation } from '../types';

interface NavigationMenuProps {
  projects: Project[];
  conversations: Conversation[];
  currentProjectId: string | null;
  currentConvId: string | null;
  currentProjectName?: string;
  onSelectProject: (id: string) => void;
  onSelectConversation: (id: string) => void;
  onCreateProject: () => void;
  onCreateConversation: () => void;
  onDeleteProject: (project: { id: string; title: string }) => void;
  onDeleteConversation: (id: string) => void;
  onUpdateProjectTitle: (id: string, title: string) => void;
  onUpdateConversationTitle: (id: string, title: string) => void;
  onOpenSettings: () => void;
  onOpenConfigProject?: (project: Project) => void;
  userName?: string;
  userAvatar?: string;
}

export function NavigationMenu({
  projects,
  conversations,
  currentProjectId,
  currentConvId,
  currentProjectName,
  onSelectProject,
  onSelectConversation,
  onCreateProject,
  onCreateConversation,
  onDeleteProject,
  onDeleteConversation,
  onUpdateProjectTitle,
  onUpdateConversationTitle,
  onOpenSettings,
  onOpenConfigProject,
  userName = 'User',
  userAvatar,
}: NavigationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Grok Chat</h1>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Projects */}
          <div className="border-b border-gray-100">
            <ProjectsList
              projects={projects}
              currentProjectId={currentProjectId}
              onSelectProject={onSelectProject}
              onCreateNew={onCreateProject}
              onDeleteProject={onDeleteProject}
              onUpdateTitle={onUpdateProjectTitle}
              onOpenConfig={onOpenConfigProject || (() => {})}
              showNewButton={true}
            />
          </div>

          {/* Conversations */}
          <ConversationsList
            currentConvId={currentConvId}
            conversations={filteredConversations}
            onSelectConv={onSelectConversation}
            onCreateNew={onCreateConversation}
            onDeleteConv={onDeleteConversation}
            onUpdateTitle={onUpdateConversationTitle}
            currentProjectName={currentProjectName}
          />
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  userName[0].toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">Premium User</p>
              </div>
            </div>
            <button
              onClick={onOpenSettings}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>

          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}