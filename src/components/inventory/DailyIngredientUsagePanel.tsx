import React, { useState, useEffect } from 'react';
import { Branch, DailyIngredientUsageAuditReport, IngredientUsageAuditItem } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { DailyUsageReportModal } from './DailyUsageReportModal';
import {
  Boxes,
  Layers,
  UtensilsCrossed,
  Printer,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles,
  ArrowDownRight,
  TrendingDown,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

interface DailyIngredientUsagePanelProps {
  branches: Branch[];
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
}

export const DailyIngredientUsagePanel: React.FC<DailyIngredientUsagePanelProps> = ({
  branches,
  selectedBranchId,
  onBranchChange
}) => {
  const { user, isOwner, isManager } = useAuth();
  const [report, setReport] = useState<DailyIngredientUsageAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [onlyConsumed, setOnlyConsumed] = useState<boolean>(false);

  // Printable Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const fetchUsageReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const audit = await api.getDailyIngredientUsageAudit({
        branch_id: selectedBranchId || undefined,
        date: datePreset === 'custom' ? customDate : undefined,
        date_preset: datePreset !== 'custom' ? datePreset : undefined
      });
      setReport(audit);
    } catch (err: any) {
      console.error('Failed to fetch daily ingredient usage:', err);
      setError(err.message || 'Failed to compute daily ingredient usage audit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageReport();
  }, [selectedBranchId, datePreset, customDate]);

  // Filter ingredients
  const rawIngredients = report?.ingredients || [];
  const filteredIngredients = rawIngredients.filter((ing) => {
    const matchesSearch =
      ing.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'ALL' || ing.category.toUpperCase() === categoryFilter.toUpperCase();
    const matchesConsumed = !onlyConsumed || ing.total_consumed_today > 0;
    return matchesSearch && matchesCategory && matchesConsumed;
  });

  const categories = ['ALL', ...Array.from(new Set(rawIngredients.map((i) => i.category.toUpperCase())))];
  const consumedCount = rawIngredients.filter((i) => i.total_consumed_today > 0).length;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 uppercase">
                Section 2 Commissary Audit
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {report ? report.branch_name : 'Branch Inventory'}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 flex items-center gap-2.5">
              <UtensilsCrossed className="w-6 h-6 text-[#111111]" />
              Today's Consumed Raw Ingredients
            </h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
              Automatic real-time commissary consumption audit. Calculates exact raw ingredient deductions from today's orders and cross-examines finished goods against physical kitchen stock.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchUsageReport}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition"
              title="Refresh Usage Audit"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-zinc-900' : ''}`} />
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={!report}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#CDEBC5]" />
              <span>Print / Export Daily Usage Report</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-6 pt-5 border-t border-zinc-100">
          {/* Branch Filter */}
          <div className="md:col-span-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1.5">
              Branch Scope:
            </label>
            {isOwner ? (
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => onBranchChange(e.target.value)}
                  className="w-full text-xs font-semibold pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">Narra Branch (Default Master Hub)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 bg-zinc-100 px-3 py-2 rounded-xl border border-zinc-200">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                <span>{report?.branch_name || 'Assigned Branch'}</span>
              </div>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="md:col-span-8 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1.5">
                Audit Date Period:
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'custom', label: 'Specific Date' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDatePreset(p.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                      datePreset === p.id
                        ? 'bg-[#111111] text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                {datePreset === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="text-xs bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 font-mono text-zinc-900 focus:bg-white"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Search & Filter Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search ingredient (e.g. Patty, Siomai, Rice)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyConsumed}
                onChange={(e) => setOnlyConsumed(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300"
              />
              <span>Consumed Today Only ({consumedCount})</span>
            </label>

            {categories.length > 2 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 font-bold text-zinc-700 focus:bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    Category: {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Cross-Audit Automated Verification Cards */}
      {report && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-950 font-mono">
                  Automated Cross-Audit Verification Check
                </h3>
                <p className="text-xs text-amber-800">
                  Authoritative reconciliation comparing sold finished goods against physical recipe ingredient deductions.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-mono">
              Live Order Integrity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.cross_audit_checks.map((check, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[10px] font-mono uppercase font-bold">{check.title}</span>
                    <span className="text-[10px] font-bold text-zinc-500 font-mono">
                      {check.finished_goods_count} Sold
                    </span>
                  </div>
                  <p className="text-sm font-bold text-zinc-900 mt-1 font-mono">
                    "{check.notes}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-medium">Recipe Parity</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase font-mono px-2 py-0.5 rounded ${
                    check.matched
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {check.matched ? 'Tally & Verified' : 'Check Stock'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient Usage Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-zinc-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 font-mono">
              Itemized Raw Materials Consumption & Stock Ledger
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Showing {filteredIngredients.length} ingredients
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/75 border-b border-zinc-200 text-zinc-600 font-mono font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Raw Ingredient</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Total Deducted Today</th>
                <th className="py-3 px-4 text-right">Remaining Ending Balance</th>
                <th className="py-3 px-4 text-right">Reorder Level</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-mono text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Computing commissary recipe deductions...
                  </td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-mono text-xs">
                    No ingredient records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ing) => {
                  const isDeducted = ing.total_consumed_today > 0;
                  return (
                    <tr
                      key={ing.ingredient_id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        isDeducted ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Ingredient Name */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900 text-sm">
                        {ing.ingredient_name}
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-xs">
                        {ing.item_code}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600">
                          {ing.category}
                        </span>
                      </td>

                      {/* Total Consumed Today */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                        {isDeducted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                            -{ing.total_consumed_today} {ing.unit}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-normal">0 {ing.unit}</span>
                        )}
                      </td>

                      {/* Remaining Ending Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-zinc-900">
                        {ing.current_ending_stock} {ing.unit}
                      </td>

                      {/* Reorder Level */}
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-500">
                        {ing.reorder_level} {ing.unit}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                            ing.status === 'IN_STOCK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ing.status === 'LOW_STOCK'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ing.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Notice */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Commissary deductions validated against active branch recipes.</span>
          </div>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="text-zinc-900 font-bold hover:underline flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            Launch Full End-of-Day Print Sheet
          </button>
        </div>
      </div>

      {/* Printable End-of-Day Report Modal */}
      <DailyUsageReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        report={report}
      />
    </div>
  );
};
