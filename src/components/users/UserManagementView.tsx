import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Shield,
  Building2,
  CheckCircle2,
  XCircle,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  X,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Profile, Branch, UserRole, CreateUserInput } from '../../types/index';

interface UserManagementViewProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

const VALID_ROLES: UserRole[] = [
  'OWNER',
  'MANAGER',
  'CASHIER',
  'CREW',
  'WAREHOUSEMAN',
  'KITCHEN'
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen
}) => {
  const { user, isOwner } = useAuth();
  const [users, setUsers] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem('tagpuan_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((u: any) => u.email?.toLowerCase() !== 'owner@tagpuan.ph');
        }
      }
    } catch (e) {}
    return [];
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Create User Form State
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('CREW');
  const [createBranchId, setCreateBranchId] = useState<string>('');
  const [createKioskPin, setCreateKioskPin] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Kiosk PIN State for table & Owner Reset Modal
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [resetPinUser, setResetPinUser] = useState<Profile | null>(null);
  const [resetPinValue, setResetPinValue] = useState<string>('');
  const [resetPinLoading, setResetPinLoading] = useState(false);
  const [resetPinError, setResetPinError] = useState<string | null>(null);

  // Edit Branch Modal State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editBranchId, setEditBranchId] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);

  // Notification Toast State
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const fetchUsersAndBranches = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData] = await Promise.all([
        api.getUsers(),
        api.getBranches()
      ]);
      setUsers(usersData);
      try {
        localStorage.setItem('tagpuan_users', JSON.stringify(usersData));
        localStorage.setItem('tagpuan_admin_users', JSON.stringify(usersData));
      } catch (e) {}
      setBranches(branchesData);
      if (branchesData.length > 0 && !createBranchId) {
        setCreateBranchId(branchesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load user management data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndBranches();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword || !createFullName) {
      setCreateError('Please fill in all required fields.');
      return;
    }
    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters long.');
      return;
    }
    if (createRole !== 'OWNER' && !createBranchId) {
      setCreateError('Please assign a branch to this employee.');
      return;
    }

    if (createRole === 'MANAGER' && createKioskPin.trim()) {
      if (!/^\d{4,6}$/.test(createKioskPin.trim())) {
        setCreateError('Kiosk Terminal PIN must be between 4 and 6 numeric digits.');
        return;
      }
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await api.createUser({
        email: createEmail.trim(),
        password: createPassword,
        full_name: createFullName.trim(),
        role: createRole,
        branch_id: createRole === 'OWNER' ? null : createBranchId,
        kiosk_pin: createRole === 'MANAGER' && createKioskPin.trim() ? createKioskPin.trim() : undefined
      });

      // Reset form
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      setCreateKioskPin('');
      setCreateRole('CREW');
      setIsCreateModalOpen(false);

      if (res?.profile) {
        const nextUsers = [...users, res.profile];
        setUsers(nextUsers);
        try {
          localStorage.setItem('tagpuan_users', JSON.stringify(nextUsers));
          localStorage.setItem('tagpuan_admin_users', JSON.stringify(nextUsers));
        } catch (e) {}
      }
      await fetchUsersAndBranches();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (targetUser: Profile) => {
    if (!isOwner) return;
    try {
      await api.toggleUserStatus(targetUser.id, !targetUser.is_active);
      await fetchUsersAndBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (targetUser: Profile) => {
    if (!isOwner) return;

    console.log(`[UserManagement] Initiating deletion for user: ${targetUser.id} (${targetUser.email})`);

    // 1. Immediately remove the user from local React state so row disappears instantly
    const updatedUsers = users.filter((u) => u.id !== targetUser.id);
    setUsers(updatedUsers);

    // 2. Immediately persist updated users list to localStorage
    try {
      localStorage.setItem('tagpuan_users', JSON.stringify(updatedUsers));
      localStorage.setItem('tagpuan_admin_users', JSON.stringify(updatedUsers));
    } catch (e) {
      console.warn('Failed to save updated users to localStorage:', e);
    }

    // 3. Send async DELETE request with active session token
    try {
      const token =
        localStorage.getItem('tagpuan_auth_token') ||
        sessionStorage.getItem('tagpuan_auth_token') ||
        localStorage.getItem('tagpuan_token') ||
        sessionStorage.getItem('tagpuan_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');

      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      console.log(`[UserManagement] User ${targetUser.id} (${targetUser.email}) deleted successfully from server:`, data);
      showToast(`User "${targetUser.full_name}" has been permanently deleted.`, 'success');
    } catch (err: any) {
      console.error(`[UserManagement] Failed to delete user ${targetUser.id} on server:`, err);
      showToast(err.message || 'Failed to delete user on server.', 'error');
      // On failure, re-sync with server
      fetchUsersAndBranches();
    }
  };

  const handleSaveBranchAssignment = async () => {
    if (!editingUser || !isOwner) return;
    try {
      setEditLoading(true);
      await api.assignUserBranch(editingUser.id, editingUser.role === 'OWNER' ? null : editBranchId);
      setEditingUser(null);
      await fetchUsersAndBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to update branch assignment.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveKioskPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinUser) return;
    const cleanPin = resetPinValue.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setResetPinError('PIN must be 4 to 6 numeric digits.');
      return;
    }
    setResetPinLoading(true);
    setResetPinError(null);
    try {
      await api.updateUserKioskPin(resetPinUser.id, cleanPin);
      setResetPinUser(null);
      setResetPinValue('');
      await fetchUsersAndBranches();
    } catch (err: any) {
      setResetPinError(err.message || 'Failed to update Kiosk PIN.');
    } finally {
      setResetPinLoading(false);
    }
  };

  // Filtered list
  const filteredUsers = users
    .filter((u) => {
      // Exclude trial owner if another owner exists
      if (u.email?.toLowerCase() === 'owner@tagpuan.ph') {
        const hasOtherOwner = users.some(
          (o) => o.role === 'OWNER' && o.email?.toLowerCase() !== 'owner@tagpuan.ph'
        );
        if (hasOtherOwner) return false;
      }
      return true;
    })
    .filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.branch_name && u.branch_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesBranch = branchFilter === 'ALL' || u.branch_id === branchFilter;

      return matchesSearch && matchesRole && matchesBranch;
    });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-[#CDEBC5] text-[#111111] border-[#a3d995] font-bold';
      case 'MANAGER':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
      case 'CASHIER':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      case 'CREW':
        return 'bg-teal-50 text-teal-800 border-teal-200 font-semibold';
      case 'WAREHOUSEMAN':
        return 'bg-purple-50 text-purple-800 border-purple-200 font-semibold';
      case 'KITCHEN':
        return 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-zinc-800" />
            <span>{isOwner ? 'User & Role Management' : 'Branch Staff'}</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isOwner
              ? 'Authorized Owner governance: provision employee credentials, assign branches, and manage roles.'
              : 'Branch team directory and operational staff assignments.'}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            id="create-user-modal-btn"
            className="px-4 py-2.5 bg-[#111111] hover:bg-[#262626] active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#CDEBC5]" />
            <span>Create New User</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or branch..."
            className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] placeholder-zinc-400 outline-none transition"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-zinc-800 outline-none transition font-medium"
          >
            <option value="ALL">All Roles</option>
            {VALID_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {isOwner && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-zinc-800 outline-none transition font-medium"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] border-b border-[#e5e7eb] text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Assigned Branch</th>
                <th className="py-3.5 px-4">Kiosk PIN</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                {isOwner && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 7 : 6} className="py-8 text-center text-zinc-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f8fafc] transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center font-bold text-xs text-[#CDEBC5]">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#111111] text-xs">{u.full_name}</p>
                          <p className="text-[11px] text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{u.branch_name || (u.role === 'OWNER' ? 'Global Access' : 'Unassigned')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'MANAGER' ? (
                        <div className="flex items-center gap-2">
                          {u.kiosk_pin ? (
                            <>
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded border border-zinc-200 text-zinc-800">
                                {visiblePins[u.id] ? u.kiosk_pin : '••••••'}
                              </span>
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => setVisiblePins(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                  className="p-1 text-zinc-400 hover:text-zinc-700 transition rounded"
                                  title={visiblePins[u.id] ? 'Hide PIN' : 'Reveal PIN'}
                                >
                                  {visiblePins[u.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Unconfigured
                            </span>
                          )}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setResetPinUser(u);
                                setResetPinValue(u.kiosk_pin || '');
                                setResetPinError(null);
                              }}
                              className="text-[10px] text-zinc-500 hover:text-[#111111] hover:underline font-bold ml-1 flex items-center gap-0.5"
                              title="Set or Reset PIN"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>{u.kiosk_pin ? 'Reset' : 'Set'}</span>
                            </button>
                          )}
                        </div>
                      ) : u.role === 'OWNER' ? (
                        <span className="text-[11px] font-mono text-zinc-400 font-medium">Master (8888)</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#166534]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role !== 'OWNER' && (
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditBranchId(u.branch_id || (branches[0]?.id || ''));
                              }}
                              className="p-1.5 text-zinc-500 hover:text-[#111111] rounded-lg hover:bg-zinc-100 transition"
                              title="Reassign Branch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={u.role === 'OWNER' && users.filter((o) => o.role === 'OWNER' && o.is_active).length <= 1}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                              u.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-[#f0f9ee] text-[#166534] hover:bg-[#e1f5dd] border border-[#a3d995]'
                            } ${u.role === 'OWNER' && users.filter((o) => o.role === 'OWNER' && o.is_active).length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL (Owner Only) */}
      {isCreateModalOpen && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-lg bg-white border border-[#e5e7eb] rounded-2xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            id="create-user-modal"
          >
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-[#111111] rounded-lg hover:bg-zinc-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center text-[#CDEBC5]">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111111] tracking-tight">Create Tagpuan User</h3>
                <p className="text-xs text-zinc-500">Owner Provisioning System</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  required
                  className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] placeholder-zinc-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  Gmail / Work Email *
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. jdelacruz@tagpuan.ph"
                  required
                  className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] placeholder-zinc-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  Initial Password (Min. 6 characters) *
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Enter initial password"
                  required
                  className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] placeholder-zinc-400 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-zinc-500" />
                    Assigned Role *
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] outline-none transition font-medium"
                  >
                    {VALID_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    Assigned Branch {createRole === 'OWNER' ? '(N/A - Global)' : '*'}
                  </label>
                  <select
                    value={createBranchId}
                    onChange={(e) => setCreateBranchId(e.target.value)}
                    disabled={createRole === 'OWNER'}
                    className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] disabled:opacity-40 rounded-xl text-xs text-[#111111] outline-none transition font-medium"
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manager Kiosk PIN Field */}
              {createRole === 'MANAGER' && (
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-zinc-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-zinc-600" />
                      Kiosk Terminal PIN (4-6 Digits)
                    </label>
                    <span className="text-[10px] text-zinc-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={createKioskPin}
                    onChange={(e) => setCreateKioskPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234 (Leave blank for Manager first-login setup)"
                    className="w-full px-3 py-2 bg-white border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] placeholder:text-zinc-400 outline-none transition font-mono tracking-wider"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                    If left blank, the Manager will be prompted to create their PIN upon their first login.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-zinc-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 bg-[#111111] hover:bg-[#262626] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#CDEBC5]" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH REASSIGNMENT MODAL */}
      {editingUser && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#111111] mb-1">Reassign Branch</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Update branch location for <span className="text-[#111111] font-semibold">{editingUser.full_name}</span> ({editingUser.role})
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Select New Branch</label>
              <select
                value={editBranchId}
                onChange={(e) => setEditBranchId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] outline-none transition font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-zinc-700 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editLoading}
                onClick={handleSaveBranchAssignment}
                className="flex-1 py-2.5 bg-[#111111] hover:bg-[#262626] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#CDEBC5]" /> : <span>Update Branch</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Reset Kiosk PIN Modal */}
      {resetPinUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#e5e7eb] p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111111]">Set Kiosk Terminal PIN</h3>
                  <p className="text-[11px] text-zinc-500">{resetPinUser.full_name} ({resetPinUser.branch_name || 'Branch Manager'})</p>
                </div>
              </div>
              <button
                onClick={() => setResetPinUser(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKioskPin} className="space-y-4">
              {resetPinError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{resetPinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  New PIN (4 to 6 numeric digits) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetPinValue}
                  onChange={(e) => {
                    setResetPinValue(e.target.value.replace(/\D/g, ''));
                    setResetPinError(null);
                  }}
                  placeholder="Enter 4-6 digits"
                  className="w-full px-4 py-2.5 bg-[#f8fafc] border border-zinc-300 focus:border-[#111111] rounded-xl text-center text-lg font-mono tracking-widest text-[#111111] placeholder:text-zinc-400 placeholder:text-xs placeholder:tracking-normal outline-none transition"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPinUser(null)}
                  className="flex-1 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-zinc-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPinLoading || resetPinValue.length < 4}
                  className="flex-1 py-2.5 bg-[#111111] hover:bg-[#262626] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  {resetPinLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#CDEBC5]" /> : <span>Save PIN</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
