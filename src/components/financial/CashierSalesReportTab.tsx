import React, { useState, useEffect } from 'react';
import { CashierSalesSummary, Branch } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Download,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  Award
} from 'lucide-react';

interface CashierSalesReportTabProps {
  branches: Branch[];
}

export const CashierSalesReportTab: React.FC<CashierSalesReportTabProps> = ({ branches }) => {
  const { user, isOwner } = useAuth();
  const [reports, setReports] = useState<CashierSalesSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('this_month');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchCashierSales = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();

      if (datePreset) params.set('date_preset', datePreset);
      if (selectedBranchId) params.set('branch_id', selectedBranchId);

      const response = await fetch(`/api/financial/cashier-sales?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cashier sales.');
      }

      setReports(data.reports);
    } catch (err: any) {
      setError(err.message || 'Error fetching cashier sales report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashierSales();
  }, [datePreset, selectedBranchId]);

  const filteredReports = reports.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.cashier_name.toLowerCase().includes(q) || r.branch_name.toLowerCase().includes(q);
    }
    return true;
  });

  const handleExportCSV = () => {
    const rows = [
      ['Cashier', 'Branch', 'Total Sales (₱)', 'Orders', 'Cash (₱)', 'GCash (₱)', 'Maya (₱)', 'Avg Ticket (₱)', 'Shifts', 'Voids'],
      ...filteredReports.map(r => [
        r.cashier_name,
        r.branch_name,
        r.total_sales.toFixed(2),
        r.order_count.toString(),
        r.cash_sales.toFixed(2),
        r.gcash_sales.toFixed(2),
        r.maya_sales.toFixed(2),
        r.average_order_value.toFixed(2),
        r.shift_count.toString(),
        r.void_count.toString()
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tagpuan_cashier_sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-zinc-800" />
              Cashier Performance & Shift Sales Breakdown
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {filteredReports.length} Cashiers
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'all_time', label: 'All Time' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDatePreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    datePreset === p.id ? 'bg-[#111111] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filteredReports.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-black transition shadow-xs ml-2"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cashier or branch..."
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-zinc-900 focus:bg-white"
            />
          </div>

          {isOwner && (
            <div>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-zinc-900 focus:bg-white"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cashier Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-mono border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Cashier Name</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-right">Total Shift Sales</th>
                <th className="py-3 px-4 text-right">Orders Handled</th>
                <th className="py-3 px-4 text-right">Cash Sales</th>
                <th className="py-3 px-4 text-right">e-Wallet Sales</th>
                <th className="py-3 px-4 text-right">Avg Ticket</th>
                <th className="py-3 px-4 text-center">Shifts Worked</th>
                <th className="py-3 px-4 text-center">Voids</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
                    Loading cashier performance reports...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    No cashier sales found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredReports.map((c, index) => {
                  const eWalletTotal = c.gcash_sales + c.maya_sales;
                  return (
                    <tr key={c.cashier_id} className="hover:bg-zinc-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-zinc-900 flex items-center gap-2">
                        {index === 0 && <Award className="w-4 h-4 text-amber-500" />}
                        {c.cashier_name}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600">
                        {c.branch_name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-900">
                        ₱{c.total_sales.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-700">
                        {c.order_count}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                        ₱{c.cash_sales.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-700">
                        ₱{eWalletTotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-700">
                        ₱{c.average_order_value.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-700">
                        {c.shift_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-red-600">
                        {c.void_count}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
