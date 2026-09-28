import React, { useState, useEffect } from 'react';
import { Product, ModifierGroup, CartItemModifierInput } from '../../types';
import { X, Check, Plus, AlertCircle } from 'lucide-react';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';

interface ProductModifierModalProps {
  product: Product;
  modifierGroups: ModifierGroup[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number, selectedModifiers: CartItemModifierInput[], notes: string) => void;
}

export const ProductModifierModal: React.FC<ProductModifierModalProps> = ({
  product,
  modifierGroups,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedMods, setSelectedMods] = useState<Record<string, CartItemModifierInput[]>>({});
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter applicable modifier groups for this product
  const applicableGroups = modifierGroups.filter(g => {
    if (g.applicable_product_ids && g.applicable_product_ids.length > 0) {
      return g.applicable_product_ids.includes(product.id);
    }
    return g.applicable_categories.includes(product.category);
  });

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes('');
      setValidationError(null);

      // Pre-select default options if any
      const initial: Record<string, CartItemModifierInput[]> = {};
      applicableGroups.forEach(group => {
        const defaults = group.options
          .filter(opt => opt.is_default)
          .map(opt => ({
            modifier_id: opt.id,
            modifier_name: opt.name,
            modifier_group: group.name,
            additional_price: opt.price,
            ingredient_id: opt.ingredient_id || null,
            quantity_consumed: opt.quantity_consumed || null,
            unit: opt.unit || null
          }));
        if (defaults.length > 0) {
          initial[group.id] = defaults;
        } else {
          initial[group.id] = [];
        }
      });
      setSelectedMods(initial);
    }
  }, [isOpen, product.id]);

  if (!isOpen) return null;

  const handleToggleOption = (group: ModifierGroup, opt: any) => {
    const current = selectedMods[group.id] || [];
    const exists = current.some(m => m.modifier_id === opt.id);

    if (exists) {
      // Remove option
      if (group.required && current.length <= group.min_selection && current.length === 1) {
        // Can't unselect if strictly required and only 1 selected
        return;
      }
      setSelectedMods({
        ...selectedMods,
        [group.id]: current.filter(m => m.modifier_id !== opt.id)
      });
    } else {
      // Add option
      const newMod: CartItemModifierInput = {
        modifier_id: opt.id,
        modifier_name: opt.name,
        modifier_group: group.name,
        additional_price: opt.price,
        ingredient_id: opt.ingredient_id || null,
        quantity_consumed: opt.quantity_consumed || null,
        unit: opt.unit || null
      };

      if (group.max_selection === 1) {
        // Radio behavior (single choice)
        setSelectedMods({
          ...selectedMods,
          [group.id]: [newMod]
        });
      } else {
        // Multiple choices up to max_selection
        if (current.length >= group.max_selection) {
          return;
        }
        setSelectedMods({
          ...selectedMods,
          [group.id]: [...current, newMod]
        });
      }
    }
  };

  const handleConfirm = () => {
    // Validate required groups
    for (const group of applicableGroups) {
      const selected = selectedMods[group.id] || [];
      if (group.required && selected.length < group.min_selection) {
        setValidationError(`Please select at least ${group.min_selection} option(s) for "${group.name}".`);
        return;
      }
    }

    const allModifiers: CartItemModifierInput[] = [];
    Object.keys(selectedMods).forEach(key => {
      const items = selectedMods[key] || [];
      allModifiers.push(...items);
    });
    onConfirm(product, quantity, allModifiers, notes);
    onClose();
  };

  const calculateUnitExtra = () => {
    let extra = 0;
    Object.keys(selectedMods).forEach(key => {
      const items = selectedMods[key] || [];
      items.forEach(m => {
        extra += m.additional_price || 0;
      });
    });
    return extra;
  };

  const unitPrice = product.selling_price + calculateUnitExtra();
  const totalPrice = unitPrice * quantity;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={getProductImageWithFallback(product.product_image, product.product_name, product.category)}
              alt={product.product_name}
              onError={(e) => {
                const target = e.currentTarget;
                target.src = getFoodSvgForProduct(product.product_name, product.category);
              }}
              className="w-12 h-12 rounded-xl object-cover border border-zinc-700"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-extrabold text-base leading-tight text-white">{product.product_name}</h3>
              <p className="text-xs text-[#CDEBC5] font-semibold">
                Base Price: ₱{product.selling_price.toFixed(2)} • <span className="text-zinc-400">{product.category}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {validationError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {applicableGroups.length === 0 && (
            <p className="text-sm text-zinc-500 italic text-center py-4">
              No modifier groups configured for this item. You can customize quantity and special instructions below.
            </p>
          )}

          {applicableGroups.map((group) => {
            const currentSelected = selectedMods[group.id] || [];
            const isSingle = group.max_selection === 1;

            return (
              <div key={group.id} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                      <span>{group.name}</span>
                      {group.required && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      {isSingle
                        ? 'Select 1 option'
                        : `Select up to ${group.max_selection} options (Min: ${group.min_selection})`}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 font-mono">
                    {currentSelected.length} / {group.max_selection}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {group.options.map((opt) => {
                    const isSelected = currentSelected.some(m => m.modifier_id === opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setValidationError(null);
                          handleToggleOption(group, opt);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-[#CDEBC5]/30 border-[#111111] text-[#111111] font-semibold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-${isSingle ? 'full' : 'md'} border flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#111111] border-[#111111] text-[#CDEBC5]'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-medium">{opt.name}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-900 font-mono">
                          {opt.price > 0 ? `+₱${opt.price.toFixed(2)}` : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes / Special Instructions */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Special Instructions / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Extra spicy, less mayo, cut in half..."
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#111111] bg-white text-zinc-900"
            />
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
            <span className="text-xs font-bold text-zinc-700">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-800 hover:bg-zinc-300 font-bold flex items-center justify-center text-sm transition"
              >
                -
              </button>
              <span className="text-sm font-black text-zinc-900 w-8 text-center font-mono">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-800 hover:bg-zinc-300 font-bold flex items-center justify-center text-sm transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-zinc-500 font-medium">Calculated Item Total</p>
            <p className="text-lg font-black text-[#111111] font-mono">
              ₱{totalPrice.toFixed(2)}{' '}
              <span className="text-xs font-normal text-zinc-500">
                (₱{unitPrice.toFixed(2)} x {quantity})
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
