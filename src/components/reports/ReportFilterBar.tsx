import React from 'react';
import { Calendar, Filter, Building2, ArrowUpDown, RefreshCw } from 'lucide-react';
import { ReportDatePreset, Branch, UserRole } from '../../types/index';

interface ReportFilterBarProps {
  period: ReportDatePreset;
  onPeriodChange: (p: ReportDatePreset) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  selectedBranchId: string;
  onBranchChange: (id: string) => void;
  branches: Branch[];
  userRole: UserRole;
  userBranchName?: string;
  onRefresh: () => void;
  isLoading: boolean;
  sortBy?: string;
  onSortByChange?: (s: string) => void;
  showSortOptions?: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  period,
  onPeriodChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedBranchId,
  onBranchChange,
  branches,
  userRole,
  userBranchName,
  onRefresh,
  isLoading,
  sortBy,
  onSortByChange,
  showSortOptions = false
}) => {
  const isOwner = userRole === 'OWNER';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Date Preset Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          {(['TODAY', 'LAST_7_DAYS', 'MONTHLY', 'YEARLY', 'CUSTOM'] as ReportDatePreset[]).map((p) => {
            const labelMap: Record<ReportDatePreset, string> = {
              TODAY: 'Today',
              LAST_7_DAYS: 'Last 7 Days',
              MONTHLY: 'This Month',
              YEARLY: 'This Year',
              CUSTOM: 'Custom Date'
            };
            const isActive = period === p;
            return (
              <button
                key={p}
                id={`filter-preset-${p.toLowerCase()}`}
                type="button"
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {labelMap[p]}
              </button>
            );
          })}
        </div>

        {/* Right side controls: Custom dates, Branch, Sort & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Date Pickers */}
          {period === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  id="filter-custom-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none"
                />
              </div>
              <span className="text-slate-400 text-xs font-semibold">to</span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  id="filter-custom-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            {isOwner ? (
              <select
                id="filter-branch-select"
                value={selectedBranchId}
                onChange={(e) => onBranchChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-600/30 cursor-pointer"
              >
                <option value="ALL">All Branches (17 Cavite Locations)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {userBranchName || 'Assigned Branch'}
              </div>
            )}
          </div>

          {/* Optional Sort by (e.g. Products) */}
          {showSortOptions && onSortByChange && (
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <select
                id="filter-sort-select"
                value={sortBy || 'highest-sales'}
                onChange={(e) => onSortByChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-600/30 cursor-pointer"
              >
                <option value="highest-sales">Highest Net Sales</option>
                <option value="lowest-sales">Lowest Net Sales</option>
                <option value="highest-quantity">Highest Quantity Sold</option>
                <option value="lowest-quantity">Lowest Quantity Sold</option>
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            id="filter-refresh-btn"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
