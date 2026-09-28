import React, { useState, useEffect } from 'react';
import { Branch, DailyProductSaleItem, DailyProductSalesSummary } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Utensils,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  TrendingUp,
  Tag,
  Building2,
  CheckCircle2,
  Award,
  ChevronRight,
  Printer
} from 'lucide-react';

interface TodaysSoldMenuItemsTableProps {
  branches: Branch[];
  currentBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  datePreset?: string;
  onDatePresetChange?: (preset: string) => void;
}

export const TodaysSoldMenuItemsTable: React.FC<TodaysSoldMenuItemsTableProps> = ({
  branches,
  currentBranchId,
  onBranchChange,
  datePreset: externalPreset,
  onDatePresetChange
}) => {
  const { isOwner, isManager, user } = useAuth();
  const [data, setData] = useState<DailyProductSalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentBranchId !== undefined ? currentBranchId : (isManager && user?.branch_id ? user.branch_id : '')
  );
  const [datePreset, setDatePreset] = useState<string>(externalPreset || 'today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchSalesSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDailyProductSales({
        branch_id: selectedBranchId || undefined,
        date_preset: datePreset
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load daily product sales:', err);
      setError(err.message || 'Failed to load product sales breakdown.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentBranchId !== undefined && currentBranchId !== selectedBranchId) {
      setSelectedBranchId(currentBranchId);
    }
  }, [currentBranchId]);

  useEffect(() => {
    if (externalPreset !== undefined && externalPreset !== datePreset) {
      setDatePreset(externalPreset);
    }
  }, [externalPreset]);

  useEffect(() => {
    fetchSalesSummary();
  }, [selectedBranchId, datePreset]);

  const handleBranchSelect = (bId: string) => {
    setSelectedBranchId(bId);
    if (onBranchChange) onBranchChange(bId);
  };

  const handlePresetSelect = (preset: string) => {
    setDatePreset(preset);
    if (onDatePresetChange) onDatePresetChange(preset);
  };

  // Filter items
  const items = data?.items || [];
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category.toUpperCase() === selectedCategory.toUpperCase();
    return matchesSearch && matchesCategory;
  });

  // Unique categories for filter pills
  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category.toUpperCase())))];

  const handleExportCSV = () => {
    if (!data || items.length === 0) return;
    const headers = ['Rank', 'Product Name', 'Product Code', 'Category', 'Unit Price (PHP)', 'Units Sold', 'Orders Count', 'Gross Sales (PHP)', '% of Total'];
    const rows = items.map((item, idx) => {
      const share = data.total_gross_sales > 0 ? ((item.gross_sales / data.total_gross_sales) * 100).toFixed(1) : '0.0';
      return [
        (idx + 1).toString(),
        `"${item.product_name.replace(/"/g, '""')}"`,
        item.product_code,
        item.category,
        item.unit_price.toFixed(2),
        item.quantity_sold.toString(),
        item.order_count.toString(),
        item.gross_sales.toFixed(2),
        `${share}%`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tagpuan_Sold_Menu_Items_${data.date_label.replace(/ /g, '_')}_${selectedBranchId || 'All_Branches'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden mt-6">
      {/* Table Header & Toolbar */}
      <div className="p-6 bg-gradient-to-b from-zinc-50 to-white border-b border-zinc-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
                Finished Goods Audit
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {data ? data.branch_label : 'Branch Breakdown'}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-600" />
              Today's Sold Menu Items
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Itemized finished goods sales from counter POS and self-ordering kiosks. Cross-referenced against recipe deductions.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchSalesSummary}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition"
              title="Refresh Sales"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-zinc-900' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!data || items.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data || items.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-5 pt-4 border-t border-zinc-200/80">
          {/* Date Range Presets */}
          <div className="md:col-span-6 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Period:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all_time', label: 'All Time' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  datePreset === p.id
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Branch Filter (Owner can choose all or specific, manager locked to own branch) */}
          <div className="md:col-span-6 flex items-center justify-end gap-2">
            {isOwner && (
              <div className="w-full sm:w-64">
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => handleBranchSelect(e.target.value)}
                    className="w-full text-xs font-medium pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">All 17 Branches (Consolidated)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Search & Category Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-zinc-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search product name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900"
            />
          </div>

          {categories.length > 2 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Counters */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-zinc-50 border-b border-zinc-200 font-mono">
          <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <p className="text-[10px] text-zinc-400 uppercase font-bold">Total Units Sold</p>
            <p className="text-xl font-black text-zinc-900 mt-0.5">{data.total_quantity.toLocaleString()} pcs</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <p className="text-[10px] text-zinc-400 uppercase font-bold">Total Gross Sales</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              ₱{data.total_gross_sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <p className="text-[10px] text-zinc-400 uppercase font-bold">Distinct Menu Items</p>
            <p className="text-xl font-black text-zinc-900 mt-0.5">{items.length} items</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <p className="text-[10px] text-zinc-400 uppercase font-bold">Top Selling Item</p>
            <p className="text-xs font-black text-zinc-900 mt-1 truncate">
              {items[0] ? `${items[0].product_name} (${items[0].quantity_sold} sold)` : 'None'}
            </p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-100/75 border-b border-zinc-200 text-zinc-600 font-mono font-bold text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Menu Product Item</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Qty Sold (Units)</th>
              <th className="py-3 px-4 text-right">Orders</th>
              <th className="py-3 px-4 text-right">Gross Sales (₱)</th>
              <th className="py-3 px-4 text-right">% Sales Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                  Loading today's product sales ledger...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono text-xs">
                  No sold menu items found for this branch and period filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const totalGross = data?.total_gross_sales || 1;
                const percentage = ((item.gross_sales / totalGross) * 100);
                const isTopSeller = index === 0 && item.quantity_sold > 0;

                return (
                  <tr key={item.product_id || index} className="hover:bg-zinc-50/80 transition-colors">
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {isTopSeller ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-black text-[11px] font-mono">
                          ★
                        </span>
                      ) : (
                        <span className="font-mono text-zinc-400 text-xs font-bold">
                          {index + 1}
                        </span>
                      )}
                    </td>

                    {/* Product Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 text-sm">
                        {item.product_name}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-zinc-400" />
                        <span>{item.product_code}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {item.category}
                      </span>
                    </td>

                    {/* Unit Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-zinc-600">
                      ₱{item.unit_price.toFixed(2)}
                    </td>

                    {/* Quantity Sold */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-zinc-900 text-sm">
                      <span className="bg-zinc-100 px-2 py-0.5 rounded-md text-zinc-900">
                        {item.quantity_sold.toLocaleString()} pcs
                      </span>
                    </td>

                    {/* Distinct Orders */}
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-600">
                      {item.order_count.toLocaleString()}
                    </td>

                    {/* Gross Sales */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                      ₱{item.gross_sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Share Bar */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-600 w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                        <div className="w-16 h-2 bg-zinc-100 rounded-full overflow-hidden shrink-0">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Audit Notice */}
      <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Verified against authoritative Point of Sale & Kitchen Display tickets.</span>
        </div>
        <div className="text-zinc-400">
          Audited Date: {data?.date_label || 'Today'}
        </div>
      </div>
    </div>
  );
};
