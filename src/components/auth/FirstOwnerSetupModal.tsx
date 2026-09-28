import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FirstOwnerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirstOwnerSetupModal: React.FC<FirstOwnerSetupModalProps> = ({ isOpen, onClose }) => {
  const { bootstrapFirstOwner } = useAuth();
  const [email, setEmail] = useState('janzenmarkglori@gmail.com');
  const [fullName, setFullName] = useState('Janzen Mark Glori');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await bootstrapFirstOwner({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        masterKey: masterKey.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Setup authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 shadow-2xl relative"
        id="first-owner-setup-modal"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#111111] flex items-center justify-center text-[#CDEBC5]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#111111] tracking-tight">First Owner Governance Setup</h3>
            <p className="text-xs text-zinc-500">Tagpuan ERP Security Provisioning</p>
          </div>
        </div>

        <p className="text-xs text-zinc-600 mb-5 leading-relaxed">
          Initialize the primary system Owner account. Once established, only the Owner can provision additional employees, assign branch scopes, or manage ERP security.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Owner Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Maria Tagpuan Santos"
              required
              className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              Owner Gmail / Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. janzenmarkglori@gmail.com"
              required
              className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              Initial Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              Server Master Key (Optional if fresh install)
            </label>
            <input
              type="password"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              placeholder="Default: tagpuan-owner-setup-key"
              className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] focus:bg-white rounded-xl text-sm text-[#111111] placeholder-zinc-400 outline-none transition shadow-sm"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#111111] hover:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <span>Establish Owner</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
