import React, { useState, useEffect } from 'react';
import { SalesSummaryMetrics, Branch } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TodaysSoldMenuItemsTable } from './TodaysSoldMenuItemsTable';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { googleSheetsPersistence } from '../../lib/googleSheetsPersistence';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Sparkles,
  Layers,
  AlertTriangle,
  CreditCard,
  QrCode,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Scale,
  Gift,
  CheckCircle2,
  Building2,
  FileDown,
  Loader2
} from 'lucide-react';

interface SalesSummaryTabProps {
  branches: Branch[];
}

const SalesSummaryTabInner: React.FC<SalesSummaryTabProps> = ({ branches }) => {
  const { user, isOwner, isManager } = useAuth();
  const [metrics, setMetrics] = useState<SalesSummaryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingDrivePdf, setIsSavingDrivePdf] = useState(false);
  const [drivePdfNotice, setDrivePdfNotice] = useState<string | null>(null);

  // Filter state - for Branch Manager automatically default to the manager's assigned branchId
  const [datePreset, setDatePreset] = useState<string>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (isManager && user?.branch_id) return user.branch_id;
    return '';
  });

  // Keep manager's branch synchronized if user context loads asynchronously
  useEffect(() => {
    if (isManager && user?.branch_id && selectedBranchId !== user.branch_id) {
      console.log('[SalesSummaryTab] Auto-setting Branch Manager scope to assigned branch:', user.branch_id);
      setSelectedBranchId(user.branch_id);
    }
  }, [isManager, user?.branch_id, selectedBranchId]);

  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();

      if (datePreset) params.set('date_preset', datePreset);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const branchToQuery = (isManager && user?.branch_id) ? user.branch_id : selectedBranchId;
      if (branchToQuery && branchToQuery !== 'ALL') {
        params.set('branch_id', branchToQuery);
      }
      if (selectedSource) params.set('source', selectedSource);
      if (selectedPaymentMethod) params.set('payment_method', selectedPaymentMethod);

      console.log('[SalesSummaryTab] Fetching sales summary with params:', params.toString(), {
        role: user?.role,
        branchToQuery: branchToQuery || 'ALL'
      });

      const response = await fetch(`/api/financial/sales-summary?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('[SalesSummaryTab] Received sales summary response payload:', data);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sales summary.');
      }

      setMetrics(data.summary || null);
    } catch (err: any) {
      console.error('[SalesSummaryTab] Error fetching sales metrics:', err);
      setError(err.message || 'Error fetching metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [datePreset, startDate, endDate, selectedBranchId, selectedSource, selectedPaymentMethod]);

  const handleExportCSV = () => {
    if (!metrics) return;
    const pb = metrics.payment_breakdown || {
      cash: { amount: 0, count: 0 },
      gcash: { amount: 0, count: 0 },
      maya: { amount: 0, count: 0 },
      qrph: { amount: 0, count: 0 },
      bank: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 }
    };
    const rows = [
      ['Metric', 'Value'],
      ['Gross Sales (₱)', (metrics.gross_sales || 0).toFixed(2)],
      ['Discounts (₱)', (metrics.discounts || 0).toFixed(2)],
      ['Net Sales (₱)', (metrics.net_sales || 0).toFixed(2)],
      ['Cost of Goods Sold (COGS ₱)', (metrics.cogs || 0).toFixed(2)],
      ['Gross Profit (₱)', (metrics.gross_profit || 0).toFixed(2)],
      ['Gross Profit Margin (%)', `${(metrics.profit_margin || 0).toFixed(2)}%`],
      ['Total Orders', (metrics.order_count || 0).toString()],
      ['Average Order Value (₱)', (metrics.average_order_value || 0).toFixed(2)],
      ['POS Sales (₱)', (metrics.pos_sales || 0).toFixed(2)],
      ['Kiosk Sales (₱)', (metrics.kiosk_sales || 0).toFixed(2)],
      ['Cash Sales (₱)', (pb.cash?.amount || 0).toFixed(2)],
      ['GCash Sales (₱)', (pb.gcash?.amount || 0).toFixed(2)],
      ['Maya Sales (₱)', (pb.maya?.amount || 0).toFixed(2)],
      ['QRPH Sales (₱)', (pb.qrph?.amount || 0).toFixed(2)],
      ['Bank Transfer (₱)', (pb.bank?.amount || 0).toFixed(2)],
      ['Other Payments (₱)', (pb.other?.amount || 0).toFixed(2)],
      ['Total Expenses (₱)', (metrics.total_expenses || 0).toFixed(2)],
      ['Expected Cash in Drawer (₱)', (metrics.expected_cash || 0).toFixed(2)],
      ['Actual Cash Counted (₱)', (metrics.actual_cash || 0).toFixed(2)],
      ['Cash Variance (₱)', (metrics.cash_variance || 0).toFixed(2)],
      ['Total Cash Remitted (₱)', (metrics.total_remittances || 0).toFixed(2)],
      ['Loyalty Redemptions Claimed (Meals)', (metrics.loyalty_redemptions_claimed_count || 0).toString()],
      ['Loyalty Redemptions Value (₱)', ((metrics.loyalty_redemptions_equivalent_value || 0)).toFixed(2)],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tagpuan_sales_summary_${datePreset || 'custom'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePdfToGoogleDrive = async () => {
    if (!metrics) return;
    try {
      setIsSavingDrivePdf(true);
      setDrivePdfNotice(null);
      const branchObj = branches.find(b => b.id === selectedBranchId);
      const branchLabel = branchObj ? branchObj.name : (selectedBranchId ? selectedBranchId : 'All_Branches');
      const archiveItem = await googleSheetsPersistence.generateAndSaveSalesSummaryToDrive(
        metrics,
        branchLabel,
        datePreset || 'today',
        { downloadLocally: true }
      );
      setDrivePdfNotice(
        archiveItem.status === 'SAVED_TO_DRIVE'
          ? `PDF Sales Summary saved directly to Google Drive (${archiveItem.driveFolderName}/${archiveItem.fileName})`
          : `PDF Sales Summary downloaded & queued in LocalStorage for Google Drive sync (${archiveItem.fileName})`
      );
    } catch (err: any) {
      console.warn('Error saving Sales Summary PDF to Google Drive:', err);
    } finally {
      setIsSavingDrivePdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {drivePdfNotice && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{drivePdfNotice}</span>
          </span>
          <button
            onClick={() => setDrivePdfNotice(null)}
            className="text-[11px] text-emerald-700 hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'all_time', label: 'All Time' },
              { id: 'custom', label: 'Custom' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  datePreset === preset.id
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSummary}
              disabled={isLoading}
              className="p-2 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSavePdfToGoogleDrive}
              disabled={!metrics || isLoading || isSavingDrivePdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] text-[#CDEBC5] text-xs font-bold hover:bg-black transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSavingDrivePdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>Save PDF to Google Drive</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!metrics || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-black transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-zinc-100">
          {datePreset === 'custom' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
                />
              </div>
            </>
          )}

          {isOwner ? (
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Filter by Branch</label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  console.log('[SalesSummaryTab] Master Owner switched branch filter to:', e.target.value || 'ALL');
                  setSelectedBranchId(e.target.value);
                }}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white cursor-pointer font-medium"
              >
                <option value="">All 17 Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Assigned Branch Scope</label>
              <div className="flex items-center justify-between p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-950">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">{user?.branch_name || 'Assigned Branch'}</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono uppercase bg-emerald-100/80 px-1.5 py-0.5 rounded shrink-0">
                  Manager Scope
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-1">Order Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
            >
              <option value="">All Channels (POS + Kiosk)</option>
              <option value="POS">Cashier POS Counter</option>
              <option value="KIOSK">Self-Ordering Kiosk</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-1">Payment Method</label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
            >
              <option value="">All Payment Types</option>
              <option value="CASH">Cash</option>
              <option value="GCASH">GCash</option>
              <option value="MAYA">Maya</option>
              <option value="QRPH">QRPH</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Metric Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Sales */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Net Sales</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
                ₱{metrics.net_sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <span>Gross: ₱{metrics.gross_sales.toLocaleString('en-PH')}</span>
                <span className="text-zinc-300">•</span>
                <span className="text-amber-600">Disc: -₱{metrics.discounts.toLocaleString('en-PH')}</span>
              </p>
            </div>
          </div>

          {/* Gross Profit & COGS */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Gross Profit / Margin</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-700 tracking-tight font-mono">
                ₱{metrics.gross_profit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
                <span>Margin: <strong className="text-blue-900">{metrics.profit_margin.toFixed(1)}%</strong></span>
                <span>COGS: ₱{metrics.cogs.toLocaleString('en-PH')}</span>
              </div>
            </div>
          </div>

          {/* Total Orders & AOV */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Volume & Ticket</span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
                {metrics.order_count.toLocaleString()} <span className="text-xs font-normal text-zinc-500 font-sans">Orders</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Avg Ticket: <strong className="text-zinc-800 font-mono">₱{metrics.average_order_value.toFixed(2)}</strong>
              </p>
            </div>
          </div>

          {/* Cash Variance & Health */}
          <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
            metrics.cash_variance === 0
              ? 'bg-emerald-50/60 border-emerald-200'
              : metrics.cash_variance > 0
              ? 'bg-blue-50/60 border-blue-200'
              : 'bg-red-50/60 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-700">Cash Drawer Variance</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                metrics.cash_variance === 0 ? 'bg-emerald-500 text-white' : metrics.cash_variance > 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
              }`}>
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className={`text-2xl font-black tracking-tight font-mono ${
                metrics.cash_variance === 0 ? 'text-emerald-800' : metrics.cash_variance > 0 ? 'text-blue-800' : 'text-red-800'
              }`}>
                {metrics.cash_variance > 0 ? `+₱${metrics.cash_variance.toFixed(2)}` : metrics.cash_variance < 0 ? `-₱${Math.abs(metrics.cash_variance).toFixed(2)}` : '₱0.00'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {metrics.cash_variance === 0 ? 'Drawer Balanced perfectly' : metrics.cash_variance > 0 ? 'Cash Overage detected' : 'Cash Shortage detected'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Section: Payment Methods + Sales Channels */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods Breakdown */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-600" />
                Payment Method Distribution
              </h3>
              <span className="text-xs font-mono font-bold text-zinc-500">
                Total: ₱{metrics.net_sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Cash Drawer', data: metrics.payment_breakdown.cash, icon: DollarSign, color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                { label: 'GCash e-Wallet', data: metrics.payment_breakdown.gcash, icon: QrCode, color: 'bg-blue-50 border-blue-200 text-blue-800' },
                { label: 'Maya e-Wallet', data: metrics.payment_breakdown.maya, icon: QrCode, color: 'bg-teal-50 border-teal-200 text-teal-800' },
                { label: 'QRPH Unified', data: metrics.payment_breakdown.qrph, icon: QrCode, color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
                { label: 'Bank Transfer', data: metrics.payment_breakdown.bank, icon: CreditCard, color: 'bg-amber-50 border-amber-200 text-amber-800' },
                { label: 'Other', data: metrics.payment_breakdown.other, icon: Receipt, color: 'bg-zinc-50 border-zinc-200 text-zinc-800' }
              ].map((item, idx) => {
                const percentage = metrics.net_sales > 0 ? ((item.data.amount / metrics.net_sales) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className={`p-3.5 rounded-xl border ${item.color} flex flex-col justify-between`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[11px] font-mono font-bold opacity-80">{item.data.count} txns</span>
                    </div>
                    <div>
                      <p className="text-lg font-black font-mono">
                        ₱{item.data.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="w-full bg-black/10 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className="bg-current h-full rounded-full"
                          style={{ width: `${Math.min(100, parseFloat(percentage))}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-mono mt-1 opacity-70">{percentage}% of total sales</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Channel Breakdown: POS vs Kiosk */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-zinc-600" />
                Sales Channel Share
              </h3>
            </div>

            <div className="space-y-3">
              {/* POS */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-zinc-600" /> Cashier POS
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    ₱{metrics.pos_sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>{metrics.pos_order_count} Orders</span>
                  <span>
                    {metrics.gross_sales > 0 ? ((metrics.pos_sales / metrics.gross_sales) * 100).toFixed(1) : 0}% share
                  </span>
                </div>
              </div>

              {/* Kiosk */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Self-Ordering Kiosk
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-900">
                    ₱{metrics.kiosk_sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-800/80 font-mono">
                  <span>{metrics.kiosk_order_count} Orders</span>
                  <span>
                    {metrics.gross_sales > 0 ? ((metrics.kiosk_sales / metrics.gross_sales) * 100).toFixed(1) : 0}% share
                  </span>
                </div>
              </div>
            </div>

            {/* Voids & Cancellations summary */}
            <div className="p-3 rounded-xl bg-red-50/60 border border-red-200 flex items-center justify-between text-xs text-red-900">
              <span className="flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Voided Orders:
              </span>
              <span className="font-mono font-black">
                {metrics.void_count} orders (₱{metrics.voids.toFixed(2)})
              </span>
            </div>
          </div>

          {/* End-of-Day Loyalty Redemptions Claimed Tally */}
          <div className="lg:col-span-3 bg-gradient-to-br from-purple-50/40 via-white to-purple-50/20 p-5 rounded-2xl border border-purple-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#111111] flex items-center gap-2">
                    <span>Loyalty Redemptions Claimed (Zero Cash Impact)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold border border-purple-200">
                      Audit Tally
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Free meals redeemed via 200 points. Ingredients depleted from branch stock with ₱0.00 cash drawer effect.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recipe Inventory Balanced</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">Total Meals Claimed</span>
                <p className="text-xl font-black text-[#111111] mt-0.5 font-mono">
                  {metrics.loyalty_redemptions_claimed_count || 0} <span className="text-xs font-semibold text-zinc-500">meals</span>
                </p>
                <span className="text-[10px] text-zinc-400">Zero drawer cash discrepancy</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">Loyalty Points Burned</span>
                <p className="text-xl font-black text-purple-900 mt-0.5 font-mono">
                  {metrics.loyalty_redemptions_claimed_points || 0} <span className="text-xs font-semibold text-zinc-500">pts</span>
                </p>
                <span className="text-[10px] text-zinc-400">200 pts per free meal claimed</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">Equivalent Retail Value</span>
                <p className="text-xl font-black text-zinc-900 mt-0.5 font-mono">
                  ₱{(metrics.loyalty_redemptions_equivalent_value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-zinc-400">Absorbed via promotional allowance</span>
              </div>
            </div>

            {/* Itemized list if any redemptions exist */}
            {metrics.loyalty_redemptions_items && metrics.loyalty_redemptions_items.length > 0 && (
              <div className="mt-2 pt-2 border-t border-purple-100">
                <span className="text-[11px] font-bold text-purple-950 uppercase tracking-wider block mb-2">
                  Itemized Redemption Tickets ({metrics.loyalty_redemptions_items.length}):
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-purple-100/50 text-purple-900 font-bold">
                      <tr>
                        <th className="p-2 rounded-l-lg">Ticket / ID</th>
                        <th className="p-2">Customer</th>
                        <th className="p-2">Reward Meal</th>
                        <th className="p-2">Points</th>
                        <th className="p-2">Cashier / Channel</th>
                        <th className="p-2 rounded-r-lg">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {metrics.loyalty_redemptions_items.map((item, i) => (
                        <tr key={i} className="hover:bg-purple-50/50">
                          <td className="p-2 font-mono font-bold text-purple-950">
                            {item.reward_ticket_number || `RED-${item.id.slice(0, 6).toUpperCase()}`}
                          </td>
                          <td className="p-2 font-semibold text-zinc-800">{item.customer_name}</td>
                          <td className="p-2 text-zinc-700">{item.product_name}</td>
                          <td className="p-2 font-mono font-bold text-purple-800">-{item.points_spent || 200} pts</td>
                          <td className="p-2 text-zinc-600">{item.cashier_name || 'Counter Register'}</td>
                          <td className="p-2 font-mono text-zinc-400">
                            {new Date(item.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's Sold Menu Items (Finished Goods Breakdown) */}
      <TodaysSoldMenuItemsTable
        branches={branches}
        currentBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
      />
    </div>
  );
};

export const SalesSummaryTab: React.FC<SalesSummaryTabProps> = (props) => {
  return (
    <ErrorBoundary fallbackTitle="Sales Summary Hub">
      <SalesSummaryTabInner {...props} />
    </ErrorBoundary>
  );
};
