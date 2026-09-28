import React from 'react';
import { CashDenominationCount } from '../../types';
import { Banknote, Coins, Calculator } from 'lucide-react';

interface DenominationCalculatorProps {
  denominations: CashDenominationCount;
  onChange: (denominations: CashDenominationCount, total: number) => void;
  readOnly?: boolean;
}

export const DENOMINATION_VALUES: { key: keyof CashDenominationCount; label: string; value: number; type: 'bill' | 'coin' }[] = [
  { key: 'd1000', label: '₱1,000 Bill', value: 1000, type: 'bill' },
  { key: 'd500', label: '₱500 Bill', value: 500, type: 'bill' },
  { key: 'd200', label: '₱200 Bill', value: 200, type: 'bill' },
  { key: 'd100', label: '₱100 Bill', value: 100, type: 'bill' },
  { key: 'd50', label: '₱50 Bill', value: 50, type: 'bill' },
  { key: 'd20', label: '₱20 Bill/Coin', value: 20, type: 'bill' },
  { key: 'd10', label: '₱10 Coin', value: 10, type: 'coin' },
  { key: 'd5', label: '₱5 Coin', value: 5, type: 'coin' },
  { key: 'd1', label: '₱1 Coin', value: 1, type: 'coin' },
];

export const calculateTotalCash = (counts: CashDenominationCount): number => {
  return DENOMINATION_VALUES.reduce((sum, item) => {
    const count = counts[item.key] || 0;
    return sum + (count * item.value);
  }, 0);
};

export const DenominationCalculator: React.FC<DenominationCalculatorProps> = ({
  denominations,
  onChange,
  readOnly = false
}) => {
  const handleCountChange = (key: keyof CashDenominationCount, val: string) => {
    const count = Math.max(0, parseInt(val, 10) || 0);
    const updated = {
      ...denominations,
      [key]: count
    };
    const total = calculateTotalCash(updated);
    onChange(updated, total);
  };

  const totalCalculated = calculateTotalCash(denominations);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-zinc-900 text-white p-3.5 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#CDEBC5]" />
          <div>
            <p className="text-xs font-semibold text-zinc-300">Total Cash Counted</p>
            <p className="text-xl font-mono font-black text-[#CDEBC5]">
              ₱{totalCalculated.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
            {(Object.values(denominations) as number[]).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0)} Pieces Total
          </span>
        </div>
      </div>

      {/* Grid of Denominations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {DENOMINATION_VALUES.map((denom) => {
          const count = denominations[denom.key] || 0;
          const subtotal = count * denom.value;

          return (
            <div
              key={denom.key}
              className={`p-2.5 rounded-xl border transition-all ${
                count > 0 ? 'bg-emerald-50/50 border-emerald-300' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {denom.type === 'bill' ? (
                    <Banknote className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Coins className="w-4 h-4 text-amber-700" />
                  )}
                  <span className="text-xs font-bold text-zinc-800">{denom.label}</span>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-600">
                  ₱{subtotal.toLocaleString('en-PH')}
                </span>
              </div>

              {readOnly ? (
                <div className="w-full text-right font-mono font-bold text-sm text-zinc-900 bg-zinc-100 py-1 px-2 rounded-lg border border-zinc-200">
                  {count} pcs
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={count === 0 ? '' : count}
                    onChange={(e) => handleCountChange(denom.key, e.target.value)}
                    placeholder="0"
                    className="w-full text-right font-mono font-bold text-sm bg-white border border-zinc-300 rounded-lg py-1 px-2 text-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                  <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap">pcs</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
