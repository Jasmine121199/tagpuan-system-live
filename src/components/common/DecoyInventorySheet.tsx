import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash
} from 'lucide-react';

interface DecoyInventorySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RawMaterialRow {
  code: string;
  name: string;
  category: string;
  batchLot: string;
  unit: string;
  beginningCount: number;
  receivedCommissary: number;
  transferredOut: number;
  physicalEndingCount: number;
  varianceStatus: 'MATCHED' | 'DISCREPANCY_LOW' | 'AUDIT_VERIFIED';
}

const SAMPLE_RAW_MATERIALS: RawMaterialRow[] = [
  { code: 'RM-PAT-001', name: 'Beef Patties (100% Quarter-Pound)', category: 'Meat Products', batchLot: 'LOT-202609-01A', unit: 'kg / packs', beginningCount: 140, receivedCommissary: 60, transferredOut: 12, physicalEndingCount: 188, varianceStatus: 'MATCHED' },
  { code: 'RM-SIO-002', name: 'Pork Siomai Steamer Packs (50s)', category: 'Dimsum Viands', batchLot: 'LOT-202609-02B', unit: 'packs', beginningCount: 85, receivedCommissary: 40, transferredOut: 5, physicalEndingCount: 120, varianceStatus: 'MATCHED' },
  { code: 'RM-BUN-003', name: 'Sesame Seed Burger Buns (12s)', category: 'Bakery Logistics', batchLot: 'LOT-202609-03C', unit: 'packs', beginningCount: 110, receivedCommissary: 70, transferredOut: 8, physicalEndingCount: 172, varianceStatus: 'MATCHED' },
  { code: 'RM-EGG-004', name: 'Farm Fresh Medium Eggs (Tray 30s)', category: 'Poultry', batchLot: 'LOT-202609-04D', unit: 'trays', beginningCount: 22, receivedCommissary: 15, transferredOut: 2, physicalEndingCount: 35, varianceStatus: 'AUDIT_VERIFIED' },
  { code: 'RM-RIC-005', name: 'Sinandomeng Garlic Grain Rice', category: 'Dry Goods', batchLot: 'LOT-202609-05E', unit: '50kg sacks', beginningCount: 14, receivedCommissary: 8, transferredOut: 0, physicalEndingCount: 22, varianceStatus: 'MATCHED' },
  { code: 'RM-CHS-006', name: 'Cheddar Cheese Singles Slices', category: 'Dairy & Cheese', batchLot: 'LOT-202609-06F', unit: 'packs (84s)', beginningCount: 30, receivedCommissary: 15, transferredOut: 3, physicalEndingCount: 42, varianceStatus: 'MATCHED' },
  { code: 'RM-SAU-007', name: 'Signature Burger Mayo Dressing', category: 'Condiments', batchLot: 'LOT-202609-07G', unit: '1-gal bottles', beginningCount: 18, receivedCommissary: 10, transferredOut: 1, physicalEndingCount: 27, varianceStatus: 'MATCHED' },
  { code: 'RM-CHI-008', name: 'Toasted Chili Garlic Paste (Bulk)', category: 'Condiments', batchLot: 'LOT-202609-08H', unit: 'jars', beginningCount: 25, receivedCommissary: 12, transferredOut: 0, physicalEndingCount: 37, varianceStatus: 'MATCHED' },
  { code: 'RM-FRO-009', name: 'Shoestring Cut French Fries', category: 'Frozen Snacks', batchLot: 'LOT-202609-09I', unit: '2kg bags', beginningCount: 45, receivedCommissary: 30, transferredOut: 4, physicalEndingCount: 71, varianceStatus: 'MATCHED' },
  { code: 'RM-CUP-010', name: 'Takeout Paper Meal Boxes & Spoons', category: 'Packaging', batchLot: 'LOT-202609-10J', unit: 'bundles', beginningCount: 60, receivedCommissary: 50, transferredOut: 0, physicalEndingCount: 110, varianceStatus: 'AUDIT_VERIFIED' }
];

