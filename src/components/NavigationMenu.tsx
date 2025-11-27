// src/components/NavigationMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  FolderOpen,
  Settings,
  Search,
  ChevronDown,
  Plus,
  LogOut,
  User,
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
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.96 },
};

const mobileMenuVariants = {
  closed: { x: '100%' },
  open: { x: 0 },
  exit: { x: '100%' },
};

export const NavigationMenu: React.FC<NavigationMenuProps> = React.memo(
  ({
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

    // Fixed: Defensive access + loading state
    const { settings, isLoading: settingsLoading = true } = useSettings();

    const logoUrl =
      settings?.logoUrl ||
      'https://vrcxtkstyeutxwhllnws.supabase.co/storage/v1/object/public/logos/logo.png';

    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [projectsOpen, setProjectsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const projectsRef = useRef<HTMLDivElement>(null);

    // Close menus on outside click or ESC
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node))
          setMobileOpen(false);
        if (profileRef.current && !profileRef.current.contains(e.target as Node))
          setProfileOpen(false);
        if (projectsRef.current && !projectsRef.current.contains(e.target as Node))
          setProjectsOpen(false);
      };

      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileOpen(false);
          setProfileOpen(false);
          setProjectsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEsc);
      };
    }, []);

    const filteredConvs = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Show skeleton while settings load
    if (settingsLoading) {
      return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-lg border-b border-gray-200 dark:bg-gray-900/95 dark:border-gray-800">
          <div className="flex items-center justify-between h-full px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="w-40 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:block w-72 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          </div>
        </header>
      );
    }

    return (
      <>
        {/* Desktop Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 dark:bg-gray-900/95 dark:border-gray-800 shadow-sm">
          <nav className="max-w-full px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="xAI Coder Logo"
                  className="h-9 w-auto rounded-lg object-contain"
                  onError={(e) => (e.currentTarget.src = '/vite.svg')}
                />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  xAI Coder
                </h1>
              </div>

              {/* Desktop Nav */}
              <ul className="hidden md:flex items-center gap-8">
                <li>
                  <button
                    onClick={() => navigate('/')}
                    className="text-gray-700 hover:text-blue-600 font-medium transition dark:text-gray-300 dark:hover:text-blue-400"
                  >
                    Home
                  </button>
                </li>
                <li className="relative" ref={projectsRef}>
                  <button
                    onClick={() => setProjectsOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 font-medium transition dark:text-gray-300 dark:hover:text-blue-400"
                    aria-haspopup="true"
                    aria-expanded={projectsOpen}
                  >
                    Projects
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${projectsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {projectsOpen && (
                      <motion.ul
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-xl shadow-xl ring-1 ring-black/5 py-2 z-50 dark:bg-gray-800"
                        role="menu"
                      >
                        {projects.map((p) => (
                          <li key={p.id}>
                            <button
                              onClick={() => {
                                onSelectProject(p.id);
                                setProjectsOpen(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                              role="menuitem"
                            >
                              <FolderOpen size={16} className="text-indigo-600" />
                              <span className="truncate font-medium">{p.title}</span>
                            </button>
                          </li>
                        ))}
                        <li>
                          <button
                            onClick={() => {
                              onCreateProject();
                              setProjectsOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 font-medium"
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
              </ul>

              {/* Right Side */}
              <div className="flex items-center gap-4">
                {/* Desktop Search */}
                <div className="hidden lg:block relative">
                  <input
                    type="search"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72 transition dark:bg-gray-800 dark:text-white"
                  />
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>

                {/* User Menu */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="flex items-center gap-2.5 hover:opacity-80 transition"
                    aria-haspopup="true"
                    aria-expanded={profileOpen}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md">
                      <User size={18} className="text-white" />
                    </div>
                    <span className="hidden lg:block font-medium text-gray-900 dark:text-white">
                      {userName}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`hidden lg:block transition-transform ${
                        profileOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl ring-1 ring-black/5 py-2 dark:bg-gray-800"
                      >
                        <button
                          onClick={onOpenSettings}
                          className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Settings size={16} />
                          Settings
                        </button>
                        {onLogout && (
                          <button
                            onClick={onLogout}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileOpen(true)}
                  className="md:hidden text-gray-700 dark:text-gray-300"
                  aria-label="Open menu"
                >
                  <Menu size={26} />
                </button>
              </div>
            </div>
          </nav>
        </header>

        {/* Mobile Full-Screen Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
              />

              <motion.div
                ref={mobileMenuRef}
                variants={mobileMenuVariants}
                initial="closed"
                animate="open"
                exit="exit"
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b dark:border-gray-800">
                  <h2 className="text-2xl font-bold">Menu</h2>
                  <button onClick={() => setMobileOpen(false)}>
                    <X size={28} />
                  </button>
                </div>

                <div className="p-6">
                  <input
                    type="search"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-8">
                  {/* Projects */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Projects
                    </h3>
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition ${
                          currentProjectId === p.id
                            ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/50'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="truncate">{p.title}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        onCreateProject();
                        setMobileOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-blue-600 font-medium hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2"
                    >
                      <Plus size={16} />
                      New Project
                    </button>
                  </div>

                  {/* Current Project Chats */}
                  {currentProjectId && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Chats in {currentProjectName}
                      </h3>
                      {filteredConvs
                        .filter((c) => c.project_id === currentProjectId)
                        .slice(0, 15)
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              onSelectConversation(c.id);
                              setMobileOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg transition ${
                              currentConvId === c.id
                                ? 'bg-indigo-100 text-indigo-700 font-medium dark:bg-indigo-900/50'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {c.title}
                          </button>
                        ))}
                      <button
                        onClick={() => {
                          onCreateConversation();
                          setMobileOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-cyan-600 font-medium hover:bg-cyan-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2"
                      >
                        <Plus size={16} />
                        New Chat
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t dark:border-gray-800">
                  <button
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Settings size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{userName}</p>
                      <p className="text-sm text-gray-500">Settings & API Keys</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }
);

NavigationMenu.displayName = 'NavigationMenu';