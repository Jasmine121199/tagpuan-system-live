import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Bell,
  Shield,
  ShoppingCart,
  Boxes,
  ChefHat,
  Truck,
  Wallet,
  Bot,
  Layers,
  Sparkles,
  Clock,
  ShoppingBag,
  PackageCheck,
  Award,
  Sliders,
  FileSpreadsheet,
  Banknote
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  closeMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  closeMobileMenu
}) => {
  const { user, isOwner, isManager } = useAuth();
  const { unreadCount } = useNotifications();

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    if (closeMobileMenu) {
      closeMobileMenu();
    }
  };

  // Role-based Nav items
  const getNavItems = () => {
    if (isOwner) {
      return [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { id: 'master-control', label: 'Owner Master Control', icon: Sliders, badge: 'OWNER' },
        { id: 'financial', label: 'Cash Remittance & Sales', icon: Banknote },
        { id: 'reports', label: 'Report Center & Data', icon: FileSpreadsheet, badge: 'P14' },
        { id: 'ai-command', label: 'AI Command Center', icon: Bot, badge: 'AI' },
        { id: 'purchasing', label: 'Purchasing & Suppliers', icon: ShoppingBag },
        { id: 'warehouse', label: 'Central Commissary & Logistics', icon: Truck },
        { id: 'requests', label: 'Stock Requests & AI', icon: Bot },
        { id: 'inventory', label: 'Branch Inventory', icon: Boxes },
        { id: 'kds', label: 'Kitchen Display (KDS)', icon: ChefHat },
        { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
        { id: 'loyalty', label: 'Loyalty & Rewards', icon: Award },
        { id: 'kiosk', label: 'Customer Kiosk Mode', icon: Sparkles },
        { id: 'products', label: 'Products & Recipes', icon: ChefHat },
        { id: 'employees', label: 'Employees', icon: Users },
        { id: 'attendance', label: 'Attendance Logs', icon: Clock },
        { id: 'payroll', label: 'Payroll & Rates', icon: Wallet },
        { id: 'users', label: 'User Accounts', icon: Shield },
        { id: 'branches', label: '17 Branches', icon: Building2 },
        { id: 'audit', label: 'Audit Logs', icon: FileText },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'security', label: 'Database & RLS', icon: Shield },
      ];
    }

    if (isManager) {
      return [
        { id: 'dashboard', label: 'Branch Dashboard', icon: LayoutDashboard },
        { id: 'financial', label: 'Cash Remittance & Sales', icon: Banknote },
        { id: 'reports', label: 'Branch Reports', icon: FileSpreadsheet, badge: 'P14' },
        { id: 'ai-command', label: 'AI Command Center', icon: Bot, badge: 'AI' },
        { id: 'requests', label: 'Branch Stock Requests', icon: PackageCheck },
        { id: 'inventory', label: 'Branch Inventory', icon: Boxes },
        { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
        { id: 'loyalty', label: 'Loyalty & Rewards', icon: Award },
        { id: 'kiosk', label: 'Customer Kiosk Mode', icon: Sparkles },
        { id: 'products', label: 'Products & Recipes', icon: ChefHat },
        { id: 'employees', label: 'Branch Employees', icon: Users },
        { id: 'attendance', label: 'Branch Attendance', icon: Clock },
        { id: 'payroll', label: 'Branch Payroll', icon: Wallet },
        { id: 'branches', label: 'Branch Info', icon: Building2 },
        { id: 'audit', label: 'Branch Logs', icon: FileText },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
      ];
    }

    // Specific strict role for WAREHOUSEMAN
    if (user?.role === 'WAREHOUSEMAN') {
      return [
        { id: 'warehouse', label: 'Central Commissary & Logistics', icon: Truck },
        { id: 'requests', label: 'Branch Request Queue', icon: PackageCheck },
        { id: 'attendance', label: 'My Attendance', icon: Clock },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
      ];
    }

    // Specific strict role for KITCHEN users: Only KDS
    if (user?.role === 'KITCHEN') {
      return [
        { id: 'kds', label: 'Kitchen Display (KDS)', icon: ChefHat },
        { id: 'attendance', label: 'My Attendance', icon: Clock },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
      ];
    }

    // Specific strict role for CASHIER: Strictly POS, Attendance, Cash Remittance, Loyalty (NO KDS!)
    if (user?.role === 'CASHIER') {
      return [
        { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
        { id: 'financial', label: 'Cash Remittance & Shifts', icon: Banknote },
        { id: 'loyalty', label: 'Loyalty & Rewards', icon: Award },
        { id: 'attendance', label: 'My Attendance', icon: Clock },
        { id: 'kiosk', label: 'Customer Kiosk Mode', icon: Sparkles },
        { id: 'products', label: 'Product Catalog', icon: ChefHat },
        { id: 'branches', label: 'My Branch', icon: Building2 },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
      ];
    }

    // Operational CREW: KDS, Attendance, Products, Branch Info
    return [
      { id: 'dashboard', label: 'Crew Station', icon: LayoutDashboard },
      { id: 'kds', label: 'Kitchen Display (KDS)', icon: ChefHat },
      { id: 'attendance', label: 'My Attendance', icon: Clock },
      { id: 'products', label: 'Product Catalog', icon: ChefHat },
      { id: 'branches', label: 'My Branch', icon: Building2 },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    ];
  };

  const navItems = getNavItems();

  // Coming soon Phase 8+ modules
  const comingSoonModules = [
    { label: 'Voice AI Order Assistant', icon: Bot, phase: 'Phase 8' },
    { label: 'Multi-Location Live Geofencing', icon: Truck, phase: 'Phase 8' },
  ];

  return (
    <aside className="w-64 bg-[#111111] border-r border-[#222222] flex flex-col h-full overflow-y-auto">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#222222] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] p-2 flex items-center justify-center">
          <img 
            src="/icons/icon.svg" 
            alt="Tagpuan Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
            TAGPUAN <span className="text-[#111111] text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-[#CDEBC5]">ERP</span>
          </h2>
          <p className="text-[10px] text-zinc-400 font-medium">Home of Burger & Siomai</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            Tagpuan ERP System
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  id={`nav-${item.id}`}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-[#CDEBC5] text-[#111111] shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition ${isActive ? 'text-[#111111]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-[#111111] text-[#CDEBC5]' : 'bg-[#CDEBC5] text-[#111111]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Future Modules Section (Strictly labeled Coming Soon) */}
        <div>
          <div className="px-3 flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
              Future Modules
            </p>
            <span className="text-[9px] text-[#111111] font-bold bg-[#CDEBC5] px-1.5 py-0.5 rounded">
              Roadmap
            </span>
          </div>
          <div className="space-y-1">
            {comingSoonModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.label}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-400 transition select-none opacity-60"
                  title="Coming in later phases"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-600" />
                    <span>{module.label}</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-[#181818] border border-[#282828]">
                    {module.phase}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PWA Install Button (Discreet in-app install prompt) */}
      <div className="px-3 pb-2">
        <PWAInstallButton variant="sidebar" forceShow={true} />
      </div>

      {/* User Scope Footer */}
      <div className="p-3 border-t border-[#222222] bg-[#0c0c0c]">
        <div className="p-2.5 rounded-xl bg-[#181818] border border-[#282828] text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-zinc-400">Current Role:</span>
            <span className="text-[10px] font-bold text-[#CDEBC5] font-mono">{user?.role}</span>
          </div>
          <p className="text-[11px] text-zinc-300 truncate font-medium">
            {isOwner ? 'Full System Authority' : (user?.branch_name || 'Assigned Branch')}
          </p>
        </div>
      </div>
    </aside>
  );
};
