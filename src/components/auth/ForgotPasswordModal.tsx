import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2, X, Lock, KeyRound, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: (email: string, newPassword: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess
}) => {
  const [step, setStep] = useState<'VERIFY_EMAIL' | 'NEW_PASSWORD' | 'SUCCESS'>('VERIFY_EMAIL');
  const [email, setEmail] = useState(initialEmail);
  const [verifiedAccount, setVerifiedAccount] = useState<{
    email: string;
    full_name: string;
    role: string;
    branch_name?: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEmail) setEmail(initialEmail);
      setStep('VERIFY_EMAIL');
      setError(null);
      setSuccessMessage(null);
      setNewPassword('');
      setConfirmPassword('');
      setVerifiedAccount(null);
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  // Step 1: Verify Email
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Gmail / Email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.verifyResetEmail(cleanEmail);
      setVerifiedAccount(result);
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      setError(err.message || 'No registered account found with this email. Please check your spelling.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Instant Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.instantResetPassword(email.trim(), newPassword);
      setSuccessMessage(res.message || 'Password successfully updated! You can now log in.');
      setStep('SUCCESS');

      // Notify parent to auto-populate credentials in login page
      if (onSuccess) {
        onSuccess(email.trim(), newPassword);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAndLogin = () => {
    if (onSuccess && newPassword) {
      onSuccess(email.trim(), newPassword);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 shadow-2xl relative"
        id="instant-forgot-password-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center text-[#CDEBC5]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#111111] tracking-tight">
              Instant Password Reset
            </h3>
            <p className="text-xs text-zinc-500 font-medium">Self-Service Account Recovery</p>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* STEP 1: EMAIL VERIFICATION */}
        {step === 'VERIFY_EMAIL' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 leading-relaxed">
              Enter your registered Tagpuan account email. The system will verify your identity immediately without waiting for external email links.
            </div>

            <div>
              <label htmlFor="reset-verify-email" className="block text-xs font-bold text-zinc-700 mb-1.5">
                Registered Gmail / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-verify-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. janzenmarkglori@gmail.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                id="btn-verify-reset-email"
                className="flex-1 py-3 bg-[#111111] hover:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: ENTER NEW PASSWORD */}
        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Account Info Pill */}
            {verifiedAccount && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950">{verifiedAccount.full_name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900 font-mono font-bold text-[10px]">
                      {verifiedAccount.role}
                    </span>
                  </div>
                  <p className="text-emerald-800 text-[11px] mt-0.5 font-mono">{verifiedAccount.email}</p>
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="new-password-input" className="block text-xs font-bold text-zinc-700 mb-1.5">
                New Password <span className="text-zinc-400 font-normal">(Min. 6 characters)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoFocus
                  minLength={6}
                  className="w-full pl-10 pr-11 py-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirm-password-input" className="block text-xs font-bold text-zinc-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-11 py-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('VERIFY_EMAIL')}
                className="py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                id="btn-submit-instant-reset"
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving New Password...</span>
                  </>
                ) : (
                  <span>Update Password & Log In</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'SUCCESS' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#f0f9ee] border border-[#a3d995] flex items-start gap-3 text-sm text-[#166534]">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold text-[#111111] mb-1">Password Successfully Updated!</p>
                <p className="text-xs text-[#166534] leading-relaxed">
                  {successMessage || 'Password successfully updated! You can now log in.'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-2 font-medium">
                  Your credentials have been automatically populated in the login form.
                </p>
              </div>
            </div>

            <button
              id="btn-instant-reset-finish-login"
              onClick={handleFinishAndLogin}
              className="w-full py-3.5 bg-[#111111] hover:bg-zinc-800 text-[#CDEBC5] font-black rounded-xl text-xs tracking-wide transition font-sans cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>Proceed to Log In Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
