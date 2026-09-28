import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AttendanceRecord } from '../types';
import { useAuth } from './AuthContext';

interface ShiftContextType {
  isClockedIn: boolean | null;
  activeShift: AttendanceRecord | null;
  attendanceChecked: boolean;
  serverTime: string | null;
  isLoadingShift: boolean;
  refreshShiftStatus: () => Promise<void>;
  returnTargetView: string | null;
  setReturnTargetView: (view: string | null) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState<boolean | null>(null);
  const [activeShift, setActiveShift] = useState<AttendanceRecord | null>(null);
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [isLoadingShift, setIsLoadingShift] = useState(false);
  const [returnTargetView, setReturnTargetViewState] = useState<string | null>(() => {
    return sessionStorage.getItem('tagpuan_return_view') || null;
  });

  const setReturnTargetView = (view: string | null) => {
    setReturnTargetViewState(view);
    if (view) {
      sessionStorage.setItem('tagpuan_return_view', view);
    } else {
      sessionStorage.removeItem('tagpuan_return_view');
    }
  };

  const refreshShiftStatus = useCallback(async () => {
    if (!user) {
      setIsClockedIn(false);
      setActiveShift(null);
      setAttendanceChecked(true);
      return;
    }

    try {
      setIsLoadingShift(true);
      const token = localStorage.getItem('tagpuan_token');
      if (!token) return;

      const res = await fetch('/api/attendance/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const clockedInState = !!data.isClockedIn || (!!data.currentShift && !data.currentShift.clock_out);
        setIsClockedIn(clockedInState);
        setActiveShift(data.currentShift || null);
        setServerTime(data.serverTime || new Date().toISOString());
      }
    } catch (err) {
      console.warn('Failed to refresh shift status:', err);
    } finally {
      setIsLoadingShift(false);
      setAttendanceChecked(true);
    }
  }, [user]);

  // Initial fetch on user change
  useEffect(() => {
    if (user) {
      refreshShiftStatus();
    } else {
      setIsClockedIn(false);
      setActiveShift(null);
      setAttendanceChecked(true);
    }
  }, [user, refreshShiftStatus]);

  // Listen to window shift_status_updated custom event
  useEffect(() => {
    const handleShiftUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        if (typeof custom.detail.isClockedIn === 'boolean') {
          setIsClockedIn(custom.detail.isClockedIn);
        }
        if (custom.detail.currentShift !== undefined) {
          setActiveShift(custom.detail.currentShift);
        }
      }
      refreshShiftStatus();
    };

    window.addEventListener('shift_status_updated', handleShiftUpdated);
    return () => {
      window.removeEventListener('shift_status_updated', handleShiftUpdated);
    };
  }, [refreshShiftStatus]);

  return (
    <ShiftContext.Provider
      value={{
        isClockedIn,
        activeShift,
        attendanceChecked,
        serverTime,
        isLoadingShift,
        refreshShiftStatus,
        returnTargetView,
        setReturnTargetView
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = (): ShiftContextType => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
};
