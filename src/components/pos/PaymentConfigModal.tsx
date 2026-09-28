import React, { useState } from 'react';
import { PaymentConfiguration } from '../../types';
import { X, QrCode, Save, AlertCircle, Loader2, Plus, Image as ImageIcon } from 'lucide-react';

interface PaymentConfigModalProps {
  configs: PaymentConfiguration[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const PaymentConfigModal: React.FC<PaymentConfigModalProps> = ({
  configs,
  isOpen,
  onClose,
  onRefresh
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentConfiguration>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEdit = (config: PaymentConfiguration) => {
    setEditingId(config.id);
    setFormData({
      account_name: config.account_name,
      account_number: config.account_number,
      qr_image_url: config.qr_image_url,
      instructions: config.instructions,
      is_active: config.is_active
    });
    setError(null);
  };

  const handleSave = async (configId: string) => {
    setError(null);
    try {
      setIsSaving(true);
      const token = localStorage.getItem('tagpuan_token');

      const response = await fetch(`/api/pos/payment-configs/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment gateway.');
      }

      setEditingId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error saving payment config.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">QR & Payment Gateway Settings</h3>
              <p className="text-xs text-zinc-400">Owner Configuration (GCash, Maya, QRPh, Bank)</p>
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-zinc-500">
            Configure the official payment receiving accounts and QR codes presented to customers during POS checkout.
          </p>

          <div className="space-y-4">
            {configs.map((cfg) => {
              const isEditing = editingId === cfg.id;

              return (
                <div
                  key={cfg.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#111111] text-[#CDEBC5] text-[11px] font-black font-mono">
                        {cfg.payment_method}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cfg.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                      }`}>
                        {cfg.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleEdit(cfg)}
                        className="px-3 py-1 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition"
                      >
                        Edit Details
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-2 border-t border-zinc-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-700 mb-1">Account Name</label>
                          <input
                            type="text"
                            value={formData.account_name || ''}
                            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white text-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-700 mb-1">Account Number / Mobile</label>
                          <input
                            type="text"
                            value={formData.account_number || ''}
                            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs font-mono font-bold bg-white text-zinc-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 mb-1">QR Code Image URL</label>
                        <input
                          type="text"
                          value={formData.qr_image_url || ''}
                          onChange={(e) => setFormData({ ...formData, qr_image_url: e.target.value })}
                          placeholder="https://... or /qr/... URL"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs font-mono bg-white text-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 mb-1">Cashier / Customer Instructions</label>
                        <input
                          type="text"
                          value={formData.instructions || ''}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          placeholder="e.g. Please show confirmation screen to cashier"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white text-zinc-900"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
                          <input
                            type="checkbox"
                            checked={formData.is_active ?? true}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded text-[#111111] focus:ring-[#111111]"
                          />
                          <span>Enable this payment method for POS checkout</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave(cfg.id)}
                          disabled={isSaving}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] flex items-center gap-1.5"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          <span>Save Settings</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div className="sm:col-span-2 space-y-1">
                        <p className="text-xs font-bold text-zinc-900">{cfg.account_name}</p>
                        <p className="text-xs text-zinc-600 font-mono font-semibold">{cfg.account_number}</p>
                        {cfg.instructions && (
                          <p className="text-[11px] text-zinc-400 italic">{cfg.instructions}</p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        {cfg.qr_image_url ? (
                          <img
                            src={cfg.qr_image_url}
                            alt={`${cfg.payment_method} QR`}
                            className="w-14 h-14 object-contain rounded-lg border border-zinc-200 p-1 bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
