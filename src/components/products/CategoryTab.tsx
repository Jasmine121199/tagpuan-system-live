import React, { useState } from 'react';
import { Layers, Plus, Edit2, ArrowUp, ArrowDown, Check, X, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { MenuCategory } from '../../types/index';
import { api } from '../../lib/api';

interface CategoryTabProps {
  categories: MenuCategory[];
  isOwner: boolean;
  onRefresh: () => void;
  showNotification: (msg: string) => void;
}

export const CategoryTab: React.FC<CategoryTabProps> = ({
  categories,
  isOwner,
  onRefresh,
  showNotification
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setFormName('');
    setFormCode('');
    setError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (cat: MenuCategory) => {
    setSelectedCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code);
    setError(null);
    setIsEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Category name is required.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await api.createCategory({
        name: formName.trim().toUpperCase(),
        code: formCode.trim().toUpperCase() || undefined,
        display_order: categories.length + 1
      });
      setIsAddOpen(false);
      showNotification(`Category "${formName.toUpperCase()}" added.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await api.updateCategory(selectedCategory.id, {
        name: formName.trim().toUpperCase(),
        code: formCode.trim().toUpperCase()
      });
      setIsEditOpen(false);
      showNotification(`Category "${formName.toUpperCase()}" updated.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: MenuCategory) => {
    try {
      await api.updateCategory(cat.id, { is_active: !cat.is_active });
      showNotification(`Category "${cat.name}" is now ${!cat.is_active ? 'ACTIVE' : 'DISABLED'}.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle category.');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;

    const reordered = newCats.map((cat, idx) => ({
      id: cat.id,
      display_order: idx + 1
    }));

    try {
      await api.reorderCategories(reordered);
      showNotification('Category display order updated.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reorder categories.');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50">
        <div>
          <h3 className="text-sm font-black text-zinc-900 tracking-tight">
            Menu Categories & Display Order
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure the categories shown across POS and Customer Kiosk. Categories display in this configured order.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#CDEBC5]" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      <div className="divide-y divide-zinc-100">
        {categories.map((cat, index) => (
          <div
            key={cat.id}
            className="p-4 flex items-center justify-between hover:bg-zinc-50/80 transition"
          >
            <div className="flex items-center gap-4">
              <span className="w-7 h-7 rounded-xl bg-zinc-100 font-mono font-bold text-xs flex items-center justify-center text-zinc-500">
                #{cat.display_order || index + 1}
              </span>
              <div>
                <h4 className="text-sm font-black text-zinc-900">{cat.name}</h4>
                <p className="text-[11px] font-mono text-zinc-400">CODE: {cat.code}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl uppercase ${
                cat.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
              }`}>
                {cat.is_active ? 'Active' : 'Disabled'}
              </span>

              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 disabled:opacity-30 transition"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={index === categories.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 disabled:opacity-30 transition"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(cat)}
                    className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                    title={cat.is_active ? 'Disable Category' : 'Enable Category'}
                  >
                    {cat.is_active ? <X className="w-4 h-4 text-rose-500" /> : <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">Add New Menu Category</h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-zinc-400">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RICE BOWLS"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold uppercase focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Category Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. RICE"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                />
              </div>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-[#111111] text-white rounded-xl shadow flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                <span>Save Category</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpdate} className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">Edit Menu Category</h3>
              <button type="button" onClick={() => setIsEditOpen(false)} className="text-zinc-400">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Category Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold uppercase focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Category Code</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#CDEBC5] focus:outline-none"
                />
              </div>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-[#111111] text-white rounded-xl shadow flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
                <span>Update Category</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
