import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Monitor, Apple, ExternalLink, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'login' | 'sidebar' | 'kiosk' | 'compact';
  className?: string;
  forceShow?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
  forceShow = false
}) => {
  const { isInstalled, isInstallable, isIOS, showGuide, setShowGuide, install } = usePWAInstall();
  const [internalGuideOpen, setInternalGuideOpen] = useState(false);

  // If already running as an installed standalone PWA, suppress button unless forced
  if (isInstalled && !forceShow) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setInternalGuideOpen(true);
    }
  };

  const isModalOpen = showGuide || internalGuideOpen;
  const closeModal = () => {
    setShowGuide(false);
    setInternalGuideOpen(false);
  };

  // Render variant buttons
  let buttonContent = null;

  if (variant === 'sidebar') {
    buttonContent = (
      <button
        type="button"
        onClick={handleClick}
        id="btn-sidebar-install-pwa"
        title="Install Tagpuan ERP on Desktop or Mobile"
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition bg-[#181818] hover:bg-[#222222] text-[#CDEBC5] border border-[#2a2a2a] hover:border-[#383838] group shadow-sm cursor-pointer active:scale-[0.98] ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm">📲</span>
          <span className="font-semibold text-white group-hover:text-[#CDEBC5] transition">
            Install Tagpuan App
          </span>
        </div>
        <span className="text-[9px] font-mono font-bold bg-[#111111] text-[#CDEBC5] px-2 py-0.5 rounded border border-[#2a2a2a]">
          PWA
        </span>
      </button>
    );
  } else if (variant === 'kiosk') {
    buttonContent = (
      <button
        type="button"
        onClick={handleClick}
        id="btn-kiosk-install-pwa"
        title="Install Tagpuan Kiosk App"
        className={`px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 text-xs font-bold transition active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer ${className}`}
      >
        <span>📲</span>
        <span className="hidden sm:inline">Install Tagpuan App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  } else if (variant === 'login') {
    buttonContent = (
      <button
        type="button"
        onClick={handleClick}
        id="btn-login-install-pwa"
        title="Install Tagpuan ERP to Home Screen / Desktop"
        className={`w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 border border-zinc-300/80 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99] ${className}`}
      >
        <span>📲</span>
        <span>Install Tagpuan App</span>
        <span className="text-[10px] text-zinc-500 font-mono font-normal">(Android, iOS, PC & Mac)</span>
      </button>
    );
  } else {
    // Compact generic button
    buttonContent = (
      <button
        type="button"
        onClick={handleClick}
        id="btn-compact-install-pwa"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-black text-[#CDEBC5] border border-zinc-700 transition cursor-pointer active:scale-95 ${className}`}
      >
        <span>📲</span>
        <span>Install Tagpuan App</span>
      </button>
    );
  }

  return (
    <>
      {buttonContent}

      {/* Cross-Platform Installation Guide Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-zinc-900">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#111111] p-2 flex items-center justify-center shadow-lg">
                <img
                  src="/icons/icon.svg"
                  alt="Tagpuan Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-base font-black text-[#111111] tracking-tight">
                  Install Tagpuan Food Hub ERP
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Standalone PWA for Mobile, Tablet & Desktop
                </p>
              </div>
            </div>

            {/* Platform Guides */}
            <div className="space-y-3 mb-5 text-xs text-zinc-600">
              {/* iOS / iPhone / iPad Guide */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-2 font-bold text-zinc-900 mb-1.5">
                  <Apple className="w-4 h-4 text-zinc-800" />
                  <span>iOS (iPhone & iPad Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-zinc-600 pl-1">
                  <li>Tap the <strong>Share</strong> icon (square with arrow) at the bottom or top of Safari.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> to launch Tagpuan in full-screen standalone mode.</li>
                </ol>
              </div>

              {/* Android / Chrome Guide */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-2 font-bold text-zinc-900 mb-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Android (Chrome / Edge / Samsung Internet):</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Tap the three-dot menu (⋮) in the top right of your browser, then tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                </p>
              </div>

              {/* Mac & Windows Laptop Guide */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-2 font-bold text-zinc-900 mb-1.5">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <span>Windows PC & Mac Desktop:</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Click the <strong>Install</strong> icon in your browser's address bar (URL bar), or open the browser menu (⋮) and select <strong>Install Tagpuan Food Hub Management System</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    closeModal();
                    await install();
                  }}
                  className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Launch Install Prompt</span>
                </button>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="w-full py-3 bg-[#111111] hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
