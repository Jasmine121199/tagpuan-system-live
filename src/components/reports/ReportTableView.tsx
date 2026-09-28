import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { UnifiedReportResponse, ReportColumn } from '../../types/index';
import { formatCellValue, exportToCSV, exportToExcel, exportToPDF } from '../../lib/export-utils';
import { api } from '../../lib/api';

interface ReportTableViewProps {
  report: UnifiedReportResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const ReportTableView: React.FC<ReportTableViewProps> = ({
  report,
  isLoading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Handle Export Logging & Download
  const handleExport = async (format: 'CSV' | 'XLSX' | 'PDF' | 'PRINT') => {
    if (!report) return;

    try {
      const fileName = `Tagpuan_${report.report_type}_${report.start_date}_to_${report.end_date}`;

      if (format === 'CSV') exportToCSV(report);
      else if (format === 'XLSX') exportToExcel(report);
      else if (format === 'PDF') exportToPDF(report);
      else if (format === 'PRINT') window.print();

      // Log export event to server audit
      await api.logReportExport({
        report_type: report.report_name,
        format,
        branch_id: report.branch_id,
        branch_name: report.branch_name,
        period: report.period,
        row_count: report.rows.length,
        file_name: fileName
      });

      setExportMessage(`Successfully generated ${format} export.`);
      setTimeout(() => setExportMessage(null), 4000);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportMessage('Export completed with local download.');
      setTimeout(() => setExportMessage(null), 4000);
    }
  };

  // Header Sort Toggle
  const handleHeaderClick = (colId: string) => {
    if (sortColumn === colId) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colId);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    if (!report) return [];
    let rows = [...report.rows];

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(row => {
        return Object.values(row).some(v => {
          if (v === null || v === undefined) return false;
          return String(v).toLowerCase().includes(q);
        });
      });
    }

    // Sort
    if (sortColumn) {
      rows.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return rows;
  }, [report, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalRows = filteredAndSortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(startIdx, startIdx + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-semibold text-slate-700">Compiling centralized Tagpuan ERP records...</p>
        <p className="text-xs text-slate-500 mt-1">Cross-referencing POS, payments, inventory, and branch ledgers</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">No report selected or data unavailable.</p>
        <p className="text-xs text-slate-500 mt-1">Select a report from the categories above.</p>
      </div>
    );
  }

  // Render badge with tailored color schemes
  const renderBadge = (value: string) => {
    const valUpper = String(value).toUpperCase();

    if (valUpper === 'COMPLETED' || valUpper === 'DELIVERED' || valUpper === 'APPROVED' || valUpper === 'IN STOCK' || valUpper === 'BALANCED' || valUpper === 'SUCCESS') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">{value}</span>;
    }
    if (valUpper === 'LOW STOCK' || valUpper === 'SUBMITTED' || valUpper === 'PENDING' || valUpper === 'DRAFT' || valUpper === 'WARNING' || valUpper.includes('DELAYED')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">{value}</span>;
    }
    if (valUpper === 'NEEDS ORDER' || valUpper === 'CANCELLED' || valUpper === 'VOIDED' || valUpper === 'REJECTED' || valUpper === 'SHORT' || valUpper === 'CRITICAL' || valUpper.includes('15+')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">{value}</span>;
    }
    if (valUpper === 'OVER') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">{value}</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">{value}</span>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Report Header Banner */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{report.report_name}</h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-red-100 text-red-800">
                {report.report_type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span><strong>Branch:</strong> {report.branch_name}</span>
              <span><strong>Period:</strong> {report.period} ({report.start_date} to {report.end_date})</span>
              <span><strong>Generated By:</strong> {report.generated_by}</span>
              <span><strong>Records:</strong> {report.rows.length.toLocaleString()}</span>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="export-csv-btn"
              type="button"
              onClick={() => handleExport('CSV')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Download RFC-compliant CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              id="export-excel-btn"
              type="button"
              onClick={() => handleExport('XLSX')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Download Microsoft Excel workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              id="export-pdf-btn"
              type="button"
              onClick={() => handleExport('PDF')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Download formatted PDF document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              id="export-print-btn"
              type="button"
              onClick={() => handleExport('PRINT')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {exportMessage && (
          <div className="mt-3 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{exportMessage}</span>
          </div>
        )}

        {/* Special Report Metadata / Discrepancy warnings */}
        {report.metadata?.discrepancy_warning && (
          <div className="mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{report.metadata.discrepancy_warning}</span>
          </div>
        )}
      </div>

      {/* Filter and In-Table Search Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="report-table-search-input"
            type="text"
            placeholder="Search report entries..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600/30"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows per page:</span>
          <select
            id="report-page-size-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2 font-medium text-slate-600">
            Showing {totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, totalRows)} of {totalRows}
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
              {report.columns.map((col) => {
                const isSorted = sortColumn === col.id;
                return (
                  <th
                    key={col.id}
                    id={`report-th-${col.id}`}
                    onClick={() => col.sortable && handleHeaderClick(col.id)}
                    className={`py-3 px-4 text-xs font-bold uppercase tracking-wider select-none ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.sortable ? 'cursor-pointer hover:bg-slate-200/60' : ''}`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <ArrowUpDown className={`w-3 h-3 ${isSorted ? 'text-red-700 font-extrabold' : 'text-slate-400'}`} />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={report.columns.length} className="py-12 text-center text-slate-400">
                  No matching records found in this reporting window.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className="hover:bg-slate-50/80 transition-colors text-slate-700"
                >
                  {report.columns.map((col) => {
                    const rawVal = row[col.id];
                    const isBadge = col.format === 'badge';

                    return (
                      <td
                        key={col.id}
                        className={`py-2.5 px-4 font-medium whitespace-nowrap ${
                          col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {isBadge ? renderBadge(String(rawVal)) : formatCellValue(rawVal, col.format)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalRows.toLocaleString()} total entries)
        </span>

        <div className="flex items-center gap-1">
          <button
            id="report-prev-page-btn"
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers preview */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 3 + i;
              if (pageNum > totalPages) pageNum = totalPages - 4 + i;
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  currentPage === pageNum
                    ? 'bg-red-700 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            id="report-next-page-btn"
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
