import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  Timer,
  Lock,
  Unlock,
  ShieldAlert,
  KeyRound,
  X,
  Coffee,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { AttendanceRecord } from '../../types/index';

interface QuickClockWidgetProps {
  onStatusChange?: () => void;
}

export const QuickClockWidget: React.FC<QuickClockWidgetProps> = ({ onStatusChange }) => {
  const { user, isOwner } = useAuth();
  const { addNotification } = useNotifications();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentShift, setCurrentShift] = useState<AttendanceRecord | null>(null);
  const [hasCompletedShiftToday, setHasCompletedShiftToday] = useState(false);
  const [completedShiftsTodayCount, setCompletedShiftsTodayCount] = useState(0);
  const [canClockOut, setCanClockOut] = useState(false);
  const [cooldownLocked, setCooldownLocked] = useState(false);
  const [remainingCooldownMinutes, setRemainingCooldownMinutes] = useState(0);
  const [serverTime, setServerTime] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // PIN Override Modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<'EARLY_CLOCK_OUT' | 'DOUBLE_SHIFT'>('DOUBLE_SHIFT');
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Fetch current authoritative attendance status from server
  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/attendance/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsClockedIn(data.isClockedIn);
        setCurrentShift(data.currentShift);
        setHasCompletedShiftToday(!!data.hasCompletedShiftToday);
        setCompletedShiftsTodayCount(data.completedShiftsTodayCount || 0);
        setCanClockOut(!!data.canClockOut);
        setCooldownLocked(!!data.cooldownLocked);
        setRemainingCooldownMinutes(data.remainingCooldownMinutes || 0);
        setServerTime(data.serverTime || null);
      }
    } catch (err) {
      console.error('Failed to fetch attendance status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, []);

  // Live timer for elapsed shift duration and dynamic cooldown calculation
  useEffect(() => {
    if (!isClockedIn || !currentShift?.clock_in) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateTimer = () => {
      const clockInTime = new Date(currentShift.clock_in).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - clockInTime);

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (n: number) => String(n).padStart(2, '0');
      setElapsedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);

      // 2-hour minimum duration cooldown (120 minutes)
      const elapsedMins = Math.floor(diffMs / (1000 * 60));
      if (elapsedMins < 120) {
        setCooldownLocked(true);
        setRemainingCooldownMinutes(120 - elapsedMins);
        setCanClockOut(false);
      } else {
        setCooldownLocked(false);
        setRemainingCooldownMinutes(0);
        setCanClockOut(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, currentShift]);

  // Handle standard Clock In
  const handleClockIn = async (overridePin?: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPinError(null);

    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          manager_pin: overridePin || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clock in.');
      }

      setIsClockedIn(true);
      setCurrentShift(data.record);
      setIsPinModalOpen(false);
      setManagerPin('');
      setSuccessMsg(`Clock-in successful at ${new Date(data.record.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      addNotification('Clock-In Successful', `Shift recorded at ${new Date(data.record.clock_in).toLocaleTimeString()}`, 'SUCCESS');
      
      // Dispatch global event for instant reactive KDS & POS unlock
      window.dispatchEvent(new CustomEvent('shift_status_updated', {
        detail: { isClockedIn: true, currentShift: data.record }
      }));

      await fetchStatus();
      if (onStatusChange) onStatusChange();

      // Check if user was redirected from KDS or another station
      const returnView = sessionStorage.getItem('tagpuan_return_view');
      if (returnView) {
        sessionStorage.removeItem('tagpuan_return_view');
        window.dispatchEvent(new CustomEvent('tagpuan_navigate_view', { detail: { view: returnView } }));
      } else if (user?.role === 'CREW' || user?.role === 'KITCHEN') {
        window.dispatchEvent(new CustomEvent('tagpuan_navigate_view', { detail: { view: 'kds' } }));
      }
    } catch (err: any) {
      if (overridePin) {
        setPinError(err.message || 'Invalid Manager PIN.');
      } else {
        setErrorMsg(err.message || 'Error clocking in.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle standard Clock Out
  const handleClockOut = async (overridePin?: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPinError(null);

    try {
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          manager_pin: overridePin || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clock out.');
      }

      setIsClockedIn(false);
      setCurrentShift(null);
      setIsPinModalOpen(false);
      setManagerPin('');
      setSuccessMsg(`Shift completed: ${data.record.total_hours_formatted}`);
      addNotification('Clock-Out Successful', `Shift completed: ${data.record.total_hours_formatted}`, 'SUCCESS');

      // Dispatch global event for instant reactive KDS & POS lock
      window.dispatchEvent(new CustomEvent('shift_status_updated', {
        detail: { isClockedIn: false, currentShift: null }
      }));

      await fetchStatus();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      if (overridePin) {
        setPinError(err.message || 'Invalid Manager PIN.');
      } else {
        setErrorMsg(err.message || 'Error clocking out.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDoubleShiftModal = () => {
    setPinAction('DOUBLE_SHIFT');
    setManagerPin('');
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const openEarlyClockOutModal = () => {
    setPinAction('EARLY_CLOCK_OUT');
    setManagerPin('');
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerPin.trim()) {
      setPinError('Please enter a 4-digit Manager or Owner PIN');
      return;
    }
    if (pinAction === 'DOUBLE_SHIFT') {
      handleClockIn(managerPin.trim());
    } else {
      handleClockOut(managerPin.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Check if >= 5 hours elapsed for break deduction banner
  const elapsedMinutesCount = isClockedIn && currentShift?.clock_in
    ? Math.floor((Date.now() - new Date(currentShift.clock_in).getTime()) / (1000 * 60))
    : 0;
  const isBreakDeductionActive = elapsedMinutesCount >= 300;

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#e5e7eb] shadow-sm relative overflow-hidden">
      {/* Top Banner for Shift Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status indicator & employee info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isClockedIn ? 'bg-[#166534] animate-pulse' : 'bg-zinc-400'
              }`}
            />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500">
              Shift Attendance Station
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                isClockedIn ? 'bg-[#CDEBC5] text-[#111111]' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {isClockedIn ? 'ACTIVE SHIFT' : hasCompletedShiftToday ? 'SHIFT COMPLETED' : 'OFF DUTY'}
            </span>
          </div>

          <h3 className="text-lg font-extrabold text-[#111111] tracking-tight">
            {user?.full_name}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-medium">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{user?.branch_name || 'Tagpuan Store'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            {hasCompletedShiftToday && !isClockedIn && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                1 Daily Shift Cycle Completed
              </span>
            )}
          </div>
        </div>

        {/* Action Controls and Live Elapsed Timer */}
        <div className="flex flex-wrap items-center gap-3">
          {isClockedIn && (
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-center min-w-[130px]">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                <Timer className="w-3 h-3 text-[#166534]" />
                <span>Elapsed</span>
              </div>
              <p className="text-lg font-mono font-black text-[#111111] tracking-tight">
                {elapsedTime}
              </p>
            </div>
          )}

          <div>
            {!isClockedIn ? (
              hasCompletedShiftToday && !isOwner ? (
                // Single Shift Lockout reached: Button requires Manager Override
                <button
                  type="button"
                  id="btn-double-shift-clock-in"
                  onClick={openDoubleShiftModal}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 active:scale-[0.98] font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
                  title="Daily shift completed. Re-clocking in requires Branch Manager or Master Owner PIN override."
                >
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>DOUBLE SHIFT (PIN OVERRIDE)</span>
                </button>
              ) : (
                // Standard Clock In
                <button
                  type="button"
                  id="btn-clock-in"
                  onClick={() => handleClockIn()}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#CDEBC5] text-[#111111] hover:bg-[#bce4b2] active:scale-[0.98] font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>CLOCK IN SHIFT</span>
                </button>
              )
            ) : (
              // Clocked in state: Check 2-hour cooldown
              cooldownLocked && !isOwner ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-clock-out-locked"
                    onClick={openEarlyClockOutModal}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 text-zinc-500 border border-zinc-300 hover:border-red-300 hover:text-red-700 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                    title={`Minimum 2-hour duration lock: ${remainingCooldownMinutes}m remaining. Click for Manager Early Release override.`}
                  >
                    <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>LOCKED ({remainingCooldownMinutes}m left)</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-clock-out"
                  onClick={() => handleClockOut()}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#111111] text-[#CDEBC5] hover:bg-[#222222] active:scale-[0.98] font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Square className="w-4 h-4 fill-current" />
                  )}
                  <span>CLOCK OUT SHIFT</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Details & Anti-Tamper Badges */}
      <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        {isClockedIn && currentShift ? (
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Clocked in at <strong className="text-[#111111]">{new Date(currentShift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
            </span>

            {cooldownLocked ? (
              <span className="font-mono text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-700" />
                <span>2-Hour Anti-Tamper Cooldown Lock Active ({remainingCooldownMinutes} min remaining)</span>
              </span>
            ) : (
              <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Unlock className="w-3 h-3 text-emerald-700" />
                <span>2-Hour Minimum Satisfied • Ready to Clock Out</span>
              </span>
            )}

            {isBreakDeductionActive && (
              <span className="font-mono text-[11px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                <Coffee className="w-3 h-3 text-purple-700" />
                <span>Tagpuan Rule: Shift ≥ 5h (-1h Meal Break Deducted)</span>
              </span>
            )}
          </div>
        ) : (
          <span className="font-mono text-[11px] text-zinc-500">
            {hasCompletedShiftToday
              ? 'Single Shift Lockout active for today. Re-clocking in requires Branch Manager or Master Owner PIN.'
              : 'Press "Clock In Shift" to record your authoritative shift start.'}
          </span>
        )}

        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
          🔒 Server-Authoritative ISO Timestamp
        </span>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PIN OVERRIDE MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-zinc-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-zinc-900">
                    {pinAction === 'DOUBLE_SHIFT'
                      ? 'Double Shift Approval Override'
                      : 'Early Clock-Out Authorization'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Branch Manager PIN or Owner Override Required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="p-5 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                {pinAction === 'DOUBLE_SHIFT' ? (
                  <p>
                    <strong>Anti-Tamper Rule:</strong> Standard policy permits only ONE clock-in/out cycle per day. To authorize a double shift for <strong>{user?.full_name}</strong>, the on-duty Branch Manager or Master Owner must enter their authorized PIN.
                  </p>
                ) : (
                  <p>
                    <strong>Minimum Duration Cooldown:</strong> An active shift has a mandatory 2-hour lock ({remainingCooldownMinutes} minutes remaining). To release <strong>{user?.full_name}</strong> early for emergencies or health reasons, enter an authorized Manager PIN.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Manager / Owner 4-Digit Security PIN:
                </label>
                <input
                  type="password"
                  maxLength={10}
                  autoFocus
                  value={managerPin}
                  onChange={e => setManagerPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
                <p className="text-[10px] text-zinc-400 mt-1 text-center font-mono">
                  Default Manager PIN: 1234 • Master Override: 8888
                </p>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !managerPin}
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>Approve & Proceed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
