import React, { useState } from 'react';
import { KioskCartItem, DiningOption } from '../../types';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  Edit2,
  AlertTriangle,
  ShoppingBag,
  UtensilsCrossed,
  ArrowLeft
} from 'lucide-react';

interface KioskCartDrawerProps {
  cart: KioskCartItem[];
  diningOption: DiningOption;
  tableNumber?: string | null;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onEditItem: (item: KioskCartItem) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onContinueOrdering: () => void;
}

export const KioskCartDrawer: React.FC<KioskCartDrawerProps> = ({
  cart,
  diningOption,
  tableNumber,
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
  onClearCart,
  onProceedToCheckout,
  onContinueOrdering
}) => {
  const [itemToRemove, setItemToRemove] = useState<KioskCartItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#18181B] text-white w-full max-w-2xl rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onContinueOrdering}
              className="p-2.5 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Order Review
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#CDEBC5] text-[#111111]">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-medium flex items-center flex-wrap gap-1.5 mt-0.5">
                {tableNumber ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-300 text-amber-950 font-black text-[11px] border border-amber-400">
                    <UtensilsCrossed className="w-3 h-3 text-amber-950" />
                    Assigned: {tableNumber.toLowerCase().startsWith('table') ? tableNumber : `Table ${tableNumber}`} (Locked)
                  </span>
                ) : diningOption === 'DINE_IN' ? (
                  <span className="inline-flex items-center gap-1 text-zinc-300">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#CDEBC5]" /> Dine In
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-zinc-300">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#CDEBC5]" /> Take Out
                  </span>
                )}
                <span>• Please verify your order items</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Cancel Order</span>
          </button>
        </div>

        {/* Cart Item List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 divide-y divide-zinc-800/80">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-zinc-300">Wala pang laman ang iyong order</h3>
              <p className="text-xs text-zinc-500">Pumili ng mga pagkain sa menu para makapagpatuloy.</p>
              <button
                type="button"
                onClick={onContinueOrdering}
                className="mt-4 px-6 py-2.5 rounded-2xl bg-[#CDEBC5] text-[#111111] font-extrabold text-sm"
              >
                Pumili sa Menu
              </button>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.id} className={`${idx > 0 ? 'pt-4' : ''} space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shrink-0">
                      <img
                        src={getProductImageWithFallback(item.product.product_image, item.product.product_name, item.product.category)}
                        alt={item.product.product_name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = getFoodSvgForProduct(item.product.product_name, item.product.category);
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-extrabold text-white leading-tight truncate">
                        {item.product.product_name}
                      </h3>
                      <p className="text-xs font-semibold text-zinc-400 mt-0.5">
                        ₱{item.unitPrice.toFixed(2)} each
                      </p>

                      {/* Modifier Chips */}
                      {item.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.modifiers.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                            >
                              {m.modifier_name}
                              {m.additional_price > 0 && ` (+₱${m.additional_price})`}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Customer Notes */}
                      {item.notes && (
                        <p className="text-xs text-zinc-400 italic mt-1 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800 inline-block">
                          Note: "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Item Total Price */}
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-[#CDEBC5]">
                      ₱{item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quantity & Actions Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#CDEBC5]" />
                      <span>Customize</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToRemove(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 text-xs font-bold transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.quantity <= 1) {
                          setItemToRemove(item);
                        } else {
                          onUpdateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold hover:bg-zinc-700 active:scale-95 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-black text-white px-2 min-w-[1.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold hover:bg-zinc-700 active:scale-95 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Subtotal & Checkout */}
        {cart.length > 0 && (
          <div className="p-5 sm:p-6 border-t border-zinc-800 bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400 font-bold">Total Amount to Pay:</span>
              <span className="text-2xl font-black text-[#CDEBC5]">
                ₱{subtotal.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onContinueOrdering}
                className="py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm transition text-center"
              >
                + Add More Items
              </button>

              <button
                type="button"
                onClick={onProceedToCheckout}
                className="py-3.5 px-6 rounded-2xl bg-[#CDEBC5] text-[#111111] hover:bg-[#b8e2af] font-black text-base transition flex items-center justify-center gap-2 shadow-lg active:scale-[0.99]"
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove Single Item Confirmation Modal */}
      {itemToRemove && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 text-white max-w-sm w-full p-6 rounded-3xl border border-zinc-800 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-white">Alisin ang Item?</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Sigurado ka bang nais mong alisin ang{' '}
                <strong className="text-white">{itemToRemove.product.product_name}</strong> mula sa iyong order?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToRemove(null)}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                Huwag Alisin
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveItem(itemToRemove.id);
                  setItemToRemove(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold text-xs"
              >
                Alisin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Entire Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 text-white max-w-sm w-full p-6 rounded-3xl border border-zinc-800 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-white">I-cancel ang Buong Order?</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Mawawala ang lahat ng iyong napiling pagkain at babalik ang kiosk sa welcome screen.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                Ipagpatuloy ang Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearCart();
                }}
                className="py-2.5 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold text-xs"
              >
                Oo, I-cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
