import React, { useState, useEffect } from 'react';
import { Branch } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SalesSummaryTab } from './SalesSummaryTab';
import { CashierShiftsTab } from './CashierShiftsTab';
import { CashRemittanceTab } from './CashRemittanceTab';
import { BranchExpensesTab } from './BranchExpensesTab';
import { FinancialReconciliationTab } from './FinancialReconciliationTab';
import { CashierSalesReportTab } from './CashierSalesReportTab';
import { TodaysSoldMenuItemsTable } from './TodaysSoldMenuItemsTable';
import {
  TrendingUp,
  Clock,
  Banknote,
  Receipt,
  Scale,
  Users,
  Building2,
  DollarSign,
  ShieldCheck,
  Utensils
} from 'lucide-react';

export const FinancialDashboardView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<'summary' | 'products' | 'shifts' | 'remittances' | 'expenses' | 'reconciliation' | 'cashiers'>('summary');
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem('tagpuan_token');
        const response = await fetch('/api/branches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error('Failed to load branches for financial view:', err);
      }
    };
    fetchBranches();
  }, []);

  const tabs = [
    { id: 'summary', label: 'Sales Summary', icon: TrendingUp },
    { id: 'products', label: "Today's Sold Items", icon: Utensils },
    { id: 'shifts', label: 'Cashier Shifts & Cash Count', icon: Clock },
    { id: 'remittances', label: 'Cash Remittance', icon: Banknote },
    { id: 'expenses', label: 'Branch Expenses', icon: Receipt },
    { id: 'reconciliation', label: 'Multi-source Reconciliation', icon: Scale },
    { id: 'cashiers', label: 'Cashier Sales Report', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111111] text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-[#CDEBC5] text-[#111111] uppercase">
              Phase 8 Financial Hub
            </span>
            <span className="text-xs text-zinc-400">
              {isOwner ? 'Executive Financial Management' : isManager ? 'Branch Financial Operations' : 'Cashier Shift Financials'}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Sales, Remittance & Financial Reconciliation
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Complete financial integrity from completed orders → cashier shifts & denomination cash counts → cash remittances with deposit proof → operational expenses → multi-source reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono text-zinc-400">Financial Integrity</p>
              <p className="text-xs font-bold text-emerald-400">Immutable Audit Trail Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#CDEBC5]' : 'text-zinc-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render Active Tab Content */}
      <div className="animate-fadeIn">
        {activeTab === 'summary' && <SalesSummaryTab branches={branches} />}
        {activeTab === 'products' && <TodaysSoldMenuItemsTable branches={branches} />}
        {activeTab === 'shifts' && <CashierShiftsTab branches={branches} />}
        {activeTab === 'remittances' && <CashRemittanceTab branches={branches} />}
        {activeTab === 'expenses' && <BranchExpensesTab branches={branches} />}
        {activeTab === 'reconciliation' && <FinancialReconciliationTab branches={branches} />}
        {activeTab === 'cashiers' && <CashierSalesReportTab branches={branches} />}
      </div>
    </div>
  );
};
