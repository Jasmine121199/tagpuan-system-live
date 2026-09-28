import React, { useRef } from 'react';
import { CashRemittance } from '../../types';
import { DENOMINATION_VALUES } from './DenominationCalculator';
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Banknote,
  Receipt,
  Sparkles
} from 'lucide-react';

interface ShiftRemittanceTicketModalProps {
  remittance: CashRemittance | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftRemittanceTicketModal: React.FC<ShiftRemittanceTicketModalProps> = ({
  remittance,
  isOpen,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !remittance) return null;

  const handlePrint = () => {
    window.print();
  };

  const denoms = remittance.denomination_breakdown || {
    d1000: 0,
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    d5: 0,
    d1: 0
  };

  const hasDenomData = Object.values(denoms).some(v => (v || 0) > 0);
  const netRemittedToVault = (remittance.manager_verified_amount ?? remittance.remitted_amount) - (remittance.manager_deductions_amount ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-remittance-ticket, #printable-remittance-ticket * {
              visibility: visible !important;
            }
            #printable-remittance-ticket {
              position: fixed !important;
              left: 50% !important;
              top: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 100% !important;
              max-width: 480px !important;
              box-shadow: none !important;
              border: 1px solid #111111 !important;
              padding: 24px !important;
              background: white !important;
            }
          }
        `}
      </style>

      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col my-8 max-h-[92vh]">
        {/* Modal Bar */}
        <div className="bg-[#111111] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#CDEBC5] text-[#111111] uppercase">
                  Shift Remittance Ticket
                </span>
                <span className="text-xs text-zinc-400 font-mono">{remittance.remittance_number}</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Cash Remittance & Shift Audit Slip
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-[#CDEBC5] rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Ticket
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-6 overflow-y-auto bg-zinc-50 flex items-center justify-center">
          <div
            id="printable-remittance-ticket"
            ref={printRef}
            className="bg-white border border-zinc-300 rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-sm font-sans text-zinc-900"
          >
            {/* Header */}
            <div className="text-center pb-4 border-b border-dashed border-zinc-300">
              <h1 className="text-xl font-black uppercase tracking-tight text-[#111111] font-mono">
                TAGPUAN FOOD HUB
              </h1>
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Official Shift Remittance & Cash Count Ticket
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black bg-zinc-900 text-[#CDEBC5]">
                {remittance.remittance_number}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="py-3 border-b border-dashed border-zinc-300 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Branch:</span>
                <span className="font-bold text-zinc-900">{remittance.branch_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cashier:</span>
                <span className="font-bold text-zinc-900">{remittance.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Date & Shift:</span>
                <span className="font-bold text-zinc-900">{remittance.date} • {remittance.shift_id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Submitted At:</span>
                <span className="text-zinc-800">
                  {remittance.submitted_at ? new Date(remittance.submitted_at).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    remittance.status === 'APPROVED' || remittance.status === 'RECONCILED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : remittance.status === 'VERIFIED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {remittance.status === 'VERIFIED' ? 'VERIFIED & RECEIVED' : remittance.status}
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-3 border-b border-dashed border-zinc-300 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600 font-medium">POS Gross Sales:</span>
                <span className="font-mono font-bold text-zinc-900">
                  ₱{(remittance.gross_sales || remittance.expected_cash).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 font-medium">Expected Drawer Cash:</span>
                <span className="font-mono font-bold text-zinc-900">
                  ₱{remittance.expected_cash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center bg-zinc-50 p-2 rounded-xl border border-zinc-200">
                <span className="text-zinc-900 font-bold">Physical Cash Remitted:</span>
                <span className="font-mono text-base font-black text-emerald-700">
                  ₱{remittance.remitted_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 font-medium">Cash Variance:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono font-bold ${
                      Math.abs(remittance.remittance_variance) < 0.01
                        ? 'text-emerald-600'
                        : remittance.remittance_variance < 0
                        ? 'text-rose-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {remittance.remittance_variance >= 0 ? '+' : ''}
                    ₱{remittance.remittance_variance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      remittance.variance_flag === 'TALLY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : remittance.variance_flag === 'SHORTAGE'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {remittance.variance_flag || 'TALLY'}
                  </span>
                </div>
              </div>

              {/* Manager Deductions / Verified info */}
              {(remittance.manager_deductions_amount || 0) > 0 && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <div className="flex justify-between text-amber-900 font-bold">
                    <span>Manager Petty Expense Deduction:</span>
                    <span className="font-mono">-₱{remittance.manager_deductions_amount?.toFixed(2)}</span>
                  </div>
                  {remittance.manager_deductions_notes && (
                    <p className="text-[11px] text-amber-800 italic">
                      Note: {remittance.manager_deductions_notes}
                    </p>
                  )}
                  <div className="flex justify-between text-emerald-950 font-black pt-1 border-t border-amber-200">
                    <span>Net Safe Remittance:</span>
                    <span className="font-mono">₱{netRemittedToVault.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Denomination Breakdown */}
            {hasDenomData && (
              <div className="py-3 border-b border-dashed border-zinc-300">
                <p className="text-[11px] uppercase font-bold text-zinc-500 mb-2 font-mono">
                  Denomination Breakdown Count
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                  {DENOMINATION_VALUES.map(denom => {
                    const count = denoms[denom.key] || 0;
                    if (count === 0) return null;
                    const subtotal = count * denom.value;
                    return (
                      <div key={denom.key} className="bg-zinc-50 p-1.5 rounded border border-zinc-200">
                        <span className="text-zinc-500 text-[10px] block">{denom.label}</span>
                        <div className="flex justify-between font-bold text-zinc-900">
                          <span>{count} pcs</span>
                          <span>₱{subtotal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Reconciliation Notes */}
            {remittance.ai_reconciliation_notes && (
              <div className="my-3 p-3 bg-zinc-100 rounded-xl text-xs text-zinc-700 space-y-1">
                <div className="flex items-center gap-1 font-bold text-zinc-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  System Reconciliation Audit:
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-600">
                  {remittance.ai_reconciliation_notes}
                </p>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-4 grid grid-cols-2 gap-4 text-center text-xs text-zinc-500">
              <div className="pt-8 border-t border-zinc-300">
                <p className="font-bold text-zinc-800">{remittance.cashier_name}</p>
                <p className="text-[10px]">Cashier Shift Sign-Off</p>
              </div>

              <div className="pt-8 border-t border-zinc-300">
                <p className="font-bold text-zinc-800">
                  {remittance.manager_name || remittance.reviewed_by_name || 'Branch Manager'}
                </p>
                <p className="text-[10px]">
                  {remittance.status === 'VERIFIED' || remittance.status === 'APPROVED'
                    ? 'Verified & Received'
                    : 'Manager Verification'}
                </p>
              </div>
            </div>

            <div className="mt-4 text-center text-[9px] font-mono text-zinc-400">
              Generated by Tagpuan Cloud ERP • Immutable Audit Trail
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#111111] text-white hover:bg-black rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
