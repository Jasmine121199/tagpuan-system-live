import React, { useState, useEffect } from 'react';
import { KitchenOrderHistoryItem, Branch } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../lib/api';
import {
  X,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  ChefHat,
  Loader2,
  Timer,
  FileSpreadsheet
} from 'lucide-react';

interface KDSHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  selectedBranchId: string;
}

export const KDSHistoryModal: React.FC<KDSHistoryModalProps> = ({
  isOpen,
  onClose,
  branches,
  selectedBranchId
}) => {
  const { user, isOwner } = useAuth();
  const [history, setHistory] = useState<KitchenOrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>(selectedBranchId || 'ALL');

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (isOwner && branchFilter !== 'ALL') {
        params.append('branch_id', branchFilter);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/kds/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.warn('Failed to fetch kitchen history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, branchFilter]);

  if (!isOpen) return null;

  const filteredHistory = history.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.order_number.toLowerCase().includes(q) ||
      item.items_summary.toLowerCase().includes(q) ||
      (item.branch_name && item.branch_name.toLowerCase().includes(q))
    );
  });

  // Helper to format seconds into readable mm:ss or mm mins
  const formatDuration = (seconds?: number | null) => {
    if (seconds === undefined || seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 tracking-tight">
                Kitchen Preparation Logs & Analytics
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Live historical prep durations and completed ticket metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-zinc-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order # or item..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#111111]"
            />
          </div>

          {isOwner && (
            <div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#111111] font-medium"
              >
                <option value="ALL">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#111111] mb-2" />
              <p className="text-xs font-mono">Loading kitchen history records...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              <Timer className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm font-bold text-zinc-700">No Kitchen Records Found</p>
              <p className="text-xs text-zinc-500 mt-1">Orders completed in the kitchen will show up here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-mono font-bold">
                  <tr>
                    <th className="py-3 px-3">Order #</th>
                    <th className="py-3 px-3">Branch</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3">Received</th>
                    <th className="py-3 px-3">Ready At</th>
                    <th className="py-3 px-3">Prep Duration</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredHistory.map((item) => {
                    const isLongPrep = (item.total_duration_seconds || 0) > 900; // >15m
                    return (
                      <tr key={item.order_id} className="hover:bg-zinc-50/80 transition">
                        <td className="py-3 px-3 font-mono font-black text-zinc-900">
                          {item.order_number}
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            {item.source} • {item.dining_option || 'Dine In'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-700 font-medium">
                          {item.branch_name}
                        </td>
                        <td className="py-3 px-3 text-zinc-800 max-w-xs truncate">
                          <span className="font-semibold">{item.items_summary}</span>
                        </td>
                        <td className="py-3 px-3 text-zinc-500 font-mono">
                          {formatTime(item.kitchen_received_at)}
                        </td>
                        <td className="py-3 px-3 text-zinc-500 font-mono">
                          {formatTime(item.ready_at || item.completed_at)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                            isLongPrep ? 'bg-rose-100 text-rose-800 font-black' : 'bg-[#CDEBC5] text-[#111111]'
                          }`}>
                            {formatDuration(item.total_duration_seconds || item.preparation_duration_seconds)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-800">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500 font-medium">
          <span>Showing {filteredHistory.length} most recent kitchen records</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#111111] text-[#CDEBC5] hover:bg-black font-extrabold text-xs transition"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
