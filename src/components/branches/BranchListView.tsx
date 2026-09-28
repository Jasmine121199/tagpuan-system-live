import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Search,
  Users,
  MapPin,
  Lock,
  QrCode,
  Edit3,
  Clock,
  Phone,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Activity,
  AlertTriangle,
  Sparkles,
  Tag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Branch, Profile } from '../../types/index';
import { BranchKioskQRModal } from '../kiosk/BranchKioskQRModal';
import { PrintableTableQRModal } from '../kiosk/PrintableTableQRModal';
import { EditBranchModal } from './EditBranchModal';

export const BranchListView: React.FC = () => {
  const { isOwner, isManager, user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchForQR, setSelectedBranchForQR] = useState<Branch | null>(null);
  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState<Branch | null>(null);
  const [isTableQRModalOpen, setIsTableQRModalOpen] = useState(false);
  const [selectedBranchForTableQR, setSelectedBranchForTableQR] = useState<Branch | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const [branchesData, usersData] = await Promise.all([
        api.getBranches(),
        api.getUsers()
      ]);
      setBranches(branchesData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load branches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const getStaffCount = (branchId: string) => {
    return users.filter(u => u.branch_id === branchId && u.is_active).length;
  };

  const togglePinReveal = (branchId: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }));
  };

  const handleQuickStatusChange = async (branch: Branch, newStatus: 'OPEN' | 'MAINTENANCE' | 'CLOSED') => {
    if (!isOwner) return;
    try {
      setStatusActionLoading(branch.id);
      const updated = await api.toggleBranchStatus(branch.id, newStatus, newStatus !== 'CLOSED');
      setBranches(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    } catch (err) {
      console.error('Failed to toggle branch status', err);
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleBranchSaved = (updated: Branch) => {
    setBranches(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const filteredBranches = branches.filter(b => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.manager_name && b.manager_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-zinc-800" />
            <span>{isOwner ? '17 Initial Tagpuan Branches' : 'Branch Scope & Operational Info'}</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isOwner
              ? 'Complete operational registry of all 17 seeded Tagpuan branch locations with Master Owner configuration authority.'
              : `Authorized branch terminal data strictly isolated to ${user?.branch_name || 'your assigned branch'}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#e5e7eb] shadow-sm text-xs">
          <ShieldCheck className="w-4 h-4 text-zinc-700" />
          <span className="text-zinc-500">Database Isolation:</span>
          <span className="text-[#166534] font-bold">
            {isOwner ? 'Global Authority (17/17)' : 'Single Branch Enforced'}
          </span>
        </div>
      </div>

      {/* Search Bar & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isOwner && (
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by branch name, code, address, or manager..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5e7eb] focus:border-[#111111] rounded-xl text-xs text-[#111111] placeholder-zinc-400 outline-none shadow-sm transition"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            id="btn-open-table-qr-generator"
            onClick={() => {
              setSelectedBranchForTableQR(branches[0] || null);
              setIsTableQRModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] font-black transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            title="Generate scannable Dine-In Table QR codes and Printable Table Tent Cards"
          >
            <QrCode className="w-4 h-4 text-[#CDEBC5]" />
            <span>Table QR Generator & Tent Cards</span>
          </button>

          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            {branches.filter(b => b.operating_status === 'OPEN' || (!b.operating_status && b.is_active)).length} Open
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
            {branches.filter(b => b.operating_status === 'MAINTENANCE').length} Maintenance
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-bold">
            {branches.length} Total
          </span>
        </div>
      </div>

      {/* Branch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map((branch, index) => {
          const staffCount = getStaffCount(branch.id);
          const isUserBranch = user?.branch_id === branch.id;
          const canViewPin = isOwner || (isManager && isUserBranch);
          const isPinRevealed = revealedPins[branch.id];
          const isStatusLoading = statusActionLoading === branch.id;

          const status = branch.operating_status || (branch.is_active ? 'OPEN' : 'CLOSED');

          return (
            <div
              key={branch.id}
              className={`p-5 rounded-2xl bg-white border transition relative overflow-hidden flex flex-col justify-between ${
                isUserBranch
                  ? 'border-[#111111] shadow-md ring-2 ring-[#CDEBC5]'
                  : 'border-[#e5e7eb] hover:border-zinc-400 shadow-sm'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center text-[#CDEBC5] font-black text-xs shrink-0">
                      {branch.code ? branch.code.replace('TAG-', '') : index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-[#111111] flex items-center gap-1.5 truncate">
                        <span className="truncate">{branch.name}</span>
                        {isUserBranch && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#CDEBC5] text-[#111111] font-bold shrink-0">
                            Your Branch
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-bold text-zinc-700">
                          {branch.code || `TAG-${String(index + 1).padStart(2, '0')}`}
                        </span>
                        <span>Tagpuan Food Hub</span>
                      </div>
                    </div>
                  </div>

                  {/* Operating Status Badge */}
                  <div className="shrink-0">
                    {isOwner ? (
                      <select
                        value={status}
                        disabled={isStatusLoading}
                        onChange={(e) => handleQuickStatusChange(branch, e.target.value as any)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer outline-none ${
                          status === 'OPEN'
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                            : status === 'MAINTENANCE'
                            ? 'text-amber-800 bg-amber-50 border-amber-300'
                            : 'text-zinc-600 bg-zinc-100 border-zinc-300'
                        }`}
                        title="Master Owner: Click to quickly change operational status"
                      >
                        <option value="OPEN">● Open</option>
                        <option value="MAINTENANCE">🛠️ Maint.</option>
                        <option value="CLOSED">⛔ Closed</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          status === 'OPEN'
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                            : status === 'MAINTENANCE'
                            ? 'text-amber-800 bg-amber-50 border-amber-200'
                            : 'text-zinc-600 bg-zinc-100 border-zinc-200'
                        }`}
                      >
                        {status === 'OPEN' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {status === 'MAINTENANCE' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        <span>{status}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Address & Landmark */}
                <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/70 space-y-1.5 text-xs mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-zinc-800 font-medium text-[11px] leading-tight">
                        {branch.address || 'Address on file'}
                      </p>
                      {branch.landmark && (
                        <p className="text-[10px] text-zinc-500 italic mt-0.5">
                          Landmark: {branch.landmark}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Manager & Phone */}
                  <div className="pt-2 border-t border-zinc-200/50 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-zinc-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-zinc-400 block">Manager:</span>
                        <span className="font-semibold text-zinc-800 truncate block">
                          {branch.manager_name || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-zinc-400 block">Hotline:</span>
                        <span className="font-mono text-zinc-800 text-[10px] truncate block">
                          {branch.phone || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hours & Staff */}
                  <div className="pt-2 border-t border-zinc-200/50 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Store Hours:</span>
                        <span className="font-mono text-[10px] text-zinc-800 font-bold">
                          {branch.opening_time || '08:00 AM'} - {branch.closing_time || '10:00 PM'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-zinc-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Staff:</span>
                        <span className="font-mono text-[10px] text-zinc-800 font-bold">
                          {staffCount} active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Kiosk PIN (Restricted RLS) */}
                  <div className="pt-2 border-t border-zinc-200/50 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 flex items-center gap-1 text-[10px]">
                      <KeyRound className="w-3 h-3 text-zinc-400" />
                      Kiosk Terminal PIN:
                    </span>

                    {canViewPin ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-zinc-900 tracking-widest text-xs px-2 py-0.5 rounded bg-zinc-100">
                          {isPinRevealed ? (branch.kiosk_pin || '1234') : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePinReveal(branch.id)}
                          className="text-zinc-400 hover:text-zinc-700 p-0.5"
                          title={isPinRevealed ? 'Hide PIN' : 'Show PIN'}
                        >
                          {isPinRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>•••• (Protected)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 mt-auto">
                <span className="text-[10px] text-zinc-400 font-mono truncate">
                  ID: {branch.id.slice(0, 8)}...
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Master Owner Edit Button */}
                  {isOwner && (
                    <button
                      type="button"
                      id={`btn-edit-branch-${branch.id}`}
                      onClick={() => setSelectedBranchForEdit(branch)}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Edit branch operational parameters"
                    >
                      <Edit3 className="w-3 h-3 text-zinc-600" />
                      <span>Edit</span>
                    </button>
                  )}

                  {/* Table QR Generator & Tent Cards Modal */}
                  <button
                    type="button"
                    id={`btn-table-qr-${branch.id}`}
                    onClick={() => {
                      setSelectedBranchForTableQR(branch);
                      setIsTableQRModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-400 text-amber-950 text-[11px] font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    title="Generate Dine-In Table QR Codes and Printable Tent Cards for this branch"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-950" />
                    <span>Table QR Cards</span>
                  </button>

                  {/* Kiosk QR Poster Modal */}
                  <button
                    type="button"
                    id={`btn-kiosk-qr-${branch.id}`}
                    onClick={() => setSelectedBranchForQR(branch)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] text-[11px] font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    title="Generate Counter Kiosk Standee Poster"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#CDEBC5]" />
                    <span>Poster</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBranches.length === 0 && (
        <div className="p-8 text-center bg-white border border-[#e5e7eb] rounded-2xl text-xs text-zinc-500 shadow-sm">
          No branches found matching your search.
        </div>
      )}

      {/* Edit Branch Modal (Master Owner) */}
      {selectedBranchForEdit && (
        <EditBranchModal
          branch={selectedBranchForEdit}
          isOpen={!!selectedBranchForEdit}
          onClose={() => setSelectedBranchForEdit(null)}
          onSaved={handleBranchSaved}
        />
      )}

      {/* Counter Kiosk Poster Modal */}
      {selectedBranchForQR && (
        <BranchKioskQRModal
          branch={selectedBranchForQR}
          isOpen={!!selectedBranchForQR}
          onClose={() => setSelectedBranchForQR(null)}
        />
      )}

      {/* Table QR Generator & Printable Tent Cards Modal */}
      {isTableQRModalOpen && (
        <PrintableTableQRModal
          branch={selectedBranchForTableQR || branches[0] || null}
          branches={branches}
          isOpen={isTableQRModalOpen}
          onClose={() => {
            setIsTableQRModalOpen(false);
            setSelectedBranchForTableQR(null);
          }}
        />
      )}
    </div>
  );
};
