import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, Shield, Building2, User, CheckCircle2, ChevronDown, Menu, X, ExternalLink, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useBranch } from '../../context/BranchContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen,
  activeView,
  setActiveView
}) => {
  const { user, logout, isOwner } = useAuth();
  const { selectedBranchId, setSelectedBranchId, branches, toggleDecoy } = useBranch();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-[#CDEBC5] text-[#111111] border-[#a3d995] font-bold';
      case 'MANAGER':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
      case 'CASHIER':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      case 'CREW':
        return 'bg-teal-50 text-teal-800 border-teal-200 font-semibold';
      case 'WAREHOUSEMAN':
        return 'bg-purple-50 text-purple-800 border-purple-200 font-semibold';
      case 'KITCHEN':
        return 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left: Mobile Hamburger & Current Page / Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition"
          aria-label="Toggle Navigation Menu"
          id="mobile-menu-toggle-btn"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#111111] p-1.5 flex items-center justify-center shrink-0">
            <img 
              src="/icons/icon.svg" 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-extrabold text-[#111111] tracking-tight">Tagpuan <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-[#CDEBC5] text-[#111111]">ERP</span></span>
            <span className="text-[10px] text-zinc-500 block -mt-0.5 font-medium">Home of Authentic Burger & Siomai</span>
          </div>
        </div>

        {/* Active Branch Scope Selector */}
        {isOwner ? (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs">
            <Building2 className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
            <span className="text-zinc-500 font-medium shrink-0">Branch:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-bold text-[#111111] focus:outline-none cursor-pointer text-xs"
              aria-label="Filter active branch"
              id="header-branch-selector"
            >
              <option value="ALL">All Branches (Global Access)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-xs">
            <Building2 className="w-3.5 h-3.5 text-zinc-700" />
            <span className="text-zinc-500">Branch:</span>
            <span className="font-bold text-[#111111]">
              {user?.branch_name || 'Assigned Branch'}
            </span>
          </div>
        )}
      </div>

      {/* Right: Privacy Decoy Mode (Owner), Notification Bell, Profile dropdown */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* PWA Install App Button */}
        <div>
          <PWAInstallButton variant="compact" forceShow={true} />
        </div>

        {/* Stealth Decoy Toggle (Audit Mode) for Owner */}
        {isOwner && (
          <button
            type="button"
            onClick={toggleDecoy}
            title="Switch to Raw Materials & Stock Inventory Sheet (Audit Mode). Exit via ESC x3 or triple tap header."
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-semibold transition"
            id="privacy-decoy-mode-btn"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" />
            <span>🛡️ Privacy Decoy</span>
          </button>
        )}
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            id="notification-bell-btn"
            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent hover:border-[#e2e8f0] transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#111111] text-[#CDEBC5] text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {isNotifOpen && (
            <div 
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#e5e7eb] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
              id="notification-popover"
            >
              <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-[#f8fafc]">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#111111]">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#CDEBC5] text-[#111111] rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-zinc-600 hover:text-[#111111] font-semibold underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#f1f5f9]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No system notifications at this time.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-3.5 hover:bg-[#f8fafc] cursor-pointer transition flex items-start gap-3 ${
                        !notif.read ? 'bg-[#f0f9ee]/60' : ''
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#22c55e]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-xs font-semibold truncate ${!notif.read ? 'text-[#111111]' : 'text-zinc-600'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-[#f8fafc] border-t border-[#e5e7eb] text-center">
                <button
                  onClick={() => {
                    setActiveView('notifications');
                    setIsNotifOpen(false);
                  }}
                  className="text-xs font-bold text-[#111111] hover:underline"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            id="user-profile-menu-btn"
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] transition"
          >
            <div className="w-7 h-7 rounded-lg bg-[#111111] flex items-center justify-center text-[#CDEBC5] font-bold text-xs">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#111111] leading-none truncate max-w-[120px]">
                {user?.full_name || 'User'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(user?.role)}`}>
                  {user?.role}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-0.5 hidden sm:block" />
          </button>

          {/* User Menu Popover */}
          {isUserMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-64 bg-white border border-[#e5e7eb] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
              id="user-profile-popover"
            >
              <div className="p-4 border-b border-[#e5e7eb] bg-[#f8fafc]">
                <p className="text-xs font-bold text-[#111111] truncate">{user?.full_name}</p>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">{user?.email}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadgeColor(user?.role)}`}>
                    {user?.role}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate">
                    {isOwner ? 'Global Access' : (user?.branch_name || 'Assigned Branch')}
                  </span>
                </div>
              </div>

              <div className="p-2 divide-y divide-[#f1f5f9]">
                <button
                  onClick={() => {
                    setActiveView('notifications');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:text-[#111111] hover:bg-[#f8fafc] rounded-lg transition flex items-center gap-2.5"
                >
                  <Bell className="w-4 h-4 text-zinc-500" />
                  <span>Notification Center</span>
                </button>

                {isOwner && (
                  <button
                    onClick={() => {
                      setActiveView('security');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:text-[#111111] hover:bg-[#f8fafc] rounded-lg transition flex items-center gap-2.5"
                  >
                    <Shield className="w-4 h-4 text-[#166534]" />
                    <span>Supabase RLS & Security</span>
                  </button>
                )}

                <button
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    await logout();
                  }}
                  id="header-logout-btn"
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-2.5 mt-1"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
