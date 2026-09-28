import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ResetPasswordPageProps {
  token: string;
  onSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token, onSuccess }) => {
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-3xl p-8 shadow-xl shadow-zinc-200/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#111111] flex items-center justify-center text-[#CDEBC5]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#111111] tracking-tight">Reset Password</h2>
            <p className="text-xs text-zinc-500">Tagpuan ERP Security</p>
          </div>
        </div>

        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-[#f0f9ee] border border-[#a3d995] flex flex-col items-center gap-3 text-[#166534]">
              <CheckCircle2 className="w-10 h-10 text-[#166534]" />
              <p className="font-bold text-[#111111]">Password Reset Complete</p>
              <p className="text-xs text-[#166534]">Your Tagpuan account password has been updated securely.</p>
            </div>
            <button
              onClick={onSuccess}
              className="w-full py-3.5 bg-[#111111] hover:bg-zinc-800 text-white font-bold rounded-xl text-sm transition font-sans"
            >
              Sign In with New Password
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full pl-4 pr-11 py-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none shadow-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none shadow-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-[#111111] hover:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Update Password</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
