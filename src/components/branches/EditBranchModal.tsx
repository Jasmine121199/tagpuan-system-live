import React, { useState, useEffect } from 'react';
import { Branch } from '../../types';
import { api } from '../../lib/api';
import {
  Building2,
  X,
  MapPin,
  Phone,
  User,
  Clock,
  KeyRound,
  Activity,
  CheckCircle2,
  AlertCircle,
  Save,
  Tag
} from 'lucide-react';

interface EditBranchModalProps {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedBranch: Branch) => void;
}

export const EditBranchModal: React.FC<EditBranchModalProps> = ({
  branch,
  isOpen,
  onClose,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [kioskPin, setKioskPin] = useState('');
  const [operatingStatus, setOperatingStatus] = useState<'OPEN' | 'MAINTENANCE' | 'CLOSED'>('OPEN');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branch) {
      setName(branch.name || '');
      setCode(branch.code || '');
      setAddress(branch.address || '');
      setLandmark(branch.landmark || '');
      setPhone(branch.phone || '');
      setManagerName(branch.manager_name || '');
      setOpeningTime(branch.opening_time || '08:00 AM');
      setClosingTime(branch.closing_time || '10:00 PM');
      setKioskPin(branch.kiosk_pin && !branch.kiosk_pin.includes('•') ? branch.kiosk_pin : '');
      setOperatingStatus(branch.operating_status || 'OPEN');
      setIsActive(branch.is_active ?? true);
      setError(null);
    }
  }, [branch]);

  if (!isOpen || !branch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Branch Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: Partial<Branch> = {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        address: address.trim() || undefined,
        landmark: landmark.trim() || undefined,
        phone: phone.trim() || undefined,
        manager_name: managerName.trim() || undefined,
        opening_time: openingTime.trim() || undefined,
        closing_time: closingTime.trim() || undefined,
        operating_status: operatingStatus,
        is_active: isActive
      };

      // Only include kiosk_pin if user provided a new 4-digit PIN
      if (kioskPin.trim()) {
        if (!/^\d{4}$/.test(kioskPin.trim())) {
          setError('Terminal Kiosk PIN must be exactly 4 digits.');
          setIsSubmitting(false);
          return;
        }
        payload.kiosk_pin = kioskPin.trim();
      }

      const updated = await api.updateBranch(branch.id, payload);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update branch parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111111] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Edit Branch Parameters</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-[#CDEBC5] font-bold">
                  Master Owner
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">{branch.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Basic Identity */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              1. Branch Identity
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tagpuan - Narra Branch"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Branch Code</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TAG-NAR"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 bg-white uppercase focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Location */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              <span>2. Physical Location & Landmark</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Complete Physical Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 142 Narra Avenue, Barangay Poblacion"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Prominent Landmark (for delivery logistics & dispatch)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Front of Town Plaza, beside Rural Bank"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
              />
            </div>
          </div>

          {/* Section: Management & Contact */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-zinc-500" />
              <span>3. Operations & Management</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Assigned Store Manager
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Contact Phone / Hotline</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +63 917 123 4567"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Opening Time</span>
                </label>
                <input
                  type="text"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  placeholder="08:00 AM"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Closing Time</span>
                </label>
                <input
                  type="text"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  placeholder="10:00 PM"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Security & Status */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
              <span>4. Security & Terminal Configuration</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Terminal Kiosk PIN (4 Digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={kioskPin}
                  onChange={(e) => setKioskPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={branch.kiosk_pin ? '•••• (Unchanged)' : 'Enter 4 digits'}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono font-bold tracking-widest text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Visible strictly to Master Owner and assigned Branch Manager.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Operating Status</span>
                </label>
                <select
                  value={operatingStatus}
                  onChange={(e) => setOperatingStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none cursor-pointer"
                >
                  <option value="OPEN">● Open / Active Trading</option>
                  <option value="MAINTENANCE">🛠️ Maintenance Mode</option>
                  <option value="CLOSED">⛔ Closed for Renovation</option>
                </select>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div>
                <span className="text-xs font-bold text-zinc-900 block">Branch Enabled in System</span>
                <span className="text-[10px] text-zinc-500">Allows POS login and kiosk customer ordering</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#111111]"></div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4.5 py-2 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Parameters'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