export const DecoyInventorySheet: React.FC<DecoyInventorySheetProps> = ({
  isOpen,
  onClose
}) => {
  const [escapePressCount, setEscapePressCount] = useState<number>(0);
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [headerTapCount, setHeaderTapCount] = useState<number>(0);
  const headerTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // 1. Detect 3 rapid Escape presses to stealthily dismiss decoy
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEscapePressCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            onClose();
            return 0;
          }
          if (escapeTimeoutRef.current) clearTimeout(escapeTimeoutRef.current);
          escapeTimeoutRef.current = setTimeout(() => {
            setEscapePressCount(0);
          }, 1200);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (escapeTimeoutRef.current) clearTimeout(escapeTimeoutRef.current);
    };
  }, [isOpen, onClose]);

  // 2. Triple-tap on the header text to exit
  const handleHeaderClick = () => {
    setHeaderTapCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        onClose();
        return 0;
      }
      if (headerTapTimeoutRef.current) clearTimeout(headerTapTimeoutRef.current);
      headerTapTimeoutRef.current = setTimeout(() => {
        setHeaderTapCount(0);
      }, 1000);
      return next;
    });
  };

  if (!isOpen) return null;

  const filteredItems = SAMPLE_RAW_MATERIALS.filter(m =>
    m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-100 text-zinc-900 flex flex-col font-sans select-none overflow-hidden animate-fadeIn">
      {/* Decoy Toolbar / Ribbon resembling an institutional auditing spreadsheet */}
      <header className="bg-emerald-800 text-white px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-emerald-950 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-emerald-950/80 flex items-center justify-center font-bold text-emerald-200">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h1
              onClick={handleHeaderClick}
              title="Click triple times or press ESC 3 times to return"
              className="text-sm font-bold tracking-tight cursor-default select-none hover:text-emerald-100 transition"
            >
              Raw Materials & Stock Inventory Sheet
            </h1>
            <p className="text-[11px] text-emerald-200/90 font-mono">
              Form 104-B • Tagpuan Commissary & Receiving Log (Internal Auditor Copy)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0 text-[11px]">
          <span className="bg-emerald-900/90 px-2 py-0.5 rounded text-emerald-100 font-mono">
            PERIOD: SEP 2026 • REVISED
          </span>
          <span className="bg-emerald-900/90 px-2 py-0.5 rounded text-emerald-100 font-mono">
            STATUS: AUDIT_LOCKED
          </span>
        </div>
      </header>

      {/* Audit Form Controls Bar */}
      <div className="bg-white border-b border-zinc-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search raw material name, code, or batch..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alert("Audit sheet exported as CSV format.")}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded flex items-center gap-1 font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded flex items-center gap-1 font-medium transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Content */}
      <main className="flex-1 overflow-auto bg-white p-4">
        <div className="border border-zinc-300 rounded overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3 border-r border-zinc-200">Item Code</th>
                <th className="py-2.5 px-3 border-r border-zinc-200 font-sans">Material Description</th>
                <th className="py-2.5 px-3 border-r border-zinc-200">Category</th>
                <th className="py-2.5 px-3 border-r border-zinc-200">Batch / Lot #</th>
                <th className="py-2.5 px-3 border-r border-zinc-200 text-right">Beginning</th>
                <th className="py-2.5 px-3 border-r border-zinc-200 text-right">Commissary In</th>
                <th className="py-2.5 px-3 border-r border-zinc-200 text-right">Transfer Out</th>
                <th className="py-2.5 px-3 border-r border-zinc-200 text-right font-bold">Physical Count</th>
                <th className="py-2.5 px-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {filteredItems.map((item, idx) => (
                <tr
                  key={item.code}
                  className={`hover:bg-zinc-50/80 transition ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/40'
                  }`}
                >
                  <td className="py-2 px-3 border-r border-zinc-200 text-zinc-600 font-medium">{item.code}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 font-sans font-bold text-zinc-900">{item.name}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 text-zinc-600">{item.category}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 text-zinc-500">{item.batchLot}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 text-right text-zinc-600">{item.beginningCount}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 text-right text-emerald-700">+{item.receivedCommissary}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 text-right text-amber-700">-{item.transferredOut}</td>
                  <td className="py-2 px-3 border-r border-zinc-200 text-right font-black text-zinc-950 bg-emerald-50/30">
                    {item.physicalEndingCount} {item.unit}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{item.varianceStatus}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footnote notes resembling standard procurement documentation */}
        <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded text-[11px] text-zinc-500 flex items-start justify-between">
          <div>
            <p className="font-semibold text-zinc-700">Physical Stock Count Certification</p>
            <p>Certified by Commissary Receiving Supervisor & Independent Inventory Checker.</p>
          </div>
          <div className="text-right font-mono text-[10px] text-zinc-400">
            <span>Doc ID: #TG-INV-2026-09</span>
          </div>
        </div>
      </main>

      {/* Discreet Footer Bar with version tag and exit hint */}
      <footer className="bg-zinc-200 border-t border-zinc-300 px-4 py-2 flex items-center justify-between text-[11px] text-zinc-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Internal Physical Inventory Ledger</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 font-mono">v1.0.4 • Tagpuan Food Hub</span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 underline text-[10px]"
            title="Return to management console"
          >
            Return
          </button>
        </div>
      </footer>
    </div>
  );
};
