import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Loader2, ShieldAlert, Sparkles, CheckCircle2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { FirstOwnerSetupModal } from './FirstOwnerSetupModal';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface LoginPageProps {
  onLaunchKiosk?: () => void;
  onLaunchPOS?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLaunchKiosk, onLaunchPOS }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccessToast, setResetSuccessToast] = useState<string | null>(null);
  
  // Modal states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both Gmail / Email and Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email.trim(), password, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background ambient mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#CDEBC5]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#111111] p-3 mb-4 shadow-xl">
            <img 
              src="/icons/icon.svg" 
              alt="Tagpuan Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
            TAGPUAN <span className="text-[#166534]">ERP</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            Home of Authentic Burger & Siomai
          </p>
        </div>

        {/* Login Card */}
        <div 
          className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-200/50"
          id="tagpuan-login-card"
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#111111] tracking-tight">Sign In</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter your credentials to access your authorized branch terminal
            </p>
          </div>

          {/* INSTANT PASSWORD RESET SUCCESS TOAST */}
          {resetSuccessToast && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-3 text-xs text-emerald-900 shadow-sm animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-950 text-sm">{resetSuccessToast}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                  Your updated credentials have been populated below. Click &quot;Sign In&quot; to continue.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Gmail / Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-zinc-700 mb-1.5">
                Gmail / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tagpuan.ph or gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
                />
              </div>
            </div>

            {/* Password Field with Eye Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-bold text-zinc-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetSuccessToast(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs text-[#166534] hover:text-[#14532d] font-bold transition cursor-pointer"
                  id="forgot-password-link"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  id="toggle-password-visibility-btn"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label htmlFor="remember-me" className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#d1d5db] bg-white text-[#111111] focus:ring-0 focus:ring-offset-0 accent-[#111111]"
                />
                <span className="text-xs text-zinc-600 font-medium">Remember Me</span>
              </label>
              <span className="text-[11px] text-zinc-400">30-day session</span>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              id="tagpuan-login-submit-btn"
              className="w-full mt-2 py-3.5 px-4 bg-[#111111] hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 font-sans tracking-wide cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* DISCREET IN-APP PWA INSTALL BUTTON */}
          <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
            <PWAInstallButton variant="login" forceShow={true} />
          </div>

          {/* Quick Demo Credentials Guide for Evaluation */}
          <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2">
              <span className="font-bold text-zinc-700">Phase 1 Default Access:</span>
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(true)}
                className="text-[11px] text-[#166534] font-bold hover:underline cursor-pointer"
              >
                Owner Setup
              </button>
            </div>
            <div className="space-y-1.5">
              <div 
                onClick={() => {
                  setEmail('janzenmarkglori@gmail.com');
                  setPassword('TagpuanStaff2026!');
                }}
                className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-zinc-400 cursor-pointer transition text-[11px] font-mono text-zinc-700 flex items-center justify-between group shadow-sm"
              >
                <div>
                  <span className="text-[#111111] font-bold">Owner:</span> janzenmarkglori@gmail.com
                </div>
                <span className="text-zinc-400 group-hover:text-zinc-700 font-sans font-medium text-[10px] bg-white px-2 py-0.5 rounded border border-[#e2e8f0]">Auto-fill</span>
              </div>

              <div 
                onClick={() => {
                  setEmail('crew.narra@tagpuan.ph');
                  setPassword('TagpuanStaff2026!');
                }}
                className="p-2.5 rounded-xl bg-[#f8fafc] border border-amber-200 hover:border-amber-400 cursor-pointer transition text-[11px] font-mono text-zinc-700 flex items-center justify-between group shadow-sm"
              >
                <div>
                  <span className="text-amber-800 font-bold">Crew (KDS):</span> crew.narra@tagpuan.ph
                </div>
                <span className="text-amber-700 group-hover:text-amber-900 font-sans font-medium text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Auto-fill Crew</span>
              </div>
            </div>
          </div>

          {/* Quick Terminal Launchers */}
          <div className="mt-4 pt-4 border-t border-[#f1f5f9] space-y-2">
            {onLaunchPOS && (
              <button
                type="button"
                id="btn-launch-pos-preview"
                onClick={onLaunchPOS}
                className="w-full py-3 px-4 rounded-2xl bg-[#111111] hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center justify-between shadow-md group border border-zinc-700 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
                    ₱
                  </div>
                  <div className="text-left">
                    <span className="text-white block leading-tight font-bold">POS Cashier Checkout</span>
                    <span className="text-[10px] text-[#CDEBC5] font-normal">Direct Register & KDS Routing</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#CDEBC5] text-[#111111] group-hover:scale-105 transition-transform">
                  Open POS
                </span>
              </button>
            )}

            {onLaunchKiosk && (
              <button
                type="button"
                id="btn-launch-kiosk-preview"
                onClick={onLaunchKiosk}
                className="w-full py-2.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition flex items-center justify-between border border-zinc-300 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 text-[#CDEBC5] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight text-xs font-semibold">Self-Ordering Kiosk</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-zinc-500 group-hover:text-zinc-900">
                  Customer Mode →
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Security Footer Notice */}
        <p className="text-center text-[11px] text-zinc-400 mt-6 leading-relaxed">
          Authorized personnel only. Branch isolation and database-level Row Level Security (RLS) active.
        </p>
      </div>

      {/* Modals */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
        onSuccess={(updatedEmail, updatedPassword) => {
          setEmail(updatedEmail);
          setPassword(updatedPassword);
          setResetSuccessToast('Password successfully updated! You can now log in.');
        }}
      />

      <FirstOwnerSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
      />
    </div>
  );
};
