import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Printer,
  Copy,
  Check,
  Download,
  X,
  Sparkles,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  UtensilsCrossed,
  Flame,
  Award
} from 'lucide-react';
import { Branch } from '../../types';

interface BranchKioskQRModalProps {
  branch: Branch | { id: string; name: string; code?: string; address?: string };
  isOpen: boolean;
  onClose: () => void;
}

export const BranchKioskQRModal: React.FC<BranchKioskQRModalProps> = ({
  branch,
  isOpen,
  onClose
}) => {
  const [posterFormat, setPosterFormat] = useState<'4x6' | 'a4'>('4x6');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Compute the direct Kiosk URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tagpuan.ph';
  const queryParams = new URLSearchParams();
  queryParams.set('mode', 'kiosk');
  queryParams.set('view', 'kiosk');
  queryParams.set('branch_id', branch.id);
  queryParams.set('branchId', branch.id);
  if (tableNumber.trim()) {
    queryParams.set('table', tableNumber.trim());
  }
  const kioskUrl = `${origin}/?${queryParams.toString()}`;

  // Generate QR Code whenever branch or tableNumber changes
  useEffect(() => {
    if (!isOpen || !branch.id) return;
    setIsGenerating(true);
    QRCode.toDataURL(kioskUrl, {
      width: posterFormat === '4x6' ? 500 : 700,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
        setIsGenerating(false);
      });
  }, [isOpen, branch.id, kioskUrl, tableNumber, posterFormat]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Tagpuan-Kiosk-QR-${branch.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Dynamic Print Styles according to format */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-kiosk-poster, #printable-kiosk-poster * {
              visibility: visible !important;
            }
            #printable-kiosk-poster {
              position: fixed !important;
              left: 50% !important;
              top: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: ${posterFormat === '4x6' ? '3.8in' : '7.5in'} !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: 3px solid #111111 !important;
              padding: ${posterFormat === '4x6' ? '20px' : '36px'} !important;
              background: white !important;
              page-break-inside: avoid !important;
            }
          }
        `}
      </style>

      {/* Printable Poster Container */}
      <div className="bg-white text-zinc-900 w-full max-w-2xl rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar (Hidden during print) */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#CDEBC5] text-[#111111]">
                  OFFICIAL KIOSK POSTER
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {(branch as any).code || 'TAG'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Customer Kiosk QR Poster Generator
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar (Hidden during print) */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Format Selector: 4x6 vs A4 */}
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Poster Format
              </label>
              <div className="flex items-center bg-white border border-zinc-300 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setPosterFormat('4x6')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    posterFormat === '4x6'
                      ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  4" x 6" Table Tent
                </button>
                <button
                  type="button"
                  onClick={() => setPosterFormat('a4')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    posterFormat === 'a4'
                      ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  A4 Counter Signage
                </button>
              </div>
            </div>

            {/* Table Number */}
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Table # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 04 (or leave blank)"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#111111] w-36"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE POSTER CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-zinc-100">
          <div
            id="printable-kiosk-poster"
            ref={printAreaRef}
            className={`bg-white border-2 border-zinc-900 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-xl transition-all ${
              posterFormat === '4x6' ? 'w-[360px] min-h-[490px]' : 'w-[480px] min-h-[640px]'
            }`}
          >
            {/* Brand Header */}
            <div className="space-y-1 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] text-[#CDEBC5] text-xs font-black tracking-wider uppercase mb-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>TAGPUAN FOOD HUB</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight uppercase font-mono">
                {branch.name}
              </h1>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                AUTHENTIC BURGERS, SILOG & SIZZLING SPECIALS
              </p>
            </div>

            {/* Table Number Badge */}
            <div className="mb-4">
              {tableNumber.trim() ? (
                <span className="px-3 py-1 rounded-xl bg-[#CDEBC5] text-[#111111] border border-[#a8e09c] text-xs font-black font-mono">
                  🍽️ TABLE {tableNumber.trim().toUpperCase()}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-black font-mono">
                  📍 COUNTER & DINE-IN KIOSK
                </span>
              )}
            </div>

            {/* QR Frame */}
            <div className="relative p-3 rounded-2xl bg-white border-3 border-[#111111] shadow-lg flex items-center justify-center mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Tagpuan Mobile Kiosk QR"
                  className={posterFormat === '4x6' ? 'w-44 h-44 object-contain' : 'w-56 h-56 object-contain'}
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-zinc-300 animate-pulse" />
                </div>
              )}
            </div>

            {/* Call to action headline */}
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 text-xs font-black tracking-tight">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                SCAN HERE TO ORDER & EARN LOYALTY POINTS
              </div>
              <p className="text-[11px] font-medium text-zinc-600 mt-1 max-w-xs">
                No app download required. Scan with camera, customize your meal, and earn 1 point per ₱100 spent!
              </p>
            </div>

            {/* 3 Step Guide */}
            <div className="w-full grid grid-cols-3 gap-1.5 text-left border-t border-zinc-200 pt-3">
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-[9px] font-mono font-bold text-zinc-400 block">STEP 1</span>
                <p className="text-[10px] font-bold text-zinc-800 leading-tight">Point camera at QR code</p>
              </div>
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-[9px] font-mono font-bold text-zinc-400 block">STEP 2</span>
                <p className="text-[10px] font-bold text-zinc-800 leading-tight">Select meals & combos</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[9px] font-mono font-bold text-emerald-700 block">STEP 3</span>
                <p className="text-[10px] font-bold text-emerald-950 leading-tight">Earn points & free food</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 text-[9px] font-mono text-zinc-400 w-full flex items-center justify-between border-t border-zinc-100 pt-2">
              <span className="truncate max-w-[200px]">{(branch as any).address || branch.name}</span>
              <span className="font-bold text-zinc-700">Official Tagpuan POS Kiosk</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden during print) */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3 print:hidden">
          <p className="text-xs text-zinc-500">
            Selected format: <strong className="text-zinc-800">{posterFormat === '4x6' ? '4" x 6" Table Tent' : 'A4 Counter Signage'}</strong>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
