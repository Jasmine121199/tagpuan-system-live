import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { LayoutDashboard, Users, Building2, FileText, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useBranch } from '../../context/BranchContext';

interface AppLayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeView,
  setActiveView
}) => {
  const { isOwner, isManager } = useAuth();
  const { toggleDecoy } = useBranch();
  const { unreadCount } = useNotifications();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1a1a1a] flex flex-col antialiased">
      {/* Top Header */}
      <Header
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
          />
        </div>

        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fadeIn flex"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div 
              className="w-72 max-w-[85vw] h-full shadow-2xl animate-slideRight bg-[#111111]"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                activeView={activeView}
                setActiveView={setActiveView}
                closeMobileMenu={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Application Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 bg-[#f8fafc] flex flex-col justify-between">
          <div className="max-w-7xl mx-auto w-full flex-1">
            {children}
          </div>

          {/* Discreet Global Footer with v1.0.4 label */}
          <footer className="max-w-7xl mx-auto w-full pt-8 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400 border-t border-zinc-200/70 mt-8">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>Tagpuan Multi-Branch Management ERP</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <button
                type="button"
                onClick={toggleDecoy}
                title="Triple click or click to toggle Stealth Decoy Mode"
                className="hover:text-zinc-600 transition cursor-pointer select-none"
                id="footer-version-tag"
              >
                v1.0.4
              </button>
              <span>•</span>
              <span>All Systems Operational</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for rapid touch switching */}
      <nav 
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-[#e5e7eb] px-2 py-1.5 flex items-center justify-around z-30 shadow-lg"
      >
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-semibold transition ${
            activeView === 'dashboard' ? 'bg-[#CDEBC5] text-[#111111]' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </button>

        {(isOwner || isManager) && (
          <button
            onClick={() => setActiveView('users')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-semibold transition ${
              activeView === 'users' ? 'bg-[#CDEBC5] text-[#111111]' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>{isOwner ? 'Users' : 'Staff'}</span>
          </button>
        )}

        <button
          onClick={() => setActiveView('branches')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-semibold transition ${
            activeView === 'branches' ? 'bg-[#CDEBC5] text-[#111111]' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Building2 className="w-5 h-5 mb-0.5" />
          <span>Branches</span>
        </button>

        {(isOwner || isManager) && (
          <button
            onClick={() => setActiveView('audit')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-semibold transition ${
              activeView === 'audit' ? 'bg-[#CDEBC5] text-[#111111]' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>Audit</span>
          </button>
        )}

        <button
          onClick={() => setActiveView('notifications')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-semibold relative transition ${
            activeView === 'notifications' ? 'bg-[#CDEBC5] text-[#111111]' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Bell className="w-5 h-5 mb-0.5" />
          <span>Alerts</span>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-3 w-3.5 h-3.5 bg-[#111111] text-[#CDEBC5] text-[9px] font-black rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
};
