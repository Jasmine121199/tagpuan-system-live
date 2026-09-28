import React, { useState, useEffect } from 'react';
import { BranchExpense, Branch, ExpenseCategory, ExpensePaymentMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Loader2,
  X,
  Building2,
  CreditCard,
  Banknote,
  Tag
} from 'lucide-react';

interface BranchExpensesTabProps {
  branches: Branch[];
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'STORE_SUPPLIES',
  'EMERGENCY_INGREDIENTS',
  'UTILITIES_BILLS',
  'EQUIPMENT_MAINTENANCE',
  'STAFF_MEAL',
  'DELIVERY_FUEL',
  'CASH_DRAWER_OUTFLOW',
  'MISCELLANEOUS'
];

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] = [
  'CASH_DRAWER',
  'PETTY_CASH',
  'GCASH_MAYA',
  'BANK_TRANSFER'
];

export const formatCategoryName = (cat: ExpenseCategory) => {
  return cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

export const BranchExpensesTab: React.FC<BranchExpensesTabProps> = ({ branches }) => {
  const { user, isOwner, isManager } = useAuth();
  const [expenses, setExpenses] = useState<BranchExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reviewExpense, setReviewExpense] = useState<BranchExpense | null>(null);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Add Form State
  const [targetBranchId, setTargetBranchId] = useState<string>(user?.branch_id || (branches[0]?.id || ''));
  const [category, setCategory] = useState<ExpenseCategory>('STORE_SUPPLIES');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('CASH_DRAWER');
  const [paidTo, setPaidTo] = useState<string>('');
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review State
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();

      if (selectedBranchId) params.set('branch_id', selectedBranchId);
      if (categoryFilter) params.set('category', categoryFilter);
      if (paymentMethodFilter) params.set('payment_method', paymentMethodFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/financial/expenses?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch branch expenses.');
      }

      setExpenses(data.expenses);
    } catch (err: any) {
      setError(err.message || 'Error fetching expenses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedBranchId, categoryFilter, paymentMethodFilter, statusFilter]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch('/api/financial/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: targetBranchId,
          category,
          description: description.trim(),
          amount: parseFloat(amount) || 0,
          date,
          payment_method: paymentMethod,
          paid_to: paidTo.trim() || undefined,
          receipt_image_url: receiptImageUrl.trim() || undefined,
          notes: notes.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record expense.');
      }

      setIsAddModalOpen(false);
      setDescription('');
      setAmount('');
      setPaidTo('');
      setReceiptImageUrl('');
      setNotes('');
      fetchExpenses();
    } catch (err: any) {
      setError(err.message || 'Error creating expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewExpense) return;

    setIsSubmittingReview(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch(`/api/financial/expenses/${reviewExpense.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: reviewAction,
          rejection_reason: reviewAction === 'REJECTED' ? rejectionReason : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to review expense.');
      }

      setReviewExpense(null);
      setRejectionReason('');
      fetchExpenses();
    } catch (err: any) {
      setError(err.message || 'Error reviewing expense.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        exp.expense_number.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q) ||
        (exp.paid_to && exp.paid_to.toLowerCase().includes(q)) ||
        exp.branch_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalExpenseAmount = filteredExpenses
    .filter(e => e.status !== 'REJECTED')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-700" />
              Branch Operational Expenses
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              Total: ₱{totalExpenseAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-black hover:bg-black transition shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#CDEBC5]" /> Record Branch Expense
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-zinc-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, payee, #"
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategoryName(cat)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
            >
              <option value="">All Payment Modes</option>
              <option value="CASH_DRAWER">Cash Drawer Outflow</option>
              <option value="PETTY_CASH">Branch Petty Cash Fund</option>
              <option value="GCASH_MAYA">GCash / Maya e-Wallet</option>
              <option value="BANK_TRANSFER">Bank Direct Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Expenses List */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-mono border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Expense #</th>
                <th className="py-3 px-4">Branch & Date</th>
                <th className="py-3 px-4">Category & Payee</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      {exp.expense_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-zinc-900">{exp.branch_name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{exp.date}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-zinc-800">
                        <Tag className="w-3 h-3 text-zinc-500" />
                        {formatCategoryName(exp.category)}
                      </span>
                      {exp.paid_to && (
                        <p className="text-[11px] text-zinc-500">Paid to: {exp.paid_to}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-zinc-700">
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-600">
                      {exp.payment_method.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-900">
                      ₱{exp.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        exp.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exp.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {exp.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {exp.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {exp.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {exp.receipt_image_url && (
                          <button
                            onClick={() => setPreviewReceiptUrl(exp.receipt_image_url!)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            title="View Official Receipt Slip"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOwner && exp.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setReviewExpense(exp);
                              setReviewAction('APPROVED');
                              setRejectionReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-black transition"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Record Branch Expense</h3>
                  <p className="text-xs text-zinc-400">Log store disbursement with receipt proof</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {isOwner && (
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Branch *</label>
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900 font-bold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {formatCategoryName(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Amount (₱) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₱</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full font-mono font-bold bg-zinc-50 border border-zinc-300 rounded-xl pl-8 pr-3 py-2 text-zinc-900 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                  >
                    <option value="CASH_DRAWER">Cash Drawer Outflow</option>
                    <option value="PETTY_CASH">Branch Petty Cash Fund</option>
                    <option value="GCASH_MAYA">GCash / Maya e-Wallet</option>
                    <option value="BANK_TRANSFER">Bank Direct Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Description / Item Details *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 5 Rolls Thermal Paper & Cleaning Detergent from MiniStop"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Paid To / Payee Vendor</label>
                <input
                  type="text"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  placeholder="e.g. Puregold Supermarket / Meralco / Shell Gas"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Receipt / Invoice Image URL</label>
                <input
                  type="url"
                  value={receiptImageUrl}
                  onChange={(e) => setReceiptImageUrl(e.target.value)}
                  placeholder="https://... (Receipt snapshot)"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#111111] text-white font-black hover:bg-black transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OWNER REVIEW EXPENSE */}
      {reviewExpense && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-white">Review Expense Approval</h3>
                <p className="text-xs text-zinc-400">{reviewExpense.expense_number} • {reviewExpense.branch_name}</p>
              </div>
              <button
                onClick={() => setReviewExpense(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewExpense} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Amount:</span>
                  <span className="font-mono font-black text-zinc-900">₱{reviewExpense.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Category:</span>
                  <span className="font-bold text-zinc-800">{formatCategoryName(reviewExpense.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Description:</span>
                  <span className="text-zinc-800 text-right">{reviewExpense.description}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction('APPROVED')}
                  className={`py-2 px-3 rounded-xl border-2 font-bold transition ${
                    reviewAction === 'APPROVED' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-zinc-200'
                  }`}
                >
                  APPROVE
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('REJECTED')}
                  className={`py-2 px-3 rounded-xl border-2 font-bold transition ${
                    reviewAction === 'REJECTED' ? 'border-red-500 bg-red-50 text-red-900' : 'border-zinc-200'
                  }`}
                >
                  REJECT
                </button>
              </div>

              {reviewAction === 'REJECTED' && (
                <div>
                  <label className="block font-bold text-red-700 mb-1">Rejection Reason *</label>
                  <input
                    type="text"
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Unapproved personal expense..."
                    className="w-full bg-red-50 border border-red-300 rounded-xl p-2.5 text-zinc-900"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setReviewExpense(null)}
                  className="px-4 py-2 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2.5 rounded-xl bg-[#111111] text-white font-black hover:bg-black transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-4 max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-sm text-zinc-900">Official Receipt Preview</span>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewReceiptUrl}
              alt="Receipt"
              className="max-h-[75vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
