// src/components/NavigationMenu.tsx
import React from 'react';
import { Bot, Settings, Plus, Menu, X } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface NavigationMenuProps {
  // ... your existing props
  onOpenSettings: () => void;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = (props) => {
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const logoUrl = settings.logoUrl || 'https://vrcxtkstyeutxwhllnws.supabase.co/storage/v1/object/public/logos/logo.png';

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-80 lg:fixed lg:inset-y-0 bg-gradient-to-b from-indigo-900 to-purple-900 text-white">
        {/* Logo + Title */}
        <div className="flex items-center gap-3 px-6 py-8 border-b border-white/10">
          <img 
            src={logoUrl} 
            alt="Code Guru Logo" 
            className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-lg"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9IiM1RTdCRUIiLz4KPHBhdGggZD0iTTI0IDI4TDMwIDE2SDM0TDE4IDMyTDE0IDI2SDIyTDI0IDI4WiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K';
            }}
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Code Guru</h1>
            <p className="text-xs opacity-80">Your AI Coding Assistant</p>
          </div>
        </div>

        {/* Rest of your existing menu content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Your existing project/conversation list */}
        </div>

        {/* Settings Button */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={props.onOpenSettings}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      </div>

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
    </>
  );
};