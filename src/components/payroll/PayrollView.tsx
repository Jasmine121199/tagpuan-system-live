import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Settings,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  FileText,
  Building2,
  User,
  Coffee,
  AlertCircle,
  Loader2,
  Printer,
  Edit3,
  Lock,
  Download,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  PayrollRecord,
  PayrollPeriod,
  PayrollRule,
  PayrollStatus,
  Branch
} from '../../types/index';

export const PayrollView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const { addNotification } = useNotifications();

  // Active subtab
  const [activeTab, setActiveTab] = useState<'records' | 'rules' | 'periods'>('records');

  // Data states
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rules, setRules] = useState<PayrollRule | null>(null);

  // Filters & selection
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Modals
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<PayrollRecord | null>(null);
  const [selectedRecordForAdjust, setSelectedRecordForAdjust] = useState<PayrollRecord | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [newPeriodData, setNewPeriodData] = useState({
    name: '',
    start_date: '',
    end_date: ''
  });

  // Rates form state
  const [rateForm, setRateForm] = useState<{
    deduct_break_hour: boolean;
    minimum_hours_for_break_deduction: number;
    rates: Record<number, number | null>;
  }>({
    deduct_break_hour: true,
    minimum_hours_for_break_deduction: 5,
    rates: {
      5: 200,
      6: 250,
      7: 300,
      8: 350,
      9: 400,
      10: 450,
      11: 500,
      12: 550
    }
  });

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('tagpuan_token');

      // Fetch periods
      const periodsRes = await fetch('/api/payroll/periods', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (periodsRes.ok) {
        const pData = await periodsRes.json();
        setPeriods(pData.periods || []);
        if (pData.periods?.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(pData.periods[0].id);
        }
      }

      // Fetch rules
      const rulesRes = await fetch('/api/payroll/rules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (rulesRes.ok) {
        const rData = await rulesRes.json();
        setRules(rData.rules);
        if (rData.rules) {
          setRateForm({
            deduct_break_hour: rData.rules.deduct_break_hour,
            minimum_hours_for_break_deduction: rData.rules.minimum_hours_for_break_deduction,
            rates: {
              ...rateForm.rates,
              ...rData.rules.rates
            }
          });
        }
      }

      // Fetch branches (for Owner)
      if (isOwner) {
        const branchesRes = await fetch('/api/branches', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (branchesRes.ok) {
          const bData = await branchesRes.json();
          setBranches(bData.branches || []);
        }
      } else if (isManager && user?.branch_id) {
        setSelectedBranchId(user.branch_id);
      }
    } catch (err) {
      console.error('Failed to load payroll foundation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch records whenever filters or periods change
  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();
      if (selectedPeriodId) params.append('period_id', selectedPeriodId);
      const effectiveBranchId = isManager ? (user?.branch_id || selectedBranchId) : selectedBranchId;
      if (effectiveBranchId) params.append('branch_id', effectiveBranchId);
      if (filterStatus) params.append('status', filterStatus);

      const res = await fetch(`/api/payroll/records?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch payroll records:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchRecords();
    }
  }, [selectedPeriodId, selectedBranchId, filterStatus]);

  // Generate Payroll for current period
  const handleGeneratePayroll = async () => {
    if (!selectedPeriodId) {
      alert('Please select a payroll period first.');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          period_id: selectedPeriodId,
          branch_id: isOwner ? selectedBranchId || null : user?.branch_id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate payroll');
      }

      addNotification('Payroll Generated', `Calculated ${data.count} employee payroll records.`, 'SUCCESS');
      fetchRecords();
    } catch (err: any) {
      alert(err.message || 'Error generating payroll');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update Status (Approve/Review)
  const handleUpdateStatus = async (recordId: string, status: PayrollStatus) => {
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch(`/api/payroll/records/${recordId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      addNotification('Payroll Status Updated', `Payroll marked as ${status}.`, 'SUCCESS');
      fetchRecords();
      if (selectedRecordForDetail?.id === recordId) {
        setSelectedRecordForDetail(data.record);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // Export Payslip as Clean Text / Receipt
  const handleExportPayslipText = (record: PayrollRecord) => {
    const grossStr = `₱${record.gross_payable_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const adjStr = record.adjustments !== 0 
      ? (record.adjustments > 0 ? `+₱${record.adjustments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-₱${Math.abs(record.adjustments).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      : '₱0.00';
    const netStr = `₱${record.final_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const breakHours = record.deducted_break_hours ?? (record.breakdown_items || []).reduce((acc, item) => acc + (item.deducted_break_hours || 0), 0);

    const text = `=====================================================
TAGPUAN FOOD HUB - OFFICIAL EMPLOYEE PAYSLIP
Republic of the Philippines
=====================================================
Branch:       ${record.branch_name}
Pay Period:   ${record.period_name || 'Current Period'}
Status:       ${record.status}
Generated:    ${new Date(record.created_at).toLocaleString()}
-----------------------------------------------------
EMPLOYEE DETAILS:
Name:         ${record.employee_name}
Role:         ${record.employee_role}
Employee ID:  ${record.employee_id}
Branch:       ${record.branch_name}
-----------------------------------------------------
HOURS & ATTENDANCE SUMMARY:
Total Shifts: ${record.total_shifts}
Gross Hours:  ${record.gross_hours} hrs
Break Deduct: -${breakHours} hrs (1-hour break deduction for shifts >= 5h)
Payable Hours:${record.payable_hours} hrs
-----------------------------------------------------
SHIFT BREAKDOWN:
${record.breakdown_items.map((it, idx) => `[Shift ${idx + 1}] ${it.date} | In: ${new Date(it.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Out: ${new Date(it.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Gross: ${it.gross_hours}h | Break: -${it.deducted_break_hours}h | Payable: ${it.payable_hours}h | Pay: ₱${it.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n')}
-----------------------------------------------------
COMPENSATION SUMMARY (PHP ₱):
Gross Shift Pay:          ${grossStr}
Allowances / Adjustments: ${adjStr} ${record.adjustment_note ? `(${record.adjustment_note})` : ''}
NET TAKE-HOME PAY:         ${netStr}
=====================================================
CERTIFICATION & SIGNATURES:

Prepared By:  ${record.prepared_by_name || 'Store Branch Manager'}
Title:        Branch Manager / Operations Supervisor
Signature:    ______________________________________

Approved By:  ${record.approved_by_name || (record.status === 'APPROVED' ? 'Tagpuan Food Hub Management' : 'Pending Owner Approval')}
Title:        Owner / Tagpuan Food Hub Management
Signature:    ______________________________________
=====================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payslip_${record.employee_name.replace(/\s+/g, '_')}_${record.period_name?.replace(/\s+/g, '_') || 'Current'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForAdjust) return;

    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch(`/api/payroll/records/${selectedRecordForAdjust.id}/adjust`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adjustments: Number(adjustmentAmount),
          note: adjustmentNote
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply adjustment');
      }

      addNotification('Payroll Adjusted', `Adjustment of ₱${adjustmentAmount} applied with audit note.`, 'SUCCESS');
      setSelectedRecordForAdjust(null);
      fetchRecords();
    } catch (err: any) {
      alert(err.message || 'Error adjusting record');
    }
  };

  // Save Payroll Rules (Owner only)
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/payroll/rules', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deduct_break_hour: rateForm.deduct_break_hour,
          minimum_hours_for_break_deduction: Number(rateForm.minimum_hours_for_break_deduction),
          rates: rateForm.rates
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update payroll rules');
      }

      setRules(data.rules);
      addNotification('Payroll Rules Saved', 'Rate structure and break deductions updated.', 'SUCCESS');
    } catch (err: any) {
      alert(err.message || 'Error saving rules');
    } finally {
      setIsSavingRules(false);
    }
  };

  // Create Payroll Period (Owner only)
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/payroll/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPeriodData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create period');
      }

      addNotification('Payroll Period Created', `${newPeriodData.name} ready for calculations.`, 'SUCCESS');
      setIsPeriodModalOpen(false);
      setNewPeriodData({ name: '', start_date: '', end_date: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating period');
    }
  };

  // Total summary calculations
  const totalGrossHours = records.reduce((sum, r) => sum + r.gross_hours, 0);
  const totalPayableHours = records.reduce((sum, r) => sum + r.payable_hours, 0);
  const totalPayout = records.reduce((sum, r) => sum + r.final_amount, 0);

  const getStatusBadge = (status: PayrollStatus) => {
    switch (status) {
      case 'FOR_REVIEW':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'PAID':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider rounded-full bg-[#CDEBC5] text-[#111111]">
              Phase 2 • Payroll Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight mt-1">
            Payroll & Shift Rates
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">
            Authoritative attendance-linked shift calculation, 1-hour break rules, configurable hour rates, and review workflow.
          </p>
        </div>

        {/* Subtabs navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'records'
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Payroll Sheets
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'rules'
                    ? 'bg-white text-[#111111] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Rate Rules (5-12h)
              </button>
              <button
                onClick={() => setActiveTab('periods')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'periods'
                    ? 'bg-white text-[#111111] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Pay Periods
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: PAYROLL RECORDS & REVIEW                      */}
      {/* ==================================================== */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Period Selector */}
              <div className="min-w-[200px]">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 font-mono">
                  Payroll Period
                </label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-bold focus:outline-none focus:ring-2 focus:ring-[#111111]"
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.start_date} to {p.end_date})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Selector (Owner only) */}
              {isOwner && (
                <div className="min-w-[180px]">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 font-mono">
                    Branch Filter
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Branch Scope Locked (Manager only) */}
              {isManager && (
                <div className="min-w-[180px]">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 font-mono">
                    Assigned Branch (Locked)
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-[#111111] font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span className="truncate">{user?.branch_name || 'Assigned Store Branch'}</span>
                  </div>
                </div>
              )}

              {/* Status Filter */}
              <div className="min-w-[140px]">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 font-mono">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111]"
                >
                  <option value="">All Statuses</option>
                  <option value="FOR_REVIEW">For Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            {/* Generate Button (Owner or Manager) */}
            {(isOwner || isManager) && (
              <div className="self-end">
                <button
                  onClick={handleGeneratePayroll}
                  disabled={isGenerating || !selectedPeriodId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Calculate / Generate Sheet</span>
                </button>
              </div>
            )}
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Employees</span>
                <User className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-extrabold text-[#111111] font-mono">
                {records.length}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">Calculated in active period</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Gross Hours</span>
                <Clock className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-extrabold text-[#111111] font-mono">
                {totalGrossHours.toFixed(1)} hrs
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">Total recorded shift duration</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Payable Hours</span>
                <Coffee className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-2xl font-extrabold text-[#166534] font-mono">
                {totalPayableHours.toFixed(1)} hrs
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">After 1h break deductions (≥5h)</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111111] border border-[#222222] shadow-sm text-white">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-[#CDEBC5]">Total Payout</span>
                <DollarSign className="w-4 h-4 text-[#CDEBC5]" />
              </div>
              <p className="text-2xl font-extrabold text-[#CDEBC5] font-mono">
                ₱{totalPayout.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">Net compensation total</p>
            </div>
          </div>

          {/* Records Table */}
          <div className="rounded-2xl bg-white border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-bold text-[#111111]">Employee Payroll Breakdown</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#f1f5f9] text-zinc-600 text-[11px] font-mono font-bold">
                  {records.length} records
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#111111]" />
                <p className="text-xs font-mono">Loading calculated payroll sheets...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-sm font-bold text-zinc-700">No payroll records for this period</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Click "Calculate / Generate Sheet" above to compute shift wages from attendance logs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-zinc-500 font-mono text-[10px] uppercase tracking-wider border-b border-[#e5e7eb]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Employee</th>
                      <th className="px-4 py-3 font-bold">Branch</th>
                      <th className="px-4 py-3 font-bold">Shifts</th>
                      <th className="px-4 py-3 font-bold">Gross Hrs</th>
                      <th className="px-4 py-3 font-bold">Payable Hrs</th>
                      <th className="px-4 py-3 font-bold">Gross Amount</th>
                      <th className="px-4 py-3 font-bold">Adjustment</th>
                      <th className="px-4 py-3 font-bold">Net Payout</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#f8fafc] transition">
                        {/* Employee */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[#111111]">{rec.employee_name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">{rec.employee_role}</div>
                        </td>

                        {/* Branch */}
                        <td className="px-4 py-3.5 text-zinc-700 font-medium">
                          {rec.branch_name}
                        </td>

                        {/* Total Shifts */}
                        <td className="px-4 py-3.5 font-mono font-bold text-[#111111]">
                          {rec.total_shifts} shifts
                        </td>

                        {/* Gross Hours */}
                        <td className="px-4 py-3.5 font-mono text-zinc-600">
                          {rec.gross_hours}h
                        </td>

                        {/* Payable Hours */}
                        <td className="px-4 py-3.5 font-mono font-bold text-[#166534]">
                          {rec.payable_hours}h
                        </td>

                        {/* Gross Amount */}
                        <td className="px-4 py-3.5 font-mono text-zinc-700">
                          ₱{rec.gross_payable_amount.toLocaleString()}
                        </td>

                        {/* Adjustments */}
                        <td className="px-4 py-3.5 font-mono">
                          {rec.adjustments !== 0 ? (
                            <span className={`font-bold ${rec.adjustments > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {rec.adjustments > 0 ? `+₱${rec.adjustments}` : `-₱${Math.abs(rec.adjustments)}`}
                            </span>
                          ) : (
                            <span className="text-zinc-400">₱0</span>
                          )}
                        </td>

                        {/* Net Amount */}
                        <td className="px-4 py-3.5 font-mono font-extrabold text-[#111111] text-sm">
                          ₱{rec.final_amount.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(rec.status)}`}>
                            {rec.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                          {/* View Detail Breakdown */}
                          <button
                            onClick={() => setSelectedRecordForDetail(rec)}
                            title="View Shift Breakdown"
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Adjust Record */}
                          {(isOwner || isManager) && (
                            <button
                              onClick={() => {
                                setSelectedRecordForAdjust(rec);
                                setAdjustmentAmount(rec.adjustments);
                                setAdjustmentNote(rec.adjustment_note || '');
                              }}
                              title="Adjust Bonus/Deduction"
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Approve Record (Owner Only) */}
                          {isOwner && rec.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateStatus(rec.id, 'APPROVED')}
                              title="Approve Payroll"
                              className="px-2.5 py-1 rounded-lg bg-[#CDEBC5] hover:bg-[#bce4b2] text-[#111111] font-bold text-[10px] transition"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: RATE RULES CONFIGURATION (Owner only)         */}
      {/* ==================================================== */}
      {activeTab === 'rules' && isOwner && (
        <div className="space-y-6">
          <form onSubmit={handleSaveRules} className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#111111]">
                Shift Rate Structure & Break Deduction Rules
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Configure hourly rates for shifts (5 to 12 hours) and break deductions. All shift calculations strictly use these server-authoritative rules.
              </p>
            </div>

            {/* 1-Hour Break Deduction Rule */}
            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-zinc-700" />
                    Automatic 1-Hour Break Deduction
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Deduct 1 unpaid hour for meal/rest break when shift duration meets or exceeds minimum hours.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rateForm.deduct_break_hour}
                    onChange={(e) => setRateForm({ ...rateForm, deduct_break_hour: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#111111]"></div>
                </label>
              </div>

              {rateForm.deduct_break_hour && (
                <div className="flex items-center gap-3 pt-2 border-t border-[#e2e8f0]">
                  <span className="text-xs text-zinc-700 font-semibold">
                    Minimum shift hours to trigger break deduction:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={rateForm.minimum_hours_for_break_deduction}
                    onChange={(e) => setRateForm({ ...rateForm, minimum_hours_for_break_deduction: Number(e.target.value) })}
                    className="w-20 px-3 py-1.5 rounded-lg bg-white border border-[#cbd5e1] text-xs font-mono font-bold text-[#111111]"
                  />
                  <span className="text-xs text-zinc-500">hours (Default: 5 hours)</span>
                </div>
              )}
            </div>

            {/* Shift Hours Rate Matrix (5 - 12 hours) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono">
                  Shift Rate Matrix (Pay per Shift by Duration)
                </h4>
                <span className="text-[11px] text-zinc-500 font-mono">Philippine Peso (PHP ₱)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[5, 6, 7, 8, 9, 10, 11, 12].map((hours) => (
                  <div key={hours} className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#111111]">{hours} Hours Shift</span>
                      {hours <= 7 && (
                        <span className="text-[9px] font-bold text-[#166534] bg-[#dcfce7] px-1.5 py-0.5 rounded">
                          Standard
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        placeholder="Configurable rate"
                        value={rateForm.rates[hours] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          setRateForm({
                            ...rateForm,
                            rates: { ...rateForm.rates, [hours]: val }
                          });
                        }}
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white border border-[#cbd5e1] text-xs font-mono font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
              <button
                type="submit"
                disabled={isSavingRules}
                className="px-6 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSavingRules ? 'Saving Rates...' : 'Save Rate Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: PAYROLL PERIODS (Owner only)                  */}
      {/* ==================================================== */}
      {activeTab === 'periods' && isOwner && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Configured Pay Periods</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Manage semi-monthly or monthly cut-off date intervals.</p>
            </div>

            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Pay Period</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {periods.map((p) => (
              <div key={p.id} className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-[#111111]">{p.name}</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#CDEBC5] text-[#111111]">
                    Active
                  </span>
                </div>

                <div className="text-xs text-zinc-600 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Start Date:</span>
                    <span className="font-semibold text-[#111111]">{p.start_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">End Date:</span>
                    <span className="font-semibold text-[#111111]">{p.end_date}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedPeriodId(p.id);
                    setActiveTab('records');
                  }}
                  className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800 transition text-center"
                >
                  View Payroll Sheet
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: SHIFT BREAKDOWN / OFFICIAL PAYSLIP           */}
      {/* ==================================================== */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="printable-payslip bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header / Payslip Header */}
            <div className="p-6 border-b border-[#e5e7eb] bg-[#fafafa]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold font-mono uppercase bg-[#111111] text-[#CDEBC5] rounded">
                      TAGPUAN FOOD HUB
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider">
                      OFFICIAL EMPLOYEE PAYSLIP
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusBadge(selectedRecordForDetail.status)}`}>
                      {selectedRecordForDetail.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-[#111111]">
                    {selectedRecordForDetail.employee_name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span><strong>Branch:</strong> {selectedRecordForDetail.branch_name}</span>
                    <span>•</span>
                    <span><strong>Pay Period:</strong> {selectedRecordForDetail.period_name || 'Active Cycle'}</span>
                    <span>•</span>
                    <span><strong>Position:</strong> {selectedRecordForDetail.employee_role}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecordForDetail(null)}
                  className="no-print p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content / Breakdown & Earnings */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Shift Attendance Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold text-[#111111] uppercase tracking-wider font-mono">
                    Shift Attendance & Hours ({selectedRecordForDetail.breakdown_items?.length || 0} shifts)
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    Gross: <strong>{selectedRecordForDetail.gross_hours}h</strong> | Break Deduct: <strong>-{(selectedRecordForDetail.deducted_break_hours ?? (selectedRecordForDetail.breakdown_items || []).reduce((acc, item) => acc + (item.deducted_break_hours || 0), 0))}h</strong> | Payable: <strong className="text-emerald-700">{selectedRecordForDetail.payable_hours}h</strong>
                  </span>
                </div>
                <div className="border border-[#e5e7eb] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8fafc] text-zinc-500 font-mono text-[10px] uppercase border-b border-[#e5e7eb]">
                      <tr>
                        <th className="p-2.5 font-bold">Date</th>
                        <th className="p-2.5 font-bold">Clock In</th>
                        <th className="p-2.5 font-bold">Clock Out</th>
                        <th className="p-2.5 font-bold text-center">Gross</th>
                        <th className="p-2.5 font-bold text-center">Break (-1h)</th>
                        <th className="p-2.5 font-bold text-center">Payable</th>
                        <th className="p-2.5 font-bold text-right">Shift Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {selectedRecordForDetail.breakdown_items && selectedRecordForDetail.breakdown_items.length > 0 ? (
                        selectedRecordForDetail.breakdown_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#f8fafc]">
                            <td className="p-2.5 font-medium text-zinc-900">{item.date}</td>
                            <td className="p-2.5 font-mono text-zinc-600">
                              {new Date(item.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 font-mono text-zinc-600">
                              {new Date(item.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 font-mono text-center">{item.gross_hours}h</td>
                            <td className="p-2.5 font-mono text-center text-zinc-500">
                              {item.deducted_break_hours > 0 ? `-${item.deducted_break_hours}h` : '0h'}
                            </td>
                            <td className="p-2.5 font-mono text-center font-bold text-emerald-700">
                              {item.payable_hours}h
                            </td>
                            <td className="p-2.5 font-mono font-bold text-right text-[#111111]">
                              ₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-zinc-500 italic">
                            No shift logs recorded for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Adjustments section */}
              {selectedRecordForDetail.adjustments !== 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#111111]">Allowances / Deductions / Adjustments:</span>
                    {selectedRecordForDetail.adjustment_note && (
                      <p className="text-zinc-500 text-[11px] mt-0.5">{selectedRecordForDetail.adjustment_note}</p>
                    )}
                  </div>
                  <span className={`font-mono font-bold text-sm ${selectedRecordForDetail.adjustments > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedRecordForDetail.adjustments > 0
                      ? `+₱${selectedRecordForDetail.adjustments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `-₱${Math.abs(selectedRecordForDetail.adjustments).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              )}

              {/* Compensation Summary in Philippine Peso */}
              <div className="p-4 rounded-xl bg-[#111111] text-white space-y-2">
                <div className="flex justify-between text-zinc-300">
                  <span>Gross Basic Shift Earnings:</span>
                  <span className="font-mono font-bold">
                    ₱{selectedRecordForDetail.gross_payable_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Incentives & Adjustments:</span>
                  <span className="font-mono font-bold">
                    {selectedRecordForDetail.adjustments >= 0
                      ? `+₱${selectedRecordForDetail.adjustments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `-₱${Math.abs(selectedRecordForDetail.adjustments).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline text-[#CDEBC5]">
                  <span className="font-extrabold text-sm uppercase tracking-wide">Net Take-Home Pay (PHP):</span>
                  <span className="font-mono text-xl font-black">
                    ₱{selectedRecordForDetail.final_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Official Signatures Section */}
              <div className="pt-2 border-t border-dashed border-zinc-300">
                <div className="grid grid-cols-2 gap-4">
                  {/* Prepared By Signature Line */}
                  <div className="border border-zinc-200 rounded-xl p-3.5 bg-zinc-50 flex flex-col justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-3">
                      Prepared By:
                    </p>
                    <div className="h-10 flex items-end justify-center border-b border-zinc-400 pb-1 mb-1.5">
                      <span className="font-serif italic text-zinc-800 text-xs">
                        {selectedRecordForDetail.prepared_by_name || 'Store Branch Manager'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-900 text-center">
                      {selectedRecordForDetail.prepared_by_name || 'Store Branch Manager'}
                    </p>
                    <p className="text-[10px] text-zinc-500 text-center">Branch Manager / Operations Supervisor</p>
                    <p className="text-[9px] text-zinc-400 text-center font-mono mt-0.5">
                      Issued: {new Date(selectedRecordForDetail.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Approved By Signature Line */}
                  <div className="border border-zinc-200 rounded-xl p-3.5 bg-zinc-50 flex flex-col justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-3">
                      Approved By:
                    </p>
                    <div className="h-10 flex items-end justify-center border-b border-zinc-400 pb-1 mb-1.5">
                      <span className="font-serif italic text-zinc-800 text-xs">
                        {selectedRecordForDetail.approved_by_name || (selectedRecordForDetail.status === 'APPROVED' ? 'Tagpuan Management' : 'Pending Owner Approval')}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-900 text-center">
                      {selectedRecordForDetail.approved_by_name || (selectedRecordForDetail.status === 'APPROVED' ? 'Tagpuan Food Hub Management' : 'Tagpuan Owner / Management')}
                    </p>
                    <p className="text-[10px] text-zinc-500 text-center">Owner / Executive Approver</p>
                    <p className="text-[9px] text-zinc-400 text-center font-mono mt-0.5">
                      {selectedRecordForDetail.approved_at
                        ? `Approved: ${new Date(selectedRecordForDetail.approved_at).toLocaleDateString()}`
                        : (selectedRecordForDetail.status === 'APPROVED' ? 'Approved & Authorized' : 'Pending Authorization')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="no-print p-4 border-t border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-800 text-xs font-bold hover:bg-zinc-50 shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Print Payslip</span>
                </button>

                <button
                  onClick={() => handleExportPayslipText(selectedRecordForDetail)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-800 text-xs font-bold hover:bg-zinc-50 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Download Text Slip</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-5 py-2 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADJUST PAYROLL                                */}
      {/* ==================================================== */}
      {selectedRecordForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#111111]" />
                <h3 className="text-base font-bold text-[#111111]">Adjust Payroll Amount</h3>
              </div>
              <button
                onClick={() => setSelectedRecordForAdjust(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-zinc-600">
                  Adjusting pay for <strong className="text-[#111111]">{selectedRecordForAdjust.employee_name}</strong>
                </p>
                <p className="text-[11px] text-zinc-500">
                  Gross calculation: ₱{selectedRecordForAdjust.gross_payable_amount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Adjustment Amount (₱) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500 for bonus or -200 for deduction"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-mono font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Positive for bonuses/allowances, negative for deductions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Audit Reason / Note *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Performance bonus or Cash advance deduction"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs flex justify-between">
                <span className="text-zinc-600 font-medium">New Final Amount:</span>
                <span className="font-mono font-extrabold text-[#111111]">
                  ₱{Math.max(0, selectedRecordForAdjust.gross_payable_amount + Number(adjustmentAmount)).toLocaleString()}
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForAdjust(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] text-xs font-bold shadow-sm transition"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE PAYROLL PERIOD                         */}
      {/* ==================================================== */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#111111]" />
                <h3 className="text-base font-bold text-[#111111]">Create Pay Period</h3>
              </div>
              <button
                onClick={() => setIsPeriodModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Period Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. September 1-15, 2026"
                  value={newPeriodData.name}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newPeriodData.start_date}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newPeriodData.end_date}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] text-xs font-bold shadow-sm transition"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
