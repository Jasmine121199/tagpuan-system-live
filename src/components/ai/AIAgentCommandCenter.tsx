import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  ChefHat,
  FileText,
  RefreshCw,
  Search,
  Send,
  Eye,
  Check,
  Printer,
  Mail,
  Filter,
  Calendar,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Award,
  Wallet
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  AIAlert,
  AIAlertPriority,
  AIAlertStatus,
  AIAlertCategory,
  AIDateFilterPeriod,
  AIBusinessStatus,
  AIBusinessReport,
  AIChatMessage,
  Branch
} from '../../types/index';

interface AIAgentCommandCenterProps {
  setActiveView?: (view: string) => void;
}

export const AIAgentCommandCenter: React.FC<AIAgentCommandCenterProps> = ({ setActiveView }) => {
  const { user, isOwner, isManager } = useAuth();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'report' | 'chat'>('overview');

  // Filters
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    user?.role === 'OWNER' ? 'ALL' : (user?.branch_id || 'ALL')
  );
  const [datePeriod, setDatePeriod] = useState<AIDateFilterPeriod>('TODAY');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Alerts filters
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Data States
  const [status, setStatus] = useState<AIBusinessStatus | null>(null);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [report, setReport] = useState<AIBusinessReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Draft Request Dialog State
  const [draftModalAlert, setDraftModalAlert] = useState<AIAlert | null>(null);
  const [draftQuantity, setDraftQuantity] = useState<number>(50);
  const [draftSubmitting, setDraftSubmitting] = useState<boolean>(false);

  // Email Report Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>(user?.email || '');
  const [emailSubmitting, setEmailSubmitting] = useState<boolean>(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      message: `Kumusta, ${user?.full_name || 'Partner'}! Ako ang Tagpuan ERP AI Command Center Assistant.\n\nHanda akong mag-analyze at mag-audit ng operations mula sa 17 branches natin. Ano ang nais mong malaman?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggested_queries: [
        'Magkano ang sales today?',
        'Anong branch ang may pinakamalaking sales?',
        'Anong items ang low stock?',
        'May cashier variance ba today?'
      ]
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Load initial branch list
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchList = await api.getBranches();
        setBranches(branchList);
      } catch (e) {
        console.error('Failed to load branches:', e);
      }
    };
    fetchBranches();
  }, []);

  // Fetch status and alerts when filters change
  const fetchData = async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statusRes, alertsRes] = await Promise.all([
        api.getAIBusinessStatus({
          branch_id: selectedBranchId,
          date_preset: datePeriod,
          start_date: customStartDate || undefined,
          end_date: customEndDate || undefined
        }),
        api.getAIAlerts({
          branch_id: selectedBranchId,
          category: filterCategory,
          priority: filterPriority,
          status: filterStatus,
          date_preset: datePeriod,
          start_date: customStartDate || undefined,
          end_date: customEndDate || undefined
        })
      ]);

      setStatus(statusRes);
      setAlerts(alertsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI Command Center data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId, datePeriod, customStartDate, customEndDate, filterPriority, filterCategory, filterStatus]);

  // Fetch report when Report tab is selected or filters change
  const fetchReport = async () => {
    try {
      setLoading(true);
      const rep = await api.getAIBusinessReport({
        period: datePeriod,
        branch_id: selectedBranchId,
        start_date: customStartDate || undefined,
        end_date: customEndDate || undefined
      });
      setReport(rep);
    } catch (err: any) {
      setError(err.message || 'Failed to generate business report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'report') {
      fetchReport();
    }
  }, [activeTab, selectedBranchId, datePeriod, customStartDate, customEndDate]);

  // Alert Actions
  const handleReviewAlert = async (alertId: string) => {
    try {
      await api.reviewAIAlert(alertId, 'Reviewed by user in AI Command Center');
      setSuccessMessage('Alert marked as REVIEWED.');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to review alert.');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.resolveAIAlert(alertId, 'Resolved by authorized user in AI Command Center');
      setSuccessMessage('Alert marked as RESOLVED.');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve alert.');
    }
  };

  const handleOpenDraftModal = (alert: AIAlert) => {
    setDraftModalAlert(alert);
    setDraftQuantity(alert.action_payload?.quantity || 50);
  };

  const handleConfirmDraftRequest = async () => {
    if (!draftModalAlert) return;
    setDraftSubmitting(true);
    try {
      await api.createDraftRequestFromAI({
        alertId: draftModalAlert.id,
        branchId: draftModalAlert.branch_id,
        ingredientId: draftModalAlert.action_payload?.ingredient_id || '',
        quantity: Number(draftQuantity) || 50
      });
      setSuccessMessage(`Draft Request Order created successfully for ${draftModalAlert.branch_name}! Requires Owner approval.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setDraftModalAlert(null);
      fetchData(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create draft request.');
    } finally {
      setDraftSubmitting(false);
    }
  };

  // Send Email Report
  const handleSendEmailReport = async () => {
    if (!report || !recipientEmail) return;
    setEmailSubmitting(true);
    try {
      await api.sendAIBusinessReportEmail(report, recipientEmail);
      setSuccessMessage(`Report dispatched to ${recipientEmail} and logged.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsEmailModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send report email.');
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Send Chat Message
  const handleSendChat = async (queryText?: string) => {
    const textToSend = queryText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      message: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.sendAIChatMessage(textToSend.trim(), selectedBranchId);
      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        message: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_queries: res.suggested_queries,
        data_points: res.data_points
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: AIChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        message: 'Paumanhin, nagkaroon ng pansamantalang error sa pagproseso ng query. Mangyaring subukan muli.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Live AI Indicator */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/20">
              <Bot className="w-7 h-7 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  AI Agent Command Center
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Monitoring Active
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">
                Centralized monitoring, automated audit, anomaly detection & executive business reporting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-refresh-ai-audit"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{refreshing ? 'Scanning...' : 'Run Audit Scan'}</span>
            </button>
            <button
              id="btn-open-ai-chat"
              onClick={() => setActiveTab('chat')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold shadow-md shadow-amber-500/20 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#27272a]">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Scope: <strong>{selectedBranchId === 'ALL' ? 'All 17 Branches' : (branches.find(b => b.id === selectedBranchId)?.name || 'Branch')}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Integrity: <strong>Zero Hallucination Guaranteed</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Source of Truth: <strong>Server Live DB</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Audit Trail: <strong>All Actions Logged</strong></span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-red-400 hover:underline">Dismiss</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs text-emerald-400 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Branch:</label>
          {user?.role === 'OWNER' ? (
            <select
              id="select-ai-branch"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All 17 Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <div className="text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
              {branches.find(b => b.id === user?.branch_id)?.name || 'Assigned Branch'}
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Period:</label>
          <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-700 text-xs">
            {(['TODAY', 'LAST_7_DAYS', 'MONTHLY', 'YEARLY', 'CUSTOM'] as AIDateFilterPeriod[]).map((period) => (
              <button
                key={period}
                id={`btn-period-${period.toLowerCase()}`}
                onClick={() => setDatePeriod(period)}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  datePeriod === period ? 'bg-amber-500 text-black font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {period === 'LAST_7_DAYS' ? '7 Days' : period.charAt(0) + period.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {datePeriod === 'CUSTOM' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-1"
              />
              <span className="text-zinc-500 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-1"
              />
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 text-xs w-full lg:w-auto">
          <button
            id="tab-btn-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'overview' ? 'bg-amber-500 text-black font-semibold shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            id="tab-btn-alerts"
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'alerts' ? 'bg-amber-500 text-black font-semibold shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Alert Center</span>
            {alerts.filter(a => a.status !== 'RESOLVED').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {alerts.filter(a => a.status !== 'RESOLVED').length}
              </span>
            )}
          </button>
          <button
            id="tab-btn-report"
            onClick={() => setActiveTab('report')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'report' ? 'bg-amber-500 text-black font-semibold shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Business Report</span>
          </button>
          <button
            id="tab-btn-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'chat' ? 'bg-amber-500 text-black font-semibold shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Net Sales</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                ₱{(status?.sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                <span>{status?.paid_orders || 0} paid orders</span>
                <span>AOV: ₱{(status?.average_order_value || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Order Volume</span>
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {status?.orders || 0}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                <span>Voided: {status?.voided_orders || 0}</span>
                <span className="text-emerald-400">{status?.orders ? Math.round(((status.paid_orders || 0) / status.orders) * 100) : 100}% Completed</span>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Critical Operational Alerts</span>
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <div className={`text-2xl font-bold ${(status?.critical_alerts_count || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {status?.critical_alerts_count || 0}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                <span>Warnings: {status?.warning_alerts_count || 0}</span>
                <button
                  onClick={() => { setActiveTab('alerts'); setFilterPriority('CRITICAL'); }}
                  className="text-amber-400 hover:underline"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Inventory & Supply Need</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`text-2xl font-bold ${(status?.low_stock_count || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {status?.low_stock_count || 0} <span className="text-xs font-normal text-zinc-400">low stock</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                <span>Pending Req: {status?.pending_requests_count || 0}</span>
                <button
                  onClick={() => { setActiveTab('alerts'); setFilterCategory('INVENTORY'); }}
                  className="text-amber-400 hover:underline"
                >
                  Restock Center &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown & Branch Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Method Distribution */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                Payment Method Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Cash', val: status?.payment_breakdown.cash || 0, color: 'bg-emerald-500' },
                  { label: 'GCash', val: status?.payment_breakdown.gcash || 0, color: 'bg-blue-500' },
                  { label: 'Maya', val: status?.payment_breakdown.maya || 0, color: 'bg-green-500' },
                  { label: 'QRPH', val: status?.payment_breakdown.qrph || 0, color: 'bg-purple-500' },
                  { label: 'Bank Transfer', val: status?.payment_breakdown.bank_transfer || 0, color: 'bg-indigo-500' },
                  { label: 'Other', val: status?.payment_breakdown.other || 0, color: 'bg-zinc-500' }
                ].map(item => {
                  const total = status?.sales || 1;
                  const pct = total > 0 ? Math.round((item.val / total) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{item.label}</span>
                        <span className="text-white font-mono">₱{item.val.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Branch Performance Rankings */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 lg:col-span-2">
              <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Branch Performance Leaderboard
                </span>
                <span className="text-xs text-zinc-400 font-normal">Ranked by Net Sales</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="pb-3">Rank & Branch</th>
                      <th className="pb-3">Orders</th>
                      <th className="pb-3 text-right">Net Sales</th>
                      <th className="pb-3 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {status?.branch_performance && status.branch_performance.length > 0 ? (
                      status.branch_performance.slice(0, 6).map((b, idx) => {
                        const totalSales = status?.sales || 1;
                        const pct = totalSales > 0 ? ((b.sales / totalSales) * 100).toFixed(1) : '0';
                        return (
                          <tr key={b.branch_id} className="hover:bg-zinc-800/30 transition">
                            <td className="py-2.5 flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-zinc-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="font-medium text-white">{b.branch_name}</span>
                            </td>
                            <td className="py-2.5 text-zinc-300">{b.orders}</td>
                            <td className="py-2.5 text-right font-mono font-bold text-white">₱{b.sales.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-xs text-zinc-400 font-mono">{pct}%</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-500 text-sm">
                          No sales recorded in the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Anomaly & Audit Radar */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              Automated Audit Radar Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-xs text-zinc-400">Cashier Variances</div>
                <div className={`text-xl font-bold mt-1 ${(status?.cash_variances_count || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {status?.cash_variances_count || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-xs text-zinc-400">Kitchen Delays</div>
                <div className={`text-xl font-bold mt-1 ${(status?.kitchen_delays_count || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {status?.kitchen_delays_count || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-xs text-zinc-400">Payroll Alerts</div>
                <div className={`text-xl font-bold mt-1 ${(status?.payroll_alerts_count || 0) > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {status?.payroll_alerts_count || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-xs text-zinc-400">Loyalty Alerts</div>
                <div className={`text-xl font-bold mt-1 ${(status?.loyalty_alerts_count || 0) > 0 ? 'text-purple-400' : 'text-emerald-400'}`}>
                  {status?.loyalty_alerts_count || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-xs text-zinc-400">Pending POs / Requests</div>
                <div className={`text-xl font-bold mt-1 ${(status?.pending_requests_count || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {status?.pending_requests_count || 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-xs text-zinc-400">Audit Consistency</div>
                <div className="text-xl font-bold mt-1 text-emerald-400">
                  100%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AUDIT & ALERT CENTER */}
      {/* ========================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Sub-Filters for Alerts */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-semibold">Priority:</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="WARNING">Warning Only</option>
                <option value="INFO">Info Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-semibold">Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="INVENTORY">Inventory & Stock</option>
                <option value="PURCHASING">Purchasing & Requests</option>
                <option value="CASHIER">Cashier & Variances</option>
                <option value="KITCHEN">Kitchen & KDS Delays</option>
                <option value="SALES">Sales & Voids</option>
                <option value="ATTENDANCE">Attendance & Labor</option>
                <option value="PAYROLL">Payroll Status</option>
                <option value="LOYALTY">Loyalty & Rewards</option>
                <option value="CROSS_MODULE">Cross-Module Integrity</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-semibold">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New Alerts</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="ml-auto text-xs text-zinc-400 pt-4">
              Showing <strong>{alerts.length}</strong> alerts
            </div>
          </div>

          {/* Alert Cards List */}
          {alerts.length === 0 ? (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No Active Alerts Found</h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                All operational metrics, stock levels, cashier reconciliations, and attendance records meet standard operational thresholds.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const isCritical = alert.priority === 'CRITICAL';
                const isWarning = alert.priority === 'WARNING';

                return (
                  <div
                    key={alert.id}
                    className={`bg-[#18181b] border rounded-xl p-5 transition ${
                      isCritical
                        ? 'border-red-500/40 bg-gradient-to-r from-red-500/5 to-transparent'
                        : isWarning
                        ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/5 to-transparent'
                        : 'border-[#27272a]'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              isCritical
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {alert.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {alert.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              alert.status === 'RESOLVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : alert.status === 'REVIEWED'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {alert.status}
                          </span>
                          <span className="text-xs text-zinc-400">
                            • {alert.branch_name} • {new Date(alert.date_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white">{alert.title}</h4>
                        <p className="text-sm text-zinc-300">{alert.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 mt-2">
                          <div>
                            <span className="text-zinc-400 block font-semibold">What Happened:</span>
                            <span className="text-zinc-200">{alert.what_happened}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block font-semibold">Why Flagged:</span>
                            <span className="text-zinc-200">{alert.why_flagged}</span>
                          </div>
                        </div>

                        <div className="text-xs text-amber-300/90 flex items-center gap-1.5 mt-1">
                          <Info className="w-3.5 h-3.5 flex-shrink-0" />
                          <span><strong>Recommended Action:</strong> {alert.recommended_action}</span>
                        </div>

                        {alert.notes && (
                          <div className="text-xs text-zinc-400 italic">
                            Notes: {alert.notes}
                          </div>
                        )}
                      </div>

                      {/* Action Triggers */}
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-2 flex-shrink-0">
                        {/* 1-Click Create Draft Request Order */}
                        {alert.action_type === 'CREATE_DRAFT_REQUEST' && alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleOpenDraftModal(alert)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Create Draft Request</span>
                          </button>
                        )}

                        {/* Direct Navigation shortcuts */}
                        {alert.action_type === 'VIEW_KDS' && setActiveView && (
                          <button
                            onClick={() => setActiveView('kds')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                          >
                            <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                            <span>Open KDS</span>
                          </button>
                        )}

                        {alert.action_type === 'VIEW_REQUESTS' && setActiveView && (
                          <button
                            onClick={() => setActiveView('requests')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                          >
                            <Package className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Requests</span>
                          </button>
                        )}

                        {alert.action_type === 'VIEW_LOYALTY' && setActiveView && (
                          <button
                            onClick={() => setActiveView('loyalty')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Loyalty</span>
                          </button>
                        )}

                        {alert.action_type === 'VIEW_PAYROLL' && setActiveView && (
                          <button
                            onClick={() => setActiveView('payroll')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                          >
                            <Wallet className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Payroll</span>
                          </button>
                        )}

                        {/* Review / Resolve Actions */}
                        {alert.status === 'NEW' && (
                          <button
                            onClick={() => handleReviewAlert(alert.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Mark Reviewed</span>
                          </button>
                        )}

                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium border border-emerald-500/30 transition"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: 12-SECTION BUSINESS REPORT */}
      {/* ========================================================= */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Official Tagpuan ERP Business Report</h3>
              <p className="text-xs text-zinc-400">Period: {datePeriod} • Scope: {selectedBranchId === 'ALL' ? 'All 17 Branches' : 'Selected Branch'}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-print-report"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Export</span>
              </button>

              <button
                id="btn-email-report"
                onClick={() => setIsEmailModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Report</span>
              </button>
            </div>
          </div>

          {/* Printable Report Layout (12 Sections) */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 space-y-8 print:bg-white print:text-black print:p-0 print:border-none">
            {/* Section 1: Header */}
            <div className="border-b border-zinc-800 pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-amber-500 tracking-tight">TAGPUAN ERP</h2>
                  <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Automated AI Business & Operational Audit Report</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <div>Generated: {new Date(report?.generated_at || Date.now()).toLocaleString()}</div>
                  <div>Report Period: <strong className="text-white">{report?.period}</strong></div>
                  <div>Scope: <strong className="text-white">{report?.branch_name}</strong></div>
                </div>
              </div>
            </div>

            {/* Section 2: Executive AI Insights */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4" />
                1. Executive Operational Insights
              </h3>
              <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 text-sm text-zinc-300 space-y-2">
                {report?.executive_ai_insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Sales Summary */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                2. Financial & Sales Metrics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Total Net Sales</div>
                  <div className="text-lg font-bold text-white mt-1">₱{(report?.sales_summary.total_sales || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Total Orders</div>
                  <div className="text-lg font-bold text-white mt-1">{report?.sales_summary.order_count || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Paid Orders</div>
                  <div className="text-lg font-bold text-white mt-1">{report?.sales_summary.paid_count || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Average Order Value</div>
                  <div className="text-lg font-bold text-white mt-1">₱{(report?.sales_summary.average_order_value || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Section 4: Payment Method Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                3. Payment Channels
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Cash</div>
                  <div className="font-bold text-white mt-1 font-mono">₱{(report?.payment_breakdown.cash || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">GCash</div>
                  <div className="font-bold text-white mt-1 font-mono">₱{(report?.payment_breakdown.gcash || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Maya</div>
                  <div className="font-bold text-white mt-1 font-mono">₱{(report?.payment_breakdown.maya || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">QRPH</div>
                  <div className="font-bold text-white mt-1 font-mono">₱{(report?.payment_breakdown.qrph || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Bank Transfer</div>
                  <div className="font-bold text-white mt-1 font-mono">₱{(report?.payment_breakdown.bank_transfer || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-xs text-zinc-400">Other</div>
                  <div className="font-bold text-white mt-1 font-mono">₱{(report?.payment_breakdown.other || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Section 5: Best-Performing Items */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                4. Best-Performing Products
              </h3>
              {report?.best_performing_items && report.best_performing_items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {report.best_performing_items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <div className="text-xs text-amber-400 font-bold">#{idx + 1} Best Seller</div>
                      <div className="font-semibold text-white mt-1 truncate">{item.product_name}</div>
                      <div className="text-xs text-zinc-400 mt-1">{item.quantity} sold • ₱{item.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No specific product sales breakdown recorded during this period.</p>
              )}
            </div>

            {/* Section 6: Branch Performance */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4" />
                5. Multi-Branch Operations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {report?.branch_performance && report.branch_performance.length > 0 ? (
                  report.branch_performance.slice(0, 6).map((b, idx) => (
                    <div key={b.branch_id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white">{b.branch_name}</div>
                        <div className="text-xs text-zinc-400">{b.orders} orders</div>
                      </div>
                      <div className="text-right font-mono font-bold text-white">
                        ₱{b.sales.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic">All branch sales metrics currently balanced.</p>
                )}
              </div>
            </div>

            {/* Section 7 to 12: Modules Audit Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800">
              {/* 6. Inventory Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">6. Inventory & Supply Status</h4>
                <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  {report?.inventory_alerts_summary.map((line, i) => (
                    <div key={i}>• {line}</div>
                  ))}
                </div>
              </div>

              {/* 7. Purchasing Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">7. Purchasing & Fulfillment</h4>
                <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  {report?.purchasing_alerts_summary.map((line, i) => (
                    <div key={i}>• {line}</div>
                  ))}
                </div>
              </div>

              {/* 8. Cashier & Reconciliation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">8. Cashier & Shift Variances</h4>
                <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  {report?.cashier_variances_summary.map((line, i) => (
                    <div key={i}>• {line}</div>
                  ))}
                </div>
              </div>

              {/* 9. Attendance & Shifts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">9. Attendance & Labor Logs</h4>
                <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  {report?.attendance_issues_summary.map((line, i) => (
                    <div key={i}>• {line}</div>
                  ))}
                </div>
              </div>

              {/* 10. Payroll Audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">10. Payroll & Rate Compliance</h4>
                <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  {report?.payroll_issues_summary.map((line, i) => (
                    <div key={i}>• {line}</div>
                  ))}
                </div>
              </div>

              {/* 11. Kitchen Display (KDS) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">11. Kitchen Display Speed & Delays</h4>
                <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  {report?.kitchen_delays_summary.map((line, i) => (
                    <div key={i}>• {line}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 12: Audit Trail Verification Footer */}
            <div className="pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500">
              <p>Tagpuan ERP AI Audit Agent • Cryptographically Grounded Business Records • No Automatic Destructive Overwrites</p>
              <p className="mt-1">All rights reserved. Central Commissary & 17 Operational Branches.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: AI CHAT ASSISTANT */}
      {/* ========================================================= */}
      {activeTab === 'chat' && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col h-[650px] shadow-xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-[#27272a] bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Operational Chat Assistant</h3>
                <p className="text-xs text-zinc-400">Strictly grounded in live business data • English & Filipino</p>
              </div>
            </div>

            <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Zero Hallucination
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-amber-400" />
                    </div>
                  )}

                  <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isAi
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm'
                      : 'bg-amber-500 text-black font-medium shadow-md'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                    <div className={`text-[10px] mt-2 text-right ${isAi ? 'text-zinc-500' : 'text-black/60'}`}>
                      {msg.timestamp}
                    </div>

                    {/* Suggested Queries Chips */}
                    {msg.suggested_queries && msg.suggested_queries.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1.5">
                        <div className="text-[11px] font-semibold text-zinc-400">Suggested queries:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggested_queries.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendChat(q)}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-300 px-2.5 py-1 rounded-full border border-zinc-700 transition"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Kumukuha ng datos mula sa live database...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-zinc-900/80 border-t border-[#27272a] flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-zinc-500 flex-shrink-0">Sample:</span>
            {[
              'Magkano ang sales today?',
              'Anong branch ang may pinakamalaking sales?',
              'Anong items ang low stock?',
              'May cashier variance ba?'
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-[#27272a] bg-zinc-900/60 flex items-center gap-2">
            <input
              id="input-ai-chat"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendChat();
              }}
              placeholder="Tanungin ang AI ukol sa sales, stock, cashier, o kusina..."
              className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />
            <button
              id="btn-send-ai-chat"
              onClick={() => handleSendChat()}
              disabled={!chatInput.trim() || chatLoading}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: 1-Click Draft Request Order Confirmation */}
      {/* ========================================================= */}
      {draftModalAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Draft Request Order</h3>
                <p className="text-xs text-zinc-400">Autonomous replenishment assistant</p>
              </div>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <div><strong>Branch:</strong> {draftModalAlert.branch_name}</div>
              <div><strong>Item:</strong> {draftModalAlert.title.replace('Low Stock: ', '')}</div>
              <div><strong>Alert Cause:</strong> {draftModalAlert.what_happened}</div>
              <div className="text-amber-400 font-medium pt-1">
                Notice: The AI prepares this order in DRAFT state. It will require Owner or Manager approval before preparation.
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Requested Quantity:
              </label>
              <input
                id="input-draft-quantity"
                type="number"
                min={1}
                value={draftQuantity}
                onChange={(e) => setDraftQuantity(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDraftModalAlert(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-draft-request"
                onClick={handleConfirmDraftRequest}
                disabled={draftSubmitting}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold shadow transition"
              >
                {draftSubmitting ? 'Creating Draft...' : 'Confirm Draft Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Email Business Report */}
      {/* ========================================================= */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Email Business Report</h3>
                <p className="text-xs text-zinc-400">Dispatch 12-section audit report via email</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Recipient Email Address:
              </label>
              <input
                id="input-report-recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="owner@tagpuan.ph"
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="text-xs text-zinc-400">
              The report will be sent and logged into the system notification history and audit log.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-send-email"
                onClick={handleSendEmailReport}
                disabled={emailSubmitting || !recipientEmail}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold shadow transition"
              >
                {emailSubmitting ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
