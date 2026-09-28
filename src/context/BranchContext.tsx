import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Branch } from '../types/index';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

interface BranchContextType {
  selectedBranchId: string; // 'ALL' or branch uuid
  setSelectedBranchId: (id: string) => void;
  selectedBranchName: string;
  branches: Branch[];
  isLoadingBranches: boolean;
  refreshBranches: () => Promise<void>;
  isDecoyActive: boolean;
  setIsDecoyActive: (active: boolean) => void;
  toggleDecoy: () => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isOwner, isLoading: isAuthLoading } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(true);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(() => {
    return localStorage.getItem('tagpuan_selected_branch_id') || 'ALL';
  });
  const [isDecoyActive, setIsDecoyActive] = useState<boolean>(false);

  const refreshBranches = useCallback(async () => {
    try {
      setIsLoadingBranches(true);
      const list = await api.getBranches();
      setBranches(Array.isArray(list) ? list : []);
    } catch (err: any) {
      // Graceful fallback to avoid uncaught exceptions or error toasts
      console.warn('Branch list info:', err?.message || err);
      setBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  // Fetch branches on mount and re-fetch when user authentication or branch assignment changes
  useEffect(() => {
    if (!isAuthLoading) {
      refreshBranches();
    }
  }, [isAuthLoading, user?.id, user?.role, user?.branch_id, refreshBranches]);

  // Synchronize selection based on user role and assigned branch
  useEffect(() => {
    if (user) {
      if (!isOwner && user.branch_id) {
        setSelectedBranchIdState(user.branch_id);
      } else if (isOwner) {
        const stored = localStorage.getItem('tagpuan_selected_branch_id');
        if (stored) {
          setSelectedBranchIdState(stored);
        } else {
          setSelectedBranchIdState('ALL');
        }
      }
    }
  }, [user, isOwner]);

  const setSelectedBranchId = (id: string) => {
    setSelectedBranchIdState(id);
    localStorage.setItem('tagpuan_selected_branch_id', id);
  };

  const toggleDecoy = () => {
    setIsDecoyActive(prev => !prev);
  };

  // Resolve human-readable name of current selection
  const selectedBranchName = selectedBranchId === 'ALL'
    ? 'All Branches (Global Access)'
    : branches.find(b => b.id === selectedBranchId)?.name || user?.branch_name || 'Assigned Branch';

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        setSelectedBranchId,
        selectedBranchName,
        branches,
        isLoadingBranches,
        refreshBranches,
        isDecoyActive,
        setIsDecoyActive,
        toggleDecoy
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
