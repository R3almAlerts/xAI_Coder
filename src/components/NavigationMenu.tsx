// src/components/NavigationMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, FolderOpen, Settings, Search, ChevronDown, Plus, LogOut, User } from 'lucide-react';
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

export const NavigationMenu: React.FC<NavigationMenuProps> = React.memo((props) => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  // This is the key: default logo is a tiny transparent pixel
  const DEFAULT_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const logoUrl = settings?.logoUrl || DEFAULT_LOGO;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setMobileOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (projectsRef.current && !projectsRef.current.contains(e.target as Node)) setProjectsOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false) && setProfileOpen(false) && setProjectsOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 dark:bg-gray-900/95 dark:border-gray-800 shadow-sm">
      <nav className="max-w-full px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          {/* Logo — NEVER shows vite.svg */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={logoUrl}
                alt="xAI Coder Logo"
                className="h-9 w-auto rounded-lg object-contain opacity-0 transition-opacity duration-200"
                onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_LOGO;
                  e.currentTarget.classList.add('opacity-100');
                }}
              />
              {/* Fallback skeleton */}
              <div className="absolute inset-0 h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">xAI Coder</h1>
          </div>

          {/* Rest of your nav — unchanged */}
          <ul className="hidden md:flex items-center gap-8">
            <li><button onClick={() => navigate('/')} className="text-gray-700 hover:text-blue-600 font-medium transition dark:text-gray-300 dark:hover:text-blue-400">Home</button></li>
            <li className="relative" ref={projectsRef}>
              <button onClick={() => setProjectsOpen(o => !o)} className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 font-medium transition dark:text-gray-300 dark:hover:text-blue-400" aria-haspopup="true" aria-expanded={projectsOpen}>
                Projects
                <ChevronDown size={16} className={`transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
              </button>
              {/* Dropdown content */}
            </li>
          </ul>

          <div className="flex items-center gap-4">
            {/* Search, profile, mobile menu — unchanged */}
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-700 dark:text-gray-300" aria-label="Open menu">
              <Menu size={26} />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
});

NavigationMenu.displayName = 'NavigationMenu';