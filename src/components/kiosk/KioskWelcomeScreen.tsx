import React, { useRef } from 'react';
import { UtensilsCrossed, ShoppingBag, ArrowRight, ShieldCheck, Sparkles, MapPin, Lock } from 'lucide-react';
import { DiningOption } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface KioskWelcomeScreenProps {
  branchName: string;
  onSelectDiningOption: (option: DiningOption) => void;
  onStaffSettings: () => void;
}

export function formatKioskBranchHeader(branchName?: string | null): string {
  if (!branchName) return 'TAGPUAN';
  const clean = branchName.trim();
  if (/^tagpuan\s*-\s*/i.test(clean)) {
    const afterDash = clean.replace(/^tagpuan\s*-\s*/i, '').trim();
    return `TAGPUAN - ${afterDash}`;
  }
  if (/^tagpuan\s+/i.test(clean)) {
    const rest = clean.replace(/^tagpuan\s+/i, '').trim();
    return `TAGPUAN - ${rest}`;
  }
  return `TAGPUAN - ${clean}`;
}

export const KioskWelcomeScreen: React.FC<KioskWelcomeScreenProps> = ({
  branchName,
  onSelectDiningOption,
  onStaffSettings
}) => {
  const formattedTitle = formatKioskBranchHeader(branchName);
  const clickCountRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Secret Triple-Click on Tagpuan Brand Header
  const handleTripleClickSecret = () => {
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      timerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 800);
    } else if (clickCountRef.current >= 3) {
      if (timerRef.current) clearTimeout(timerRef.current);
      clickCountRef.current = 0;
      onStaffSettings();
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#CDEBC5] opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#CDEBC5] opacity-10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Brand Logo with secret triple-click listener */}
          <div 
            onClick={handleTripleClickSecret}
            title="Tagpuan Food Hub"
            className="w-12 h-12 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black text-xl shadow-lg cursor-pointer transform active:scale-95 transition-all hover:ring-2 hover:ring-[#CDEBC5]/50"
          >
            T
          </div>
          <div>
            <h1 
              onClick={handleTripleClickSecret}
              className="text-xl sm:text-2xl font-black tracking-tight text-white flex flex-wrap items-center gap-2 cursor-pointer hover:text-[#CDEBC5] transition"
            >
              <span>{formattedTitle}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#CDEBC5] text-[#111111]">
                Self Ordering Kiosk
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#CDEBC5] shrink-0" />
              <span>{branchName || 'Assigned Branch'}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-mono text-[10px] tracking-wide">TERMINAL LOCKED</span>
            </p>
          </div>
        </div>

        {/* Header Controls: PWA Install & Discrete Lock Icon & Staff PIN Trigger */}
        <div className="flex items-center gap-2">
          <PWAInstallButton variant="kiosk" forceShow={true} />

          {/* Discrete Lock Icon (🔒) */}
          <button
            type="button"
            onClick={onStaffSettings}
            title="Discrete Lock: Staff & Owner PIN Access"
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#CDEBC5] hover:border-zinc-700 transition active:scale-95"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Staff / Device PIN Unlock Button */}
          <button
            type="button"
            onClick={onStaffSettings}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-[#CDEBC5]" />
            <span>Staff Access</span>
          </button>
        </div>
      </div>

      {/* Main Center Content */}
      <div className="my-auto text-center max-w-2xl mx-auto z-10 space-y-8 py-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-[#CDEBC5]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Home of Authentic Burger & Siomai</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
            Welcome to <span className="text-[#CDEBC5]">Tagpuan</span>
          </h2>
          <p className="text-base sm:text-lg text-zinc-300 font-medium max-w-lg mx-auto">
            Order your favorite Buy 1 Take 1 Burgers, Double Cheese Fries, and Rice Meals in seconds.
          </p>
        </div>

        {/* Step 1: Select Dining Mode */}
        <div className="space-y-4 pt-4">
          <p className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">
            Pumili ng paraan ng pagkain / Choose Dining Option:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {/* DINE IN */}
            <button
              type="button"
              onClick={() => onSelectDiningOption('DINE_IN')}
              className="group relative p-6 sm:p-8 rounded-3xl bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-[#CDEBC5] transition-all duration-200 text-left flex flex-col justify-between shadow-xl active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white group-hover:text-[#CDEBC5] transition-colors">
                    Dine In
                  </h3>
                  <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-[#CDEBC5] group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Dito kakain sa loob ng tindahan
                </p>
              </div>
            </button>

            {/* TAKE OUT */}
            <button
              type="button"
              onClick={() => onSelectDiningOption('TAKE_OUT')}
              className="group relative p-6 sm:p-8 rounded-3xl bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-[#CDEBC5] transition-all duration-200 text-left flex flex-col justify-between shadow-xl active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-white text-[#111111] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white group-hover:text-[#CDEBC5] transition-colors">
                    Take Out
                  </h3>
                  <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-[#CDEBC5] group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Balot / Iuuwi ang order
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="text-center z-10 pt-4 border-t border-zinc-900 text-zinc-500 text-xs">
        <p className="font-semibold text-zinc-400">
          Touch any button on the screen to begin your order.
        </p>
        <p className="text-[11px] mt-0.5">
          TAGPUAN ERP • Direct Kiosk System • Cash & Digital Payments Accepted
        </p>
      </div>
    </div>
  );
};
