import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Branch } from '../../types';
import {
  Printer,
  X,
  QrCode,
  Sparkles,
  UtensilsCrossed,
  Smartphone,
  Award,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Building2,
  Table as TableIcon,
  Flame,
  ArrowRight
} from 'lucide-react';

interface PrintableTableQRModalProps {
  branch: Branch | null;
  branches?: Branch[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBranch?: (branch: Branch) => void;
}

export const PrintableTableQRModal: React.FC<PrintableTableQRModalProps> = ({
  branch: initialBranch,
  branches = [],
  isOpen,
  onClose
}) => {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(initialBranch);
  const [printFormat, setPrintFormat] = useState<'4x6' | 'sticker' | 'batch_sheet'>('4x6');
  
  // Table Range / Selection State
  const [generationMode, setGenerationMode] = useState<'range' | 'single'>('range');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(15);
  const [customTable, setCustomTable] = useState<string>('Table 1');
  const [previewTable, setPreviewTable] = useState<string>('Table 1');
  
  // QR Cache for fast printing & rendering
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync selected branch when prop updates
  useEffect(() => {
    if (initialBranch) {
      setSelectedBranch(initialBranch);
    } else if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]);
    }
  }, [initialBranch, branches]);

  // Compute table list based on mode
  const tableList: string[] = React.useMemo(() => {
    if (generationMode === 'single') {
      return [customTable.trim() || 'Table 1'];
    }
    const start = Math.max(1, Math.min(rangeStart, rangeEnd));
    const end = Math.min(50, Math.max(rangeStart, rangeEnd));
    const list: string[] = [];
    for (let i = start; i <= end; i++) {
      list.push(`Table ${i}`);
    }
    return list;
  }, [generationMode, rangeStart, rangeEnd, customTable]);

  // Ensure previewTable is valid
  useEffect(() => {
    if (tableList.length > 0 && !tableList.includes(previewTable)) {
      setPreviewTable(tableList[0]);
    }
  }, [tableList, previewTable]);

  // Generate QR Codes for all tables in list
  useEffect(() => {
    if (!isOpen || !selectedBranch || tableList.length === 0) return;

    let isMounted = true;
    setIsGenerating(true);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tagpuan.ph';

    const generateAllQrs = async () => {
      const newMap: Record<string, string> = {};
      for (const table of tableList) {
        // Embed the exact parameter format required: /kiosk?branchId=[BRANCH_ID]&table=[TABLE_NUMBER]
        // Include fallback parameters for robust routing
        const targetUrl = `${origin}/kiosk?branchId=${selectedBranch.id}&table=${encodeURIComponent(table)}&view=kiosk&mode=kiosk`;
        try {
          const dataUrl = await QRCode.toDataURL(targetUrl, {
            width: 600,
            margin: 2,
            color: {
              dark: '#111111',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
          });
          newMap[table] = dataUrl;
        } catch (e) {
          console.error('Failed to generate QR for', table, e);
        }
      }

      if (isMounted) {
        setQrMap(newMap);
        setIsGenerating(false);
      }
    };

    generateAllQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedBranch?.id, tableList]);

  if (!isOpen || !selectedBranch) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tagpuan.ph';
  const currentKioskUrl = `${origin}/kiosk?branchId=${selectedBranch.id}&table=${encodeURIComponent(previewTable)}&view=kiosk&mode=kiosk`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentKioskUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownloadSingleQR = () => {
    const dataUrl = qrMap[previewTable];
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Tagpuan-${selectedBranch.name.replace(/[^a-zA-Z0-9]/g, '-')}-${previewTable.replace(/\s+/g, '-')}-QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Print Stylesheet for Isolated High-Quality Table Cards */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #tagpuan-print-container, #tagpuan-print-container * {
              visibility: visible !important;
            }
            #tagpuan-print-container {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              margin: 0 !important;
              padding: 0.5in !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
            }
            .table-card-print-item {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 0.4in !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>

      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col my-4 max-h-[94vh]">
        {/* Modal Header */}
        <div className="bg-[#111111] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black shadow-md">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#CDEBC5] text-[#111111] uppercase tracking-wider">
                  Dine-In Table QR Ordering
                </span>
                <span className="text-xs text-zinc-400 font-mono">{selectedBranch.code || 'HUB'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                Table QR Generator & Printable Tent Cards
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Toolbar */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Branch Selection */}
            <div>
              <label className="text-[11px] uppercase font-black text-zinc-600 block mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                Select Branch
              </label>
              <select
                value={selectedBranch.id}
                onChange={(e) => {
                  const found = branches.find(b => b.id === e.target.value);
                  if (found) setSelectedBranch(found);
                }}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer shadow-xs"
              >
                {branches.length > 0 ? (
                  branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code || 'HUB'})
                    </option>
                  ))
                ) : (
                  <option value={selectedBranch.id}>{selectedBranch.name}</option>
                )}
              </select>
            </div>

            {/* Table Numbering Mode */}
            <div>
              <label className="text-[11px] uppercase font-black text-zinc-600 block mb-1 flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5 text-zinc-500" />
                Table Numbering
              </label>
              <div className="flex bg-white border border-zinc-300 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setGenerationMode('range')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    generationMode === 'range'
                      ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Range (e.g. 1-15)
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationMode('single')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    generationMode === 'single'
                      ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Custom Single
                </button>
              </div>
            </div>

            {/* Print Format */}
            <div>
              <label className="text-[11px] uppercase font-black text-zinc-600 block mb-1 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-zinc-500" />
                Print Format
              </label>
              <div className="flex bg-white border border-zinc-300 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPrintFormat('4x6')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    printFormat === '4x6'
                      ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  4"x6" Tent Card
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('sticker')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    printFormat === 'sticker'
                      ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Table Sticker
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('batch_sheet')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    printFormat === 'batch_sheet'
                      ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Batch Multi-Sheet
                </button>
              </div>
            </div>
          </div>

          {/* Sub-toolbar: Range inputs or Custom Table input */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-200">
            {generationMode === 'range' ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-700">From:</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(parseInt(e.target.value, 10) || 1)}
                    className="w-16 bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-zinc-900"
                  />
                  <span className="text-xs font-bold text-zinc-700">To:</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(parseInt(e.target.value, 10) || 15)}
                    className="w-16 bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-zinc-900"
                  />
                  <span className="text-xs font-mono text-zinc-500 font-bold bg-zinc-200 px-2 py-0.5 rounded-md">
                    ({tableList.length} tables: {tableList[0]} to {tableList[tableList.length - 1]})
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-zinc-400 font-semibold">Presets:</span>
                  <button
                    type="button"
                    onClick={() => { setRangeStart(1); setRangeEnd(10); }}
                    className="px-2 py-0.5 text-[11px] font-bold rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
                  >
                    1-10
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRangeStart(1); setRangeEnd(15); }}
                    className="px-2 py-0.5 text-[11px] font-bold rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
                  >
                    1-15
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRangeStart(1); setRangeEnd(20); }}
                    className="px-2 py-0.5 text-[11px] font-bold rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
                  >
                    1-20
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-700">Table Name / Number:</span>
                <input
                  type="text"
                  value={customTable}
                  onChange={(e) => setCustomTable(e.target.value)}
                  placeholder="e.g. Table 5, Al Fresco 1, VIP 2"
                  className="w-48 bg-white border border-zinc-300 rounded-lg px-3 py-1 text-xs font-bold text-zinc-900"
                />
              </div>
            )}

            {/* Preview Selector if Multiple Tables */}
            {tableList.length > 1 && printFormat !== 'batch_sheet' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-600">Preview Table:</span>
                <select
                  value={previewTable}
                  onChange={(e) => setPreviewTable(e.target.value)}
                  className="bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-900"
                >
                  {tableList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="p-6 overflow-y-auto bg-zinc-100 flex-1 flex flex-col items-center">
          {isGenerating ? (
            <div className="py-20 text-center text-zinc-400">
              <div className="w-8 h-8 border-3 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold">Generating QR Code(s)...</p>
            </div>
          ) : (
            <div id="tagpuan-print-container" className="w-full flex flex-col items-center">
              {printFormat === 'batch_sheet' ? (
                /* Multi-Table Batch Sheet */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                  {tableList.map((tableName) => {
                    const qrUrl = qrMap[tableName];
                    return (
                      <div
                        key={tableName}
                        className="table-card-print-item bg-white border-2 border-zinc-900 rounded-3xl p-5 text-center flex flex-col justify-between shadow-md relative overflow-hidden"
                      >
                        {/* Top Branding */}
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#111111] text-white text-[9px] font-mono font-bold tracking-widest uppercase mb-1">
                            <UtensilsCrossed className="w-3 h-3 text-[#CDEBC5]" />
                            TAGPUAN FOOD HUB
                          </div>
                          <h3 className="text-lg font-black tracking-tight text-[#111111] uppercase font-mono leading-none">
                            {selectedBranch.name}
                          </h3>
                        </div>

                        {/* Bold Table Banner */}
                        <div className="my-2.5 py-1.5 px-4 bg-amber-300 text-amber-950 rounded-xl font-mono font-black text-sm border-2 border-amber-400 tracking-wider shadow-xs">
                          🍽️ {tableName.toUpperCase()}
                        </div>

                        {/* QR Code */}
                        <div className="bg-zinc-50 p-2.5 rounded-2xl border-2 border-dashed border-zinc-300 inline-block mx-auto my-1">
                          {qrUrl ? (
                            <img
                              src={qrUrl}
                              alt={`${tableName} QR`}
                              className="w-36 h-36 object-contain"
                            />
                          ) : (
                            <div className="w-36 h-36 flex items-center justify-center text-xs text-zinc-400">Loading QR...</div>
                          )}
                        </div>

                        {/* Simple Scan Instructions */}
                        <div className="mt-2">
                          <p className="text-xs font-black text-zinc-900 tracking-tight">
                            I-scan para mag-order mula sa lamesa
                          </p>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            Scan to Order from Table • Earn Loyalty Points
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : printFormat === 'sticker' ? (
                /* Table Sticker Format (Square / Compact 3x3) */
                <div
                  className="table-card-print-item bg-white border-3 border-zinc-900 rounded-3xl p-6 text-center flex flex-col items-center justify-between shadow-xl w-[320px] min-h-[360px]"
                >
                  <div className="w-full">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#111111] text-white text-[9px] font-mono font-bold tracking-widest uppercase mb-1.5">
                      <UtensilsCrossed className="w-3 h-3 text-[#CDEBC5]" />
                      TAGPUAN FOOD HUB
                    </div>
                    <div className="py-1 px-3 bg-amber-300 text-amber-950 rounded-xl font-mono font-black text-base border-2 border-amber-400 tracking-wider">
                      🍽️ {previewTable.toUpperCase()}
                    </div>
                  </div>

                  <div className="my-3 p-2 bg-white rounded-2xl border-2 border-zinc-900 shadow-sm">
                    {qrMap[previewTable] ? (
                      <img
                        src={qrMap[previewTable]}
                        alt={`${previewTable} QR`}
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-zinc-400">Loading QR...</div>
                    )}
                  </div>

                  <div className="w-full border-t border-zinc-200 pt-2">
                    <p className="text-xs font-black text-zinc-900">
                      I-scan para mag-order mula sa lamesa
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      Direct Kitchen & Cashier Dispatch
                    </p>
                  </div>
                </div>
              ) : (
                /* 4" x 6" Acrylic Table Tent Format */
                <div
                  className="table-card-print-item bg-white border-2 border-zinc-900 rounded-3xl p-6 sm:p-7 text-center flex flex-col justify-between shadow-xl w-[360px] min-h-[520px]"
                >
                  {/* Top Header */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] text-white text-[10px] font-mono font-bold tracking-widest uppercase mb-2">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-[#CDEBC5]" />
                      TAGPUAN FOOD HUB
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[#111111] uppercase font-mono leading-none">
                      {selectedBranch.name}
                    </h1>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">
                      Authentic Filipino Sizzling & Silog Hub
                    </p>

                    {/* Table Number Banner */}
                    <div className="mt-2.5 py-1.5 px-4 bg-amber-300 text-amber-950 rounded-xl font-mono font-black text-base border-2 border-amber-400 shadow-xs">
                      🍽️ {previewTable.toUpperCase()} • DINE-IN
                    </div>
                  </div>

                  {/* QR Box */}
                  <div className="my-3 p-3 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 flex flex-col items-center">
                    <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-zinc-200 inline-block">
                      {qrMap[previewTable] ? (
                        <img
                          src={qrMap[previewTable]}
                          alt={`${previewTable} QR`}
                          className="w-40 h-40 object-contain"
                        />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-zinc-400">Loading QR...</div>
                      )}
                    </div>

                    <div className="mt-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-black uppercase">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        I-scan para mag-order mula sa lamesa
                      </span>
                    </div>
                  </div>

                  {/* 3 Step Instruction Guide */}
                  <div className="grid grid-cols-3 gap-2 text-left pt-2 border-t border-zinc-200">
                    <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-zinc-400 uppercase">
                        <Smartphone className="w-3 h-3 text-[#111111]" /> 1. Scan
                      </div>
                      <p className="text-[10px] font-bold text-zinc-800 leading-tight mt-0.5">
                        Itapat ang camera sa QR code
                      </p>
                    </div>

                    <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-zinc-400 uppercase">
                        <UtensilsCrossed className="w-3 h-3 text-[#111111]" /> 2. Order
                      </div>
                      <p className="text-[10px] font-bold text-zinc-800 leading-tight mt-0.5">
                        Piliin ang Sisig, Silog, Burger
                      </p>
                    </div>

                    <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 uppercase">
                        <Award className="w-3 h-3 text-emerald-600" /> 3. Relax
                      </div>
                      <p className="text-[10px] font-bold text-emerald-900 leading-tight mt-0.5">
                        Ihahatid sa iyong lamesa!
                      </p>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="mt-3 text-[9px] font-mono text-zinc-400 flex items-center justify-between border-t border-zinc-100 pt-2">
                    <span>{selectedBranch.address ? `${selectedBranch.address.slice(0, 32)}...` : 'Tagpuan Store'}</span>
                    <span className="font-bold text-zinc-700">Mobile Table Ordering</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 bg-white border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-600 truncate max-w-md">
            <span className="font-bold text-zinc-800">Target QR URL:</span>
            <span className="font-mono text-[11px] text-zinc-500 truncate">{currentKioskUrl}</span>
            <button
              onClick={handleCopyLink}
              className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
              title="Copy URL"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadSingleQR}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#111111] text-[#CDEBC5] hover:bg-black rounded-xl text-xs font-black shadow-md transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              {printFormat === 'batch_sheet' ? `Print All (${tableList.length} Tables)` : `Print ${previewTable} Tent / Sticker`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TableQRGeneratorModal = PrintableTableQRModal;
