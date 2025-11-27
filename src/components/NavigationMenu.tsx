// src/components/NavigationMenu.tsx
import React, { useState } from 'react';
import { 
  Bot, 
  Settings, 
  Plus, 
  FolderOpen, 
  MessageSquare, 
  ChevronDown, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { Project, Conversation } from '../types';

interface NavigationMenuProps {
  projects?: Project[];
  conversations?: Conversation[];
  currentProjectId: string | null;
  currentConvId: string | null;
  currentProjectName: string;
  onSelectProject: (id: string) => void;
  onSelectConversation: (id: string) => void;
  onCreateProject: () => void;
  onCreateConversation: () => void;
  onOpenSettings: () => void;
  userName: string;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  projects = [],
  conversations = [],
  currentProjectId,
  currentConvId,
  currentProjectName,
  onSelectProject,
  onSelectConversation,
  onCreateProject,
  onCreateConversation,
  onOpenSettings,
  userName,
}) => {
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const logoUrl = settings.logoUrl || 'https://vrcxtkstyeutxwhllnws.supabase.co/storage/v1/object/public/logos/logo.png';

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const projectConvs = (projectId: string) => 
    conversations.filter(c => c.project_id === projectId);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="Code Guru" 
              className="w-10 h-10 rounded-lg object-contain bg-white p-1 shadow-lg"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iMTYiIGZpbGw9IiM1RTdCRUIiLz4KPHBhdGggZD0iTTI4IDMyTDM1IDIwSDQwTDI0IDQwTDE4IDM0SDI2TDI4IDMyWiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K';
              }}
            />
            <h1 className="text-xl font-bold">Code Guru</h1>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-80 bg-gradient-to-b from-indigo-900 to-purple-900 text-white transform transition-transform duration-300 lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <img 
              src={logoUrl} 
              alt="Code Guru" 
              className="w-14 h-14 rounded-xl object-contain bg-white p-2 shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iMTYiIGZpbGw9IiM1RTdCRUIiLz4KPHBhdGggZD0iTTI4IDMyTDM1IDIwSDQwTDI0IDQwTDE4IDM0SDI2TDI4IDMyWiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K';
              }}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Code Guru</h1>
              <p className="text-sm opacity-80">Your AI Coding Assistant</p>
            </div>
          </div>
        </div>

        {/* New Project */}
        <div className="p-4">
          <button
            onClick={onCreateProject}
            className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl py-3 px-4 transition-all font-medium shadow-lg"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-white/60">
              <FolderOpen size={64} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No projects yet</p>
              <p className="text-sm mt-2">Click "New Project" to begin</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => {
                const isExpanded = expandedProjects.has(project.id);
                const convs = projectConvs(project.id);
                const isActive = currentProjectId === project.id;

                return (
                  <div key={project.id} className="rounded-xl overflow-hidden bg-white/5">
                    <button
                      onClick={() => {
                        onSelectProject(project.id);
                        toggleProject(project.id);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-4 transition-all ${
                        isActive 
                          ? 'bg-white/25 shadow-xl font-semibold' 
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen size={22} />
                        <span className="truncate max-w-48">{project.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {convs.length > 0 && (
                          <span className="text-xs bg-white/30 px-2.5 py-1 rounded-full font-medium">
                            {convs.length}
                          </span>
                        )}
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/10">
                        {convs.length > 0 ? (
                          <div className="py-2">
                            {convs.map(conv => (
                              <button
                                key={conv.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectConversation(conv.id);
                                }}
                                className={`w-full text-left px-10 py-3 flex items-center gap-3 transition-all text-sm ${
                                  currentConvId === conv.id
                                    ? 'bg-white/20 font-medium'
                                    : 'hover:bg-white/10'
                                }`}
                              >
                                <MessageSquare size={16} className="text-cyan-300" />
                                <span className="truncate">{conv.title}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-10 py-3 text-white/50 text-sm italic">
                            No chats yet
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateConversation();
                          }}
                          className="w-full text-left px-10 py-3 flex items-center gap-3 text-cyan-300 hover:bg-white/10 transition-all text-sm font-medium"
                        >
                          <Plus size={16} />
                          New Chat
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20 bg-gradient-to-t from-black/40 backdrop-blur">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-4 px-5 py-5 rounded-xl hover:bg-white/10 transition-all group"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition">
              <Settings size={24} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-lg">{userName}</p>
              <p className="text-sm opacity-80">Settings & API Keys</p>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/70 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};