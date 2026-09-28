import React, { useState, useMemo } from 'react';
import {
  Product,
  ModifierGroup,
  ModifierOption,
  CartItemModifierInput,
  KioskCartItem
} from '../../types';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';
import {
  X,
  Plus,
  Minus,
  Check,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  Flame
} from 'lucide-react';

interface KioskModifierModalProps {
  product: Product;
  allProducts: Product[];
  modifierGroups: ModifierGroup[];
  initialModifiers?: CartItemModifierInput[];
  initialQuantity?: number;
  initialNotes?: string;
  onSave: (customizedItem: {
    product: Product;
    quantity: number;
    modifiers: CartItemModifierInput[];
    notes: string;
    unitPrice: number;
    totalPrice: number;
  }) => void;
  onClose: () => void;
}

export const KioskModifierModal: React.FC<KioskModifierModalProps> = ({
  product,
  allProducts,
  modifierGroups,
  initialModifiers = [],
  initialQuantity = 1,
  initialNotes = '',
  onSave,
  onClose
}) => {
  // Fries size selection if this is a Double Cheese Fries product
  const isFriesCategory = product.category === 'DOUBLE CHEESE FRIES';
  const friesSizeOptions = useMemo(() => {
    if (!isFriesCategory) return [];
    return allProducts.filter(p => p.category === 'DOUBLE CHEESE FRIES');
  }, [isFriesCategory, allProducts]);

  const [selectedProduct, setSelectedProduct] = useState<Product>(product);
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [notes, setNotes] = useState<string>(initialNotes);

  // Selected modifier options: Map of group_id -> Array of ModifierOption
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<Record<string, ModifierOption[]>>(() => {
    const initialMap: Record<string, ModifierOption[]> = {};

    modifierGroups.forEach(g => {
      initialMap[g.id] = [];
    });

    if (initialModifiers.length > 0) {
      initialModifiers.forEach(m => {
        for (const group of modifierGroups) {
          const opt = group.options.find(o => o.id === m.modifier_id || o.name === m.modifier_name);
          if (opt) {
            if (!initialMap[group.id]) initialMap[group.id] = [];
            initialMap[group.id].push(opt);
            break;
          }
        }
      });
    } else {
      // Set defaults (e.g. Cheese Flavor for Fries)
      modifierGroups.forEach(group => {
        const defaultOpt = group.options.find(o => o.is_default);
        if (defaultOpt) {
          initialMap[group.id] = [defaultOpt];
        }
      });
    }

    return initialMap;
  });

  // Filter groups applicable to this product category
  const applicableGroups = useMemo(() => {
    return modifierGroups.filter(g => {
      if (g.applicable_product_ids && g.applicable_product_ids.length > 0) {
        return g.applicable_product_ids.includes(selectedProduct.id);
      }
      return g.applicable_categories.includes(selectedProduct.category);
    });
  }, [modifierGroups, selectedProduct]);

  // Toggle modifier option
  const handleToggleOption = (group: ModifierGroup, option: ModifierOption) => {
    const current = selectedOptionsByGroup[group.id] || [];
    const isSelected = current.some(o => o.id === option.id);

    if (isSelected) {
      // Remove
      if (group.required && current.length <= 1) {
        return; // Cannot remove the only selected option if required
      }
      setSelectedOptionsByGroup(prev => ({
        ...prev,
        [group.id]: current.filter(o => o.id !== option.id)
      }));
    } else {
      // Add
      if (group.max_selection === 1) {
        // Radio replacement
        setSelectedOptionsByGroup(prev => ({
          ...prev,
          [group.id]: [option]
        }));
      } else {
        // Multi-select up to max_selection
        if (current.length >= group.max_selection) {
          return; // Max reached
        }
        setSelectedOptionsByGroup(prev => ({
          ...prev,
          [group.id]: [...current, option]
        }));
      }
    }
  };

  // Switch Fries Size
  const handleSelectFriesSize = (sizeProduct: Product) => {
    setSelectedProduct(sizeProduct);
  };

  // Price Calculation
  const additionalModifierCost = useMemo(() => {
    let total = 0;
    Object.values(selectedOptionsByGroup).forEach((options: ModifierOption[]) => {
      (options || []).forEach((opt: ModifierOption) => {
        total += opt.price || 0;
      });
    });
    return total;
  }, [selectedOptionsByGroup]);

  const unitPrice = selectedProduct.selling_price + additionalModifierCost;
  const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    applicableGroups.forEach(group => {
      const count = (selectedOptionsByGroup[group.id] || []).length;
      if (group.required && count < group.min_selection) {
        errors.push(`Pumili ng hindi bababa sa ${group.min_selection} para sa ${group.name}`);
      }
    });
    return errors;
  }, [applicableGroups, selectedOptionsByGroup]);

  const handleConfirm = () => {
    if (validationErrors.length > 0) return;

    const flattenedModifiers: CartItemModifierInput[] = [];
    Object.entries(selectedOptionsByGroup).forEach(([groupId, options]) => {
      const group = modifierGroups.find(g => g.id === groupId);
      ((options as ModifierOption[]) || []).forEach((opt: ModifierOption) => {
        flattenedModifiers.push({
          modifier_id: opt.id,
          modifier_name: opt.name,
          modifier_group: group ? group.name : opt.group,
          additional_price: opt.price || 0,
          ingredient_id: opt.ingredient_id || null,
          quantity_consumed: opt.quantity_consumed || null,
          unit: opt.unit || null
        });
      });
    });

    onSave({
      product: selectedProduct,
      quantity,
      modifiers: flattenedModifiers,
      notes: notes.trim(),
      unitPrice,
      totalPrice
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#18181B] text-white w-full max-w-2xl rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
              <img
                src={getProductImageWithFallback(selectedProduct.product_image, selectedProduct.product_name, selectedProduct.category)}
                alt={selectedProduct.product_name}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = getFoodSvgForProduct(selectedProduct.product_name, selectedProduct.category);
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#CDEBC5] text-[#111111] text-[11px] font-extrabold uppercase">
                {selectedProduct.category}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {selectedProduct.product_name}
              </h2>
              <p className="text-sm font-bold text-[#CDEBC5] mt-0.5">
                Base Price: ₱{selectedProduct.selling_price.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Scrollable Customizations */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-zinc-800">
          {/* Double Cheese Fries Sizes (If Applicable) */}
          {isFriesCategory && friesSizeOptions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#CDEBC5]" />
                  Select Fries Serving Size
                </h3>
                <span className="text-xs text-zinc-400 font-semibold">Choose 1</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {friesSizeOptions.map(sizeProd => {
                  const isSelected = selectedProduct.id === sizeProd.id;
                  return (
                    <button
                      key={sizeProd.id}
                      type="button"
                      onClick={() => handleSelectFriesSize(sizeProd)}
                      className={`p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-between min-h-[90px] ${
                        isSelected
                          ? 'border-[#CDEBC5] bg-[#CDEBC5]/10 text-white shadow-lg'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-sm font-extrabold">{sizeProd.product_name}</span>
                      <span className="text-base font-black text-[#CDEBC5] mt-1">
                        ₱{sizeProd.selling_price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifier Groups */}
          {applicableGroups.map(group => {
            const selectedInGroup = selectedOptionsByGroup[group.id] || [];
            const count = selectedInGroup.length;
            const isMaxReached = group.max_selection > 1 && count >= group.max_selection;

            return (
              <div key={group.id} className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#CDEBC5]" />
                      {group.name}
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      {group.max_selection === 1 ? (
                        'Select 1 option'
                      ) : (
                        <span>
                          Choose up to {group.max_selection} selections (
                          <strong className="text-[#CDEBC5]">{count}/{group.max_selection}</strong> selected)
                        </span>
                      )}
                    </p>
                  </div>

                  {group.required && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {group.options.map(option => {
                    const isSelected = selectedInGroup.some(o => o.id === option.id);
                    const disabled = !isSelected && isMaxReached;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggleOption(group, option)}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? 'border-[#CDEBC5] bg-[#CDEBC5]/15 text-white font-bold'
                            : disabled
                            ? 'border-zinc-900 bg-zinc-950 text-zinc-600 opacity-50 cursor-not-allowed'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-[#CDEBC5] border-[#CDEBC5] text-[#111111]'
                                : 'border-zinc-700 bg-zinc-800'
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-sm font-bold block">{option.name}</span>
                          </div>
                        </div>

                        {option.price > 0 && (
                          <span className="text-xs font-black text-[#CDEBC5] px-2 py-1 rounded-lg bg-zinc-800">
                            +₱{option.price.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Preparation Instructions */}
          <div className="pt-6 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Special Instructions / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Extra hot sauce on the side, well-done patty..."
              maxLength={100}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#CDEBC5]"
            />
          </div>
        </div>

        {/* Footer: Quantity & Add Button */}
        <div className="p-5 sm:p-6 border-t border-zinc-800 bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-zinc-800 p-1.5 rounded-2xl border border-zinc-700 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-xl bg-zinc-700 text-white flex items-center justify-center font-bold hover:bg-zinc-600 active:scale-95 transition"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-lg font-black text-white px-4 min-w-[3rem] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-xl bg-zinc-700 text-white flex items-center justify-center font-bold hover:bg-zinc-600 active:scale-95 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={validationErrors.length > 0}
            className="w-full sm:w-auto sm:flex-1 py-4 px-6 rounded-2xl bg-[#CDEBC5] text-[#111111] hover:bg-[#b8e2af] font-black text-base transition flex items-center justify-between shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Add to Order</span>
            <span className="text-lg font-black tracking-tight">
              ₱{totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
