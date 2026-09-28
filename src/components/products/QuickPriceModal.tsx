import React, { useState } from 'react';
import { DollarSign, AlertCircle, CheckCircle2, History, X } from 'lucide-react';
import { Product } from '../../types/index';

interface QuickPriceModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePrice: (productId: string, newPrice: number) => Promise<void>;
}

export const QuickPriceModal: React.FC<QuickPriceModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdatePrice
}) => {
  const [newPrice, setNewPrice] = useState<number>(product.selling_price);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrice < 0) {
      setError('Price cannot be negative.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onUpdatePrice(product.id, newPrice);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update price.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CDEBC5] flex items-center justify-center text-[#111111]">
              <DollarSign className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">Update Selling Price</h3>
              <p className="text-[11px] text-zinc-500 font-mono">{product.product_code} • {product.product_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Current Price</span>
              <p className="text-base font-black text-zinc-700 mt-0.5">₱{product.selling_price.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">New Menu Price</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-sm font-black text-zinc-900">₱</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  autoFocus
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-black text-zinc-900 bg-white border border-zinc-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Historical Integrity Guarantee */}
          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-blue-900">
            <History className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Historical Price Integrity:</span> Completed sales and orders retain the price at their time of sale (₱{product.selling_price.toFixed(2)}). All new POS and Kiosk orders will immediately reflect ₱{newPrice.toFixed(2)}.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-extrabold bg-[#111111] hover:bg-black text-white rounded-xl shadow transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Updating...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                  <span>Update Price Everywhere</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
