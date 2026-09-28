import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  ShieldAlert,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ArrowRight,
  Delete,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Search,
  Check,
  Loader2
} from 'lucide-react';

interface BranchInfo {
  id: string;
  name: string;
  code?: string;
  address?: string;
}

interface KioskTerminalSetupProps {
  branches?: BranchInfo[];
  onCompleteSetup?: (branchId: string, branchName: string) => void;
  onSetupComplete?: (branchId: string, branchName: string) => void;
  onExitToERP?: () => void;
}

export const KioskTerminalSetup: React.FC<KioskTerminalSetupProps> = ({
  branches: initialBranches,
  onCompleteSetup,
  onSetupComplete,
  onExitToERP
}) => {
  const handleDone = (bId: string, bName: string) => {
    if (onCompleteSetup) onCompleteSetup(bId, bName);
    if (onSetupComplete) onSetupComplete(bId, bName);
  };
  const [step, setStep] = useState<'PIN_AUTH' | 'BRANCH_SELECT'>('PIN_AUTH');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchInfo[]>(initialBranches || []);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Fetch branches if initial list is empty
  useEffect(() => {
    if (branches.length === 0) {
      setIsLoadingBranches(true);
      fetch('/api/kiosk/branches')
        .then(res => res.json())
        .then(data => {
          const list = data.branches || [];
          setBranches(list);
          if (list.length > 0) {
            setSelectedBranchId(list[0].id);
          }
        })
        .catch(err => {
          console.error('Failed to load branches:', err);
          setError('Failed to load branch list. Please retry.');
        })
        .finally(() => setIsLoadingBranches(false));
    } else if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches.length, selectedBranchId]);

  // Handle PIN button press (from touchscreen on-screen numpad)
  const handleNumpadPress = (val: string) => {
    setError(null);
    if (pin.length < 8) {
      setPin(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClearPin = () => {
    setError(null);
    setPin('');
  };

  // Dynamic PIN verification against Branch Manager profile or Owner Master PIN
  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError('Please enter your 4 to 6-digit PIN.');
      return;
    }
    setIsVerifyingPin(true);
    setError(null);
    try {
      await api.verifyKioskPin(cleanPin, selectedBranchId || null);
      setError(null);
      setStep('BRANCH_SELECT');
      if (branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branches[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Manager/Owner PIN.');
      setPin('');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleSaveAndLock = () => {
    if (!selectedBranchId) {
      setError('Please select a branch location to lock this kiosk.');
      return;
    }
    const chosen = branches.find(b => b.id === selectedBranchId);
    const branchName = chosen ? chosen.name : 'Branch';

    // Store in localStorage for permanent terminal lock
    localStorage.setItem('kiosk_assigned_branch_id', selectedBranchId);
    localStorage.setItem('kiosk_assigned_branch_name', branchName);
    localStorage.setItem('tagpuan_kiosk_branch_id', selectedBranchId);

    handleDone(selectedBranchId, branchName);
  };

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-between p-4 sm:p-8 select-none relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#CDEBC5] opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#CDEBC5] opacity-10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between z-10 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black text-xl shadow-lg">
            T
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              TAGPUAN
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-black">
                Terminal Setup
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Self-Ordering Kiosk Device Configuration</p>
          </div>
        </div>

        {onExitToERP && (
          <button
            type="button"
            onClick={onExitToERP}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#CDEBC5]" />
            <span>Go to Staff ERP</span>
          </button>
        )}
      </header>

      {/* Main Configuration Card */}
      <main className="my-auto max-w-lg w-full mx-auto z-10 py-6">
        <div className="bg-[#18181B] rounded-3xl border border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Status Alert Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-200">Terminal Not Yet Assigned to a Branch</p>
              <p className="text-amber-300/80 leading-relaxed">
                Before allowing customer ordering, an Owner or Store Manager must unlock this terminal and link it to a specific store location.
              </p>
            </div>
          </div>

          {step === 'PIN_AUTH' ? (
            /* STEP 1: PIN AUTHENTICATION */
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 text-[#CDEBC5] mx-auto flex items-center justify-center mb-2 shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-white">Enter Manager / Owner PIN</h2>
                <p className="text-xs text-zinc-400">
                  Authenticate to assign and permanently lock this kiosk terminal.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Masked PIN Display */}
              <div className="flex justify-center items-center gap-3 py-3">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      pin.length > idx
                        ? 'bg-[#CDEBC5] scale-110 shadow-[0_0_10px_#CDEBC5]'
                        : 'bg-zinc-800 border border-zinc-700'
                    }`}
                  />
                ))}
              </div>

              {/* Physical Input Fallback */}
              <form onSubmit={handleVerifyPin} className="space-y-2">
                <input
                  type="password"
                  value={pin}
                  onChange={e => {
                    setError(null);
                    setPin(e.target.value);
                  }}
                  placeholder="Or type PIN (e.g. 1234)"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center font-mono text-sm tracking-widest text-white focus:outline-none focus:border-[#CDEBC5]"
                />
              </form>

              {/* Touchscreen Numpad for Kiosks */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumpadPress(num)}
                    className="py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-lg font-bold font-mono text-white border border-zinc-800 transition active:scale-95 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold uppercase text-zinc-400 border border-zinc-800 transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress('0')}
                  className="py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-lg font-bold font-mono text-white border border-zinc-800 transition active:scale-95 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 flex items-center justify-center transition cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Unlock Action Button */}
              <button
                type="button"
                id="btn-unlock-kiosk-setup"
                disabled={pin.length < 4 || isVerifyingPin}
                onClick={() => handleVerifyPin()}
                className="w-full py-3.5 rounded-2xl bg-[#CDEBC5] text-[#111111] hover:bg-[#bce4b2] disabled:opacity-50 disabled:cursor-not-allowed font-black text-sm uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isVerifyingPin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#111111]" />
                    <span>Verifying PIN...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Terminal Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-zinc-500 text-center font-mono">
                Store Manager Default PIN: 1234 or Owner Master PIN: 8888
              </p>
            </div>
          ) : (
            /* STEP 2: SELECT AND LOCK BRANCH */
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PIN Verified</span>
                </div>
                <h2 className="text-xl font-black text-white">Select Branch Assignment</h2>
                <p className="text-xs text-zinc-400">
                  Choose the Tagpuan branch this kiosk terminal will operate for:
                </p>
              </div>

              {/* Branch Search */}
              {branches.length > 5 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search branch name or address..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#CDEBC5]"
                  />
                </div>
              )}

              {/* Branch List Cards */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {isLoadingBranches ? (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    Loading branch directory...
                  </div>
                ) : filteredBranches.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    No branches found matching search.
                  </div>
                ) : (
                  filteredBranches.map(branch => {
                    const isSelected = selectedBranchId === branch.id;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#CDEBC5]/10 border-[#CDEBC5] text-white shadow-md'
                            : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#CDEBC5] text-[#111111]'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{branch.name}</p>
                            {branch.address && (
                              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#CDEBC5]" />
                                <span>{branch.address}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                            isSelected
                              ? 'bg-[#CDEBC5] border-[#CDEBC5] text-[#111111]'
                              : 'border-zinc-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  id="btn-save-lock-kiosk"
                  disabled={!selectedBranchId}
                  onClick={handleSaveAndLock}
                  className="w-full py-3.5 rounded-2xl bg-[#CDEBC5] text-[#111111] hover:bg-[#bce4b2] disabled:opacity-50 font-black text-sm uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  <span>Save & Lock Terminal</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('PIN_AUTH');
                    setPin('');
                  }}
                  className="py-2.5 text-xs text-zinc-400 hover:text-white transition text-center"
                >
                  ← Back to PIN Screen
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 text-center">
                🔒 <strong>Permanent Assignment:</strong> This terminal will remember this branch in local storage even after browser refresh or device reboot.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-zinc-600 text-xs z-10 border-t border-zinc-800/60 pt-4">
        Tagpuan Self-Ordering Kiosk System • Terminal Security & Branch Lockdown Module
      </footer>
    </div>
  );
};
