import React from 'react';
import { Building2, ShieldCheck, Clock, User, CheckCircle2, AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { QuickClockWidget } from '../attendance/QuickClockWidget';
import { MyPayslipsWidget } from '../payroll/MyPayslipsWidget';

interface OperationalDashboardProps {
  setActiveView?: (view: string) => void;
}

export const OperationalDashboard: React.FC<OperationalDashboardProps> = ({ setActiveView }) => {
  const { user } = useAuth();

  const getRoleDescription = (role?: string) => {
    switch (role) {
      case 'CASHIER':
        return 'Point of Sale (POS) frontline station operator. Operates branch ordering terminals and cashier shifts.';
      case 'CREW':
        return 'Branch operations and service station. Handles order fulfillment, customer service, and dining stations.';
      case 'WAREHOUSEMAN':
        return 'Warehouse logistics and ingredient supply scope. Responsible for raw inventory receiving and commissary dispatch foundation.';
      case 'KITCHEN':
        return 'Kitchen display and meal preparation station. Handles burger grilling, siomai steaming, and order prep cues.';
      default:
        return 'Tagpuan ERP operational station.';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Station Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider rounded-full bg-[#CDEBC5] text-[#111111]">
                Operational Terminal • {user?.role}
              </span>
              <span className="text-xs text-zinc-500 font-medium">Phase 2 Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              {user?.branch_name || 'Assigned Branch'} Station
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 max-w-2xl leading-relaxed">
              {getRoleDescription(user?.role)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-[#166534] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Session Authenticated</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              User: <span className="text-[#111111] font-semibold">{user?.full_name}</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              Email: <span className="text-zinc-700">{user?.email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Phase 2: Live Clock In / Clock Out Attendance Widget */}
      <QuickClockWidget />

      {/* Employee Confidential Self-Service: Approved Payslips */}
      <MyPayslipsWidget />

      {/* POS Quick Launcher for Frontline Cashiers & Crew */}
      {setActiveView && (
        <div className="p-5 rounded-2xl bg-[#111111] text-white border border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-bold">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Branch Point of Sale Terminal</h3>
                <span className="text-[10px] font-bold bg-[#CDEBC5] text-[#111111] px-2 py-0.5 rounded-full font-mono">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Launch register, create orders, process payments, and sync real-time ingredient deductions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('pos')}
            className="px-5 py-2.5 rounded-xl bg-[#CDEBC5] text-[#111111] hover:bg-[#bce4b2] font-black text-xs transition flex items-center justify-center gap-2 shrink-0"
          >
            <span>Open POS Register</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Terminal Details & Isolation Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-zinc-700" />
            <h3 className="text-base font-bold text-[#111111]">Assigned Branch Scope</h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Your terminal is cryptographically tied to <span className="text-[#111111] font-semibold">{user?.branch_name}</span>. Database Row Level Security automatically limits queries and transactions exclusively to this branch.
          </p>

          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Branch Name:</span>
              <span className="text-[#111111] font-bold">{user?.branch_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Branch ID:</span>
              <span className="font-mono text-zinc-700 font-medium">{user?.branch_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Access Scope:</span>
              <span className="text-[#166534] font-bold">Strict Single Branch Isolation</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-zinc-700" />
            <h3 className="text-base font-bold text-[#111111]">Security & Audit Status</h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            All authentications, logins, logouts, clock-in, and clock-out actions are permanently recorded to the immutable audit log with server timestamps.
          </p>

          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Audit Logging:</span>
              <span className="text-[#166534] font-bold">Enabled (Active)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Session Security:</span>
              <span className="text-[#111111] font-mono font-medium">Bearer Token Validated</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Database Role:</span>
              <span className="text-[#111111] font-mono font-bold">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice for POS / Ordering */}
      <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm text-center">
        <span className="px-3 py-1 text-xs font-bold font-mono rounded-full bg-[#111111] text-[#CDEBC5] inline-block mb-3">
          Coming in Phase 3
        </span>
        <h3 className="text-lg font-bold text-[#111111] mb-1">
          {user?.role === 'CASHIER' && 'Point of Sale (POS) Terminal'}
          {user?.role === 'CREW' && 'Crew Station & Ordering Module'}
          {user?.role === 'WAREHOUSEMAN' && 'Warehouse Inventory & Stock Receiving'}
          {user?.role === 'KITCHEN' && 'Kitchen Display System (KDS) Live Tickets'}
        </h3>
        <p className="text-xs text-zinc-500 max-w-lg mx-auto leading-relaxed">
          The operational terminal interface for {user?.role?.toLowerCase()} will be connected in Phase 3 with live inventory and ticketing synchronization.
        </p>
      </div>
    </div>
  );
};
