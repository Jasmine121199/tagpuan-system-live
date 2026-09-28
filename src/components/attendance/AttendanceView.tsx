import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  CalendarRange,
  Coffee
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, Branch } from '../../types/index';
import { QuickClockWidget } from './QuickClockWidget';

export const AttendanceView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchAttendance = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('tagpuan_token');
      let url = '/api/attendance?';
      const params = new URLSearchParams();

      if (selectedBranch) params.append('branch_id', selectedBranch);
      if (selectedDate) params.append('date', selectedDate);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(`${url}${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.attendance || []);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchBranches = async () => {
    if (!isOwner) return;
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchAttendance();
  }, [selectedBranch, selectedDate, startDate, endDate]);

  // Client-side search filtering by name or role
  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r?.employee_name || '').toLowerCase().includes(q) ||
      (r?.employee_role || '').toLowerCase().includes(q) ||
      (r?.branch_name && r.branch_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold font-mono uppercase tracking-wider rounded-full bg-[#CDEBC5] text-[#111111]">
              Phase 2 • Attendance Tracking
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight mt-1">
            Shift Attendance & Logs
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">
            Authoritative server-side timestamps for Tagpuan crew clock-in, clock-out, and break duration.
          </p>
        </div>

        <button
          onClick={fetchAttendance}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e5e7eb] hover:bg-[#f8fafc] text-[#111111] font-bold text-xs shadow-sm transition self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Clock In / Out Quick Widget */}
      <QuickClockWidget onStatusChange={fetchAttendance} />

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111111]"
            />
          </div>

          {/* Branch Filter (Owner only) */}
          {isOwner && (
            <div className="min-w-[180px]">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] font-medium focus:outline-none focus:ring-2 focus:ring-[#111111]"
              >
                <option value="">All 17 Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Specific Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-[11px] text-zinc-500 hover:text-[#111111] font-bold"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {/* Date Range Options */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f1f5f9] text-xs text-zinc-500">
          <span className="font-semibold text-zinc-700">Date Range:</span>
          <input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setSelectedDate('');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[11px] text-[#111111]"
          />
          <span>to</span>
          <input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setSelectedDate('');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[11px] text-[#111111]"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] text-rose-600 hover:underline font-bold ml-2"
            >
              Reset Range
            </button>
          )}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="rounded-2xl bg-white border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-700" />
            <h3 className="text-sm font-bold text-[#111111]">Attendance History</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#f1f5f9] text-zinc-600 text-[11px] font-mono font-bold">
              {filteredRecords.length} records
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#111111]" />
            <p className="text-xs font-mono">Loading authoritative attendance logs...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm font-bold text-zinc-700">No attendance logs found</p>
            <p className="text-xs text-zinc-500 mt-1">Clock in using the button above to record the first shift.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-zinc-500 font-mono text-[10px] uppercase tracking-wider border-b border-[#e5e7eb]">
                <tr>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Employee</th>
                  <th className="px-4 py-3 font-bold">Branch Location</th>
                  <th className="px-4 py-3 font-bold">Clock In</th>
                  <th className="px-4 py-3 font-bold">Clock Out</th>
                  <th className="px-4 py-3 font-bold">Duration</th>
                  <th className="px-4 py-3 font-bold">Break Rule</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filteredRecords.map((r) => {
                  const isInProgress = r.clock_out === null;
                  const totalHrs = (r.total_minutes || 0) / 60;
                  const hasBreakDeduction = totalHrs >= 5;

                  return (
                    <tr key={r.id} className="hover:bg-[#f8fafc] transition">
                      {/* Date */}
                      <td className="px-4 py-3.5 font-medium text-[#111111] whitespace-nowrap">
                        {r.date}
                      </td>

                      {/* Employee */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#111111]">{r.employee_name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">{r.employee_role}</div>
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-3.5 text-zinc-700 font-medium">
                        {r.branch_name || 'Tagpuan Branch'}
                      </td>

                      {/* Clock In */}
                      <td className="px-4 py-3.5 font-mono text-zinc-700 whitespace-nowrap">
                        {new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Clock Out */}
                      <td className="px-4 py-3.5 font-mono text-zinc-700 whitespace-nowrap">
                        {r.clock_out ? (
                          new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 animate-pulse">
                            Active Shift
                          </span>
                        )}
                      </td>

                      {/* Total Duration */}
                      <td className="px-4 py-3.5 font-mono font-bold text-[#111111] whitespace-nowrap">
                        {isInProgress ? 'In Progress' : r.total_hours_formatted}
                      </td>

                      {/* Break Deduction (1-hour break deduction if >= 5 hours) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isInProgress ? (
                          <span className="text-zinc-400 text-[11px]">—</span>
                        ) : hasBreakDeduction ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-100 text-zinc-700">
                            <Coffee className="w-3 h-3 text-zinc-500" />
                            -1h Break Deducted
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">No break</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#f0fdf4] text-[#166534] border border-[#dcfce7]">
                          <CheckCircle2 className="w-3 h-3" />
                          {r.status}
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
    </div>
  );
};
