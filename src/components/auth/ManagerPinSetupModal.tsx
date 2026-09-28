import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';

export const ManagerPinSetupModal: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if user is a Manager and PIN is unconfigured
  const needsPinSetup = user?.role === 'MANAGER' && (!user.is_pin_configured || !user.kiosk_pin);

  if (!needsPinSetup) {
    return null;
  }

  const handleNumpadInput = (digit: string, target: 'pin' | 'confirm') => {
    setError(null);
    if (target === 'pin') {
      if (pin.length < 6) setPin(prev => prev + digit);
    } else {
      if (confirmPin.length < 6) setConfirmPin(prev => prev + digit);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanPin) {
      setError('Please enter a 4 to 6-digit numeric PIN.');
      return;
    }

    if (!/^\d{4,6}$/.test(cleanPin)) {
      setError('PIN must be 4 to 6 numeric digits only (0-9).');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setError('PINs do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await api.setupMyKioskPin(cleanPin);
      setIsSuccess(true);
      setTimeout(async () => {
        await refreshUser();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save Kiosk PIN. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="bg-[#111111] text-white p-6 pb-5 relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[#CDEBC5]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#CDEBC5] text-[#111111]">
                  Required Setup
                </span>
                <span className="text-xs text-zinc-400 font-medium">Branch Manager</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">Create Your Branch Kiosk PIN</h2>
            </div>
          </div>
          <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
            Welcome, <strong className="text-white">{user?.full_name}</strong>. As Store Manager, your personal Kiosk PIN authorizes terminal setup, price checks, and emergency controls on your branch terminals.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Kiosk PIN Configured!</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Your branch terminal PIN has been saved securely. Initializing your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSavePin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Enter PIN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                    New Kiosk PIN (4 to 6 Digits) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium"
                  >
                    {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPin(val);
                      setError(null);
                    }}
                    placeholder="Enter 4 to 6-digit PIN"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-zinc-300 focus:border-[#111111] rounded-xl text-center text-xl font-mono tracking-widest text-[#111111] placeholder:text-zinc-400 placeholder:text-xs placeholder:tracking-normal outline-none transition"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  Confirm Kiosk PIN *
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setConfirmPin(val);
                      setError(null);
                    }}
                    placeholder="Re-enter 4 to 6-digit PIN"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-zinc-300 focus:border-[#111111] rounded-xl text-center text-xl font-mono tracking-widest text-[#111111] placeholder:text-zinc-400 placeholder:text-xs placeholder:tracking-normal outline-none transition"
                    required
                  />
                </div>
                {pin && confirmPin && pin === confirmPin && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PINs match
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || pin.length < 4 || pin !== confirmPin}
                  className="w-full py-3 px-4 bg-[#111111] hover:bg-zinc-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving PIN...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-[#CDEBC5]" />
                      <span>Save & Activate Kiosk PIN</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-zinc-400">
                You can change or reset this PIN at any time in your profile or through the Owner Master Control.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
