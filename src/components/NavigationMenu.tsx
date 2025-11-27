// src/components/NavigationMenu.tsx
import React, { useState } from 'react';
import {
  Menu,
  X,
  Home,
  FolderOpen,
  Settings,
  Plus,
  LogOut,
  User,
  MessageSquare,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../hooks/useSettings';
import { useNavigate } from 'react-router-dom';

interface NavigationMenuProps {
  onOpenSettings: () => void;
  onLogout?: () => void;
  userName: string;
  currentView: 'home' | 'chat' | 'settings';
}

const FALLBACK_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  onOpenSettings,
  onLogout,
  userName,
  currentView,
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoUrl = settings?.logoUrl || FALLBACK_LOGO;

  const menuItems = [
    { icon: Home, label: 'Home', view: 'home', onClick: () => navigate('/') },
    { icon: MessageSquare, label: 'Chat', view: 'chat', onClick: () => navigate('/chat') },
    { icon: FolderOpen, label: 'Projects', view: 'projects', onClick: () => navigate('/projects') },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
            <h1 className="text-xl font-bold">xAI Coder</h1>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-2">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Sidebar — Fixed on Desktop, Slide-in on Mobile */}
      <motion.aside
        initial={false}
        animate={{ x: mobileOpen ? 0 : '-100%' }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 lg:translate-x-0 lg:static lg:inset-0"
      >
        <div className="flex flex-col h-full">
          {/* Logo + Title */}
          <div className="hidden lg:flex items-center gap-3 px-6 py-6 border-b border-gray-200 dark:border-gray-800">
            <img
              src={logoUrl}
              alt="xAI Coder"
              className="h-10 w-10 rounded-lg object-contain bg-gray-100"
              onError={(e) => (e.currentTarget.src = FALLBACK_LOGO)}
            />
            <h1 className="text-2xl font-bold">xAI Coder</h1>
          </div>

          {/* Mobile Close Button */}
          <div className="flex justify-end p-4 lg:hidden">
            <button onClick={() => setMobileOpen(false)}>
              <X size={28} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick();
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-8 bg-blue-600 rounded-full" />}
                </button>
              );
            })}

            <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{userName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Developer</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content Padding */}
      <div className="lg:w-64 flex-shrink-0" />
    </>
  );
};

NavigationMenu.displayName = 'NavigationMenu';