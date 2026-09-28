import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Layers,
  History,
  CheckCircle2,
  Clock,
  RefreshCw,
  Building2,
  Package,
  ShoppingBag,
  Users
} from 'lucide-react';
import { DataManagementStatus, UserRole } from '../../types/index';
import { api } from '../../lib/api';

interface DataManagementViewProps {
  userRole: UserRole;
  onOpenIntegrityCheck: () => void;
  onOpenImport: () => void;
  status: DataManagementStatus | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  userRole,
  onOpenIntegrityCheck,
  onOpenImport,
  status,
  isLoading,
  onRefresh
}) => {
  const isOwner = userRole === 'OWNER';

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System Health Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Storage Engine Status</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                HEALTHY
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Tagpuan In-Memory / Snapshot Store</h3>
            <p className="text-xs text-slate-500 mt-1">
              Synchronized with append-only transaction ledgers and relational key constraints.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Last Synced:</span>
            <span className="font-semibold text-slate-700">
              {status ? new Date(status.last_sync_timestamp).toLocaleTimeString('en-PH') : 'Just now'}
            </span>
          </div>
        </div>

        {/* Integrity Check Action Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-700 mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Relational Integrity Verification</h3>
            <p className="text-xs text-slate-500 mt-1">
              Read-only scan verifying foreign keys, sales-to-payment balances, and attendance mappings.
            </p>
          </div>

          <button
            id="data-mgmt-run-integrity-btn"
            type="button"
            onClick={onOpenIntegrityCheck}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Launch Integrity Audit</span>
          </button>
        </div>

        {/* Master Import Action Card (Owner Only) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 mb-2">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Master Catalog Import</h3>
            <p className="text-xs text-slate-500 mt-1">
              Batch import products, ingredients, branches, and customer master lists with schema dry-run.
            </p>
          </div>

          {isOwner ? (
            <button
              id="data-mgmt-open-import-btn"
              type="button"
              onClick={onOpenImport}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Master Data</span>
            </button>
          ) : (
            <div className="mt-4 p-2 bg-slate-100 rounded-lg text-[11px] text-center text-slate-500 font-medium">
              Importing master data requires Owner role
            </div>
          )}
        </div>
      </div>

      {/* Database Entity Totals */}
      {status && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
            Master & Transactional Entities in Current Database
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Branches</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{status.master_records_count.branches}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Products</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{status.master_records_count.products}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Ingredients</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{status.master_records_count.ingredients}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Loyalty Members</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{status.master_records_count.customers}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Recorded Orders</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{status.master_records_count.orders}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Payments Processed</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{status.master_records_count.payments}</div>
            </div>
          </div>
        </div>
      )}

      {/* Two Columns: Recent Imports & Recent Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Imports */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Master Data Imports</h4>
            </div>
            <span className="text-[11px] text-slate-500">Immutable Audit Trail</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Import ID</th>
                  <th className="py-2.5 px-3 font-bold">Type</th>
                  <th className="py-2.5 px-3 font-bold">File</th>
                  <th className="py-2.5 px-3 font-bold text-right">Inserted</th>
                  <th className="py-2.5 px-3 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!status?.recent_imports || status.recent_imports.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No master imports recorded yet.
                    </td>
                  </tr>
                ) : (
                  status.recent_imports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{imp.id}</td>
                      <td className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-700">{imp.import_type}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[120px] truncate" title={imp.file_name}>
                        {imp.file_name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{imp.inserted_rows}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          imp.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {imp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Exports */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Report Export Activity Log</h4>
            </div>
            <span className="text-[11px] text-slate-500">Security & Compliance</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Report Name</th>
                  <th className="py-2.5 px-3 font-bold">Format</th>
                  <th className="py-2.5 px-3 font-bold">User</th>
                  <th className="py-2.5 px-3 font-bold text-right">Rows</th>
                  <th className="py-2.5 px-3 font-bold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!status?.recent_exports || status.recent_exports.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No report export logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  status.recent_exports.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-[140px] truncate" title={exp.report_type}>
                        {exp.report_type}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          exp.format === 'XLSX' ? 'bg-emerald-100 text-emerald-800' :
                          exp.format === 'PDF' ? 'bg-red-100 text-red-800' :
                          exp.format === 'CSV' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {exp.format}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[110px] truncate" title={exp.exported_by}>
                        {exp.exported_by}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{exp.row_count}</td>
                      <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(exp.timestamp).toLocaleTimeString('en-PH')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
