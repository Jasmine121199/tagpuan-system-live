import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  X,
  FileCode,
  Info
} from 'lucide-react';
import { DataIntegrityCheckResult, DataIntegrityIssue } from '../../types/index';

interface DataIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkResult: DataIntegrityCheckResult | null;
  isRunning: boolean;
  onRunCheck: () => void;
}

export const DataIntegrityModal: React.FC<DataIntegrityModalProps> = ({
  isOpen,
  onClose,
  checkResult,
  isRunning,
  onRunCheck
}) => {
  const [selectedIssue, setSelectedIssue] = useState<DataIntegrityIssue | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  if (!isOpen) return null;

  const filteredIssues = (checkResult?.issues || []).filter(issue => {
    if (severityFilter === 'ALL') return true;
    return issue.severity === severityFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Database Relational Integrity Audit</h2>
              <p className="text-xs text-slate-500">Read-only, non-destructive audit of ERP relational references</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="integrity-modal-run-btn"
              type="button"
              onClick={onRunCheck}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Auditing...' : 'Run Scan'}</span>
            </button>

            <button
              id="integrity-modal-close-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice banner */}
        <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5 flex items-center gap-2 text-xs text-blue-800 font-medium">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span><strong>Safety Guarantee:</strong> This tool performs strict read-only queries. Generating this audit will never alter, delete, or rewrite any historical records.</span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {checkResult ? (
            <>
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                  checkResult.status === 'OK'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : checkResult.status === 'WARNING'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {checkResult.status === 'OK' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  ) : checkResult.status === 'WARNING' ? (
                    <AlertTriangle className="w-7 h-7 text-amber-600" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-600" />
                  )}
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider">
                      Audit State: {checkResult.status}
                    </div>
                    <div className="text-xs mt-0.5 opacity-90">{checkResult.summary_message}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div>Checks Passed: <span className="font-bold">{checkResult.passed_checks} / {checkResult.total_checks}</span></div>
                  <div>Issues Found: <span className="font-bold">{checkResult.issues_count}</span></div>
                  <div>Last Scanned: <span className="font-normal opacity-80">{new Date(checkResult.checked_at).toLocaleTimeString('en-PH')}</span></div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5">
                  {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        severityFilter === sev
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sev === 'ALL' ? 'All Findings' : sev}
                      {sev === 'CRITICAL' && checkResult.critical_issues > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] rounded-full">
                          {checkResult.critical_issues}
                        </span>
                      )}
                      {sev === 'WARNING' && checkResult.warnings > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-amber-600 text-white text-[10px] rounded-full">
                          {checkResult.warnings}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-500">
                  Showing {filteredIssues.length} issues
                </span>
              </div>

              {/* Issues List */}
              <div className="space-y-3">
                {filteredIssues.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No issues found in this category.</p>
                  </div>
                ) : (
                  filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              issue.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-800'
                                : issue.severity === 'WARNING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{issue.check_name}</span>
                          <span className="text-[11px] text-slate-500">({issue.entity})</span>
                        </div>

                        {issue.record_preview && (
                          <button
                            type="button"
                            onClick={() => setSelectedIssue(selectedIssue?.id === issue.id ? null : issue)}
                            className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{selectedIssue?.id === issue.id ? 'Hide Record' : 'View Record'}</span>
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 mt-1.5">{issue.description}</p>
                      <div className="text-[11px] text-slate-500 mt-1 font-medium">
                        <strong>Suggested action:</strong> {issue.suggested_action}
                      </div>

                      {/* Record Preview Drawer */}
                      {selectedIssue?.id === issue.id && issue.record_preview && (
                        <div className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1 mb-2 text-[11px]">
                            <span className="flex items-center gap-1">
                              <FileCode className="w-3 h-3" /> Record Preview (ID: {issue.record_id || 'N/A'})
                            </span>
                            <span>JSON Data</span>
                          </div>
                          <pre>{JSON.stringify(issue.record_preview, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Audit scan ready to initiate.</p>
              <p className="text-xs text-slate-500 mt-1">Click "Run Scan" above to verify all cross-entity constraints.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
