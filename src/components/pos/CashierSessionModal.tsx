import React, { useState } from 'react';
import { CashierSession } from '../../types';
import { X, Lock, Unlock, DollarSign, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface CashierSessionModalProps {
  session: CashierSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSessionChange: () => void;
  branchId: string;
  branchName: string;
}

export const CashierSessionModal: React.FC<CashierSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onSessionChange,
  branchId,
  branchName
}) => {
  const [openingCash, setOpeningCash] = useState<string>('1000');
  const [closingCash, setClosingCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOpenSession = session && session.status === 'OPEN';

  const handleOpenSession = async () => {
    setError(null);
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('tagpuan_token');

      const response = await fetch('/api/pos/session/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: branchId,
          opening_cash: parseFloat(openingCash) || 0,
          notes: notes.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open cashier shift session.');
      }

      onSessionChange();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error opening session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    setError(null);
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('tagpuan_token');

      const response = await fetch('/api/pos/session/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: session.id,
          closing_cash: parseFloat(closingCash) || 0,
          notes: notes.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to close cashier shift session.');
      }

      onSessionChange();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error closing session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isOpenSession ? 'bg-emerald-500 text-white' : 'bg-[#CDEBC5] text-[#111111]'
            }`}>
              {isOpenSession ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {isOpenSession ? 'Active Cashier Session' : 'Start Cashier Shift'}
              </h3>
              <p className="text-xs text-zinc-400">{branchName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isOpenSession ? (
            /* Open Session Status & Close Form */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Cashier:</span>
                  <span className="font-bold text-zinc-900">{session.cashier_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Shift Started:</span>
                  <span className="font-mono text-zinc-800">
                    {new Date(session.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Opening Fund:</span>
                  <span className="font-mono font-bold text-zinc-900">₱{session.opening_cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-zinc-200 pt-2">
                  <span className="text-zinc-500">Orders Completed:</span>
                  <span className="font-mono font-bold text-zinc-900">{session.total_orders}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Total Shift Sales:</span>
                  <span className="font-mono font-black text-emerald-700">₱{session.total_sales.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Counted Cash in Drawer (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="e.g. 5450.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#111111] text-sm font-mono font-bold bg-white text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Shift Notes / Handover</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional shift notes..."
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#111111] text-xs bg-white text-zinc-900"
                />
              </div>
            </div>
          ) : (
            /* Open New Session Form */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Starting Cash Float / Change Fund (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="1000.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#111111] text-sm font-mono font-bold bg-white text-zinc-900"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Initial change in register at the start of your shift.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Opening Shift Note</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Morning shift opening..."
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#111111] text-xs bg-white text-zinc-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition"
          >
            Cancel
          </button>
          {isOpenSession ? (
            <button
              type="button"
              onClick={handleCloseSession}
              disabled={isSubmitting || !closingCash}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Close Shift & Reconcile</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenSession}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              <span>Open Cashier Shift</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
