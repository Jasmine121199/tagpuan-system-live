import React, { useState, useEffect, useMemo } from 'react';
import { CashRemittance, CashierShift, Branch, CashDenominationCount, BranchExpense } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DenominationCalculator, calculateTotalCash, DENOMINATION_VALUES } from './DenominationCalculator';
import { ShiftRemittanceTicketModal } from './ShiftRemittanceTicketModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  Banknote,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Eye,
  FileCheck,
  Building2,
  Loader2,
  X,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Receipt,
  Sparkles,
  Printer,
  Calculator,
  ChevronDown,
  AlertTriangle,
  Calendar,
  Layers
} from 'lucide-react';

interface CashRemittanceTabProps {
  branches: Branch[];
}

const CashRemittanceTabInner: React.FC<CashRemittanceTabProps> = ({ branches }) => {
  const { user, isOwner, isManager } = useAuth();
  // Defensive initialization: always empty arrays
  const [remittances, setRemittances] = useState<CashRemittance[]>([]);
  const [closedShifts, setClosedShifts] = useState<CashierShift[]>([]);
  const [expenses, setExpenses] = useState<BranchExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters: For Branch Manager automatically default to the manager's assigned branchId
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (isManager && user?.branch_id) return user.branch_id;
    return '';
  });

  // Keep manager's branch synchronized if user context loads asynchronously
  useEffect(() => {
    if (isManager && user?.branch_id && selectedBranchId !== user.branch_id) {
      console.log('[CashRemittanceTab] Auto-setting Branch Manager scope to assigned branch:', user.branch_id);
      setSelectedBranchId(user.branch_id);
    }
  }, [isManager, user?.branch_id, selectedBranchId]);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reviewModalRemittance, setReviewModalRemittance] = useState<CashRemittance | null>(null);
  const [ticketModalRemittance, setTicketModalRemittance] = useState<CashRemittance | null>(null);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Submit Form State
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [denominations, setDenominations] = useState<CashDenominationCount>({
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
  const [remittedAmount, setRemittedAmount] = useState<number>(0);
  const [useManualAmount, setUseManualAmount] = useState<boolean>(false);
  const [proofType, setProofType] = useState<string>('Bank Cash Deposit Slip');
  const [proofImageUrl, setProofImageUrl] = useState<string>('');
  const [submitNotes, setSubmitNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manager Review Form State
  const [reviewAction, setReviewAction] = useState<'VERIFY' | 'APPROVE' | 'REJECT' | 'FOR_REVIEW' | 'RECONCILE'>('VERIFY');
  const [managerVerifiedAmount, setManagerVerifiedAmount] = useState<string>('');
  const [managerDeductionsAmount, setManagerDeductionsAmount] = useState<string>('0');
  const [managerDeductionsNotes, setManagerDeductionsNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [correctionNotes, setCorrectionNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchRemittances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();

      const branchToQuery = (isManager && user?.branch_id) ? user.branch_id : selectedBranchId;
      if (branchToQuery && branchToQuery !== 'ALL') {
        params.set('branch_id', branchToQuery);
      }
      if (statusFilter) params.set('status', statusFilter);

      console.log('[CashRemittanceTab] Fetching remittances with params:', params.toString(), {
        role: user?.role,
        userBranch: user?.branch_id,
        targetBranch: branchToQuery || 'ALL'
      });

      let response = await fetch(`/api/financial/remittances?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok && response.status === 404) {
        response = await fetch(`/api/remittances?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }

      if (response.ok) {
        const data = await response.json();
        const resolvedList = Array.isArray(data) ? data : (data.remittances || data.data || []);
        console.log('[CashRemittanceTab] Received remittances payload count:', resolvedList.length, resolvedList);
        setRemittances(resolvedList);
      } else {
        const data = await response.json().catch(() => ({}));
        console.warn('[CashRemittanceTab] Non-OK remittances response:', data);
        const resolvedList = Array.isArray(data) ? data : (data.remittances || data.data || []);
        setRemittances(resolvedList);
      }
    } catch (err: any) {
      console.error('[CashRemittanceTab] Failed to fetch remittances:', err);
      setRemittances([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClosedShifts = async () => {
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();
      params.set('status', 'CLOSED');
      const branchToQuery = (isManager && user?.branch_id) ? user.branch_id : selectedBranchId;
      if (branchToQuery && branchToQuery !== 'ALL') {
        params.set('branch_id', branchToQuery);
      }
      const response = await fetch(`/api/financial/shifts?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        const list = Array.isArray(data) ? data : (data.shifts || data.data || []);
        console.log('[CashRemittanceTab] Fetched closed cashier shifts count:', list.length);
        setClosedShifts(list);
      } else {
        setClosedShifts([]);
      }
    } catch (err) {
      console.warn('[CashRemittanceTab] Failed to load closed shifts for remittance:', err);
      setClosedShifts([]);
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();
      const branchToQuery = (isManager && user?.branch_id) ? user.branch_id : selectedBranchId;
      if (branchToQuery && branchToQuery !== 'ALL') {
        params.set('branch_id', branchToQuery);
      }
      let response = await fetch(`/api/financial/expenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok && response.status === 404) {
        response = await fetch(`/api/expenses?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.expenses || data.data || []);
        console.log('[CashRemittanceTab] Fetched allowable branch expenses count:', list.length);
        setExpenses(list);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.warn('[CashRemittanceTab] Failed to load expenses for remittance hub:', err);
      setExpenses([]);
    }
  };

  useEffect(() => {
    fetchRemittances();
    fetchClosedShifts();
    fetchExpenses();
  }, [selectedBranchId, statusFilter]);

  const activeSelectedShift = useMemo(() => {
    return closedShifts.find((s) => s.id === selectedShiftId) || null;
  }, [closedShifts, selectedShiftId]);

  const handleShiftSelect = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    const shift = closedShifts.find((s) => s.id === shiftId);
    if (shift) {
      const expected = shift.actual_cash !== null ? shift.actual_cash : shift.expected_cash;
      // Pre-fill rough denominations if empty
      setRemittedAmount(expected);
    }
  };

  const handleDenominationChange = (newDenoms: CashDenominationCount, total: number) => {
    setDenominations(newDenoms);
    if (!useManualAmount) {
      setRemittedAmount(total);
    }
  };

  // Live submit variance computation
  const liveVariance = useMemo(() => {
    if (!activeSelectedShift) return 0;
    const targetDrawer = activeSelectedShift.actual_cash !== null ? activeSelectedShift.actual_cash : activeSelectedShift.expected_cash;
    return remittedAmount - targetDrawer;
  }, [activeSelectedShift, remittedAmount]);

  const liveVarianceFlag = useMemo<'TALLY' | 'SHORTAGE' | 'OVERAGE'>(() => {
    if (Math.abs(liveVariance) < 0.01) return 'TALLY';
    return liveVariance < 0 ? 'SHORTAGE' : 'OVERAGE';
  }, [liveVariance]);

  const handleSubmitRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/financial/remittances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          shift_id: selectedShiftId,
          remitted_amount: remittedAmount,
          denomination_breakdown: denominations,
          proof_type: proofType,
          proof_image_url: proofImageUrl.trim() || undefined,
          notes: submitNotes.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit cash remittance.');
      }

      setIsSubmitModalOpen(false);
      setSelectedShiftId('');
      setRemittedAmount(0);
      setProofImageUrl('');
      setSubmitNotes('');
      await fetchRemittances();

      // Prompt ticket modal for cashier
      if (data.remittance) {
        setTicketModalRemittance(data.remittance);
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting remittance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (rem: CashRemittance) => {
    console.log('[CashRemittanceTab] Opening review modal for remittance ticket:', rem.remittance_number, rem);
    setReviewModalRemittance(rem);
    setReviewAction(isOwner ? 'APPROVE' : 'VERIFY');
    const shift = closedShifts.find((s) => s.id === rem.shift_id);
    if (!rem.denomination_breakdown && shift?.denominations) {
      rem.denomination_breakdown = shift.denominations;
    }
    setManagerVerifiedAmount(String(rem.remitted_amount || rem.actual_cash || rem.expected_cash || '0'));
    setManagerDeductionsAmount(String(rem.manager_deductions_amount || '0'));
    setManagerDeductionsNotes(rem.manager_deductions_notes || '');
    setRejectionReason(rem.rejection_reason || '');
    setCorrectionNotes(rem.correction_notes || '');
  };

  const handleReviewRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalRemittance) return;

    setIsSubmittingReview(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const deductionsNum = parseFloat(managerDeductionsAmount) || 0;
      const verifiedNum = parseFloat(managerVerifiedAmount) || reviewModalRemittance.remitted_amount;

      const payload = {
        action: reviewAction,
        manager_verified_amount: verifiedNum,
        manager_deductions_amount: deductionsNum,
        manager_deductions_notes: managerDeductionsNotes.trim() || undefined,
        rejection_reason: reviewAction === 'REJECT' ? rejectionReason : undefined,
        correction_notes: reviewAction === 'FOR_REVIEW' ? correctionNotes : undefined
      };

      console.log('[CashRemittanceTab] Submitting review payload for ticket:', reviewModalRemittance.id, payload);

      let response = await fetch(`/api/financial/remittances/${reviewModalRemittance.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok && response.status === 404) {
        response = await fetch(`/api/remittances/${reviewModalRemittance.id}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();
      console.log('[CashRemittanceTab] Review response data:', data);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to review remittance.');
      }

      setReviewModalRemittance(null);
      await fetchRemittances();
      await fetchExpenses();
    } catch (err: any) {
      console.error('[CashRemittanceTab] Error submitting remittance review:', err);
      setError(err.message || 'Error reviewing remittance.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filtered records
  const filteredRemittances = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    return remittances.filter((r) => {
      // 1. Branch filter
      if (selectedBranchId && selectedBranchId !== 'ALL' && r.branch_id !== selectedBranchId) {
        return false;
      }
      // 2. Status filter
      if (statusFilter && r.status !== statusFilter) {
        return false;
      }
      // 3. Date filter
      if (dateFilter === 'TODAY' && r.date !== today) return false;
      if (dateFilter === 'YESTERDAY' && r.date !== yesterday) return false;
      if (dateFilter === 'THIS_WEEK' && r.date < sevenDaysAgo) return false;
      if (dateFilter === 'THIS_MONTH' && !r.date.startsWith(currentMonth)) return false;
      if (dateFilter === 'CUSTOM') {
        if (customStartDate && r.date < customStartDate) return false;
        if (customEndDate && r.date > customEndDate) return false;
      }
      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.remittance_number.toLowerCase().includes(q) ||
          r.cashier_name.toLowerCase().includes(q) ||
          r.branch_name.toLowerCase().includes(q) ||
          (r.variance_flag && r.variance_flag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [remittances, selectedBranchId, statusFilter, dateFilter, customStartDate, customEndDate, searchQuery]);

  // Master Owner Executive Metrics
  const auditMetrics = useMemo(() => {
    let totalGrossSales = 0;
    let totalRemitted = 0;
    let totalVariance = 0;
    let tallyCount = 0;
    let shortageCount = 0;
    let overageCount = 0;
    let totalDeductions = 0;

    filteredRemittances.forEach((r) => {
      totalGrossSales += r.gross_sales || r.expected_cash || 0;
      totalRemitted += r.remitted_amount || 0;
      const v = r.remittance_variance !== undefined && r.remittance_variance !== null
        ? r.remittance_variance
        : ((r.remitted_amount || 0) - (r.expected_cash || 0));
      totalVariance += v;
      totalDeductions += r.manager_deductions_amount || 0;

      const flag = r.variance_flag || (Math.abs(v) < 0.01 ? 'TALLY' : v < 0 ? 'SHORTAGE' : 'OVERAGE');
      if (flag === 'TALLY') tallyCount++;
      else if (flag === 'SHORTAGE') shortageCount++;
      else overageCount++;
    });

    // Also calculate allowable operational expenses for filtered branches/date
    let allowableExpenses = totalDeductions;
    expenses.forEach(exp => {
      if (selectedBranchId && selectedBranchId !== 'ALL' && exp.branch_id !== selectedBranchId) return;
      if (exp.status === 'APPROVED') {
        allowableExpenses += exp.amount || 0;
      }
    });

    const overallVarianceFlag: 'TALLY' | 'SHORTAGE' | 'OVERAGE' =
      Math.abs(totalVariance) < 0.01 ? 'TALLY' : totalVariance < 0 ? 'SHORTAGE' : 'OVERAGE';

    const results = {
      totalGrossSales,
      totalRemitted,
      totalVariance,
      overallVarianceFlag,
      tallyCount,
      shortageCount,
      overageCount,
      totalDeductions,
      allowableExpenses
    };

    console.log('[CashRemittanceTab] Dynamic calculation results for Audit Dashboard:', results, {
      selectedBranchId: selectedBranchId || 'ALL',
      dateFilter,
      recordCount: filteredRemittances.length
    });

    return results;
  }, [filteredRemittances, expenses, selectedBranchId, dateFilter]);

  return (
    <div className="space-y-6">
      {/* Master Owner / Manager Global Sales & Remittance Audit KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-400">Total Gross Sales (POS + Kiosk)</p>
            <p className="text-xl font-black font-mono text-zinc-900 mt-0.5">
              ₱{auditMetrics.totalGrossSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {selectedBranchId ? 'Filtered Branch Total' : 'All 17 Branches Global'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-400">Total Physical Cash Remitted</p>
            <p className="text-xl font-black font-mono text-emerald-700 mt-0.5">
              ₱{auditMetrics.totalRemitted.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">Vault & Bank Deposit Total</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-400">Allowable Expenses Deducted</p>
            <p className="text-xl font-black font-mono text-amber-700 mt-0.5">
              ₱{auditMetrics.allowableExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">Operational & Petty Deductions</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono font-bold text-zinc-400">Cash Drawer Variance</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xl font-black font-mono ${auditMetrics.totalVariance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {auditMetrics.totalVariance >= 0 ? '+' : ''}₱{auditMetrics.totalVariance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider ${
                  auditMetrics.overallVarianceFlag === 'TALLY'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : auditMetrics.overallVarianceFlag === 'SHORTAGE'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}
              >
                {auditMetrics.overallVarianceFlag}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold mt-1">
              <span className="text-emerald-700">{auditMetrics.tallyCount} Balanced</span> •{' '}
              <span className="text-rose-600">{auditMetrics.shortageCount} Short</span> •{' '}
              <span className="text-blue-600">{auditMetrics.overageCount} Over</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-zinc-700" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-700" />
              Cash Remittance & Denomination Audit Matrix
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {filteredRemittances.length} Records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDenominations({
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
                setRemittedAmount(0);
                setIsSubmitModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-black hover:bg-black transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#CDEBC5]" /> Submit Cash Remittance
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket #, cashier, branch..."
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-zinc-900 focus:bg-white"
            />
          </div>

          <div>
            {isManager ? (
              <div className="flex items-center justify-between p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-950">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">{user?.branch_name || 'Assigned Branch'}</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono uppercase bg-emerald-100/80 px-1.5 py-0.5 rounded shrink-0">
                  Manager Scope
                </span>
              </div>
            ) : (
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  console.log('[CashRemittanceTab] Master Owner toggled branch to:', e.target.value || 'ALL');
                  setSelectedBranchId(e.target.value);
                }}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white cursor-pointer font-medium"
              >
                <option value="">All Branches (Global Audit)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED (Awaiting Review)</option>
              <option value="VERIFIED">VERIFIED & RECEIVED by Manager</option>
              <option value="APPROVED">APPROVED & Reconciled</option>
              <option value="FOR_REVIEW">FOR CORRECTION</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 text-xs">
            <span className="font-bold text-zinc-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 text-xs text-zinc-800"
            />
            <span className="text-zinc-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 text-xs text-zinc-800"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Master Owner Global Branch Audit Summary Grid */}
      {isOwner && (!selectedBranchId || selectedBranchId === 'ALL') && (
        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 font-mono">
                Branch-by-Branch Sales & Cash Audit Summary
              </h4>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Click branch card to filter details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branches.map((b) => {
              const bRemittances = filteredRemittances.filter((r) => r.branch_id === b.id);
              let bSales = 0;
              let bRemitted = 0;
              let bVariance = 0;
              bRemittances.forEach((r) => {
                bSales += r.gross_sales || r.expected_cash || 0;
                bRemitted += r.remitted_amount || 0;
                const v = r.remittance_variance !== undefined && r.remittance_variance !== null
                  ? r.remittance_variance
                  : ((r.remitted_amount || 0) - (r.expected_cash || 0));
                bVariance += v;
              });

              let bExpenses = 0;
              expenses.forEach((e) => {
                if (e.branch_id === b.id && e.status === 'APPROVED') {
                  bExpenses += e.amount || 0;
                }
              });

              const bFlag = Math.abs(bVariance) < 0.01 ? 'TALLY' : bVariance < 0 ? 'SHORTAGE' : 'OVERAGE';

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  className="p-3.5 rounded-xl border border-zinc-200 hover:border-emerald-600 bg-zinc-50/50 hover:bg-emerald-50/20 transition cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-zinc-900 text-xs truncate group-hover:text-emerald-800">
                      {b.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                        bFlag === 'TALLY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : bFlag === 'SHORTAGE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {bFlag}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Sales</span>
                      <span className="font-bold text-zinc-800">₱{bSales.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Remitted</span>
                      <span className="font-bold text-emerald-700">₱{bRemitted.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Expenses</span>
                      <span className="font-bold text-amber-700">₱{bExpenses.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Variance</span>
                      <span className={`font-bold ${bVariance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {bVariance >= 0 ? '+' : ''}₱{bVariance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remittances Master Matrix Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-300 uppercase tracking-wider font-mono border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Ticket # & Date</th>
                <th className="py-3 px-4">Branch & Cashier</th>
                <th className="py-3 px-4 text-right">POS Gross</th>
                <th className="py-3 px-4 text-right">Physical Remitted</th>
                <th className="py-3 px-4 text-center">Variance Flag</th>
                <th className="py-3 px-4">Manager Sign-Off</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
                    Loading branch cash remittances...
                  </td>
                </tr>
              ) : filteredRemittances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No cash remittance records found.
                  </td>
                </tr>
              ) : (
                filteredRemittances.map((rem) => {
                  const flag = rem.variance_flag || (Math.abs(rem.remittance_variance) < 0.01 ? 'TALLY' : rem.remittance_variance < 0 ? 'SHORTAGE' : 'OVERAGE');

                  return (
                    <tr key={rem.id} className="hover:bg-zinc-50/80 transition">
                      <td className="py-3.5 px-4 font-mono">
                        <button
                          type="button"
                          onClick={() => setTicketModalRemittance(rem)}
                          className="font-black text-zinc-900 hover:text-emerald-700 underline flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-zinc-500" />
                          {rem.remittance_number}
                        </button>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {rem.date} • {rem.submitted_at ? new Date(rem.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-zinc-900">{rem.branch_name}</p>
                        <p className="text-[11px] text-zinc-500 font-mono">Cashier: {rem.cashier_name}</p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-zinc-700">
                        ₱{(rem.gross_sales || rem.expected_cash).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800">
                        ₱{rem.remitted_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        {rem.proof_image_url && (
                          <button
                            onClick={() => setPreviewProofUrl(rem.proof_image_url!)}
                            className="ml-1.5 p-0.5 text-blue-600 hover:text-blue-800 inline-block align-middle"
                            title="View Attached Proof"
                          >
                            <ExternalLink className="w-3 h-3 inline" />
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                              flag === 'TALLY'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : flag === 'SHORTAGE'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {flag === 'TALLY' && <CheckCircle2 className="w-3 h-3" />}
                            {flag === 'SHORTAGE' && <AlertTriangle className="w-3 h-3" />}
                            {flag === 'OVERAGE' && <Plus className="w-3 h-3" />}
                            {flag} ({rem.remittance_variance >= 0 ? '+' : ''}₱{rem.remittance_variance.toFixed(2)})
                          </span>

                          {rem.ai_reconciliation_notes && (
                            <span
                              className="text-[10px] text-zinc-400 max-w-[170px] truncate"
                              title={rem.ai_reconciliation_notes}
                            >
                              {rem.ai_reconciliation_notes}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono">
                        {rem.manager_name ? (
                          <div>
                            <span className="font-bold text-zinc-900">{rem.manager_name}</span>
                            {(rem.manager_deductions_amount || 0) > 0 && (
                              <div className="text-[10px] text-amber-700">
                                Petty Out: -₱{rem.manager_deductions_amount?.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Pending Sign-off</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            rem.status === 'APPROVED' || rem.status === 'RECONCILED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rem.status === 'VERIFIED'
                              ? 'bg-blue-100 text-blue-800'
                              : rem.status === 'FOR_REVIEW'
                              ? 'bg-amber-100 text-amber-800'
                              : rem.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-zinc-100 text-zinc-800'
                          }`}
                        >
                          {rem.status === 'VERIFIED' ? 'VERIFIED & RECEIVED' : rem.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTicketModalRemittance(rem)}
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                            title="View Shift Remittance Ticket"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {(isOwner || isManager) && (
                            <button
                              type="button"
                              onClick={() => openReviewModal(rem)}
                              className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition shadow-xs cursor-pointer ${
                                rem.status === 'SUBMITTED'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-zinc-900 hover:bg-black text-white'
                              }`}
                            >
                              {rem.status === 'SUBMITTED'
                                ? isManager
                                  ? 'Verify & Receive'
                                  : 'Review & Verify'
                                : 'Audit & Actions'}
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

      {/* MODAL 1: SUBMIT CASH REMITTANCE WITH DENOMINATION CALCULATOR */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="bg-[#111111] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Cashier Shift Remittance</h3>
                  <p className="text-xs text-zinc-400">Manual Cash Count & Official Shift Remittance Ticket</p>
                </div>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRemittance} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Select Shift */}
              <div>
                <label className="block font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  1. Select Closed Cashier Shift *
                </label>
                <select
                  required
                  value={selectedShiftId}
                  onChange={(e) => handleShiftSelect(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-3 text-zinc-900 font-bold text-xs focus:ring-2 focus:ring-black cursor-pointer"
                >
                  <option value="">-- Choose Shift to Remit --</option>
                  {closedShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shift_number} — {s.branch_name} ({s.cashier_name}) | Expected: ₱{s.expected_cash.toFixed(2)} | Actual: ₱{(s.actual_cash ?? s.expected_cash).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Denomination Breakdown Calculator */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-bold text-zinc-800 uppercase tracking-wider">
                    2. Denomination Breakdown Calculator (Physical Count)
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseManualAmount(!useManualAmount)}
                    className="text-[11px] font-mono text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                  >
                    {useManualAmount ? 'Use Denomination Sum' : 'Manual Override Total'}
                  </button>
                </div>

                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                  <DenominationCalculator
                    denominations={denominations}
                    onChange={handleDenominationChange}
                  />
                </div>
              </div>

              {/* Live Count & Variance Verification Card */}
              {activeSelectedShift && (
                <div className="p-4 bg-zinc-900 text-white rounded-2xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Expected POS Drawer Cash:</span>
                    <span className="font-bold">₱{activeSelectedShift.expected_cash.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Physical Cash Handed Over:</span>
                    <span className="font-black text-base text-[#CDEBC5]">₱{remittedAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-300 font-bold">Variance:</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-black text-sm ${
                          liveVarianceFlag === 'TALLY'
                            ? 'text-[#CDEBC5]'
                            : liveVarianceFlag === 'SHORTAGE'
                            ? 'text-rose-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {liveVariance >= 0 ? '+' : ''}₱{liveVariance.toFixed(2)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          liveVarianceFlag === 'TALLY'
                            ? 'bg-emerald-950 text-[#CDEBC5] border border-emerald-800'
                            : liveVarianceFlag === 'SHORTAGE'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {liveVarianceFlag}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Proof of Remittance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Proof Type *
                  </label>
                  <select
                    value={proofType}
                    onChange={(e) => setProofType(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                  >
                    <option value="Bank Cash Deposit Slip">Bank Cash Deposit Slip</option>
                    <option value="Central Safe Vault Turnover">Central Safe Vault Turnover Voucher</option>
                    <option value="GCash / Maya e-Wallet Cash-in">GCash / Maya Merchant Cash-In Receipt</option>
                    <option value="Authorized Armored Courier Handover">Authorized Armored Courier Handover</option>
                    <option value="Physical Cash Handover to Manager">Physical Cash Handover to Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Proof Slip Image / Photo URL
                  </label>
                  <input
                    type="url"
                    value={proofImageUrl}
                    onChange={(e) => setProofImageUrl(e.target.value)}
                    placeholder="https://... (Photo of deposit slip)"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  Cashier Shift Notes / Explanation
                </label>
                <textarea
                  rows={2}
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g. Validated bill count with branch manager. Coin pouch sealed."
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedShiftId || remittedAmount <= 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#111111] text-[#CDEBC5] font-black hover:bg-black transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Shift Remittance Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BRANCH MANAGER REVIEW & SIGN-OFF */}
      {reviewModalRemittance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="bg-[#111111] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Manager Review & Cash Count Sign-Off
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Ticket #{reviewModalRemittance.remittance_number} • {reviewModalRemittance.branch_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalRemittance(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewRemittance} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Cashier submitted summary */}
              <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 text-center">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">Expected Drawer</p>
                  <p className="font-mono font-bold text-zinc-900 mt-0.5">₱{reviewModalRemittance.expected_cash.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">Cashier Remitted</p>
                  <p className="font-mono font-black text-emerald-700 mt-0.5">₱{reviewModalRemittance.remitted_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">Recorded Variance</p>
                  <p
                    className={`font-mono font-black mt-0.5 ${
                      reviewModalRemittance.remittance_variance < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    ₱{reviewModalRemittance.remittance_variance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Denomination pieces verification (₱1000, ₱500, ₱200, ₱100, ₱50, ₱20, ₱10, ₱5, ₱1) */}
              {(() => {
                const denoms = reviewModalRemittance.denomination_breakdown ||
                  closedShifts.find((s) => s.id === reviewModalRemittance.shift_id)?.denominations ||
                  null;
                const totalCashDenom = denoms ? calculateTotalCash(denoms) : reviewModalRemittance.remitted_amount;

                return (
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-700" />
                        <span className="font-bold text-zinc-900 uppercase text-[10px] font-mono">
                          Cashier's Physical Denomination Count:
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-emerald-800">
                          Total: ₱{totalCashDenom.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTicketModalRemittance(reviewModalRemittance)}
                          className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" /> Ticket
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                      {DENOMINATION_VALUES.map((d) => {
                        const count = denoms ? (denoms[d.key] || 0) : 0;
                        const subtotal = count * d.value;
                        return (
                          <div
                            key={d.key}
                            className={`p-1.5 rounded-lg border flex items-center justify-between transition ${
                              count > 0 ? 'bg-white border-zinc-300 shadow-2xs' : 'bg-zinc-100/50 border-zinc-200 text-zinc-400'
                            }`}
                          >
                            <span className="text-zinc-700 font-semibold">{d.label.split(' ')[0]}</span>
                            <span className="text-[10px] text-zinc-500">×{count}</span>
                            <span className="font-bold text-zinc-900">₱{subtotal.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Branch Manager Allowable Cash Expenses / Deductions */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-950 uppercase text-[11px] flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-700" />
                    Allowable Branch Store Expenses / Deductions (₱)
                  </span>
                  <span className="text-[10px] text-amber-700">e.g. Emergency ice, LPG, drinking water</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-amber-900 block mb-1">
                      Expense Amount (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={managerDeductionsAmount}
                      onChange={(e) => setManagerDeductionsAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-amber-300 rounded-xl p-2 font-mono font-bold text-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-amber-900 block mb-1">
                      Expense Reason / Voucher Ref
                    </label>
                    <input
                      type="text"
                      value={managerDeductionsNotes}
                      onChange={(e) => setManagerDeductionsNotes(e.target.value)}
                      placeholder="e.g. Voucher #102: Emergency 2 bags ice"
                      className="w-full bg-white border border-amber-300 rounded-xl p-2 text-zinc-900"
                    />
                  </div>
                </div>

                {/* Net Safe Cash Calculation */}
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between font-mono">
                  <span className="text-amber-900 font-bold">Net Remitted Cash to Safe / Bank Deposit:</span>
                  <span className="text-base font-black text-emerald-800">
                    ₱{((parseFloat(managerVerifiedAmount) || reviewModalRemittance.remitted_amount) - (parseFloat(managerDeductionsAmount) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Decision */}
              <div>
                <label className="block font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Manager Verification Decision *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'VERIFY', label: 'VERIFY & RECEIVE', color: 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black' },
                    { id: 'APPROVE', label: 'FINAL APPROVE', color: 'border-zinc-900 bg-zinc-900 text-white font-black' },
                    { id: 'FOR_REVIEW', label: 'FOR CORRECTION', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                    { id: 'REJECT', label: 'REJECT', color: 'border-rose-500 bg-rose-50 text-rose-900' }
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setReviewAction(act.id as any)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        reviewAction === act.id ? act.color : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {reviewAction === 'REJECT' && (
                <div>
                  <label className="block font-bold text-rose-700 mb-1">
                    Rejection Reason (Audit Trail) *
                  </label>
                  <input
                    type="text"
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Cash shortfall without voucher receipt..."
                    className="w-full bg-rose-50 border border-rose-300 rounded-xl p-2.5 text-zinc-900"
                  />
                </div>
              )}

              {reviewAction === 'FOR_REVIEW' && (
                <div>
                  <label className="block font-bold text-amber-700 mb-1">
                    Correction Notes *
                  </label>
                  <input
                    type="text"
                    required
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    placeholder="e.g. Re-count ₱100 bills and re-upload bank deposit photo..."
                    className="w-full bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-zinc-900"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setReviewModalRemittance(null)}
                  className="px-4 py-2 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>
                    {reviewAction === 'VERIFY'
                      ? 'Verify & Receive Remittance'
                      : reviewAction === 'APPROVE'
                      ? 'Final Approve Remittance'
                      : 'Save Verification Decision'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SHIFT REMITTANCE TICKET */}
      <ShiftRemittanceTicketModal
        remittance={ticketModalRemittance}
        isOpen={!!ticketModalRemittance}
        onClose={() => setTicketModalRemittance(null)}
      />

      {/* MODAL 4: PROOF IMAGE ZOOM */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-4 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-sm text-zinc-900">Proof of Remittance</span>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewProofUrl}
              alt="Remittance Proof"
              className="max-h-[75vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const CashRemittanceTab: React.FC<CashRemittanceTabProps> = (props) => {
  return (
    <ErrorBoundary fallbackTitle="Cash Remittance & Sales Audit Hub">
      <CashRemittanceTabInner {...props} />
    </ErrorBoundary>
  );
};
