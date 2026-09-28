import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Power,
  RefreshCw,
  Loader2,
  Mail,
  Lock,
  BadgeCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Employee, Branch, UserRole, EmployeeStatus } from '../../types/index';

export const EmployeeManagementView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const { addNotification } = useNotifications();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'CREW' as UserRole,
    branch_id: '',
    password: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch employees
  const fetchEmployees = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();
      if (filterRole) params.append('role', filterRole);
      if (filterBranch) params.append('branch_id', filterBranch);
      if (filterStatus) params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
        if (data.branches?.length > 0 && !formData.branch_id) {
          setFormData(prev => ({ ...prev, branch_id: data.branches[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [filterRole, filterBranch, filterStatus]);

  // Handle Add Employee Submit
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      addNotification('Employee Created', `${formData.full_name} registered successfully.`, 'SUCCESS');
      setIsAddModalOpen(false);
      setFormData({
        full_name: '',
        email: '',
        role: 'CREW',
        branch_id: branches[0]?.id || '',
        password: ''
      });
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Employee Submit
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          role: formData.role,
          branch_id: formData.role === 'OWNER' ? null : formData.branch_id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update employee');
      }

      addNotification('Employee Updated', `${formData.full_name} updated successfully.`, 'SUCCESS');
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (employee: Employee) => {
    const newStatus: EmployeeStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch(`/api/employees/${employee.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle employee status');
      }

      addNotification('Status Updated', `${employee.full_name} is now ${newStatus}.`, 'SUCCESS');
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      full_name: emp.full_name,
      email: emp.email,
      role: emp.role,
      branch_id: emp.branch_id || (branches[0]?.id || ''),
      password: ''
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-[#111111] text-[#CDEBC5] border-[#2e2e2e]';
      case 'MANAGER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CASHIER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CREW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WAREHOUSEMAN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'KITCHEN':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider rounded-full bg-[#CDEBC5] text-[#111111]">
              Phase 2 • Employee Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight mt-1">
            Employee Management
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">
            Manage Tagpuan team members, branch assignments, roles, and connected user accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEmployees}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#e5e7eb] hover:bg-[#f8fafc] text-[#111111] font-bold text-xs shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {isOwner && (
            <button
              id="btn-add-employee"
              onClick={() => {
                setFormData({
                  full_name: '',
                  email: '',
                  role: 'CREW',
                  branch_id: branches[0]?.id || '',
                  password: ''
                });
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] font-bold text-xs shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code, employee name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111111]"
          />
        </div>

        {/* Role Filter */}
        <div className="min-w-[140px]">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111]"
          >
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="CREW">Crew</option>
            <option value="WAREHOUSEMAN">Warehouseman</option>
            <option value="KITCHEN">Kitchen</option>
          </select>
        </div>

        {/* Branch Filter (Owner only) */}
        {isOwner && (
          <div className="min-w-[160px]">
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111]"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div className="min-w-[130px]">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl bg-white border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-700" />
            <h3 className="text-sm font-bold text-[#111111]">Employee Directory</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#f1f5f9] text-zinc-600 text-[11px] font-mono font-bold">
              {employees.length} team members
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#111111]" />
            <p className="text-xs font-mono">Loading Tagpuan employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm font-bold text-zinc-700">No employees match criteria</p>
            <p className="text-xs text-zinc-500 mt-1">Add team members or adjust search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-zinc-500 font-mono text-[10px] uppercase tracking-wider border-b border-[#e5e7eb]">
                <tr>
                  <th className="px-4 py-3 font-bold">Code</th>
                  <th className="px-4 py-3 font-bold">Full Name</th>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">Assigned Branch</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">User Link</th>
                  {isOwner && <th className="px-4 py-3 font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {employees.map((emp) => {
                  const isEmpActive = emp.status === 'ACTIVE';

                  return (
                    <tr key={emp.id} className="hover:bg-[#f8fafc] transition">
                      {/* Code */}
                      <td className="px-4 py-3.5 font-mono font-bold text-[#111111]">
                        {emp.employee_code || `EMP-${emp.id.slice(0, 4)}`}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5 font-bold text-[#111111]">
                        {emp.full_name}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-zinc-600 font-mono text-[11px]">
                        {emp.email}
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded-full border ${getRoleBadge(emp.role)}`}>
                          {emp.role}
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-3.5 font-medium text-zinc-700">
                        {emp.role === 'OWNER' ? 'All Branches (Global Access)' : (emp.branch_name || 'Unassigned')}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isEmpActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isEmpActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>

                      {/* Connected User Link */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600">
                          <BadgeCheck className="w-3.5 h-3.5 text-[#166534]" />
                          <span>Connected</span>
                        </span>
                      </td>

                      {/* Owner Actions */}
                      {isOwner && (
                        <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            title="Edit Employee"
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(emp)}
                            title={isEmpActive ? 'Deactivate Employee' : 'Activate Employee'}
                            className={`p-1.5 rounded-lg transition ${
                              isEmpActive
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#111111]" />
                <h3 className="text-base font-bold text-[#111111]">Add New Employee</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maria.tagpuan@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    System Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-semibold focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="CREW">CREW</option>
                    <option value="WAREHOUSEMAN">WAREHOUSEMAN</option>
                    <option value="KITCHEN">KITCHEN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Branch Assignment {formData.role === 'OWNER' ? '(Global)' : '*'}
                  </label>
                  <select
                    disabled={formData.role === 'OWNER'}
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] disabled:opacity-50"
                  >
                    {formData.role === 'OWNER' ? (
                      <option value="">All Branches</option>
                    ) : (
                      branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Initial Login Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Creates linked authenticated user profile for employee.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Employee...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#111111]" />
                <h3 className="text-base font-bold text-[#111111]">
                  Edit Employee: {selectedEmployee.employee_code}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-semibold focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="CREW">CREW</option>
                    <option value="WAREHOUSEMAN">WAREHOUSEMAN</option>
                    <option value="KITCHEN">KITCHEN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Branch Assignment
                  </label>
                  <select
                    disabled={formData.role === 'OWNER'}
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] disabled:opacity-50"
                  >
                    {formData.role === 'OWNER' ? (
                      <option value="">All Branches</option>
                    ) : (
                      branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-[#222222] text-[#CDEBC5] text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
