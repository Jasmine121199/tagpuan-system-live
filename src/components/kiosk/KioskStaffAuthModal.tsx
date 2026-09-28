import React, { useState } from 'react';
import { Branch } from '../../types';
import { api } from '../../lib/api';
import {
  ShieldAlert,
  X,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface KioskStaffAuthModalProps {
  currentBranchId: string;
  branches: { id: string; name: string }[];
  onSelectBranch: (branchId: string) => void;
  onResetTerminal?: () => void;
  onExitToERP: () => void;
  onClose: () => void;
}

export const KioskStaffAuthModal: React.FC<KioskStaffAuthModalProps> = ({
  currentBranchId,
  branches,
  onSelectBranch,
  onResetTerminal,
  onExitToERP,
  onClose
}) => {
  const [pin, setPin] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authorizedBy, setAuthorizedBy] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>(currentBranchId);
  const [error, setError] = useState<string | null>(null);

  // Dynamic PIN verification supporting Two-Tier PINs (0000 Staff vs 9999 Master Owner)
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError('Please enter your Kiosk PIN.');
      return;
    }
    setIsVerifying(true);
    setError(null);

    const storedStaffPin = localStorage.getItem('tagpuan_staff_pin') || '0000';
    const storedOwnerPin = localStorage.getItem('tagpuan_owner_pin') || '9999';

    // 1. Check Master Owner PIN
    if (cleanPin === storedOwnerPin) {
      setIsAuthenticated(true);
      setAuthorizedBy('👑 Master Owner (Super-Admin)');
      setIsVerifying(false);
      return;
    }

    // 2. Check Staff PIN
    if (cleanPin === storedStaffPin) {
      setIsAuthenticated(true);
      setAuthorizedBy('👔 Staff / Cashier');
      setIsVerifying(false);
      return;
    }

    // 3. Fallback to API check
    try {
      const res = await api.verifyKioskPin(cleanPin, currentBranchId);
      setIsAuthenticated(true);
      setAuthorizedBy(res.authorizedBy || 'Authorized Staff');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Invalid PIN code. Default Staff: 0000 | Master Owner: 9999.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveBranch = () => {
    if (!selectedBranch) return;
    localStorage.setItem('kiosk_assigned_branch_id', selectedBranch);
    localStorage.setItem('tagpuan_kiosk_branch_id', selectedBranch);
    const branchObj = branches.find(b => b.id === selectedBranch);
    if (branchObj) {
      localStorage.setItem('kiosk_assigned_branch_name', branchObj.name);
    }
    onSelectBranch(selectedBranch);
    onClose();
  };

  const handleUnassignTerminal = () => {
    localStorage.removeItem('kiosk_assigned_branch_id');
    localStorage.removeItem('kiosk_assigned_branch_name');
    localStorage.removeItem('tagpuan_kiosk_branch_id');
    if (onResetTerminal) {
      onResetTerminal();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#18181B] text-white w-full max-w-md rounded-3xl border border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-[#CDEBC5]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Kiosk Staff Controls</h3>
              <p className="text-xs text-zinc-400">Device configuration & branch lock</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <p className="text-xs text-zinc-400">
              Enter Store Manager / Owner PIN to configure this Kiosk terminal:
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter Staff PIN (e.g. 1234)"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-center font-mono text-xl tracking-widest text-white focus:outline-none focus:border-[#CDEBC5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || pin.length < 4}
                className="py-3 rounded-xl bg-[#CDEBC5] disabled:opacity-50 text-[#111111] font-black text-xs hover:bg-[#b8e2af] transition flex items-center justify-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#111111]" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Unlock Kiosk</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#CDEBC5]/10 border border-[#CDEBC5]/30 text-[#CDEBC5] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Verified: <strong>{authorizedBy}</strong></span>
            </div>

            {/* Select Branch */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Assign Kiosk to Branch:
              </label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-[#CDEBC5]"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <a
                href="/ordering-system.html"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black flex items-center justify-center gap-1.5 transition shadow-md"
              >
                <span>👑 Open Owner Hub & POS System (Standalone)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={onExitToERP}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#CDEBC5]" />
                  <span>Go to Staff ERP</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveBranch}
                  className="py-3 px-5 rounded-xl bg-[#CDEBC5] text-[#111111] hover:bg-[#b8e2af] font-black text-xs transition"
                >
                  Save & Lock Kiosk
                </button>
              </div>

              {onResetTerminal && (
                <button
                  type="button"
                  onClick={handleUnassignTerminal}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold transition text-center"
                >
                  Unassign Terminal (Reset Branch Setup)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
