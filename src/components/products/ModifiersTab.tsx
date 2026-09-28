import React, { useState } from 'react';
import { Sliders, Plus, Edit2, CheckCircle2, AlertCircle, Save, DollarSign, Sparkles } from 'lucide-react';
import { ModifierGroup, ModifierOption } from '../../types/index';
import { api } from '../../lib/api';

interface ModifiersTabProps {
  modifierGroups: ModifierGroup[];
  isOwner: boolean;
  onRefresh: () => void;
  showNotification: (msg: string) => void;
}

export const ModifiersTab: React.FC<ModifiersTabProps> = ({
  modifierGroups,
  isOwner,
  onRefresh,
  showNotification
}) => {
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [optionsState, setOptionsState] = useState<ModifierOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenEdit = (group: ModifierGroup) => {
    setSelectedGroup(group);
    setOptionsState([...group.options]);
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateOptionPrice = (index: number, newPrice: number) => {
    const updated = [...optionsState];
    updated[index] = {
      ...updated[index],
      price: newPrice
    };
    setOptionsState(updated);
  };

  const handleUpdateOptionName = (index: number, newName: string) => {
    const updated = [...optionsState];
    updated[index] = {
      ...updated[index],
      name: newName
    };
    setOptionsState(updated);
  };

  const handleAddOption = () => {
    if (!selectedGroup) return;
    const newOption: ModifierOption = {
      id: `opt-${Date.now()}-${optionsState.length + 1}`,
      name: 'New Option',
      group: selectedGroup.type,
      price: 0
    };
    setOptionsState([...optionsState, newOption]);
  };

  const handleRemoveOption = (index: number) => {
    const updated = [...optionsState];
    updated.splice(index, 1);
    setOptionsState(updated);
  };

  const handleSaveGroup = async () => {
    if (!selectedGroup) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await api.updateModifierGroup(selectedGroup.id, {
        options: optionsState
      });
      setIsEditModalOpen(false);
      showNotification(`Modifier group "${selectedGroup.name}" updated successfully.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update modifier group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-mono font-black rounded-lg bg-[#CDEBC5] text-[#111111]">
                CENTRAL MODIFIERS & ADD-ONS
              </span>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Authoritative Modifier & Add-On Configurations
              </h3>
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
              Shared between POS terminals and Customer Kiosks with authoritative price lookups and recipe linkages. Changes take effect on all orders immediately.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modifierGroups.map(group => (
          <div
            key={group.id}
            className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-5 flex flex-col justify-between hover:border-zinc-300 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                    TYPE: {group.type}
                  </span>
                  <h4 className="text-base font-black text-zinc-900 tracking-tight">
                    {group.name}
                  </h4>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl uppercase ${
                  group.required ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {group.required ? 'Required' : 'Optional'} (Max {group.max_selection})
                </span>
              </div>

              <p className="text-xs text-zinc-500 mb-3">
                Applicable to: {group.applicable_categories.join(', ')}
              </p>

              {/* Options list */}
              <div className="space-y-1.5 bg-zinc-50 p-3 rounded-2xl border border-zinc-100 mb-3">
                {group.options.map(opt => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-zinc-200/60"
                  >
                    <span className="font-bold text-zinc-800">{opt.name}</span>
                    <span className="font-mono font-black text-zinc-900">
                      {opt.price > 0 ? `+₱${opt.price.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isOwner && (
              <div className="pt-2 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(group)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#CDEBC5]" />
                  <span>Configure Options & Prices</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Group Options Modal */}
      {isEditModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                  Edit Options: {selectedGroup.name}
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Modify option names, add-on pricing, and choices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                  {optionsState.length} Configured Options
                </span>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-2.5 py-1 text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="space-y-2">
                {optionsState.map((opt, idx) => (
                  <div
                    key={opt.id || idx}
                    className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Option Name</label>
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => handleUpdateOptionName(idx, e.target.value)}
                        className="w-full text-xs font-bold bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 focus:ring-1 focus:ring-[#CDEBC5] focus:outline-none"
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Price (₱)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={opt.price}
                        onChange={(e) => handleUpdateOptionPrice(idx, parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-black font-mono bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 focus:ring-1 focus:ring-[#CDEBC5] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="self-end pb-1.5 text-rose-500 hover:text-rose-700 p-1"
                      title="Remove Option"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-extrabold bg-[#111111] hover:bg-black text-white rounded-xl shadow flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                <span>Save Options</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
