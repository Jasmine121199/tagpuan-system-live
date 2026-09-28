import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Building,
  CheckCircle2,
  Package,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import {
  Branch,
  Ingredient,
  PriorityLevel,
  RequestOrder
} from '../../types';

interface CreateBranchRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequest: RequestOrder) => void;
  preselectedBranchId?: string;
  initialItems?: { ingredient_id: string; requested_quantity: number; notes?: string }[];
}

export const CreateBranchRequestModal: React.FC<CreateBranchRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedBranchId,
  initialItems
}) => {
  const { user, isOwner, isManager } = useAuth();
  const { addNotification } = useNotifications();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form states
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [notes, setNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Item rows: multiple items in a single request
  const [items, setItems] = useState<
    { ingredient_id: string; requested_quantity: number; notes?: string }[]
  >([]);

  // Load branches and ingredients whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadFormData = async () => {
      setLoadingData(true);
      setValidationError(null);
      try {
        const [loadedBranches, loadedIngredients] = await Promise.all([
          api.getBranches().catch(() => []),
          api.getIngredients().catch(() => [])
        ]);

        setBranches(loadedBranches);
        setIngredients(loadedIngredients);

        // Determine destination branch
        let defaultBranchId = preselectedBranchId || user?.branch_id || '';
        if (!defaultBranchId && loadedBranches.length > 0) {
          defaultBranchId = loadedBranches[0].id;
        }
        setTargetBranchId(defaultBranchId);

        // Setup initial items
        if (initialItems && initialItems.length > 0) {
          setItems(initialItems);
        } else if (loadedIngredients.length > 0) {
          // Pre-populate with default common supplies if list was empty
          setItems([
            {
              ingredient_id: loadedIngredients[0]?.id || '',
              requested_quantity: 100
            }
          ]);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error('Failed to load ingredients/branches for request modal:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadFormData();
  }, [isOpen, preselectedBranchId, user?.branch_id]);

  if (!isOpen) return null;

  // Add new item row - picks next unselected ingredient if possible
  const handleAddItem = () => {
    if (ingredients.length === 0) return;

    // Pick first ingredient not yet added in current items
    const selectedIds = new Set(items.map((it) => it.ingredient_id));
    const nextUnselected = ingredients.find((i) => !selectedIds.has(i.id)) || ingredients[0];

    setItems([
      ...items,
      {
        ingredient_id: nextUnselected.id,
        requested_quantity: 50
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: 'ingredient_id' | 'requested_quantity' | 'notes',
    value: any
  ) => {
    const nextItems = [...items];
    nextItems[index] = {
      ...nextItems[index],
      [field]: value
    };
    setItems(nextItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const branchToUse = isOwner ? targetBranchId : (user?.branch_id || targetBranchId);
    if (!branchToUse) {
      setValidationError('Please select a destination branch for replenishment.');
      return;
    }

    if (items.length === 0) {
      setValidationError('Please add at least one ingredient item to your request.');
      return;
    }

    // Validate each item has ingredient_id and quantity > 0
    const validItems: { ingredient_id: string; requested_quantity: number; notes?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.ingredient_id) {
        setValidationError(`Row #${i + 1}: Please select an ingredient item.`);
        return;
      }
      const qty = Number(it.requested_quantity);
      if (isNaN(qty) || qty <= 0) {
        const ing = ingredients.find((ingItem) => ingItem.id === it.ingredient_id);
        setValidationError(
          `Row #${i + 1} (${ing?.item_name || 'Item'}): Requested quantity must be greater than 0.`
        );
        return;
      }
      validItems.push({
        ingredient_id: it.ingredient_id,
        requested_quantity: qty,
        notes: it.notes || undefined
      });
    }

    const branchObj = branches.find((b) => b.id === branchToUse);
    const branchName = branchObj?.name || user?.branch_name || 'Branch';

    try {
      setSubmitting(true);
      const res = await api.createRequestOrder({
        branch_id: branchToUse,
        priority,
        notes: notes.trim() || undefined,
        delivery_notes: deliveryNotes.trim() || undefined,
        items: validItems
      });

      const req = res.requestOrder;

      // User requested exact notification format:
      // "Request Order [REQ-ID] submitted successfully for [Branch Name]!"
      addNotification(
        'Stock Request Submitted',
        `Request Order ${req.request_number} submitted successfully for ${branchName}!`,
        'SUCCESS'
      );

      // Clean up and notify caller
      onSuccess(req);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit request order:', err);
      setValidationError(err.message || 'Failed to submit request order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Find destination branch display name
  const currentBranchName =
    branches.find((b) => b.id === targetBranchId)?.name || user?.branch_name || 'Destination Branch';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center font-black shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#111111]">New Branch Stock Request</h2>
              <p className="text-xs text-zinc-500">
                Submit raw materials replenishment from Central Commissary Warehouse.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{validationError}</div>
            </div>
          )}

          {/* Branch & Priority Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-zinc-400" />
                Destination Branch *
              </label>
              {isOwner ? (
                <select
                  required
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 focus:ring-2 focus:ring-[#111111] bg-white cursor-pointer"
                >
                  {branches.length === 0 ? (
                    <option value="">Loading branches...</option>
                  ) : (
                    branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city || 'Branch'})
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={user?.branch_name || currentBranchName}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-100 text-xs font-bold text-zinc-700"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Replenishment Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold focus:ring-2 focus:ring-[#111111] bg-white cursor-pointer"
              >
                <option value="NORMAL">Standard Replenishment</option>
                <option value="HIGH">High Priority (Weekend / Peak Rush)</option>
                <option value="URGENT">🚨 URGENT (Critical Out of Stock)</option>
              </select>
            </div>
          </div>

          {/* Requested Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider font-mono">
                  Requested Items ({items.length})
                </label>
                <span className="text-[11px] text-zinc-400">
                  • Bundle multiple depleted ingredients in 1 ticket
                </span>
              </div>
              <button
                type="button"
                id="btn-add-request-item-row"
                onClick={handleAddItem}
                className="text-xs font-black text-[#111111] hover:text-black bg-[#CDEBC5] hover:bg-[#bfe3b5] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Item
              </button>
            </div>

            {loadingData ? (
              <div className="p-8 rounded-xl border border-zinc-200 bg-zinc-50 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
                <p className="text-xs text-zinc-500 font-mono">Loading inventory supplies catalog...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-dashed border-zinc-200 text-center bg-zinc-50">
                <Package className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-700">No items added to this request yet.</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Click "+ Add Item" above to select ingredients for replenishment.
                </p>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-3 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#111111] text-[#CDEBC5] hover:bg-black inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const ing = ingredients.find((i) => i.id === item.ingredient_id);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100/70 transition flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                      {/* Row index indicator */}
                      <span className="text-[10px] font-mono font-bold text-zinc-400 w-5 text-center hidden sm:inline-block">
                        #{idx + 1}
                      </span>

                      {/* Item Select Dropdown */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-0.5">
                          ITEM (RAW INGREDIENT / SUPPLY)
                        </label>
                        <select
                          required
                          value={item.ingredient_id}
                          onChange={(e) => handleUpdateItem(idx, 'ingredient_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] cursor-pointer"
                        >
                          {ingredients.length === 0 ? (
                            <option value="">No ingredients loaded</option>
                          ) : (
                            ingredients.map((ingItem) => (
                              <option key={ingItem.id} value={ingItem.id}>
                                {ingItem.item_code ? `${ingItem.item_code} • ` : ''}
                                {ingItem.item_name} ({ingItem.unit})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="w-full sm:w-36">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-0.5">
                          QTY ({ing?.unit || 'units'}) *
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.requested_quantity || ''}
                            placeholder="Qty"
                            onChange={(e) =>
                              handleUpdateItem(idx, 'requested_quantity', Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono font-bold bg-white text-center focus:ring-2 focus:ring-[#111111]"
                          />
                          <span className="text-[11px] font-mono text-zinc-500 font-bold px-1.5 py-1 rounded bg-zinc-200/80">
                            {ing?.unit || 'pcs'}
                          </span>
                        </div>
                      </div>

                      {/* Delete Row Button */}
                      <div className="flex items-end justify-end sm:self-center pt-1 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          title="Remove this item row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operational Notes / Reasons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Reason / Context for Request
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Depleted Patties & Buns from heavy lunch crowd..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111] bg-white resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Delivery / Receiving Instructions
              </label>
              <textarea
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Please deliver by morning shift (before 10:00 AM)..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111] bg-white resize-none"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {items.length} item{items.length === 1 ? '' : 's'} requested for {currentBranchName}
              </span>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-branch-stock-request"
                disabled={submitting || loadingData || items.length === 0}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#CDEBC5]" />
                    Submit Request Order
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
