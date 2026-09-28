import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ArrowRight,
  Clock,
  Wallet,
  Banknote,
  Receipt,
  ShieldCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Profile, AuditLog, Branch, CashRemittance } from '../../types/index';
import { QuickClockWidget } from '../attendance/QuickClockWidget';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ManagerDashboardProps {
  setActiveView: (view: string) => void;
}

const ManagerDashboardInner: React.FC<ManagerDashboardProps> = ({ setActiveView }) => {
  const { user } = useAuth();
  const [branchStaff, setBranchStaff] = useState<Profile[]>([]);
  const [branchLogs, setBranchLogs] = useState<AuditLog[]>([]);
  const [branchInfo, setBranchInfo] = useState<Branch | null>(null);
  const [branchRemittances, setBranchRemittances] = useState<CashRemittance[]>([]);
  const [branchSales, setBranchSales] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadManagerData = async () => {
      try {
        setLoading(true);
        console.log('[ManagerDashboard] Loading manager dashboard for branch:', user?.branch_id, user?.branch_name);
        const [usersData, logsData, branchesData, remData, salesData] = await Promise.all([
          api.getUsers().catch(err => {
            console.warn('[ManagerDashboard] Failed fetching users:', err);
            return [];
          }),
          api.getAuditLogs().catch(err => {
            console.warn('[ManagerDashboard] Failed fetching audit logs:', err);
            return [];
          }),
          api.getBranches().catch(err => {
            console.warn('[ManagerDashboard] Failed fetching branches:', err);
            return [];
          }),
          api.getRemittances({
            branch_id: user?.branch_id
          }).catch(err => {
            console.warn('[ManagerDashboard] Failed fetching remittances:', err);
            return { remittances: [] };
          }),
          api.getSalesSummary({
            branch_id: user?.branch_id
          }).catch(err => {
            console.warn('[ManagerDashboard] Failed fetching sales summary:', err);
            return { summary: null };
          })
        ]);
        setBranchStaff(usersData || []);
        setBranchLogs((logsData || []).slice(0, 6));
        if (branchesData && branchesData.length > 0) {
          const match = branchesData.find(b => b.id === user?.branch_id) || branchesData[0];
          setBranchInfo(match);
        }
        const rems = remData?.remittances || [];
        console.log('[ManagerDashboard] Loaded branch remittances:', rems.length, rems);
        setBranchRemittances(rems);
        setBranchSales(salesData?.summary || null);
      } catch (err) {
        console.error('[ManagerDashboard] Failed loading manager data', err);
      } finally {
        setLoading(false);
      }
    };
    loadManagerData();
  }, [user?.branch_id]);

  const pendingVerificationCount = branchRemittances.filter(r => r.status === 'SUBMITTED').length;
  const verifiedCount = branchRemittances.filter(r => r.status === 'VERIFIED' || r.status === 'APPROVED').length;
  const totalRemittedCash = branchRemittances.reduce((sum, r) => sum + (r.remitted_amount || 0), 0);
  const totalBranchGross = branchSales?.gross_sales || branchRemittances.reduce((sum, r) => sum + (r.gross_sales || r.expected_cash || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Branch Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider rounded-full bg-[#CDEBC5] text-[#111111]">
                Phase 3 Active • Manager Scope
              </span>
              <span className="text-xs text-zinc-500 font-medium">Branch Operations & Financial Verification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight flex items-center gap-2.5">
              <span>{user?.branch_name || 'Assigned Branch'}</span>
              <span className="text-sm font-normal text-zinc-500">Branch Terminal</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 max-w-2xl leading-relaxed">
              Real-time branch inventory monitoring, cashier shift turnovers, physical denomination counts, cash remittances, attendance and payroll for Tagpuan <span className="text-[#166534] font-semibold">{user?.branch_name}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveView('financial')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Banknote className="w-4 h-4 text-emerald-100" />
              <span>Cash Remittances & Verification</span>
              {pendingVerificationCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-black">
                  {pendingVerificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('inventory')}
              className="px-4 py-2.5 bg-[#111111] hover:bg-[#262626] active:scale-95 text-[#CDEBC5] font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Branch Inventory</span>
            </button>
            <button
              onClick={() => setActiveView('payroll')}
              className="px-3 py-2.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-zinc-700 font-semibold rounded-xl text-xs border border-[#e2e8f0] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Payroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clock In / Out Widget */}
      <QuickClockWidget />

      {/* Manager Cash Remittance & Shift Verification Radar Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-zinc-900 tracking-tight">
                  Cashier Shift Turnover & Cash Remittance Verification
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {user?.branch_name || 'My Branch'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Review cashier physical cash counts, verify denomination breakdown, record allowable store expenses, and sign off.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('financial')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111111] text-[#CDEBC5] text-xs font-black hover:bg-black transition cursor-pointer self-start sm:self-auto"
          >
            <span>Open Remittance Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Financial Counters for Manager */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-400">Branch Gross Sales</p>
            <p className="text-lg font-black font-mono text-zinc-900 mt-0.5">
              ₱{totalBranchGross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">POS Counter + Kiosk</p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <p className="text-[10px] uppercase font-mono font-bold text-emerald-800">Total Cash Remitted</p>
            <p className="text-lg font-black font-mono text-emerald-800 mt-0.5">
              ₱{totalRemittedCash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-emerald-700 mt-1">Physical bills turned over</p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <p className="text-[10px] uppercase font-mono font-bold text-amber-900">Awaiting Verification</p>
            <p className="text-lg font-black font-mono text-amber-900 mt-0.5">
              {pendingVerificationCount} <span className="text-xs font-sans font-normal">Tickets</span>
            </p>
            <p className="text-[10px] text-amber-700 mt-1">
              {pendingVerificationCount > 0 ? 'Requires manager review' : 'All tickets verified'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-400">Verified & Approved</p>
            <p className="text-lg font-black font-mono text-zinc-900 mt-0.5">
              {verifiedCount} <span className="text-xs font-sans font-normal">Tickets</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">Manager sign-off complete</p>
          </div>
        </div>

        {/* List of Today's Shift Remittance Tickets for Branch */}
        {branchRemittances.length > 0 && (
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-800 uppercase font-mono">
                Recent Cashier Shift Turnovers ({branchRemittances.length}):
              </span>
              <button
                onClick={() => setActiveView('financial')}
                className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                View Full Audit Matrix &rarr;
              </button>
            </div>
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden text-xs">
              {branchRemittances.slice(0, 3).map((rem) => {
                const isShortage = rem.remittance_variance < 0;
                return (
                  <div key={rem.id} className="p-3 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-zinc-900">{rem.remittance_number}</span>
                          <span className="text-zinc-500 font-medium">({rem.cashier_name})</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Drawer: ₱{rem.expected_cash.toFixed(2)} | Remitted: ₱{rem.remitted_amount.toFixed(2)} |{' '}
                          <span className={isShortage ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                            {rem.variance_flag} ({rem.remittance_variance >= 0 ? '+' : ''}₱{rem.remittance_variance.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          rem.status === 'SUBMITTED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {rem.status}
                      </span>
                      <button
                        onClick={() => setActiveView('financial')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          rem.status === 'SUBMITTED'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                        }`}
                      >
                        {rem.status === 'SUBMITTED' ? 'Verify & Receive' : 'Review'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Branch Team Members</span>
            <div className="p-2 rounded-xl bg-[#f0f9ee] text-[#166534]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {branchStaff.length} <span className="text-xs font-sans text-zinc-500 font-normal">Staff</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Assigned Cashier & Crew</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Branch Security Scope</span>
            <div className="p-2 rounded-xl bg-[#111111] text-[#CDEBC5]">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-[#111111]">
            Isolated to {user?.branch_name}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Cross-branch access blocked by DB</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Branch Audit Events</span>
            <div className="p-2 rounded-xl bg-[#f0f9ee] text-[#166534]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {branchLogs.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Activity logged in current session</p>
        </div>
      </div>

      {/* Staff & Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Staff Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold text-[#111111]">Branch Team</h3>
            </div>
            <button
              onClick={() => setActiveView('users')}
              className="text-xs text-[#111111] hover:underline font-bold"
            >
              View Full Team
            </button>
          </div>

          <div className="divide-y divide-[#f1f5f9]">
            {branchStaff.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No staff members currently assigned to this branch.
              </div>
            ) : (
              branchStaff.map((staff) => (
                <div key={staff.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center font-bold text-xs text-[#111111]">
                      {staff.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111111]">{staff.full_name}</p>
                      <p className="text-[11px] text-zinc-500">{staff.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-zinc-700">
                    {staff.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Branch Activity Logs */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold text-[#111111]">Branch Activity Trail</h3>
            </div>
            <button
              onClick={() => setActiveView('audit')}
              className="text-xs text-[#111111] hover:underline font-bold"
            >
              View Logs
            </button>
          </div>

          <div className="divide-y divide-[#f1f5f9]">
            {branchLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No branch activity logs recorded yet.
              </div>
            ) : (
              branchLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#111111]">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] text-zinc-500">{log.user_email}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Export Component with ErrorBoundary
export const ManagerDashboard: React.FC<ManagerDashboardProps> = (props) => {
  return (
    <ErrorBoundary>
      <ManagerDashboardInner {...props} />
    </ErrorBoundary>
  );
};

export default ManagerDashboard;
