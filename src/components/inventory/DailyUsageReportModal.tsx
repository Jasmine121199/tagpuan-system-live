import React from 'react';
import { DailyIngredientUsageAuditReport } from '../../types';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface DailyUsageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyIngredientUsageAuditReport | null;
}

export const DailyUsageReportModal: React.FC<DailyUsageReportModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Item Code',
      'Ingredient Name',
      'Category',
      'Unit',
      'Total Consumed Today',
      'Current Ending Stock',
      'Reorder Level',
      'Stock Status',
      'Physical Kitchen Count',
      'Variance',
      'Audit Notes'
    ];

    const rows = report.ingredients.map((ing) => [
      ing.item_code,
      `"${ing.ingredient_name.replace(/"/g, '""')}"`,
      ing.category,
      ing.unit,
      ing.total_consumed_today.toString(),
      ing.current_ending_stock.toString(),
      ing.reorder_level.toString(),
      ing.status,
      '', // blank for physical count
      '', // blank for variance
      ''  // blank for notes
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"Tagpuan Food Hub - End-of-Day Inventory Usage & Reconciliation Report"`,
        `"Branch: ${report.branch_name}"`,
        `"Audit Date: ${report.audit_date}"`,
        `"Generated At: ${new Date(report.generated_at).toLocaleString()}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(','))
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Tagpuan_Daily_Usage_Reconciliation_${report.branch_name.replace(/\s+/g, '_')}_${report.audit_date}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const consumedIngredients = report.ingredients.filter((i) => i.total_consumed_today > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#CDEBC5]" />
            <h3 className="text-sm font-bold tracking-tight">
              Printable End-of-Day Reconciliation Report
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#CDEBC5] text-[#111111] hover:bg-[#bde3b3] text-xs font-bold transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div id="printable-area" className="p-8 space-y-6 text-zinc-900">
          {/* Official Letterhead */}
          <div className="border-b-2 border-zinc-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-600 rounded-full inline-block"></span>
                <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 font-mono">
                  Tagpuan Food Hub
                </h1>
              </div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-0.5">
                Official Commissary & Branch Inventory Usage Audit Sheet
              </p>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Multi-Branch POS Ledger to Raw Ingredients Reconciliation
              </p>
            </div>

            <div className="text-right font-mono text-xs">
              <div className="font-bold text-zinc-900 text-sm">{report.branch_name}</div>
              <div className="text-zinc-500">Audit Date: {report.audit_date}</div>
              <div className="text-zinc-400 text-[10px]">
                Generated: {new Date(report.generated_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-4 font-mono text-xs bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Orders Audited</span>
              <span className="text-lg font-black text-zinc-900">{report.total_orders_today} Orders</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Finished Menu Items Sold</span>
              <span className="text-lg font-black text-zinc-900">{report.total_items_sold} Items</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Ingredients Impacted</span>
              <span className="text-lg font-black text-zinc-900">{consumedIngredients.length} Types</span>
            </div>
          </div>

          {/* Cross-Audit Summary Highlights */}
          <div className="border border-zinc-200 rounded-xl p-4 bg-amber-50/50">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Automated Recipe Cross-Audit Rules
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {report.cross_audit_checks.map((check, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-2xs font-mono">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">{check.title}</div>
                  <div className="text-xs font-bold text-zinc-900 mt-1">{check.notes}</div>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Verified 1:1 Against Kitchen Tickets
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Ingredient Deductions Table */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 mb-2">
              Itemized Raw Ingredient Deductions & Stock Balance
            </h4>
            <table className="w-full text-left text-xs border border-zinc-300 border-collapse">
              <thead className="bg-zinc-100 font-mono font-bold text-[10px] uppercase text-zinc-700">
                <tr>
                  <th className="py-2 px-3 border border-zinc-300">Code</th>
                  <th className="py-2 px-3 border border-zinc-300">Ingredient Name</th>
                  <th className="py-2 px-3 border border-zinc-300">Category</th>
                  <th className="py-2 px-3 border border-zinc-300 text-right">Deducted Today</th>
                  <th className="py-2 px-3 border border-zinc-300 text-right">System Ending Stock</th>
                  <th className="py-2 px-3 border border-zinc-300 text-center w-28 bg-amber-50/50">
                    Physical Count
                  </th>
                  <th className="py-2 px-3 border border-zinc-300 text-center w-24 bg-amber-50/50">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {report.ingredients.map((ing) => (
                  <tr key={ing.ingredient_id} className="hover:bg-zinc-50/50">
                    <td className="py-1.5 px-3 font-mono text-[10px] text-zinc-500 border border-zinc-300">
                      {ing.item_code}
                    </td>
                    <td className="py-1.5 px-3 font-bold text-zinc-900 border border-zinc-300">
                      {ing.ingredient_name}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[10px] text-zinc-600 border border-zinc-300">
                      {ing.category}
                    </td>
                    <td className="py-1.5 px-3 font-mono font-bold text-right border border-zinc-300">
                      {ing.total_consumed_today > 0 ? (
                        <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                          -{ing.total_consumed_today} {ing.unit}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0 {ing.unit}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 font-mono font-bold text-right text-zinc-900 border border-zinc-300">
                      {ing.current_ending_stock} {ing.unit}
                    </td>
                    <td className="py-1.5 px-3 border border-zinc-300 text-center bg-zinc-50/30">
                      {/* Blank box for physical hand-count during audit */}
                    </td>
                    <td className="py-1.5 px-3 border border-zinc-300 text-center bg-zinc-50/30">
                      {/* Blank box for variance write-in */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures for End-of-Day Audit Handover */}
          <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-8 font-mono text-xs">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-8">
                Prepared & Verified By (Store Manager / Cashier):
              </p>
              <div className="border-t border-zinc-800 pt-1.5">
                <p className="font-bold text-zinc-900">Branch Manager Signature & Date</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Physical counts audited against kitchen storage.</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-8">
                Audited & Approved By (Master Owner / Area Head):
              </p>
              <div className="border-t border-zinc-800 pt-1.5">
                <p className="font-bold text-zinc-900">Executive Master Owner Signature & Date</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Authorized commissary deduction ledger entry.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
