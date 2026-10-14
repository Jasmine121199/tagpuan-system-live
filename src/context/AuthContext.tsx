import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, UserRole, CreateUserInput, isMasterOwnerEmail, MASTER_OWNER_EMAILS } from '../types/index';
import { api } from '../lib/api';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  bootstrapFirstOwner: (data: { email: string; password: string; full_name: string; masterKey?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
  isOwner: boolean;
  isManager: boolean;
  assignedBranchId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    if (typeof window === 'undefined') return null;
    const token =
      localStorage.getItem('tagpuan_auth_token') ||
      sessionStorage.getItem('tagpuan_auth_token') ||
      localStorage.getItem('tagpuan_token');
    if (!token) return null;
    try {
      const raw = localStorage.getItem('tagpuan_fallback_user');
      if (raw) {
        const parsed: Profile = JSON.parse(raw);
        if (parsed && parsed.email) {
          const cleanEmail = parsed.email.trim().toLowerCase();
          if (isMasterOwnerEmail(cleanEmail)) {
            parsed.role = 'OWNER';
            parsed.branch_id = null;
            parsed.branch_name = 'All Branches (Global Access)';
          } else if (cleanEmail === 'janecasimiro27@gmail.com') {
            parsed.role = 'MANAGER';
            parsed.branch_id = '678fd9d5-321c-4353-8d1b-795f0676b242';
            parsed.branch_name = 'Tagpuan - Acacia Branch';
          } else if (cleanEmail === 'cashier.narra@tagpuan.ph' || cleanEmail === 'cashier@tagpuan.ph') {
            parsed.role = 'CASHIER';
          } else if (cleanEmail === 'crew.narra@tagpuan.ph' || cleanEmail === 'kitchen@tagpuan.ph') {
            parsed.role = 'KITCHEN';
          } else if (cleanEmail === 'manager.narra@tagpuan.ph' || cleanEmail === 'manager@tagpuan.ph') {
            parsed.role = 'MANAGER';
          } else if (cleanEmail.includes('warehouse')) {
            parsed.role = 'WAREHOUSEMAN';
          } else if (parsed.role === 'OWNER' && !isMasterOwnerEmail(cleanEmail)) {
            // Guard against role corruption: non-master emails cannot hydrate as OWNER
            parsed.role = 'CASHIER';
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const token =
      localStorage.getItem('tagpuan_auth_token') ||
      sessionStorage.getItem('tagpuan_auth_token') ||
      localStorage.getItem('tagpuan_token');
    // If no token exists, immediately stop loading so login screen renders with 0 delay
    if (!token) return false;
    // If token exists and local profile is already hydrated, don't block UI
    return !localStorage.getItem('tagpuan_fallback_user');
  });

  const refreshUser = useCallback(async () => {
    const timeoutGuard = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    try {
      const currentUser = await api.getCurrentUser();
      if (currentUser) {
        const clean = (currentUser.email || '').toLowerCase().trim();
        if (isMasterOwnerEmail(clean)) {
          currentUser.role = 'OWNER';
          currentUser.branch_id = null;
          currentUser.branch_name = 'All Branches (Global Access)';
        } else if (clean === 'janecasimiro27@gmail.com') {
          currentUser.role = 'MANAGER';
          currentUser.branch_id = '678fd9d5-321c-4353-8d1b-795f0676b242';
          currentUser.branch_name = 'Tagpuan - Acacia Branch';
        } else if (currentUser.role === 'OWNER') {
          // Hard guard: non-master emails cannot be OWNER
          currentUser.role = 'CASHIER';
        }
        setUser(currentUser);
        localStorage.setItem('tagpuan_fallback_user', JSON.stringify(currentUser));
      }
    } catch (err) {
      // If backend/Sheets is slow or offline, retain local cached role instead of kicking to null or defaulting to master
      console.warn('Google Sheets API slow or offline; maintaining local cached session role:', err);
    } finally {
      clearTimeout(timeoutGuard);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      let defaultView = 'dashboard';
      if (cleanEmail === 'cashier.narra@tagpuan.ph' || cleanEmail.includes('cashier')) {
        defaultView = 'pos';
      } else if (cleanEmail === 'crew.narra@tagpuan.ph' || cleanEmail.includes('crew') || cleanEmail.includes('kitchen')) {
        defaultView = 'kds';
      } else if (cleanEmail.includes('warehouse')) {
        defaultView = 'warehouse';
      } else if (!isMasterOwnerEmail(cleanEmail) && !cleanEmail.includes('manager')) {
        defaultView = 'pos';
      }

      // Reset any active views across all role keys to prevent permission leakage on account switch
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tagpuan_active_view');
        localStorage.removeItem('tagpuan_active_view_OWNER');
        localStorage.removeItem('tagpuan_active_view_CASHIER');
        localStorage.removeItem('tagpuan_active_view_KITCHEN');
        localStorage.removeItem('tagpuan_active_view_CREW');
        localStorage.removeItem('tagpuan_active_view_MANAGER');
        localStorage.removeItem('tagpuan_active_view_WAREHOUSEMAN');
        localStorage.removeItem('tagpuan_active_view_user');
        localStorage.setItem('tagpuan_active_view', defaultView);
      }

      const res = await api.login(email, password, rememberMe);
      const authenticatedUser = res.user;

      const cleanAuthEmail = (authenticatedUser.email || '').toLowerCase().trim();
      if (isMasterOwnerEmail(cleanAuthEmail)) {
        authenticatedUser.role = 'OWNER';
        authenticatedUser.branch_id = null;
        authenticatedUser.branch_name = 'All Branches (Global Access)';
      } else if (cleanAuthEmail === 'janecasimiro27@gmail.com') {
        authenticatedUser.role = 'MANAGER';
        authenticatedUser.branch_id = '678fd9d5-321c-4353-8d1b-795f0676b242';
        authenticatedUser.branch_name = 'Tagpuan - Acacia Branch';
      } else if (authenticatedUser.role === 'OWNER') {
        // Hard isolation guard: non-master emails cannot inherit OWNER role
        authenticatedUser.role = 'CASHIER';
      }

      setUser(authenticatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tagpuan_fallback_user', JSON.stringify(authenticatedUser));
        localStorage.setItem(`tagpuan_active_view_${authenticatedUser.role}`, defaultView);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tagpuan_auth_token');
        localStorage.removeItem('tagpuan_token');
        localStorage.removeItem('tagpuan_remember');
        localStorage.removeItem('tagpuan_fallback_user');
        localStorage.removeItem('tagpuan_active_shift');
        localStorage.removeItem('tagpuan_active_view');
        localStorage.removeItem('tagpuan_active_view_OWNER');
        localStorage.removeItem('tagpuan_active_view_CASHIER');
        localStorage.removeItem('tagpuan_active_view_KITCHEN');
        localStorage.removeItem('tagpuan_active_view_CREW');
        localStorage.removeItem('tagpuan_active_view_MANAGER');
        localStorage.removeItem('tagpuan_active_view_WAREHOUSEMAN');
        sessionStorage.clear();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res = await api.forgotPassword(email);
    return res.message;
  };

  const resetPassword = async (token: string, newPassword: string): Promise<string> => {
    const res = await api.resetPassword(token, newPassword);
    return res.message;
  };

  const bootstrapFirstOwner = async (data: { email: string; password: string; full_name: string; masterKey?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.bootstrapFirstOwner(data);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (isOwner) return true;
    return allowedRoles.includes(user.role);
  };

  // Hard Isolation: Only janzenmarkglori@gmail.com is the sole Master Owner with full global control
  const isOwner = !!user && isMasterOwnerEmail(user.email);
  const isManager = !!user && (user.role === 'MANAGER' || isOwner) && !['CASHIER', 'KITCHEN', 'CREW', 'WAREHOUSEMAN'].includes(user.role);
  const assignedBranchId = isOwner ? null : (user?.branch_id || null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        forgotPassword,
        resetPassword,
        bootstrapFirstOwner,
        refreshUser,
        hasPermission,
        isOwner,
        isManager,
        assignedBranchId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
