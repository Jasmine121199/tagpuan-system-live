import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  TrendingUp,
  CreditCard,
  UserCheck,
  Receipt,
  Scale,
  Building2,
  PackageCheck,
  Clock,
  Boxes,
  Truck,
  ShoppingCart,
  GitPullRequest,
  Users,
  Wallet,
  Award,
  ShieldCheck,
  Bot,
  Database,
  UploadCloud,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  ReportType,
  ReportDatePreset,
  UnifiedReportResponse,
  ReportDashboardSummary,
  Branch,
  UserRole,
  DataManagementStatus,
  DataIntegrityCheckResult
} from '../../types/index';
import { api } from '../../lib/api';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportSummaryCards } from './ReportSummaryCards';
import { ReportTableView } from './ReportTableView';
import { DataManagementView } from './DataManagementView';
import { DataIntegrityModal } from './DataIntegrityModal';
import { MasterImportModal } from './MasterImportModal';

interface ReportCenterProps {
  userRole: UserRole;
  userBranchId: string | null;
  userBranchName?: string;
  userEmail: string;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({
  userRole,
  userBranchId,
  userBranchName,
  userEmail
}) => {
  // Navigation Tabs: 'reports' or 'data-management'
  const [activeTab, setActiveTab] = useState<'reports' | 'data-management'>('reports');

  // Filters State
  const [activeReportType, setActiveReportType] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<ReportDatePreset>('TODAY');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    userRole === 'OWNER' ? 'ALL' : (userBranchId || 'ALL')
  );
  const [sortBy, setSortBy] = useState<string>('highest-sales');

  // Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reportData, setReportData] = useState<UnifiedReportResponse | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<ReportDashboardSummary | null>(null);
  const [dataManagementStatus, setDataManagementStatus] = useState<DataManagementStatus | null>(null);
  const [integrityResult, setIntegrityResult] = useState<DataIntegrityCheckResult | null>(null);

  // Loading & Modal State
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [isRunningIntegrity, setIsRunningIntegrity] = useState<boolean>(false);
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Load branches
  useEffect(() => {
    api.getBranches().then(setBranches).catch(console.error);
  }, []);

