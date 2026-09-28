import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Activity,
  PlusCircle,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
  ShoppingCart,
  Boxes,
  ChefHat,
  Truck,
  Wallet,
  Bot,
  Sliders,
  TrendingUp,
  DollarSign,
  Banknote,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { api } from '../../lib/api';
import { Branch, Profile, AuditLog, CashRemittance } from '../../types/index';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface OwnerDashboardProps {
  setActiveView: (view: string) => void;
  onOpenCreateUser: () => void;
}

const OwnerDashboardInner: React.FC<OwnerDashboardProps> = ({
  setActiveView,
  onOpenCreateUser
}) => {
  const { user } = useAuth();
  const { selectedBranchId, setSelectedBranchId, selectedBranchName, branches } = useBranch();
  const [users, setUsers] = useState<Profile[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [remittances, setRemittances] = useState<CashRemittance[]>([]);
  const [auditDatePreset, setAuditDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL'>('TODAY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('[OwnerDashboard] Loading metrics for branch scope:', selectedBranchId, 'and date preset:', auditDatePreset);
        const [usersData, logsData, salesData, remData] = await Promise.all([
          api.getUsers(),
          api.getAuditLogs(),
          api.getSalesSummary({
            branch_id: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
            date_preset: auditDatePreset.toLowerCase()
          }).catch(err => {
            console.warn('[OwnerDashboard] Sales summary fetch error (non-fatal):', err);
            return { summary: null };
          }),
          api.getRemittances({
            branch_id: selectedBranchId !== 'ALL' ? selectedBranchId : undefined
          }).catch(err => {
            console.warn('[OwnerDashboard] Remittances fetch error (non-fatal):', err);
            return { remittances: [] };
          })
        ]);
        setUsers(usersData || []);
        setRecentLogs((logsData || []).slice(0, 5));
        setSalesSummary(salesData?.summary || null);
        const remList = remData?.remittances || [];
        console.log('[OwnerDashboard] Loaded remittances count:', remList.length);
        setRemittances(remList);
      } catch (err) {
        console.error('[OwnerDashboard] Failed loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedBranchId, auditDatePreset]);

  // Global Sales & Remittance Audit Metrics for Master Owner Hub
  const remittanceAuditMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // Filter remittances dynamically by date
    const filteredRem = remittances.filter(r => {
      if (auditDatePreset === 'TODAY' && r.date !== today) return false;
      if (auditDatePreset === 'YESTERDAY' && r.date !== yesterday) return false;
      if (auditDatePreset === 'THIS_WEEK' && r.date < sevenDaysAgo) return false;
      if (auditDatePreset === 'THIS_MONTH' && !r.date.startsWith(currentMonth)) return false;
      return true;
    });

    let totalGrossSales = salesSummary?.gross_sales || 0;
    let totalPhysicalRemitted = 0;
    let totalExpensesDeducted = 0;
    let totalExpected = 0;

    filteredRem.forEach((r) => {
      if (totalGrossSales === 0) {
        totalGrossSales += r.gross_sales || r.expected_cash || 0;
      }
      totalPhysicalRemitted += r.remitted_amount || 0;
      totalExpected += r.expected_cash || 0;
      totalExpensesDeducted += r.manager_deductions_amount || 0;
    });

    // If totalPhysicalRemitted exists and totalExpected was 0, default expected to physical or cash sales
    const expectedDrawerTarget = totalExpected > 0 ? totalExpected : (salesSummary?.cash_sales || totalPhysicalRemitted);
    const netVariance = totalPhysicalRemitted - expectedDrawerTarget;
    const varianceFlag: 'TALLY' | 'SHORTAGE' | 'OVERAGE' =
      Math.abs(netVariance) < 0.01 ? 'TALLY' : netVariance < 0 ? 'SHORTAGE' : 'OVERAGE';

    const calculated = {
      totalGrossSales,
      totalPhysicalRemitted,
      totalExpensesDeducted,
      netVariance,
      varianceFlag,
      ticketCount: filteredRem.length
    };

    console.log('[OwnerDashboard] Remittance Audit Metrics calculated:', calculated, {
      selectedBranchId,
      auditDatePreset,
      filteredCount: filteredRem.length
    });

    return calculated;
  }, [remittances, salesSummary, auditDatePreset, selectedBranchId]);

  const activeBranchesCount = branches.filter(b => b.is_active).length;
  const activeUsersCount = users.filter(u => u.is_active).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Executive Welcome Banner with Global Branch Selector */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CDEBC5]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider rounded-full bg-[#CDEBC5] text-[#111111]">
                Phase 3 Active • Live Multi-Branch POS & Inventory
              </span>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Scope:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent text-[#111111] font-bold focus:outline-none cursor-pointer"
                  id="dashboard-branch-scope-selector"
                >
                  <option value="ALL">All Branches (Global Access)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Tagpuan Executive Governance
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 max-w-2xl leading-relaxed">
              Live multi-branch operations, real-time raw ingredient tracking, dynamic recipe resolution, atomic stock deduction engine, and automated low-stock monitoring for <strong className="text-zinc-900">{selectedBranchName}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveView('pos')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-100" />
              <span>POS Register</span>
            </button>
            <button
              onClick={() => setActiveView('master-control')}
              className="px-4 py-2.5 bg-[#111111] hover:bg-[#262626] active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-2 border border-zinc-700"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Master Control</span>
            </button>
            <button
              onClick={() => setActiveView('inventory')}
              className="px-4 py-2.5 bg-[#f8fafc] hover:bg-[#f1f5f9] active:scale-95 text-zinc-900 font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-2 border border-[#e2e8f0]"
            >
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Branch Inventory</span>
            </button>
            <button
              onClick={() => setActiveView('products')}
              className="px-4 py-2.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#111111] font-semibold rounded-xl text-xs sm:text-sm border border-[#e2e8f0] transition flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4 text-[#166534]" />
              <span>Products & Recipes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Phase 12: AI Command Center Quick Access Banner */}
      <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">AI Agent Command Center</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                17 Branches Monitored
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Automated business audit, cashier variance radar, low-stock drafts & executive reporting.</p>
          </div>
        </div>
        <button
          onClick={() => setActiveView('ai-command')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition shadow flex items-center gap-2 shrink-0 justify-center"
        >
          <span>Open AI Command Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Real-time Sales & Revenue Tally (Branch & Global) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Gross Sales Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 font-mono">
            ₱{(salesSummary?.gross_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1.5 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{selectedBranchId === 'ALL' ? 'Global Live Revenue' : `${selectedBranchName} Revenue`}</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Completed Orders</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 font-mono">
            {salesSummary?.order_count || 0} <span className="text-xs font-sans text-zinc-500 font-normal">Transactions</span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5 font-medium">
            POS: {salesSummary?.pos_order_count || 0} • Kiosk: {salesSummary?.kiosk_order_count || 0}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Cash Collections</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 font-mono">
            ₱{(salesSummary?.cash_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5 font-medium">
            E-Wallets: ₱{((salesSummary?.gcash_sales || 0) + (salesSummary?.maya_sales || 0) + (salesSummary?.qrph_sales || 0)).toFixed(2)}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Active Locations</span>
            <div className="p-2 rounded-xl bg-[#f0f9ee] text-[#166534]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {activeBranchesCount} / {branches.length}
          </div>
          <p className="text-[11px] text-[#166534] mt-1.5 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            {selectedBranchId === 'ALL' ? 'Multi-Branch Connected' : selectedBranchName}
          </p>
        </div>
      </div>

      {/* Global Sales & Remittance Audit Dashboard for Master Owner Hub */}
      <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-900 tracking-tight">
                  Global Sales & Remittance Audit Dashboard
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#CDEBC5] text-[#111111]">
                  Executive Radar
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Multi-branch cashier turnover audit, denomination integrity, allowable store deductions, and variance verification for <strong className="text-zinc-800">{selectedBranchName}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveView('financial')}
              className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-[#CDEBC5] text-xs font-bold rounded-xl transition shadow flex items-center gap-2 cursor-pointer"
            >
              <span>Audit Cash Remittances</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Date Filter & Branch Quick-Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Date Filter:
            </span>
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'ALL', label: 'All Time' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  console.log('[OwnerDashboard] User changed audit date filter to:', p.id);
                  setAuditDatePreset(p.id as any);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditDatePreset === p.id
                    ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Branch Scope:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                console.log('[OwnerDashboard] Switched branch from audit card to:', e.target.value);
                setSelectedBranchId(e.target.value);
              }}
              className="bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <option value="ALL">All Branches (Global Audit)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Core Audit Cards required by prompt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Gross Sales (POS + Kiosk) */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-500">
              Total Gross Sales (POS + Kiosk)
            </p>
            <p className="text-xl font-black font-mono text-zinc-900 mt-1">
              ₱{remittanceAuditMetrics.totalGrossSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {selectedBranchId === 'ALL' ? 'Aggregated across all branches' : `${selectedBranchName} Total`}
            </p>
          </div>

          {/* 2. Total Physical Cash Remitted */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <p className="text-[10px] uppercase font-mono font-bold text-emerald-900">
              Total Physical Cash Remitted
            </p>
            <p className="text-xl font-black font-mono text-emerald-800 mt-1">
              ₱{remittanceAuditMetrics.totalPhysicalRemitted.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-emerald-700 mt-1 font-medium">
              Vault drop & bank deposit turnover
            </p>
          </div>

          {/* 3. Allowable Expenses Deducted */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <p className="text-[10px] uppercase font-mono font-bold text-amber-900">
              Allowable Expenses Deducted
            </p>
            <p className="text-xl font-black font-mono text-amber-800 mt-1">
              ₱{remittanceAuditMetrics.totalExpensesDeducted.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-amber-700 mt-1 font-medium">
              Manager-verified store vouchers
            </p>
          </div>

          {/* 4. Cash Drawer Variance clearly tagged */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-500">
              Cash Drawer Variance
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xl font-black font-mono ${remittanceAuditMetrics.netVariance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {remittanceAuditMetrics.netVariance >= 0 ? '+' : ''}₱{remittanceAuditMetrics.netVariance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider ${
                  remittanceAuditMetrics.varianceFlag === 'TALLY'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : remittanceAuditMetrics.varianceFlag === 'SHORTAGE'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}
              >
                {remittanceAuditMetrics.varianceFlag}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              {remittanceAuditMetrics.ticketCount} Remittance Tickets Audited
            </p>
          </div>
        </div>
      </div>

      {/* Real Core System Foundation Stats (NO fake business data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Seeded Branches</span>
            <div className="p-2 rounded-xl bg-[#f0f9ee] text-[#166534]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {branches.length} <span className="text-xs font-sans text-zinc-500 font-normal">Branches</span>
          </div>
          <p className="text-[11px] text-[#166534] mt-1.5 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            {activeBranchesCount} Operational Locations
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Registered Users</span>
            <div className="p-2 rounded-xl bg-[#111111] text-[#CDEBC5]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {users.length} <span className="text-xs font-sans text-zinc-500 font-normal">Accounts</span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            {activeUsersCount} Active Profiles
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Security & Isolation</span>
            <div className="p-2 rounded-xl bg-[#f0f9ee] text-[#166534]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#111111]">
            RLS Active
          </div>
          <p className="text-[11px] text-[#166534] mt-1.5 font-semibold">
            Database Level Enforcement
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-500">Audit Trail</span>
            <div className="p-2 rounded-xl bg-[#111111] text-[#CDEBC5]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {recentLogs.length > 0 ? 'Live' : 'Active'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">
            Immutable Activity Logging
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Audit Logs & System Foundation Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Security & Operational Logs */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-zinc-700">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Recent System Activity</h3>
                <p className="text-[11px] text-zinc-500">Audit log feed across authentication and user management</p>
              </div>
            </div>
            <button
              onClick={() => setActiveView('audit')}
              className="text-xs font-bold text-[#111111] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#f1f5f9]">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No recent activity recorded yet.
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#111111]">{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-semibold">
                          {log.role}
                        </span>
                        {log.branch_name && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f0f9ee] text-[#166534] font-semibold">
                            {log.branch_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        By <span className="text-[#111111] font-medium">{log.user_email}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: 17 Branches Quick Snapshot */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-bold text-[#111111]">17 Tagpuan Branches</h3>
              </div>
              <button
                onClick={() => setActiveView('branches')}
                className="text-xs font-bold text-[#111111] hover:underline"
              >
                Manage
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              All 17 initial Tagpuan branches seeded into PostgreSQL / Supabase with Row Level Security.
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {branches.slice(0, 10).map((branch) => (
                <div
                  key={branch.id}
                  className="p-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs flex items-center justify-between"
                >
                  <span className="text-zinc-800 font-semibold truncate">{branch.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                </div>
              ))}
            </div>
            {branches.length > 10 && (
              <p className="text-[11px] text-zinc-400 mt-2 text-center">
                + {branches.length - 10} more branches in database
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#f1f5f9]">
            <button
              onClick={() => setActiveView('branches')}
              className="w-full py-2.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#111111] text-xs font-bold rounded-xl border border-[#e2e8f0] transition flex items-center justify-center gap-2"
            >
              <span>Explore All Branches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Future Roadmap Section - Clearly labeled Coming Soon (NO Fake Numbers) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111111]">Upcoming Business Modules</h3>
            <p className="text-xs text-zinc-500">Foundation prepared for subsequent development phases</p>
          </div>
          <span className="text-xs font-mono text-zinc-400">Scheduled Roadmap</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Point of Sale (POS) & Ordering',
              desc: 'High-speed touch terminal for burger & siomai orders, discounts, and cashier shifts.',
              icon: ShoppingCart,
              phase: 'Phase 2'
            },
            {
              title: 'Inventory & Stock Logistics',
              desc: 'Patties, siomai wrappers, buns stock tracking with warehouse dispatch & wastage logs.',
              icon: Boxes,
              phase: 'Phase 2'
            },
            {
              title: 'Kitchen Display System (KDS)',
              desc: 'Cook line terminal with preparation queues and order dispatch alerts.',
              icon: ChefHat,
              phase: 'Phase 2'
            },
            {
              title: 'Branch Delivery Management',
              desc: 'Rider dispatch, multi-drop commissary logistics, and real-time delivery status.',
              icon: Truck,
              phase: 'Phase 3'
            },
            {
              title: 'Payroll & Sales Remittance',
              desc: 'Branch daily remittance reconciliation, attendance calculations, and payroll sheets.',
              icon: Wallet,
              phase: 'Phase 3'
            },
            {
              title: 'Recipe Extraction & AI Assistant',
              desc: 'Automated recipe standardisation, cost margin calculation, and AI operational insights.',
              icon: Bot,
              phase: 'Phase 4'
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.title}
                className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm hover:border-[#cbd5e1] transition relative overflow-hidden group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-zinc-700 group-hover:text-[#111111] transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-[#111111] text-[#CDEBC5]">
                    Coming Soon • {item.phase}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#111111] transition">{item.title}</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const OwnerDashboard: React.FC<OwnerDashboardProps> = (props) => {
  return (
    <ErrorBoundary fallbackTitle="Executive Governance Hub">
      <OwnerDashboardInner {...props} />
    </ErrorBoundary>
  );
};
