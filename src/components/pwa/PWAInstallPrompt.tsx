import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-6 right-4 z-40 max-w-sm bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-xl animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center text-[#CDEBC5] shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#111111]">Install Tagpuan ERP App</h4>
            <p className="text-[11px] text-zinc-500">Install as PWA for fast touch-screen and offline shell access</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstallClick}
          className="w-full py-2 bg-[#111111] hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install PWA</span>
        </button>
      </div>
    </div>
  );
};