  // Fetch Dashboard Summary
  const fetchDashboardSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const summary = await api.getReportDashboardSummary({
        period,
        start_date: period === 'CUSTOM' ? startDate : undefined,
        end_date: period === 'CUSTOM' ? endDate : undefined,
        branch_id: selectedBranchId
      });
      setDashboardSummary(summary);
    } catch (err) {
      console.error('Failed to fetch report dashboard summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [period, startDate, endDate, selectedBranchId]);

  // Fetch Active Report Data
  const fetchReportData = useCallback(async () => {
    setIsLoadingReport(true);
    try {
      const data = await api.getReport({
        type: activeReportType,
        period,
        start_date: period === 'CUSTOM' ? startDate : undefined,
        end_date: period === 'CUSTOM' ? endDate : undefined,
        branch_id: selectedBranchId,
        sort_by: sortBy
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsLoadingReport(false);
    }
  }, [activeReportType, period, startDate, endDate, selectedBranchId, sortBy]);

  // Fetch Data Management Status
  const fetchDataManagementStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const status = await api.getDataManagementStatus();
      setDataManagementStatus(status);
    } catch (err) {
      console.error('Failed to fetch data management status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Run Integrity Check
  const handleRunIntegrityCheck = async () => {
    setIsRunningIntegrity(true);
    try {
      const res = await api.runDataIntegrityCheck();
      setIntegrityResult(res);
      setIsIntegrityModalOpen(true);
    } catch (err) {
      console.error('Integrity check error:', err);
    } finally {
      setIsRunningIntegrity(false);
    }
  };

  // Initial & reactive fetch
  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  useEffect(() => {
    if (activeTab === 'data-management') {
      fetchDataManagementStatus();
    }
  }, [activeTab, fetchDataManagementStatus]);

  // Report Categories Config
  const reportCategories = [
    {
      name: 'Financial & Sales',
      reports: [
        { type: 'sales' as ReportType, name: 'Sales Summary', icon: TrendingUp },
        { type: 'daily-sales' as ReportType, name: 'Daily Sales Ledger', icon: FileText },
        { type: 'payment' as ReportType, name: 'Payment Breakdown', icon: CreditCard },
        { type: 'cashier' as ReportType, name: 'Cashier Remittance', icon: UserCheck },
        { type: 'expense' as ReportType, name: 'Branch Expenses', icon: Receipt },
        { type: 'reconciliation' as ReportType, name: 'End-of-Day Balancing', icon: Scale },
        { type: 'branch-comparison' as ReportType, name: '17-Branch Comparison', icon: Building2 }
      ]
    },
    {
      name: 'Operations & Menu',
      reports: [
        { type: 'product-sales' as ReportType, name: 'Product Sales Ranking', icon: PackageCheck },
        { type: 'kds' as ReportType, name: 'KDS Speed of Service', icon: Clock }
      ]
    },
    {
      name: 'Inventory & Supply Chain',
      reports: [
        { type: 'inventory' as ReportType, name: 'Stock Levels & Reorder', icon: Boxes },
        { type: 'inventory-movement' as ReportType, name: 'Stock Movement History', icon: Layers },
        { type: 'purchasing' as ReportType, name: 'Purchase Orders', icon: ShoppingCart },
        { type: 'request-orders' as ReportType, name: 'Store Request Orders', icon: GitPullRequest },
        { type: 'delivery' as ReportType, name: 'Logistics Deliveries', icon: Truck }
      ]
    },
    {
      name: 'HR, Loyalty & Security',
      reports: [
        { type: 'attendance' as ReportType, name: 'Employee Attendance', icon: Users },
        { type: 'payroll' as ReportType, name: 'Branch Payroll', icon: Wallet },
        { type: 'loyalty' as ReportType, name: 'Loyalty Redemptions', icon: Award },
        { type: 'audit-logs' as ReportType, name: 'Audit Trail', icon: ShieldCheck },
        { type: 'ai' as ReportType, name: 'AI Risk Findings', icon: Bot }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Tagpuan Central Report Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
              Phase 14
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-source-of-truth business intelligence, multi-format export, and relational data management
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="nav-integrity-btn"
            type="button"
            onClick={() => {
              handleRunIntegrityCheck();
            }}
            disabled={isRunningIntegrity}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRunningIntegrity ? 'Auditing...' : 'Verify Data Integrity'}</span>
          </button>

          {userRole === 'OWNER' && (
            <button
              id="nav-import-btn"
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Master Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          id="tab-btn-reports"
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'border-red-700 text-red-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Reports & Analytics</span>
        </button>

        <button
          id="tab-btn-data-management"
          type="button"
          onClick={() => setActiveTab('data-management')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'data-management'
              ? 'border-red-700 text-red-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data Management & Integrity</span>
        </button>
      </div>

      {activeTab === 'reports' ? (
        <>
          {/* Operational KPI Cards */}
          <ReportSummaryCards
            summary={dashboardSummary}
            onSelectReport={(type) => {
              setActiveReportType(type);
            }}
            activeReport={activeReportType}
          />

          {/* Unified Filter Bar */}
          <ReportFilterBar
            period={period}
            onPeriodChange={(p) => setPeriod(p)}
            startDate={startDate}
            onStartDateChange={(d) => setStartDate(d)}
            endDate={endDate}
            onEndDateChange={(d) => setEndDate(d)}
            selectedBranchId={selectedBranchId}
            onBranchChange={(id) => setSelectedBranchId(id)}
            branches={branches}
            userRole={userRole}
            userBranchName={userBranchName}
            onRefresh={() => {
              fetchDashboardSummary();
              fetchReportData();
            }}
            isLoading={isLoadingReport || isLoadingSummary}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            showSortOptions={activeReportType === 'products'}
          />

          {/* Report Category Navigator & Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-6">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Select Report (17 Centralized Ledgers)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportCategories.map((category) => (
                <div key={category.name} className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    {category.name}
                  </div>
                  <div className="space-y-1">
                    {category.reports.map((rep) => {
                      const Icon = rep.icon;
                      const isSelected = activeReportType === rep.type;

                      return (
                        <button
                          key={rep.type}
                          id={`select-report-${rep.type}`}
                          type="button"
                          onClick={() => setActiveReportType(rep.type)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-red-700 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                          <span className="truncate">{rep.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unified Report Table View */}
          <ReportTableView
            report={reportData}
            isLoading={isLoadingReport}
            onRefresh={fetchReportData}
          />
        </>
      ) : (
        /* Data Management & Integrity View */
        <DataManagementView
          userRole={userRole}
          onOpenIntegrityCheck={handleRunIntegrityCheck}
          onOpenImport={() => setIsImportModalOpen(true)}
          status={dataManagementStatus}
          isLoading={isLoadingStatus}
          onRefresh={fetchDataManagementStatus}
        />
      )}

      {/* Modals */}
      <DataIntegrityModal
        isOpen={isIntegrityModalOpen}
        onClose={() => setIsIntegrityModalOpen(false)}
        checkResult={integrityResult}
        isRunning={isRunningIntegrity}
        onRunCheck={handleRunIntegrityCheck}
      />

      <MasterImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={() => {
          fetchDataManagementStatus();
          fetchDashboardSummary();
        }}
      />
    </div>
  );
};
