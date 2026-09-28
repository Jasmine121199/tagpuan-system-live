import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  X,
  Info,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { MasterImportType, ImportValidationResult, ImportAuditRecord } from '../../types/index';
import { api } from '../../lib/api';

interface MasterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: () => void;
}

export const MasterImportModal: React.FC<MasterImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted
}) => {
  const [importType, setImportType] = useState<MasterImportType>('products');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [auditResult, setAuditResult] = useState<ImportAuditRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sample CSV Templates
  const handleDownloadSample = () => {
    let headers: string[] = [];
    let samples: string[] = [];

    if (importType === 'products') {
      headers = ['product_name', 'price', 'category', 'description', 'is_active'];
      samples = [
        ['Pares Retiro Classic Bowl', '145.00', 'Pares Specials', 'Slow-cooked braised beef shank stew with garlic fried rice', 'true'],
        ['Bagnet Crispy Kare-Kare', '220.00', 'Signature Mains', 'Deep-fried pork belly in rich peanut gravy with bagoong', 'true'],
        ['Calamansi Iced Tea Pitcher', '85.00', 'Beverages', 'Freshly brewed black tea infused with natural calamansi', 'true']
      ].map(r => r.join(','));
    } else if (importType === 'ingredients') {
      headers = ['item_name', 'item_code', 'category', 'unit', 'cost_price', 'reorder_level'];
      samples = [
        ['Beef Shank Bone-in (Frozen)', 'ING-BEEF-SHK', 'Meat & Poultry', 'kg', '380.00', '25'],
        ['Star Anise Whole', 'ING-SPICE-ANISE', 'Spices & Seasoning', 'g', '1.20', '500'],
        ['Jasmine Sinandomeng Rice', 'ING-RICE-JAS', 'Dry Goods', 'sacks', '2450.00', '10']
      ].map(r => r.join(','));
    } else if (importType === 'branches') {
      headers = ['name', 'address', 'contact_number', 'is_active'];
      samples = [
        ['Tagpuan - Dasmarinas Salitran', 'Aguinaldo Hwy, Salitran II, Dasmarinas, Cavite', '+63 917 111 2233', 'true'],
        ['Tagpuan - Bacoor Blvd Expressway', 'Bacoor Boulevard, Molino III, Bacoor, Cavite', '+63 917 222 3344', 'true']
      ].map(r => r.join(','));
    } else if (importType === 'customers') {
      headers = ['name', 'phone', 'email', 'points'];
      samples = [
        ['Juan Dela Cruz', '+63 917 555 1234', 'juan.delacruz@gmail.com', '150'],
        ['Maria Santos', '+63 920 888 9876', 'maria.santos@yahoo.com', '75']
      ].map(r => r.join(','));
    }

    const csvContent = headers.join(',') + '\n' + samples.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tagpuan_${importType}_sample_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Parse CSV Helper
  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex for CSV split handling quotes
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      const rowObj: any = {};
      headers.forEach((h, colIdx) => {
        let val = values[colIdx] !== undefined ? values[colIdx].trim() : '';
        val = val.replace(/^"|"$/g, '');
        rowObj[h] = val;
      });
      rows.push(rowObj);
    }
    return rows;
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setValidation(null);
    setAuditResult(null);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let rows: any[] = [];

        if (file.name.endsWith('.json')) {
          rows = JSON.parse(text);
        } else {
          rows = parseCSV(text);
        }

        setParsedRows(rows);

        // Run validation with server
        setIsValidating(true);
        const result = await api.validateImport(importType, rows);
        setValidation(result);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse file. Please verify format.');
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsText(file);
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!validation || validation.valid_rows === 0 || !parsedRows.length) return;

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const audit = await api.executeImport(importType, fileName || 'import.csv', parsedRows);
      setAuditResult(audit);
      onImportCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Import execution failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Master Data Import Center</h2>
              <p className="text-xs text-slate-500">Controlled, validated insertion of master catalog & reference datasets</p>
            </div>
          </div>

          <button
            id="import-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety & Restrictions Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-900 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Master Data Only:</strong> Historical transactions (Sales, Payments, Inventory logs, Orders, Attendance, Payroll, and Audit records) cannot be imported or modified.
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Step 1: Select Master Entity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Select Master Dataset Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { type: 'products' as MasterImportType, label: 'Menu Products', desc: 'Catalog & prices' },
                { type: 'ingredients' as MasterImportType, label: 'Ingredients', desc: 'Commissary items' },
                { type: 'branches' as MasterImportType, label: 'Branches', desc: 'Cavite outlets' },
                { type: 'customers' as MasterImportType, label: 'Loyalty Customers', desc: 'Member profiles' }
              ].map((item) => {
                const isSelected = importType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setImportType(item.type);
                      setValidation(null);
                      setParsedRows([]);
                      setFileName('');
                      setAuditResult(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-red-600 bg-red-50 text-red-950 ring-2 ring-red-600/30'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Download Sample Template & File Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/60 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">2. Download CSV Template</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Download the required column structure and sample data for <strong>{importType.toUpperCase()}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer w-fit"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Sample Template (.csv)</span>
              </button>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/60">
              <h3 className="text-xs font-bold text-slate-800">3. Upload Data File</h3>
              <p className="text-xs text-slate-500 mt-1">Accepts UTF-8 encoded .csv or .json files</p>

              <label className="mt-4 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  {fileName ? fileName : 'Click or Drag & Drop File'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Max file size 5MB</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Validation Feedback & Error Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isValidating && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-semibold text-slate-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
              <span>Validating schema, duplicates, and constraints against database...</span>
            </div>
          )}

          {/* Validation Report */}
          {validation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-100 rounded-xl">
                  <div className="text-[11px] font-bold text-slate-500">Total Rows</div>
                  <div className="text-lg font-extrabold text-slate-800">{validation.total_rows}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-700">Valid Rows</div>
                  <div className="text-lg font-extrabold text-emerald-800">{validation.valid_rows}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="text-[11px] font-bold text-red-700">Invalid Rows</div>
                  <div className="text-lg font-extrabold text-red-800">{validation.invalid_rows}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-700">Duplicate Skips</div>
                  <div className="text-lg font-extrabold text-amber-800">{validation.duplicate_rows}</div>
                </div>
              </div>

              {/* Error messages table */}
              {validation.errors.length > 0 && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl max-h-36 overflow-y-auto text-xs">
                  <div className="font-bold text-red-900 mb-1">Detected Validation Errors:</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-red-800 text-[11px]">
                    {validation.errors.map((err, i) => (
                      <li key={i}>
                        Row {err.row}: <strong>{err.field}</strong> — {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Preview */}
              {validation.preview.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    4. Valid Records Preview (First {validation.preview.length} rows)
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <tr>
                          {Object.keys(validation.preview[0] || {}).map(k => (
                            <th key={k} className="py-2 px-3 font-bold uppercase text-[10px]">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validation.preview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.values(row).map((v: any, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 font-medium whitespace-nowrap text-slate-600">
                                {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit Success Result */}
          {auditResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Import Successfully Completed!</div>
                <div className="mt-1">
                  Import ID: <strong>{auditResult.id}</strong> | Records Inserted: <strong>{auditResult.inserted_rows}</strong> | Failed: <strong>{auditResult.failed_rows}</strong>
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  Logged in audit trail by {auditResult.imported_by} at {new Date(auditResult.timestamp).toLocaleString('en-PH')}.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {validation ? `${validation.valid_rows} valid rows ready to insert` : 'Awaiting file upload'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting || !validation || validation.valid_rows === 0 || !!auditResult}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Execute Master Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
