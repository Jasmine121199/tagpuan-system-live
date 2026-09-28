import React, { useState } from 'react';
import { Store, Check, X, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { Product, Branch } from '../../types/index';

interface BranchAvailabilityModalProps {
  product: Product;
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
  onSaveBranchAvailability: (productId: string, unavailableBranchIds: string[]) => Promise<void>;
}

export const BranchAvailabilityModal: React.FC<BranchAvailabilityModalProps> = ({
  product,
  branches,
  isOpen,
  onClose,
  onSaveBranchAvailability
}) => {
  // unavailable_branches array contains branch IDs where item is marked UNAVAILABLE
  const [unavailableIds, setUnavailableIds] = useState<string[]>(
    product.unavailable_branches || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleBranch = (bId: string) => {
    if (unavailableIds.includes(bId)) {
      // make it available (remove from unavailable list)
      setUnavailableIds(unavailableIds.filter(id => id !== bId));
    } else {
      // make it unavailable (add to unavailable list)
      setUnavailableIds([...unavailableIds, bId]);
    }
  };

  const handleSelectAll = () => {
    // Available in all branches
    setUnavailableIds([]);
  };

  const handleDisableAll = () => {
    // Unavailable in all branches
    setUnavailableIds(branches.map(b => b.id));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSaveBranchAvailability(product.id, unavailableIds);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update branch availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CDEBC5] flex items-center justify-center text-[#111111]">
              <Store className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">Branch Menu Availability</h3>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
            <div className="text-xs">
              <span className="font-bold text-zinc-800">Quick Branch Control</span>
              <p className="text-[11px] text-zinc-400">
                {branches.length - unavailableIds.length} of {branches.length} branches serving this item
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg text-zinc-700 transition"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={handleDisableAll}
                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg text-zinc-700 transition"
              >
                Disable All
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {branches.map(branch => {
              const isAvailable = !unavailableIds.includes(branch.id);
              return (
                <div
                  key={branch.id}
                  onClick={() => toggleBranch(branch.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isAvailable
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                      : 'bg-zinc-50 border-zinc-200/80 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isAvailable ? 'bg-emerald-600 text-white' : 'bg-zinc-300 text-zinc-600'
                    }`}>
                      {isAvailable ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-zinc-900">{branch.name}</h4>
                      <p className="text-[10px] text-zinc-500">{branch.address || 'Active Tagpuan Branch'}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg ${
                    isAvailable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-zinc-200 text-zinc-700'
                  }`}>
                    {isAvailable ? 'AVAILABLE' : 'OFF MENU'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-200/60 leading-relaxed">
            When a branch is set to <strong>OFF MENU</strong>, the item will immediately be hidden from that branch's Customer Kiosk and POS screen.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-extrabold bg-[#111111] hover:bg-black disabled:bg-zinc-300 text-white rounded-xl shadow transition flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
            <span>Save Branch Rules</span>
          </button>
        </div>
      </div>
    </div>
  );
};
