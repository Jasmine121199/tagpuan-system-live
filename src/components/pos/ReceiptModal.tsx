import React, { useRef } from 'react';
import { ReceiptData } from '../../types';
import { Printer, CheckCircle, X, PlusCircle, Share2 } from 'lucide-react';

interface ReceiptModalProps {
  receipt: ReceiptData;
  isOpen: boolean;
  onClose: () => void;
  onNewOrder: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onNewOrder
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Success Header banner */}
        <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#CDEBC5] text-[#111111] flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Payment Confirmed</h3>
              <p className="text-[11px] text-[#CDEBC5] font-mono">Order #{receipt.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/70">
          <div
            ref={receiptRef}
            id="thermal-receipt"
            className="bg-white p-6 rounded-xl border border-zinc-300 shadow-xs font-mono text-zinc-800 text-xs space-y-4"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-zinc-300 pb-3">
              <h2 className="font-extrabold text-sm tracking-tight text-black">TAGPUAN</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Home of Burger & Siomai</p>
              <p className="text-[11px] font-bold mt-1 text-black">{receipt.branch_name}</p>
              <p className="text-[10px] text-zinc-500">Official POS Sales Receipt</p>
            </div>

            {/* Metadata */}
            <div className="text-[11px] space-y-1 border-b border-dashed border-zinc-300 pb-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">Order No:</span>
                <span className="font-bold text-black">{receipt.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Date/Time:</span>
                <span>{receipt.date} {receipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cashier:</span>
                <span>{receipt.cashier_name}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2 border-b border-dashed border-zinc-300 pb-3">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Item</span>
                <span>Total</span>
              </div>
              {receipt.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-black">
                    <span>
                      {item.quantity}x {item.product_name}
                    </span>
                    <span>₱{item.subtotal.toFixed(2)}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="pl-3 text-[10px] text-zinc-500">
                      {item.modifiers.map((mod, mIdx) => (
                        <div key={mIdx}>• {mod}</div>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-zinc-400 pl-3">
                    @ ₱{item.unit_price.toFixed(2)} each
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="space-y-1.5 border-b border-dashed border-zinc-300 pb-3 text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal:</span>
                <span>₱{receipt.subtotal.toFixed(2)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount:</span>
                  <span>-₱{receipt.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-black pt-1 border-t border-zinc-200">
                <span>TOTAL:</span>
                <span>₱{receipt.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-zinc-700">
                <span>Payment Method:</span>
                <span className="text-black">{receipt.payment_method}</span>
              </div>
              {receipt.amount_received !== undefined && receipt.payment_method === 'CASH' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Cash Received:</span>
                    <span>₱{receipt.amount_received.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black">
                    <span>Change:</span>
                    <span>₱{(receipt.change || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              {receipt.reference_number && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Ref #:</span>
                  <span className="font-bold">{receipt.reference_number}</span>
                </div>
              )}
            </div>

            {/* Phase 10: Loyalty Rewards & Points Section */}
            {(receipt.customer_name || (receipt.loyalty_points_earned !== undefined && receipt.loyalty_points_earned > 0) || receipt.loyalty_reward_redeemed) && (
              <div className="border border-emerald-300 bg-emerald-50/70 p-2.5 rounded-lg space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-emerald-900">
                  <span>TAGPUAN REWARDS</span>
                  <span>⭐ LOYALTY</span>
                </div>
                {receipt.customer_name && (
                  <div className="flex justify-between text-zinc-700">
                    <span>Member:</span>
                    <span className="font-bold text-black">{receipt.customer_name}</span>
                  </div>
                )}
                {receipt.loyalty_points_earned !== undefined && receipt.loyalty_points_earned > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Points Earned Today:</span>
                    <span>+{receipt.loyalty_points_earned} pts</span>
                  </div>
                )}
                {receipt.loyalty_current_balance !== undefined && (
                  <div className="flex justify-between font-extrabold text-black pt-0.5 border-t border-emerald-200">
                    <span>New Total Balance:</span>
                    <span>{receipt.loyalty_current_balance} pts</span>
                  </div>
                )}
                {receipt.loyalty_reward_redeemed && (
                  <div className="flex justify-between text-amber-800 font-bold pt-0.5">
                    <span>Reward Item Redeemed:</span>
                    <span>{receipt.loyalty_reward_redeemed} (200 pts)</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-2 text-[10px] text-zinc-500 space-y-0.5">
              <p className="font-bold">THANK YOU FOR DINING WITH US!</p>
              <p>Please come again.</p>
              <p className="text-[8px] text-zinc-400 mt-2">Powered by Tagpuan ERP Point of Sale</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-50 transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewOrder();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
