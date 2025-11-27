// src/components/NavigationMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Bot,
  FolderOpen,
  MessageSquare,
  Settings,
  Search,
  ChevronDown,
  Plus,
  LogOut,
  User,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../hooks/useSettings';
import { Project, Conversation } from '../types';
import { useNavigate } from 'react-router-dom';

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
  onLogout?: () => void;
}

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

export const NavigationMenu: React.FC<NavigationMenuProps> = React.memo(({
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
  onLogout,
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  const logoUrl = settings.logoUrl || 'https://vrcxtkstyeutxwhllnws.supabase.co/storage/v1/object/public/logos/logo.png';

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (projectsRef.current && !projectsRef.current.contains(e.target as Node)) {
        setProjectsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Keyboard navigation for menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setProfileOpen(false);
        setProjectsOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Desktop & Tablet Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm dark:bg-gray-900/95 dark:border-gray-800">
        <nav className="max-w-full px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt="xAI Coder Logo"
                className="h-8 w-auto"
                onError={(e) => (e.currentTarget.src = '/fallback-logo.png')}
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">xAI Coder</h1>
            </div>

            {/* Desktop Menu */}
            <ul className="hidden md:flex items-center gap-6 lg:gap-8 ml-auto">
              <li>
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-blue-400"
                >
                  Home
                </button>
              </li>
              <li className="relative" ref={projectsRef}>
                <button
                  onClick={() => setProjectsOpen(!projectsOpen)}
                  className="flex items-center gap-1 text-gray-700 hover:text-blue-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-blue-400"
                  aria-haspopup="true"
                  aria-expanded={projectsOpen}
                  aria-controls="projects-menu"
                >
                  Projects
                  <ChevronDown size={16} className={`transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {projectsOpen && (
                    <motion.ul
                      id="projects-menu"
                      className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg ring-1 ring-black/5 min-w-[200px] py-1 z-50 dark:bg-gray-800"
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.15 }}
                      role="menu"
                    >
                      {projects.map((project) => (
                        <li key={project.id}>
                          <button
                            onClick={() => {
                              onSelectProject(project.id);
                              setProjectsOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-700"
                            role="menuitem"
                          >
                            <FolderOpen size={16} />
                            <span className="truncate">{project.title}</span>
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          onClick={() => {
                            onCreateProject();
                            setProjectsOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-2 dark:text-blue-400 dark:hover:bg-gray-700"
                          role="menuitem"
                        >
                          <Plus size={16} />
                          New Project
                        </button>
                      </li>
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
              <li>
                <button
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-blue-400"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-blue-400"
                >
                  Contact
                </button>
              </li>
            </ul>

            {/* Search & Profile */}
            <div className="flex items-center gap-4 ml-6">
              <div className="relative hidden lg:block">
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 dark:bg-gray-800 dark:text-white"
                  aria-label="Search conversations"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  aria-controls="profile-menu"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <span className="hidden lg:inline text-gray-900 font-medium dark:text-white">{userName}</span>
                  <ChevronDown size={16} className={`hidden lg:inline transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.ul
                      id="profile-menu"
                      className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg ring-1 ring-black/5 min-w-[180px] py-1 z-50 dark:bg-gray-800"
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.15 }}
                      role="menu"
                    >
                      <li>
                        <button
                          onClick={onOpenSettings}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-700"
                          role="menuitem"
                        >
                          <Settings size={16} />
                          Settings
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={onLogout}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-700"
                          role="menuitem"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </li>
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
              <button
                className="md:hidden text-gray-700 hover:text-blue-600 transition-colors dark:text-gray-300 dark:hover:text-blue-400"
                onClick={() => setMobileOpen(true)}
                aria-label="Open mobile menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={mobileMenuRef}
            className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 to-purple-900 text-white md:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h2 className="text-2xl font-bold">Menu</h2>
                <button onClick={() => setMobileOpen(false)} aria-label="Close mobile menu">
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-3">Projects</h3>
                  <div className="space-y-1">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          onSelectProject(project.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 rounded-lg transition-all flex items-center justify-between ${
                          currentProjectId === project.id ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{project.title}</span>
                        {currentProjectId === project.id && <div className="w-2 h-2 bg-cyan-300 rounded-full" />}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        onCreateProject();
                        setMobileOpen(false);
                      }}
                      className="w-full text-left px-5 py-3 flex items-center gap-3 text-cyan-300 hover:bg-white/10 transition-all text-sm font-medium"
                    >
                      <Plus size={16} />
                      New Project
                    </button>
                  </div>
                </div>

                {currentProjectId && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-3">
                      Chats in {currentProjectName}
                    </h3>
                    <div className="space-y-1">
                      {conversations
                        .filter((c) => c.project_id === currentProjectId)
                        .slice(0, 10)
                        .map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onSelectConversation(conv.id);
                              setMobileOpen(false);
                            }}
                            className={`w-full text-left px-5 py-3 rounded-lg transition-all ${
                              currentConvId === conv.id ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                            }`}
                          >
                            <span className="truncate">{conv.title}</span>
                          </button>
                        ))}
                      <button
                        onClick={() => {
                          onCreateConversation();
                          setMobileOpen(false);
                        }}
                        className="w-full text-left px-5 py-3 flex items-center gap-3 text-cyan-300 hover:bg-white/10 transition-all text-sm font-medium"
                      >
                        <Plus size={16} />
                        New Chat
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/20">
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});