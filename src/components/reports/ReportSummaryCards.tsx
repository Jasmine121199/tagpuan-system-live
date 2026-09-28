import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  FileText,
  DollarSign,
  Users,
  Award,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { ReportDashboardSummary, ReportType } from '../../types/index';

interface ReportSummaryCardsProps {
  summary: ReportDashboardSummary | null;
  onSelectReport: (type: ReportType) => void;
  activeReport: ReportType;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({
  summary,
  onSelectReport,
  activeReport
}) => {
  if (!summary) return null;

  const cards = [
    {
      id: 'summary-card-sales',
      title: 'Period Net Sales',
      value: `₱${(summary.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${summary.orders_count || 0} completed orders`,
      icon: TrendingUp,
      type: 'sales' as ReportType,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'summary-card-orders',
      title: 'Total Order Volume',
      value: (summary.orders_count || 0).toLocaleString(),
      subtitle: 'POS & Kiosk channels',
      icon: ShoppingBag,
      type: 'sales' as ReportType,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'summary-card-inventory',
      title: 'Low Stock Ingredients',
      value: summary.low_stock_count.toString(),
      subtitle: summary.low_stock_count > 0 ? 'Below reorder threshold' : 'All stocks healthy',
      icon: AlertTriangle,
      type: 'inventory' as ReportType,
      color: summary.low_stock_count > 0 ? 'text-amber-700' : 'text-slate-600',
      bgColor: summary.low_stock_count > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
    },
    {
      id: 'summary-card-requests',
      title: 'Pending Branch Reqs',
      value: summary.pending_requests_count.toString(),
      subtitle: 'Awaiting Commissary review',
      icon: FileText,
      type: 'request-orders' as ReportType,
      color: summary.pending_requests_count > 0 ? 'text-indigo-700' : 'text-slate-600',
      bgColor: summary.pending_requests_count > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'
    },
    {
      id: 'summary-card-cashier',
      title: 'Cash Variances',
      value: summary.cash_variances_count.toString(),
      subtitle: summary.cash_variances_count > 0 ? 'Drawer discrepancy flagged' : 'Drawers balanced',
      icon: DollarSign,
      type: 'cashier' as ReportType,
      color: summary.cash_variances_count > 0 ? 'text-red-700' : 'text-emerald-700',
      bgColor: summary.cash_variances_count > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'summary-card-payroll',
      title: 'Payroll In Review',
      value: summary.payroll_alerts_count.toString(),
      subtitle: 'Pending owner sign-off',
      icon: Users,
      type: 'payroll' as ReportType,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200'
    },
    {
      id: 'summary-card-loyalty',
      title: 'Loyalty Rewards',
      value: summary.loyalty_redemptions_count.toString(),
      subtitle: 'Points claimed in period',
      icon: Award,
      type: 'loyalty' as ReportType,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200'
    },
    {
      id: 'summary-card-kds',
      title: 'Kitchen Delays',
      value: summary.kitchen_delays_count.toString(),
      subtitle: 'Orders exceeding 10 mins',
      icon: Clock,
      type: 'kds' as ReportType,
      color: summary.kitchen_delays_count > 0 ? 'text-orange-700' : 'text-slate-600',
      bgColor: summary.kitchen_delays_count > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'
    },
    {
      id: 'summary-card-ai',
      title: 'Active AI Anomalies',
      value: summary.audit_alerts_count.toString(),
      subtitle: 'AI Agent audit findings',
      icon: ShieldAlert,
      type: 'ai' as ReportType,
      color: summary.audit_alerts_count > 0 ? 'text-rose-700' : 'text-slate-600',
      bgColor: summary.audit_alerts_count > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        const isCurrent = activeReport === c.type;
        return (
          <button
            key={c.id}
            id={c.id}
            type="button"
            onClick={() => onSelectReport(c.type)}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${c.bgColor} ${
              isCurrent ? 'ring-2 ring-red-600 shadow-sm' : 'hover:shadow-xs hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-slate-600 truncate">{c.title}</span>
              <Icon className={`w-3.5 h-3.5 shrink-0 ${c.color}`} />
            </div>
            <div>
              <div className={`text-base font-extrabold tracking-tight ${c.color} truncate`}>{c.value}</div>
              <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{c.subtitle}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
