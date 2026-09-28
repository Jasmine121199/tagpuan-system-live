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
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    try {
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
