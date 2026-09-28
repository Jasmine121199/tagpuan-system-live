import React, { useState, useEffect } from 'react';
import { FinancialReconciliationRecord, Branch } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Building2,
  Edit3,
  Loader2,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface FinancialReconciliationTabProps {
  branches: Branch[];
}

export const FinancialReconciliationTab: React.FC<FinancialReconciliationTabProps> = ({ branches }) => {
  const { user, isOwner, isManager } = useAuth();
  const [records, setRecords] = useState<FinancialReconciliationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('this_month');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Modals
  const [adjustModalRecord, setAdjustModalRecord] = useState<FinancialReconciliationRecord | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<string>('CASH_OVERAGE_ADJUSTMENT');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const fetchReconciliation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();

      if (datePreset) params.set('date_preset', datePreset);
      if (selectedBranchId) params.set('branch_id', selectedBranchId);

      const response = await fetch(`/api/financial/reconciliation?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to compute financial reconciliation.');
      }

      setRecords(data.records);
    } catch (err: any) {
      setError(err.message || 'Error fetching reconciliation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, [datePreset, selectedBranchId]);

  const handleMarkReconciled = async (record: FinancialReconciliationRecord) => {
    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/financial/reconciliation/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: record.date,
          branch_id: record.branch_id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reconcile record.');
      }

      fetchReconciliation();
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile.');
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalRecord) return;

    setIsSubmittingAdjust(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/financial/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: adjustModalRecord.date,
          branch_id: adjustModalRecord.branch_id,
          adjustment_type: adjustmentType,
          amount: parseFloat(adjustAmount) || 0,
          reason: adjustReason.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record adjustment override.');
      }

      setAdjustModalRecord(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchReconciliation();
    } catch (err: any) {
      setError(err.message || 'Error creating adjustment.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter and Overview Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-zinc-800" />
              Multi-source Financial Reconciliation Ledger
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {records.length} Date-Branch Ledgers
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all_time', label: 'All Time' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  datePreset === p.id ? 'bg-[#111111] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {isOwner && (
          <div className="pt-2 border-t border-zinc-100">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full sm:w-72 text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900"
            >
              <option value="">All 17 Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-mono border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Date & Branch</th>
                <th className="py-3 px-4 text-right">System Net Sales</th>
                <th className="py-3 px-4 text-right">Non-Cash (e-Wallets)</th>
                <th className="py-3 px-4 text-right">Expected Cash</th>
                <th className="py-3 px-4 text-right">Actual Counted</th>
                <th className="py-3 px-4 text-right">Expenses Paid</th>
                <th className="py-3 px-4 text-right">Remitted Cash</th>
                <th className="py-3 px-4 text-center">Variance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
                    Computing multi-source reconciliation records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    No transactions found for the selected period.
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => {
                  const nonCashTotal =
                    rec.payment_totals.gcash +
                    rec.payment_totals.maya +
                    rec.payment_totals.qrph +
                    rec.payment_totals.bank +
                    rec.payment_totals.other;

                  return (
                    <tr key={`${rec.date}-${rec.branch_id}-${idx}`} className="hover:bg-zinc-50/70 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-zinc-900">{rec.branch_name}</p>
                        <p className="text-[11px] text-zinc-500 font-mono">{rec.date}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900">
                        ₱{rec.net_sales.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-600">
                        ₱{nonCashTotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-700">
                        ₱{rec.expected_cash.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-900">
                        ₱{rec.actual_cash.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-700">
                        ₱{rec.total_expenses.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800">
                        ₱{rec.remitted_cash.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center font-mono font-bold text-[11px] ${
                          rec.variance === 0 ? 'text-emerald-700' : rec.variance > 0 ? 'text-blue-700' : 'text-red-700'
                        }`}>
                          {rec.variance === 0 ? '₱0.00' : rec.variance > 0 ? `+₱${rec.variance.toFixed(2)}` : `-₱${Math.abs(rec.variance).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.reconciliation_status === 'RECONCILED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.reconciliation_status === 'DISCREPANCY'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.reconciliation_status === 'RECONCILED' && <CheckCircle2 className="w-3 h-3" />}
                          {rec.reconciliation_status === 'DISCREPANCY' && <AlertTriangle className="w-3 h-3" />}
                          {rec.reconciliation_status === 'PENDING' && <Clock className="w-3 h-3" />}
                          {rec.reconciliation_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOwner && (
                            <button
                              onClick={() => {
                                setAdjustModalRecord(rec);
                                setAdjustAmount(String(Math.abs(rec.variance)));
                                setAdjustReason('');
                              }}
                              className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
                              title="Financial Adjustment Override"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(isOwner || isManager) && rec.reconciliation_status !== 'RECONCILED' && (
                            <button
                              onClick={() => handleMarkReconciled(rec)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-black transition"
                            >
                              Mark Reconciled
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: OWNER MANUAL FINANCIAL OVERRIDE ADJUSTMENT */}
      {adjustModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-white">Owner Financial Adjustment</h3>
                <p className="text-xs text-zinc-400">
                  {adjustModalRecord.branch_name} • {adjustModalRecord.date}
                </p>
              </div>
              <button
                onClick={() => setAdjustModalRecord(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Adjustment Type *</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900 font-bold"
                >
                  <option value="CASH_OVERAGE_ADJUSTMENT">Cash Overage Recognition (Income)</option>
                  <option value="SHORTAGE_WRITE_OFF">Cash Shortage Write-off (Loss)</option>
                  <option value="SYSTEM_OVERRIDE">System Sync Calibration Override</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Adjustment Amount (₱) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full font-mono font-bold bg-zinc-50 border border-zinc-300 rounded-xl pl-8 pr-3 py-2 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  Mandatory Justification / Audit Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Approved owner write-off for minor drawer rounding discrepancy."
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalRecord(null)}
                  className="px-4 py-2 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#111111] text-white font-black hover:bg-black transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingAdjust && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
