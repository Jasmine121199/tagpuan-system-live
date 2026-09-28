import React, { useState, useEffect } from 'react';
import { FileText, Shield, Search, Filter, Clock, User, Building2, Download, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AuditLog } from '../../types/index';

export const AuditLogsView: React.FC = () => {
  const { isOwner, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.branch_name && log.branch_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('LOGIN')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (action.includes('LOGOUT')) return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    if (action.includes('CREATED')) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (action.includes('ACTIVATED') || action.includes('DEACTIVATED')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (action.includes('PASSWORD')) return 'bg-purple-50 text-purple-800 border-purple-200';
    return 'bg-[#f0f9ee] text-[#166534] border-[#a3d995]';
  };

  const exportLogsAsJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredLogs, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `tagpuan_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-zinc-800" />
            <span>Audit Logging Trail</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isOwner
              ? 'Immutable system audit logs tracking authentication, user creation, role assignment, and branch actions.'
              : `Branch-specific operational audit trail for ${user?.branch_name}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e5e7eb] shadow-sm text-xs">
            <Lock className="w-3.5 h-3.5 text-zinc-700" />
            <span className="text-zinc-500">Log Integrity:</span>
            <span className="text-[#166534] font-bold">Immutable Append-Only</span>
          </div>
          {isOwner && (
            <button
              onClick={exportLogsAsJSON}
              className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold rounded-xl border border-[#e5e7eb] shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-zinc-700" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, email, role, or entity..."
            className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-[#111111] placeholder-zinc-400 outline-none transition"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#111111] rounded-xl text-xs text-zinc-800 outline-none transition font-medium"
        >
          <option value="ALL">All Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_ACTIVATED">USER_ACTIVATED</option>
          <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
          <option value="BRANCH_ASSIGNED">BRANCH_ASSIGNED</option>
          <option value="PASSWORD_RESET_REQUESTED">PASSWORD_RESET_REQUESTED</option>
          <option value="PASSWORD_RESET_COMPLETED">PASSWORD_RESET_COMPLETED</option>
          <option value="SYSTEM_INITIALIZED">SYSTEM_INITIALIZED</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] border-b border-[#e5e7eb] text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">User / Actor</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Branch Scope</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No audit logs matching current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f8fafc] transition">
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#111111]">{log.user_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-zinc-700 bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#e2e8f0] font-semibold">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-700 font-medium">
                      {log.branch_name || (log.role === 'OWNER' ? 'Global Scope' : 'N/A')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-zinc-500 font-mono max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
