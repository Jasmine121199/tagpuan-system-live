import React, { useState, useEffect } from 'react';
import { CashierShift, CashDenominationCount, Branch } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DenominationCalculator, calculateTotalCash } from './DenominationCalculator';
import { googleSheetsPersistence } from '../../lib/googleSheetsPersistence';
import {
  Clock,
  Unlock,
  Lock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  Eye,
  Loader2,
  X,
  Building2,
  Banknote,
  DollarSign
} from 'lucide-react';

interface CashierShiftsTabProps {
  branches: Branch[];
}

export const CashierShiftsTab: React.FC<CashierShiftsTabProps> = ({ branches }) => {
  const { user, isOwner, isManager } = useAuth();
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [activeShiftToClose, setActiveShiftToClose] = useState<CashierShift | null>(null);
  const [viewShiftDetails, setViewShiftDetails] = useState<CashierShift | null>(null);

  // Open Shift Form State
  const [openBranchId, setOpenBranchId] = useState<string>(user?.branch_id || (branches[0]?.id || ''));
  const [openingCash, setOpeningCash] = useState<string>('1000');
  const [openNotes, setOpenNotes] = useState<string>('');
  const [isSubmittingOpen, setIsSubmittingOpen] = useState(false);

  // Close Shift Form State
  const [closeDenominations, setCloseDenominations] = useState<CashDenominationCount>({
    d1000: 0,
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    d5: 0,
    d1: 0
  });
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  const fetchShifts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();

      if (selectedBranchId) params.set('branch_id', selectedBranchId);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/financial/shifts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch shifts.');
      }

      setShifts(data.shifts);
    } catch (err: any) {
      setError(err.message || 'Error fetching cashier shifts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [selectedBranchId, statusFilter]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOpen(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/financial/shifts/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: openBranchId,
          opening_cash: parseFloat(openingCash) || 0,
          notes: openNotes.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open cashier shift.');
      }

      setIsOpenShiftModalOpen(false);
      setOpenNotes('');
      fetchShifts();
    } catch (err: any) {
      setError(err.message || 'Error opening shift.');
    } finally {
      setIsSubmittingOpen(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShiftToClose) return;

    setIsSubmittingClose(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/financial/shifts/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shift_id: activeShiftToClose.id,
          denominations: closeDenominations,
          variance_reason: varianceReason.trim() || undefined,
          notes: closeNotes.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to close cashier shift.');
      }

      const countedTotal = calculateTotalCash(closeDenominations);
      const expectedCash = activeShiftToClose.expected_cash || activeShiftToClose.opening_cash || countedTotal;
      // Trigger Google Apps Script POST action "saveAudit" for shift sales closing report
      void googleSheetsPersistence.saveAudit({
        daily_remittance: countedTotal,
        closing_cash: countedTotal,
        expected_cash: expectedCash,
        actual_cash_counted: countedTotal,
        cash_variance: countedTotal - expectedCash,
        expenses: activeShiftToClose.cash_expenses || 0,
        cashier_name: activeShiftToClose.cashier_name || user?.full_name || 'Cashier',
        branch_name: activeShiftToClose.branch_name || user?.branch_name || 'Tagpuan Branch',
        report_type: 'SALES_CLOSING_REPORT',
        status: 'CLOSED',
        notes: closeNotes.trim() || varianceReason.trim() || `Shift #${activeShiftToClose.shift_number} Closing Report`
      });

      setIsCloseShiftModalOpen(false);
      setActiveShiftToClose(null);
      setVarianceReason('');
      setCloseNotes('');
      fetchShifts();
    } catch (err: any) {
      setError(err.message || 'Error closing shift.');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Filtered shifts list
  const filteredShifts = shifts.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.shift_number.toLowerCase().includes(q) ||
        s.cashier_name.toLowerCase().includes(q) ||
        s.branch_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeMyShift = shifts.find(
    s => s.status === 'OPEN' && s.cashier_id === user?.id
  );

  return (
    <div className="space-y-6">
      {/* Action and Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-700" />
              Cashier Shifts & Cash Count Records
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {filteredShifts.length} Shifts
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeMyShift ? (
              <button
                onClick={() => {
                  setActiveShiftToClose(activeMyShift);
                  setCloseDenominations({
                    d1000: 0, d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, d1: 0
                  });
                  setIsCloseShiftModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 transition shadow-xs animate-pulse"
              >
                <Lock className="w-4 h-4" /> Close Active Shift ({activeMyShift.shift_number})
              </button>
            ) : (
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-black hover:bg-black transition shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#CDEBC5]" /> Open New Shift
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shift #, cashier, branch..."
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-zinc-900 focus:bg-white"
            />
          </div>

          {isOwner && (
            <div>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Currently OPEN (Active)</option>
              <option value="CLOSED">CLOSED & Balanced</option>
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

      {/* Shifts Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-mono border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Shift #</th>
                <th className="py-3 px-4">Branch & Cashier</th>
                <th className="py-3 px-4">Opened / Closed</th>
                <th className="py-3 px-4 text-right">Opening Cash</th>
                <th className="py-3 px-4 text-right">Expected Cash</th>
                <th className="py-3 px-4 text-right">Actual Counted</th>
                <th className="py-3 px-4 text-center">Variance Status</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
                    Loading cashier shift records...
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    No cashier shift records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-zinc-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      {shift.shift_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-zinc-900">{shift.branch_name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{shift.cashier_name}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-600">
                      <div>Start: {new Date(shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {shift.closed_at && (
                        <div className="text-zinc-400">
                          End: {new Date(shift.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-700">
                      ₱{shift.opening_cash.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-800">
                      ₱{shift.expected_cash.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-900">
                      {shift.actual_cash !== null ? `₱${shift.actual_cash.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {shift.variance_status === 'BALANCED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Balanced
                        </span>
                      )}
                      {shift.variance_status === 'OVERAGE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          +₱{shift.variance.toFixed(2)} Overage
                        </span>
                      )}
                      {shift.variance_status === 'SHORTAGE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          -₱{Math.abs(shift.variance).toFixed(2)} Shortage
                        </span>
                      )}
                      {!shift.variance_status && <span className="text-zinc-400 font-mono">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        shift.status === 'OPEN'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                      }`}>
                        {shift.status === 'OPEN' ? 'OPEN' : 'CLOSED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {shift.status === 'OPEN' && (isOwner || isManager || shift.cashier_id === user?.id) && (
                          <button
                            onClick={() => {
                              setActiveShiftToClose(shift);
                              setCloseDenominations({
                                d1000: 0, d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, d1: 0
                              });
                              setIsCloseShiftModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600 transition"
                          >
                            Close Shift
                          </button>
                        )}
                        <button
                          onClick={() => setViewShiftDetails(shift)}
                          className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
                          title="View Shift Cash Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: OPEN SHIFT */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-bold">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Open Cashier Shift</h3>
                  <p className="text-xs text-zinc-400">Initialize cash drawer float</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="p-5 space-y-4">
              {isOwner && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Target Branch</label>
                  <select
                    value={openBranchId}
                    onChange={(e) => setOpenBranchId(e.target.value)}
                    className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900 font-bold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Opening Cash Float (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="w-full text-sm font-mono font-bold bg-zinc-50 border border-zinc-300 rounded-xl pl-8 pr-3 py-2.5 text-zinc-900 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Initial change fund placed in cash drawer register at the start of shift.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="e.g., Morning Shift change fund prepared by Manager."
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOpen}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-black hover:bg-black transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingOpen && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Open Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE SHIFT WITH DENOMINATION COUNT */}
      {isCloseShiftModalOpen && activeShiftToClose && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Close Shift — Cash Count & Z-Reading
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {activeShiftToClose.shift_number} • {activeShiftToClose.branch_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Shift Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs">
                <div>
                  <p className="text-zinc-500 text-[11px]">Opening Fund</p>
                  <p className="font-mono font-bold text-zinc-900">₱{activeShiftToClose.opening_cash.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[11px]">Cash Sales</p>
                  <p className="font-mono font-bold text-emerald-700">₱{activeShiftToClose.cash_sales.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[11px]">Cash Expenses</p>
                  <p className="font-mono font-bold text-amber-700">₱{activeShiftToClose.cash_expenses.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[11px]">Expected Cash in Register</p>
                  <p className="font-mono font-black text-zinc-900">₱{activeShiftToClose.expected_cash.toFixed(2)}</p>
                </div>
              </div>

              {/* Denomination Calculator */}
              <div>
                <label className="block text-xs font-black text-zinc-800 uppercase tracking-wider mb-2">
                  Physical Cash Count Breakdown
                </label>
                <DenominationCalculator
                  denominations={closeDenominations}
                  onChange={(d) => setCloseDenominations(d)}
                />
              </div>

              {/* Real-time Variance Analysis */}
              {(() => {
                const totalCounted = calculateTotalCash(closeDenominations);
                const variance = totalCounted - activeShiftToClose.expected_cash;
                const isBalanced = Math.abs(variance) < 0.01;
                const isShortage = variance < -0.01;
                const isOverage = variance > 0.01;

                return (
                  <div className={`p-3.5 rounded-xl border text-xs ${
                    isBalanced
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : isShortage
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1.5">
                        {isBalanced && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {isShortage && <AlertTriangle className="w-4 h-4 text-red-600" />}
                        {isOverage && <AlertTriangle className="w-4 h-4 text-blue-600" />}
                        {isBalanced ? 'Register Perfectly Balanced' : isShortage ? 'Cash Shortage Detected' : 'Cash Overage Detected'}
                      </span>
                      <span className="font-mono font-black text-sm">
                        {isBalanced ? '₱0.00' : isShortage ? `-₱${Math.abs(variance).toFixed(2)}` : `+₱${variance.toFixed(2)}`}
                      </span>
                    </div>

                    {!isBalanced && (
                      <div className="mt-3 pt-2 border-t border-current/20 space-y-1">
                        <label className="block text-[11px] font-black uppercase tracking-wider">
                          Explanation / Variance Reason (Mandatory for audit trail) *
                        </label>
                        <input
                          type="text"
                          required
                          value={varianceReason}
                          onChange={(e) => setVarianceReason(e.target.value)}
                          placeholder="e.g., Change dispensing round-off error, loose coins miscounted..."
                          className="w-full text-xs bg-white border border-zinc-300 rounded-lg p-2 text-zinc-900 focus:ring-2 focus:ring-zinc-800"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Shift Handover Notes</label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Notes for next shift cashier or manager..."
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClose}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingClose && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Cash Count & Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW SHIFT DETAILS */}
      {viewShiftDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Shift Record — {viewShiftDetails.shift_number}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {viewShiftDetails.branch_name} • Cashier: {viewShiftDetails.cashier_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewShiftDetails(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
                <div>
                  <span className="text-zinc-500 text-[11px]">Opening Fund</span>
                  <p className="font-mono font-bold text-zinc-900">₱{viewShiftDetails.opening_cash.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px]">Cash Sales</span>
                  <p className="font-mono font-bold text-emerald-700">₱{viewShiftDetails.cash_sales.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px]">Expected Cash</span>
                  <p className="font-mono font-bold text-zinc-900">₱{viewShiftDetails.expected_cash.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px]">Actual Counted</span>
                  <p className="font-mono font-black text-zinc-900">
                    {viewShiftDetails.actual_cash !== null ? `₱${viewShiftDetails.actual_cash.toFixed(2)}` : '—'}
                  </p>
                </div>
              </div>

              {/* Denominations breakdown */}
              {viewShiftDetails.denominations && (
                <div>
                  <h4 className="font-black text-zinc-800 uppercase tracking-wider mb-2">
                    Physical Cash Count Denominations
                  </h4>
                  <DenominationCalculator
                    denominations={viewShiftDetails.denominations}
                    onChange={() => {}}
                    readOnly
                  />
                </div>
              )}

              {viewShiftDetails.variance_reason && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <p className="font-bold text-[11px] uppercase tracking-wider">Variance Explanation</p>
                  <p className="mt-0.5">{viewShiftDetails.variance_reason}</p>
                </div>
              )}

              {viewShiftDetails.notes && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-zinc-500">Handover Notes</p>
                  <p className="mt-0.5">{viewShiftDetails.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setViewShiftDetails(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-black transition"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
