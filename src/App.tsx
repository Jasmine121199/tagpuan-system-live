import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BranchProvider, useBranch } from './context/BranchContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoginPage } from './components/auth/LoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AppLayout } from './components/layout/AppLayout';
import { OwnerDashboard } from './components/dashboard/OwnerDashboard';
import { ManagerDashboard } from './components/dashboard/ManagerDashboard';
import { OperationalDashboard } from './components/dashboard/OperationalDashboard';
import { UserManagementView } from './components/users/UserManagementView';
import { EmployeeManagementView } from './components/employees/EmployeeManagementView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { PayrollView } from './components/payroll/PayrollView';
import { BranchListView } from './components/branches/BranchListView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { DatabaseSecurityView } from './components/system/DatabaseSecurityView';
import { ProductRecipeManagementView } from './components/products/ProductRecipeManagementView';
import { InventoryManagementView } from './components/inventory/InventoryManagementView';
import { POSView } from './components/pos/POSView';
import { KioskView } from './components/kiosk/KioskView';
import { KDSView } from './components/kds/KDSView';
import { PurchasingView } from './components/purchasing/PurchasingView';
import { BranchRequestOrdersView } from './components/requests/BranchRequestOrdersView';
import { WarehouseDeliveryView } from './components/warehouse/WarehouseDeliveryView';
import { LoyaltyDashboard } from './components/loyalty/LoyaltyDashboard';
import { AIAgentCommandCenter } from './components/ai/AIAgentCommandCenter';
import { MasterControlCenter } from './components/admin/MasterControlCenter';
import { ReportCenter } from './components/reports/ReportCenter';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { ManagerPinSetupModal } from './components/auth/ManagerPinSetupModal';
import { DecoyInventorySheet } from './components/common/DecoyInventorySheet';
import { FinancialDashboardView } from './components/financial/FinancialDashboardView';
import { ShiftProvider, useShift } from './context/ShiftContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { googleSheetsPersistence } from './lib/googleSheetsPersistence';
import { Loader2, ShieldAlert, X, Clock, AlertTriangle, ChefHat } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isLoading, isOwner, isManager } = useAuth();
  const { isDecoyActive, setIsDecoyActive } = useBranch();
  const { isClockedIn, activeShift, attendanceChecked, isLoadingShift, refreshShiftStatus, setReturnTargetView } = useShift();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);
  const [isHydratingSheets, setIsHydratingSheets] = useState<boolean>(true);
  const [sheetsHydrationStatus, setSheetsHydrationStatus] = useState<'HYDRATING' | 'SYNCED' | 'FALLBACK'>('HYDRATING');

  // Auto-hydrate menu and pending sync queue from Google Sheets API on initial mount with latency guard
  useEffect(() => {
    let isMounted = true;
    // Fast UI fallback guard: never block initial render longer than 900ms if Google Apps Script experiences latency
    const latencyGuard = setTimeout(() => {
      if (isMounted) {
        setIsHydratingSheets(false);
        setSheetsHydrationStatus((prev) => (prev === 'HYDRATING' ? 'FALLBACK' : prev));
      }
    }, 900);

    Promise.all([
      googleSheetsPersistence.getMenu(),
      googleSheetsPersistence.flushOfflineQueue()
    ])
      .then(() => {
        if (isMounted) {
          setSheetsHydrationStatus('SYNCED');
          setIsHydratingSheets(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSheetsHydrationStatus('FALLBACK');
          setIsHydratingSheets(false);
        }
      })
      .finally(() => {
        clearTimeout(latencyGuard);
      });

    return () => {
      isMounted = false;
      clearTimeout(latencyGuard);
    };
  }, []);

  // Listen to custom navigation events (e.g. from clock-in redirect)
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.view) {
        setActiveView(custom.detail.view);
      }
    };
    window.addEventListener('tagpuan_navigate_view', handleNavigate);
    return () => window.removeEventListener('tagpuan_navigate_view', handleNavigate);
  }, []);

  // Roles subject to mandatory attendance clock-in before tool access
  const requiresAttendanceLock = ['CASHIER', 'STAFF', 'CREW', 'WAREHOUSEMAN', 'KITCHEN'].includes(user?.role || '');

  // Redirect to attendance on login if user lacks an active shift
  useEffect(() => {
    if (user && requiresAttendanceLock && attendanceChecked && isClockedIn === false) {
      if (activeView !== 'attendance') {
        if (user.role === 'KITCHEN' || user.role === 'CREW') {
          setReturnTargetView('kds');
        } else if (user.role === 'WAREHOUSEMAN') {
          setReturnTargetView('warehouse');
        } else if (user.role === 'CASHIER') {
          setReturnTargetView('pos');
        }
        setActiveView('attendance');
      }
    }
  }, [user, requiresAttendanceLock, attendanceChecked, isClockedIn, setReturnTargetView, activeView]);

  const [isPublicKiosk, setIsPublicKiosk] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname.toLowerCase();
    return (
      params.get('mode') === 'kiosk' ||
      params.get('kiosk') === '1' ||
      params.get('view') === 'kiosk' ||
      pathname === '/kiosk' ||
      pathname.startsWith('/kiosk/')
    );
  });
  const [isPublicPOS, setIsPublicPOS] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname.toLowerCase();
    return (
      params.get('mode') === 'pos' ||
      params.get('view') === 'pos' ||
      params.get('pos') === '1' ||
      pathname === '/pos' ||
      pathname.startsWith('/pos/')
    );
  });

  // Sync active view on user login (if clocked in)
  useEffect(() => {
    if (isClockedIn) {
      if (user?.role === 'KITCHEN' || user?.role === 'CREW') {
        setActiveView('kds');
      } else if (user?.role === 'WAREHOUSEMAN') {
        setActiveView('warehouse');
      } else if (user?.role === 'CASHIER' && activeView === 'attendance') {
        setActiveView('pos');
      }
    }
  }, [user?.role, isClockedIn, activeView]);

  // Proactively verify shift status whenever KDS view is active
  useEffect(() => {
    if (activeView === 'kds' && (user?.role === 'KITCHEN' || user?.role === 'CREW' || (user?.role as string) === 'STAFF')) {
      refreshShiftStatus();
    }
  }, [activeView, user?.role, refreshShiftStatus]);

  // Strict RBAC URL & View Guard: Prevent non-Owner/non-Manager access to /payroll, /payslips, /salaries
  useEffect(() => {
    if (!user) return;

    const pathname = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const viewParam = (searchParams.get('view') || searchParams.get('tab') || '').toLowerCase();

    const isRequestingPayroll =
      pathname.includes('/payroll') ||
      pathname.includes('/payslips') ||
      pathname.includes('/salaries') ||
      viewParam === 'payroll' ||
      viewParam === 'payslips' ||
      viewParam === 'salaries' ||
      activeView === 'payroll';

    if (isRequestingPayroll) {
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        // Immediately redirect to their authorized default home view with access denied notice
        const defaultView = (user.role === 'KITCHEN' || user.role === 'CREW') ? 'kds' : user.role === 'WAREHOUSEMAN' ? 'warehouse' : 'dashboard';
        setActiveView(defaultView);
        setAccessDeniedNotice('Access Denied / Unauthorized: The Payroll and Salary Management module is strictly restricted to Tagpuan Owners and Store Managers.');
        if (pathname.includes('/payroll') || pathname.includes('/payslips') || searchParams.has('view')) {
          window.history.replaceState({}, document.title, window.location.pathname.replace(/\/payroll|\/payslips|\/salaries/gi, '/'));
        }
      } else if (activeView !== 'payroll' && (viewParam === 'payroll' || pathname.includes('/payroll'))) {
        setActiveView('payroll');
      }
    }

    // Strict RBAC URL & View Guard: Central Commissary & Logistics reserved for OWNER and WAREHOUSEMAN only
    const isRequestingWarehouse =
      pathname.includes('/warehouse') ||
      pathname.includes('/commissary') ||
      viewParam === 'warehouse' ||
      viewParam === 'commissary' ||
      activeView === 'warehouse';

    if (isRequestingWarehouse) {
      if (user.role !== 'OWNER' && user.role !== 'WAREHOUSEMAN') {
        const defaultView = user.role === 'MANAGER' ? 'requests' : 'dashboard';
        setActiveView(defaultView);
        setAccessDeniedNotice('Access Restricted: Central Commissary & Logistics is strictly reserved for the Master Owner and authorized Warehouseman only.');
        if (pathname.includes('/warehouse') || pathname.includes('/commissary') || searchParams.has('view') || searchParams.has('tab')) {
          window.history.replaceState({}, document.title, window.location.pathname.replace(/\/warehouse|\/commissary/gi, '/'));
        }
      }
    }
  }, [user, activeView]);

  // Auto-dismiss access denied notification after 8 seconds
  useEffect(() => {
    if (accessDeniedNotice) {
      const timer = setTimeout(() => setAccessDeniedNotice(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [accessDeniedNotice]);

  // Check URL query parameters for password reset token or kiosk/pos mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('reset_token');
    if (token) {
      setResetToken(token);
    }
    if (params.get('mode') === 'kiosk' || params.get('kiosk') === '1' || params.get('view') === 'kiosk') {
      setIsPublicKiosk(true);
    }
    if (params.get('mode') === 'pos' || params.get('view') === 'pos' || params.get('pos') === '1') {
      setIsPublicPOS(true);
    }
    if (params.get('mode') === 'kds' || params.get('view') === 'kds') {
      setActiveView('kds');
    }
  }, []);

  if (isLoading || isHydratingSheets) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-[#111111] p-4">
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm px-6 py-5 flex flex-col items-center max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center mb-3 shadow-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
            Tagpuan Enterprise ERP
          </p>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            {isHydratingSheets
              ? 'Hydrating Menu & Orders from Google Sheets API...'
              : 'Verifying Tagpuan ERP Session...'}
          </p>
        </div>
      </div>
    );
  }

  // If in Standalone / Direct POS Mode
  if (isPublicPOS) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <div className="bg-[#111111] text-white px-4 py-2 flex items-center justify-between text-xs border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CDEBC5] animate-pulse"></span>
            <span className="font-extrabold tracking-wide text-white">TAGPUAN POS TERMINAL</span>
            <span className="hidden sm:inline text-zinc-400 font-normal">| Cashier Register & Real-Time KDS Mode</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPublicPOS(false);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5"
          >
            <span>Exit POS</span>
          </button>
        </div>
        <div className="flex-1">
          <ErrorBoundary fallbackTitle="POS Terminal Recovery">
            <POSView />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  // If in Standalone / Public Kiosk mode (No auth required for customers)
  if (isPublicKiosk) {
    const params = new URLSearchParams(window.location.search);
    const urlBranchId = params.get('branch_id') || params.get('branchId');
    const urlTable = params.get('table') || params.get('table_number') || params.get('tableNumber');
    return (
      <ErrorBoundary fallbackTitle="Self-Ordering Kiosk Recovery">
        <KioskView
          initialBranchId={urlBranchId || user?.branch_id || undefined}
          initialTable={urlTable || undefined}
          onExitToERP={() => {
            setIsPublicKiosk(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            setActiveView('dashboard');
          }}
        />
      </ErrorBoundary>
    );
  }

  // If user opened a password reset link with a token
  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onSuccess={() => {
          setResetToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  // If not logged in, show the clean login page (with option to launch Kiosk or POS terminal)
  if (!user) {
    return (
      <LoginPage
        onLaunchKiosk={() => {
          setIsPublicKiosk(true);
        }}
        onLaunchPOS={() => {
          setIsPublicPOS(true);
        }}
      />
    );
  }

  // Full-screen Kiosk mode within ERP session
  if (activeView === 'kiosk') {
    return (
      <ErrorBoundary fallbackTitle="Self-Ordering Kiosk Recovery">
        <KioskView
          initialBranchId={user?.branch_id || undefined}
          onExitToERP={() => setActiveView('pos')}
        />
      </ErrorBoundary>
    );
  }

  // Render view based on active tab and role permissions
  const renderCurrentView = () => {
    switch (activeView) {
      case 'dashboard':
        if (isOwner) {
          return (
            <OwnerDashboard
              setActiveView={setActiveView}
              onOpenCreateUser={() => {
                setActiveView('users');
                setIsCreateUserModalOpen(true);
              }}
            />
          );
        }
        if (isManager) {
          return <ManagerDashboard setActiveView={setActiveView} />;
        }
        return <OperationalDashboard setActiveView={setActiveView} />;

      case 'master-control':
        return isOwner ? <MasterControlCenter /> : <OperationalDashboard setActiveView={setActiveView} />;

      case 'reports':
        return (
          <ReportCenter
            userRole={user.role}
            userBranchId={user.branch_id}
            userBranchName={user.branch_name}
            userEmail={user.email}
          />
        );

      case 'ai-command':
        return <AIAgentCommandCenter setActiveView={setActiveView} />;

      case 'products':
        return <ProductRecipeManagementView />;

      case 'purchasing':
        return isOwner ? (
          <PurchasingView />
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-red-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 font-black">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-zinc-900">Access Restricted: Master Owner Only</h2>
            <p className="text-xs text-zinc-500 mt-2">
              Purchasing Orders, Supplier Pricing Contracts, and Commissary Procurement are strictly restricted to the Master Owner role to safeguard vendor pricing and business confidentiality.
            </p>
            <button
              onClick={() => setActiveView('dashboard')}
              className="mt-6 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        );

      case 'requests':
        return <BranchRequestOrdersView />;

      case 'warehouse':
        // Strict Role Restriction: Master Owner & Warehouseman Only
        if (!isOwner && user?.role !== 'WAREHOUSEMAN') {
          return (
            <div className="bg-white p-12 rounded-3xl border border-red-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 font-black">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-zinc-900">Access Restricted: Master Owner & Warehouseman Only</h2>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Central Commissary & Logistics depot management is strictly reserved for the Master Owner and authorized Warehousemen. Branch Managers, Cashiers, and Crew must use the Branch Stock Requests tab.
              </p>
              <button
                onClick={() => setActiveView(isManager ? 'requests' : 'dashboard')}
                className="mt-6 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer"
              >
                {isManager ? 'Go to Branch Stock Requests' : 'Return to Dashboard'}
              </button>
            </div>
          );
        }

        // Master Owner and Managers bypass attendance lock
        if (isOwner || isManager) {
          return <WarehouseDeliveryView />;
        }

        // Attendance Lock for Warehouseman
        if (requiresAttendanceLock && isClockedIn === false) {
          return (
            <div className="bg-white p-12 rounded-3xl border border-amber-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 font-black">
                <Clock className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 uppercase">
                Shift Clock-In Required
              </span>
              <h2 className="text-lg font-black text-zinc-900 mt-2">Mandatory Attendance Lock</h2>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Central Commissary & Logistics tools are locked. Tagpuan operating policy requires warehouse personnel to complete shift clock-in before beginning depot operations.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setReturnTargetView('warehouse');
                    setActiveView('attendance');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#111111] text-[#CDEBC5] rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer shadow-sm"
                >
                  Go to Attendance Station & Clock In
                </button>
                <button
                  onClick={() => refreshShiftStatus()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
                >
                  Verify Shift
                </button>
              </div>
            </div>
          );
        }
        return <WarehouseDeliveryView />;

      case 'pos':
        // Master Owner and Managers bypass attendance lock
        if (isOwner || isManager) {
          return <POSView />;
        }

        // Attendance Lock for Cashier & Crew
        if (requiresAttendanceLock && isClockedIn === false) {
          return (
            <div className="bg-white p-12 rounded-3xl border border-amber-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 font-black">
                <Clock className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 uppercase">
                Shift Clock-In Required
              </span>
              <h2 className="text-lg font-black text-zinc-900 mt-2">Mandatory Attendance Lock</h2>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                The Point of Sale (POS) register is locked. Tagpuan operating policy requires Cashiers and Store Crew to complete shift clock-in before accessing the sales counter.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setReturnTargetView('pos');
                    setActiveView('attendance');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#111111] text-[#CDEBC5] rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer shadow-sm"
                >
                  Go to Attendance Station & Clock In
                </button>
                <button
                  onClick={() => refreshShiftStatus()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
                >
                  Verify Shift
                </button>
              </div>
            </div>
          );
        }
        return <POSView />;

      case 'loyalty':
        return <LoyaltyDashboard />;

      case 'financial':
        return <FinancialDashboardView />;

      case 'kiosk':
        return (
          <KioskView
            initialBranchId={user.branch_id || undefined}
            onExitToERP={() => setActiveView('dashboard')}
          />
        );

      case 'kds':
        // Strict Role Restriction: CASHIER has no access to KDS
        if (user?.role === 'CASHIER') {
          return (
            <div className="p-8 max-w-lg mx-auto text-center mt-12 bg-white rounded-3xl border border-rose-200 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                Strict Role Restriction
              </span>
              <h2 className="text-xl font-black text-[#111111] mt-3 mb-2">
                KDS Access Blocked for Cashiers
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed mb-6">
                The Kitchen Display System (KDS) is strictly restricted to Kitchen Staff, Crew, and the Master Owner. Cashiers should only access the POS Register, Attendance, and Cash Remittance.
              </p>
              <button
                onClick={() => setActiveView('pos')}
                className="px-5 py-2.5 bg-[#111111] text-[#CDEBC5] text-xs font-black rounded-xl hover:bg-zinc-800 transition cursor-pointer"
              >
                Go to POS Register
              </button>
            </div>
          );
        }

        // 1. Master Owner can ALWAYS view KDS anytime without attendance lockout
        if (isOwner) {
          return <KDSView />;
        }

        // 2. Reactively check if logged-in kitchen crew member has an active shift record for today
        const hasActiveShift = isClockedIn === true || (!!activeShift && !activeShift.clock_out);
        if (hasActiveShift) {
          return <KDSView />;
        }

        // While checking attendance status on initial load, show verifying indicator rather than locking out
        if (isLoadingShift || !attendanceChecked) {
          return (
            <div className="bg-white p-12 rounded-3xl border border-zinc-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-[#111111] mx-auto mb-3" />
              <p className="text-xs text-zinc-500 font-mono tracking-wide">
                Verifying Kitchen Crew Shift Status...
              </p>
            </div>
          );
        }

        // 3. Attendance Lock for Kitchen & Crew if no active shift exists
        if (requiresAttendanceLock && isClockedIn === false) {
          return (
            <div className="bg-white p-12 rounded-3xl border border-amber-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 font-black">
                <Clock className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 uppercase">
                Shift Clock-In Required
              </span>
              <h2 className="text-lg font-black text-zinc-900 mt-2">Mandatory Attendance Lock</h2>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                The Kitchen Display System (KDS) is locked. Tagpuan operating policy requires Kitchen Crew to complete shift clock-in before opening order tickets.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setReturnTargetView('kds');
                    setActiveView('attendance');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#111111] text-[#CDEBC5] rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer shadow-sm"
                >
                  Go to Attendance Station & Clock In
                </button>
                <button
                  onClick={() => refreshShiftStatus()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
                >
                  Refresh Shift Status
                </button>
              </div>
            </div>
          );
        }
        return <KDSView />;

      case 'inventory':
        return <InventoryManagementView />;

      case 'employees':
        return <EmployeeManagementView />;

      case 'attendance':
        return <AttendanceView />;

      case 'payroll':
        if (!isOwner && !isManager) {
          return (
            <div className="p-8 max-w-lg mx-auto text-center mt-12 bg-white rounded-2xl border border-rose-200 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-[#111111] mb-2">Access Denied / Unauthorized</h2>
              <p className="text-xs text-zinc-600 leading-relaxed mb-6">
                You do not have administrative clearance to access the master payroll and salary register. All payroll records and compensation structures are restricted to Tagpuan Food Hub Owners and Branch Managers.
              </p>
              <button
                onClick={() => {
                  const defaultView = (user?.role === 'KITCHEN' || user?.role === 'CREW') ? 'kds' : user?.role === 'WAREHOUSEMAN' ? 'warehouse' : 'dashboard';
                  setActiveView(defaultView);
                }}
                className="px-4 py-2 bg-[#111111] text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition"
              >
                Return to Dashboard
              </button>
            </div>
          );
        }
        return <PayrollView />;

      case 'users':
        return (
          <UserManagementView
            isCreateModalOpen={isCreateUserModalOpen}
            setIsCreateModalOpen={setIsCreateUserModalOpen}
          />
        );

      case 'branches':
        return <BranchListView />;

      case 'audit':
        return <AuditLogsView />;

      case 'notifications':
        return <NotificationsView />;

      case 'security':
        if (isOwner) {
          return <DatabaseSecurityView />;
        }
        return <OperationalDashboard />;

      default:
        if (isOwner) {
          return (
            <OwnerDashboard
              setActiveView={setActiveView}
              onOpenCreateUser={() => {
                setActiveView('users');
                setIsCreateUserModalOpen(true);
              }}
            />
          );
        }
        if (isManager) {
          return <ManagerDashboard setActiveView={setActiveView} />;
        }
        return <OperationalDashboard />;
    }
  };

  return (
    <>
      <AppLayout activeView={activeView} setActiveView={setActiveView}>
        {accessDeniedNotice && (
          <div className="mb-4 mx-4 mt-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{accessDeniedNotice}</span>
            </div>
            <button
              onClick={() => setAccessDeniedNotice(null)}
              className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 transition"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {renderCurrentView()}
        <ManagerPinSetupModal />
        <PWAInstallPrompt />
      </AppLayout>

      {/* Stealth Decoy Mode Overlay (Audit Spreadsheet) */}
      <DecoyInventorySheet
        isOpen={isDecoyActive}
        onClose={() => setIsDecoyActive(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ShiftProvider>
        <BranchProvider>
          <NotificationProvider>
            <MainAppContent />
          </NotificationProvider>
        </BranchProvider>
      </ShiftProvider>
    </AuthProvider>
  );
}
