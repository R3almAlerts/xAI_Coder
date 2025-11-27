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
  projects: Project[];
  conversations: Conversation[];
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
  projects,
  conversations,
  currentProjectId,
  currentConvId,
  onSelectProject,
  onSelectConversation,
  onCreateProject,
  onCreateConversation,
  onOpenSettings,
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Code Guru" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
            <h1 className="text-xl font-bold">Code Guru</h1>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Sidebar - Desktop + Mobile when open */}
      <div className={`fixed inset-y-0 left-0 z-40 w-80 bg-gradient-to-b from-indigo-900 to-purple-900 text-white transform transition-transform lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo Header */}
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

        {/* New Project Button */}
        <div className="p-4">
          <button
            onClick={onCreateProject}
            className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl py-3 px-4 transition-all"
          >
            <Plus size={20} />
            <span className="font-medium">New Project</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>No projects yet</p>
              <p className="text-sm">Create one to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(project => {
                const isExpanded = expandedProjects.has(project.id);
                const convs = projectConvs(project.id);
                const isActive = currentProjectId === project.id;

                return (
                  <div key={project.id} className="rounded-lg overflow-hidden">
                    {/* Project Header */}
                    <button
                      onClick={() => {
                        onSelectProject(project.id);
                        toggleProject(project.id);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                        isActive ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen size={20} />
                        <span className="font-medium truncate">{project.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {convs.length > 0 && (
                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {convs.length}
                          </span>
                        )}
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </button>

                    {/* Conversations (nested) */}
                    {isExpanded && convs.length > 0 && (
                      <div className="ml-8 mt-1 space-y-1">
                        {convs.map(conv => (
                          <button
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                            className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-all ${
                              currentConvId === conv.id
                                ? 'bg-white/20 font-medium'
                                : 'hover:bg-white/10'
                            }`}
                          >
                            <MessageSquare size={16} />
                            <span className="truncate text-sm">{conv.title}</span>
                          </button>
                        ))}
                        <button
                          onClick={onCreateConversation}
                          className="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
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

        {/* Settings Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gradient-to-t from-black/20">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-white/10 transition-all"
          >
            <Settings size={22} />
            <div>
              <p className="font-medium">Settings</p>
              <p className="text-sm opacity-70">API key, model, logo</p>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};