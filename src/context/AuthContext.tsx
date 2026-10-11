import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, UserRole, CreateUserInput } from '../types/index';
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
          if (
            cleanEmail === 'owner@tagpuan.ph' ||
            cleanEmail === 'admin@tagpuan.ph' ||
            cleanEmail === 'janzenmarkglori@gmail.com' ||
            cleanEmail === 'maryjasmineadlaon121199@gmail.com'
          ) {
            parsed.role = 'OWNER';
          } else if (cleanEmail === 'cashier.narra@tagpuan.ph' || cleanEmail === 'cashier@tagpuan.ph') {
            parsed.role = 'CASHIER';
          } else if (cleanEmail === 'crew.narra@tagpuan.ph' || cleanEmail === 'kitchen@tagpuan.ph') {
            parsed.role = 'KITCHEN';
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
      setUser(currentUser);
    } catch {
      setUser(null);
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
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('tagpuan_active_view', defaultView);
      }

      const res = await api.login(email, password, rememberMe);
      setUser(res.user);
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

  const isMasterOwnerEmail = (email?: string | null): boolean => {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return (
      clean === 'janzenmarkglori@gmail.com' ||
      clean === 'owner@tagpuan.ph' ||
      clean === 'admin@tagpuan.ph' ||
      clean === 'maryjasmineadlaon121199@gmail.com'
    );
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (isMasterOwnerEmail(user.email) || user.role === 'OWNER') return true;
    return allowedRoles.includes(user.role);
  };

  const isOwner = user?.role === 'OWNER' || isMasterOwnerEmail(user?.email);
  const isManager = user?.role === 'MANAGER' || isOwner;
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
