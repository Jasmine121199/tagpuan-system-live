import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Order, Branch, KitchenStats } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../lib/api';
import { googleSheetsPersistence } from '../../lib/googleSheetsPersistence';
import { KDSOrderCard } from './KDSOrderCard';
import { KDSHistoryModal } from './KDSHistoryModal';
import { kitchenAudio } from '../../utils/kitchenAudio';
import {
  ChefHat,
  Search,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Frown,
  Loader2,
  History,
  Radio,
  Sliders,
  BellRing
} from 'lucide-react';

export const KDSView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();

  // Core Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<KitchenStats>({
    total_active: 0,
    new_count: 0,
    preparing_count: 0,
    ready_count: 0,
    critical_count: 0,
    average_prep_time_minutes: 8.5
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Filter & Search State (ALL, NEW, PREPARING, READY, DELAYED)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    user?.branch_id || (isOwner ? 'ALL' : '')
  );
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'PREPARING' | 'READY' | 'DELAYED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Synchronize branch when user context loads
  useEffect(() => {
    if (user?.branch_id) {
      setSelectedBranchId(user.branch_id);
    } else if (isOwner && (!selectedBranchId || selectedBranchId === 'branch-1')) {
      setSelectedBranchId('ALL');
    }
  }, [user?.branch_id, isOwner]);

  // Audio & Autoplay Unlock Preferences
  const [isSoundOn, setIsSoundOn] = useState<boolean>(!kitchenAudio.getMuted());
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(kitchenAudio.isUnlocked());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Sound tracking
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const alertedOrderIdsRef = useRef<Set<string>>(new Set());

  // 1. Fetch Branches for Owner selector
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const res = await fetch('/api/branches', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.warn('Failed to load branches:', err);
      }
    };
    if (isOwner) {
      fetchBranches();
    }
  }, [isOwner]);

  // 2. Fetch Live Kitchen Orders and Stats
  const fetchKitchenData = async (silent = false) => {
    // Check localStorage fallback for kds_orders
    try {
      const localOrders = localStorage.getItem('kds_orders');
      if (localOrders) {
        const parsed = JSON.parse(localOrders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const toAdd = parsed.filter((o: Order) => !existingIds.has(o.id));
            if (toAdd.length > 0) {
              return [...toAdd, ...prev];
            }
            return prev;
          });
          setIsConnected(true);
        }
      }
    } catch (e) {
      console.warn('Error reading local kds_orders:', e);
    }

    try {
      if (!silent) setIsRefreshing(true);
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const params = new URLSearchParams();
      if (isOwner && selectedBranchId && selectedBranchId !== 'ALL') {
        params.append('branch_id', selectedBranchId);
      } else if (!isOwner && (user?.branch_id || selectedBranchId)) {
        params.append('branch_id', user?.branch_id || selectedBranchId);
      }

      // Fetch Orders
      const resOrders = await fetch(`/api/kds/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ordersContentType = resOrders.headers.get('content-type') || '';

      if (resOrders.ok && ordersContentType.includes('application/json')) {
        const dataOrders = await resOrders.json();
        const fetchedOrders: Order[] = dataOrders.orders || [];
        setOrders(fetchedOrders);
        setIsConnected(true);
        setLastSyncTime(new Date());

        // Check for newly arrived orders to trigger subtle audio chime
        if (!isInitialLoadRef.current) {
          const currentIds = new Set(fetchedOrders.map(o => o.id));
          const hasNew = fetchedOrders.some(
            o => !prevOrderIdsRef.current.has(o.id) && (o.kitchen_status === 'NEW' || !o.kitchen_status)
          );
          if (hasNew && isSoundOn) {
            kitchenAudio.playNewOrderChime();
          }
          prevOrderIdsRef.current = currentIds;
        } else {
          prevOrderIdsRef.current = new Set(fetchedOrders.map(o => o.id));
          isInitialLoadRef.current = false;
        }
      } else {
        setIsConnected(false);
      }

      // Fetch Stats
      const resStats = await fetch(`/api/kds/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsContentType = resStats.headers.get('content-type') || '';
      if (resStats.ok && statsContentType.includes('application/json')) {
        const dataStats = await resStats.json();
        if (dataStats.stats) {
          setStats(dataStats.stats);
        }
      }
    } catch (err) {
      console.warn('KDS connection notice:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      if (!silent) setIsRefreshing(false);
    }
  };

  // Initial Load & Polling Interval (every 4 seconds)
  useEffect(() => {
    fetchKitchenData(false);
    const interval = setInterval(() => {
      fetchKitchenData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedBranchId]);

  // Real-time listener for incoming orders routed from POS / Checkout
  useEffect(() => {
    const handleOrderPaid = (event: Event) => {
      const customEv = event as CustomEvent<Order>;
      const paidOrder = customEv.detail;
      if (paidOrder) {
        // Immediate local state injection to eliminate any latency
        setOrders(prev => {
          if (prev.some(o => o.id === paidOrder.id)) return prev;
          return [paidOrder, ...prev];
        });
        if (isSoundOn) {
          kitchenAudio.playNewOrderChime();
        }
      }
      // Also trigger a background sync to get server calculated kitchen queue
      fetchKitchenData(true);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === 'tagpuan_latest_kitchen_order' || e.key === 'kds_orders') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const incoming: Order[] = Array.isArray(parsed) ? parsed : (parsed.order ? [parsed.order] : []);
          if (incoming.length > 0) {
            setOrders(prev => {
              const existingIds = new Set(prev.map(o => o.id));
              const toAdd = incoming.filter((o: Order) => !existingIds.has(o.id));
              if (toAdd.length > 0) {
                return [...toAdd, ...prev];
              }
              return prev;
            });
            if (isSoundOn) {
              kitchenAudio.playNewOrderChime();
            }
          }
        } catch (err) {}
        fetchKitchenData(true);
      }
    };

    window.addEventListener('tagpuan:order_paid', handleOrderPaid);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('tagpuan:order_paid', handleOrderPaid);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isSoundOn]);

  // Delayed (15m+) Audio Alert Loop:
  // Requirements:
  // "When an active order reaches more than 15 minutes: Play a kitchen alert sound.
  // The sound must continue/repeat until the order status becomes: DELIVERED."
  useEffect(() => {
    const alertInterval = setInterval(() => {
      const now = Date.now();
      const delayedOrders = orders.filter(o => {
        const status = o.kitchen_status || 'NEW';
        if (status === 'DELIVERED' || status === 'COMPLETED') return false;
        const received = new Date(o.kitchen_received_at || o.created_at).getTime();
        const elapsedMins = (now - received) / 60000;
        return elapsedMins >= 15;
      });

      if (delayedOrders.length > 0) {
        if (isSoundOn && isAudioUnlocked) {
          kitchenAudio.playCriticalWarningAlert();
        }

        // Log audit event on server for newly delayed orders
        const token = getAuthToken();
        delayedOrders.forEach(order => {
          if (!alertedOrderIdsRef.current.has(order.id)) {
            alertedOrderIdsRef.current.add(order.id);
            fetch(`/api/kds/orders/${order.id}/alert-delayed`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            }).catch(() => {});
          }
        });
      }
    }, 12000);

    return () => clearInterval(alertInterval);
  }, [orders, isSoundOn, isAudioUnlocked]);

  // Unlock Kitchen Sound
  const handleEnableSound = async () => {
    const success = await kitchenAudio.unlock();
    setIsAudioUnlocked(success);
    setIsSoundOn(true);
    kitchenAudio.setMuted(false);
  };

  const handleToggleSound = () => {
    const nextState = !isSoundOn;
    setIsSoundOn(nextState);
    kitchenAudio.setMuted(!nextState);
    if (nextState) {
      kitchenAudio.unlock().then(setIsAudioUnlocked);
    }
  };

  // Order Flow Actions:
  const broadcastStatusChange = (orderId: string, newStatus: string) => {
    const target = orders.find(o => o.id === orderId);
    const orderNumber = target?.order_number;

    // 1. Dispatch custom DOM event for same-window listeners (POS Cashier, Kiosk)
    window.dispatchEvent(
      new CustomEvent('tagpuan:kds_order_updated', {
        detail: {
          orderId,
          orderNumber,
          status: newStatus,
          order: target ? { ...target, kitchen_status: newStatus } : undefined,
          timestamp: Date.now()
        }
      })
    );

    // 2. Broadcast via localStorage for cross-window and multi-device tab sync
    try {
      localStorage.setItem(
        'tagpuan_kds_status_update',
        JSON.stringify({
          orderId,
          orderNumber,
          status: newStatus,
          timestamp: Date.now()
        })
      );
    } catch (e) {}

    // 3. Keep local storage kds_orders in sync
    try {
      const raw = localStorage.getItem('kds_orders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          let updated: Order[];
          if (newStatus === 'DELIVERED' || newStatus === 'COMPLETED') {
            updated = parsed.filter((o: Order) => o.id !== orderId);
          } else {
            updated = parsed.map((o: Order) => (o.id === orderId ? { ...o, kitchen_status: newStatus as any } : o));
          }
          localStorage.setItem('kds_orders', JSON.stringify(updated));
        }
      }
    } catch (e) {}

    // 4. Sync kitchen status update to Google Sheets Tab 1 ("Orders_Log")
    void googleSheetsPersistence.updateOrderStatusInSheet(orderNumber || orderId, {
      kitchen_status: newStatus
    });
  };

  // NEW -> PREPARING
  const handleStartOrder = async (orderId: string) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, kitchen_status: 'PREPARING', started_at: new Date().toISOString() } : o))
    );
    broadcastStatusChange(orderId, 'PREPARING');

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/kds/orders/${orderId}/start`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to start order');
      fetchKitchenData(true);
    } catch (err) {
      console.error(err);
      fetchKitchenData(true);
    }
  };

  // PREPARING -> READY
  const handleMarkReady = async (orderId: string) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, kitchen_status: 'READY', ready_at: new Date().toISOString() } : o))
    );
    broadcastStatusChange(orderId, 'READY');
    if (isSoundOn) {
      kitchenAudio.playReadyChime();
    }

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/kds/orders/${orderId}/ready`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to mark order ready');
      fetchKitchenData(true);
    } catch (err) {
      console.error(err);
      fetchKitchenData(true);
    }
  };

  // READY -> DELIVERED
  const handleDeliverOrder = async (orderId: string) => {
    broadcastStatusChange(orderId, 'DELIVERED');
    // Immediately remove from active kitchen queue
    setOrders(prev => prev.filter(o => o.id !== orderId));

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/kds/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to mark order delivered');
      fetchKitchenData(true);
    } catch (err) {
      console.error(err);
      fetchKitchenData(true);
    }
  };

  // Undo accidental action (Back to NEW or PREPARING)
  const handleRecallOrder = async (orderId: string, targetStatus: 'NEW' | 'PREPARING') => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, kitchen_status: targetStatus } : o))
    );
    broadcastStatusChange(orderId, targetStatus);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/kds/orders/${orderId}/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ target_status: targetStatus })
      });
      if (!res.ok) throw new Error('Failed to recall order');
      fetchKitchenData(true);
    } catch (err) {
      console.error(err);
      fetchKitchenData(true);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Filtered & Sorted orders: OLDEST FIRST so delayed orders are not hidden
  const displayedOrders = useMemo(() => {
    const now = Date.now();
    const filtered = orders.filter(order => {
      const status = order.kitchen_status || 'NEW';
      if (status === 'DELIVERED' || status === 'COMPLETED') return false;

      const received = new Date(order.kitchen_received_at || order.created_at).getTime();
      const elapsedMins = (now - received) / 60000;
      const isDelayed = elapsedMins >= 15;

      // Tab filter (ALL, NEW, PREPARING, READY, DELAYED)
      if (activeTab === 'NEW' && status !== 'NEW') return false;
      if (activeTab === 'PREPARING' && status !== 'PREPARING') return false;
      if (activeTab === 'READY' && status !== 'READY') return false;
      if (activeTab === 'DELAYED' && !isDelayed) return false;

      // Search filter (Order # or Item names)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = order.order_number.toLowerCase().includes(q);
        const matchesItem = order.items?.some(i => i.product_name.toLowerCase().includes(q));
        const matchesCustomer = order.customer_name?.toLowerCase().includes(q);
        if (!matchesNum && !matchesItem && !matchesCustomer) return false;
      }

      return true;
    });

    // Sort: Oldest First
    filtered.sort((a, b) => {
      const timeA = new Date(a.kitchen_received_at || a.created_at).getTime();
      const timeB = new Date(b.kitchen_received_at || b.created_at).getTime();
      return timeA - timeB;
    });

    return filtered;
  }, [orders, activeTab, searchQuery]);

  // Delayed count
  const delayedOrdersCount = useMemo(() => {
    const now = Date.now();
    return orders.filter(o => {
      const status = o.kitchen_status || 'NEW';
      if (status === 'DELIVERED' || status === 'COMPLETED') return false;
      const received = new Date(o.kitchen_received_at || o.created_at).getTime();
      return (now - received) / 60000 >= 15;
    }).length;
  }, [orders]);

  const activeBranchName = useMemo(() => {
    if (selectedBranchId === 'ALL') return 'All Branches';
    const found = branches.find(b => b.id === selectedBranchId);
    return found ? found.name : user?.branch_name || 'Kitchen';
  }, [selectedBranchId, branches, user]);

  // Strict Role Restriction: KDS is HELD strictly for Kitchen, Crew, and Owner
  if (user?.role === 'CASHIER') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-3xl border border-rose-200 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <ChefHat className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
            Strict Role Restriction
          </span>
          <h2 className="text-xl font-black text-[#111111] mt-3 mb-2">
            Kitchen Display System (KDS) Blocked
          </h2>
          <p className="text-xs text-zinc-600 leading-relaxed mb-6">
            The Kitchen Display System is exclusively operated by Kitchen Cooks, Food Prep Crew, and the Master Owner. Cashiers are restricted from food expediting displays and should operate from the <strong>POS Register</strong>, <strong>Attendance</strong>, and <strong>Cash Remittance</strong>.
          </p>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 font-medium">
            Active Account: <strong className="text-zinc-900">{user.email}</strong> • Role: <strong className="text-rose-600">CASHIER</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-zinc-100 flex flex-col select-none font-sans">
      {/* Autoplay unlock warning banner if audio is locked */}
      {!isAudioUnlocked && (
        <div className="bg-amber-400 text-black px-4 py-2 flex items-center justify-between font-bold text-xs shadow-md z-30">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-black" />
            <span>Kitchen audio alerts are locked by browser autoplay policy.</span>
          </div>
          <button
            type="button"
            onClick={handleEnableSound}
            className="bg-black text-[#CDEBC5] px-3 py-1 rounded-lg text-xs font-black tracking-wide hover:bg-zinc-900 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            ENABLE KITCHEN SOUND
          </button>
        </div>
      )}

      {/* Top Navigation & Status Bar */}
      <header className="px-4 sm:px-6 py-3.5 bg-[#181818] border-b border-[#282828] flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Live Connection Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase font-mono">
                Tagpuan KDS
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#222222] text-zinc-300 border border-[#333333]">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#CDEBC5] animate-ping' : 'bg-rose-500'}`} />
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Kitchen Display System • <span className="text-white font-bold">{activeBranchName}</span>
            </p>
          </div>
        </div>

        {/* Global Kitchen Stats Ribbon */}
        <div className="hidden md:flex items-center gap-2 bg-[#111111] p-1.5 rounded-2xl border border-[#2a2a2a]">
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-zinc-400 font-mono block">ACTIVE</span>
            <span className="text-base font-black font-mono text-white">{orders.length}</span>
          </div>
          <div className="h-6 w-px bg-[#2a2a2a]" />
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-zinc-400 font-mono block">NEW</span>
            <span className="text-base font-black font-mono text-[#CDEBC5]">
              {orders.filter(o => (o.kitchen_status || 'NEW') === 'NEW').length}
            </span>
          </div>
          <div className="h-6 w-px bg-[#2a2a2a]" />
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-zinc-400 font-mono block">PREPARING</span>
            <span className="text-base font-black font-mono text-amber-400">
              {orders.filter(o => o.kitchen_status === 'PREPARING').length}
            </span>
          </div>
          <div className="h-6 w-px bg-[#2a2a2a]" />
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-zinc-400 font-mono block">READY</span>
            <span className="text-base font-black font-mono text-emerald-400">
              {orders.filter(o => o.kitchen_status === 'READY').length}
            </span>
          </div>
          {delayedOrdersCount > 0 && (
            <>
              <div className="h-6 w-px bg-[#2a2a2a]" />
              <div className="px-3 py-1 text-center bg-rose-950/70 rounded-xl border border-rose-700 animate-pulse">
                <span className="text-[10px] text-rose-400 font-mono font-bold block">15m+ DELAYED</span>
                <span className="text-base font-black font-mono text-rose-300">{delayedOrdersCount}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls & Settings */}
        <div className="flex items-center gap-2">
          {/* Owner Branch Selector */}
          {isOwner && (
            <div className="hidden sm:block">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-[#222222] border border-[#333333] text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CDEBC5] cursor-pointer"
              >
                <option value="ALL">All 17 Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* History Button */}
          <button
            type="button"
            id="kds-btn-history"
            onClick={() => setIsHistoryOpen(true)}
            className="p-2.5 rounded-xl bg-[#222222] text-zinc-300 hover:text-white hover:bg-[#2e2e2e] transition flex items-center gap-1.5 text-xs font-bold border border-[#333333] cursor-pointer"
            title="View Completed History & Prep Durations"
          >
            <History className="w-4 h-4 text-[#CDEBC5]" />
            <span className="hidden lg:inline">Logs</span>
          </button>

          {/* Kitchen Sound ON / OFF Toggle */}
          <button
            type="button"
            id="kds-btn-sound-toggle"
            onClick={handleToggleSound}
            className={`p-2.5 rounded-xl transition flex items-center gap-1.5 text-xs font-black border cursor-pointer ${
              !isSoundOn
                ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                : 'bg-[#222222] text-[#CDEBC5] border-[#333333] hover:bg-[#2e2e2e]'
            }`}
            title={isSoundOn ? 'Kitchen Sound: ON (Click to turn OFF)' : 'Kitchen Sound: OFF (Click to turn ON)'}
          >
            {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden lg:inline">{isSoundOn ? 'KITCHEN SOUND: ON' : 'KITCHEN SOUND: OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            id="kds-btn-refresh"
            onClick={() => fetchKitchenData(false)}
            className="p-2.5 rounded-xl bg-[#222222] text-zinc-300 hover:text-white hover:bg-[#2e2e2e] transition border border-[#333333] cursor-pointer"
            title="Refresh Kitchen Board"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#CDEBC5]' : ''}`} />
          </button>

          {/* Fullscreen Mode */}
          <button
            type="button"
            id="kds-btn-fullscreen"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#222222] text-zinc-300 hover:text-white hover:bg-[#2e2e2e] transition border border-[#333333] cursor-pointer"
            title="Toggle Fullscreen Display Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Filter Tabs & Search Bar */}
      <div className="px-4 sm:px-6 py-3 bg-[#141414] border-b border-[#242424] flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs (ALL, NEW, PREPARING, READY, DELAYED) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            id="kds-tab-all"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-[#CDEBC5] text-[#111111] shadow-xs'
                : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <span>ALL</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeTab === 'ALL' ? 'bg-[#111111] text-[#CDEBC5]' : 'bg-[#333333] text-zinc-300'
            }`}>
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            id="kds-tab-new"
            onClick={() => setActiveTab('NEW')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'NEW'
                ? 'bg-[#CDEBC5] text-[#111111] shadow-xs'
                : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>NEW</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeTab === 'NEW' ? 'bg-[#111111] text-[#CDEBC5]' : 'bg-[#333333] text-zinc-300'
            }`}>
              {orders.filter(o => (o.kitchen_status || 'NEW') === 'NEW').length}
            </span>
          </button>

          <button
            type="button"
            id="kds-tab-preparing"
            onClick={() => setActiveTab('PREPARING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PREPARING'
                ? 'bg-[#CDEBC5] text-[#111111] shadow-xs'
                : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>PREPARING</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeTab === 'PREPARING' ? 'bg-[#111111] text-[#CDEBC5]' : 'bg-[#333333] text-zinc-300'
            }`}>
              {orders.filter(o => o.kitchen_status === 'PREPARING').length}
            </span>
          </button>

          <button
            type="button"
            id="kds-tab-ready"
            onClick={() => setActiveTab('READY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'READY'
                ? 'bg-[#CDEBC5] text-[#111111] shadow-xs'
                : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>READY</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeTab === 'READY' ? 'bg-[#111111] text-[#CDEBC5]' : 'bg-[#333333] text-zinc-300'
            }`}>
              {orders.filter(o => o.kitchen_status === 'READY').length}
            </span>
          </button>

          <button
            type="button"
            id="kds-tab-delayed"
            onClick={() => setActiveTab('DELAYED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              delayedOrdersCount > 0 ? 'animate-pulse' : ''
            } ${
              activeTab === 'DELAYED'
                ? 'bg-rose-600 text-white shadow-xs'
                : delayedOrdersCount > 0
                ? 'bg-rose-950/70 text-rose-300 hover:bg-rose-900 border border-rose-700'
                : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <Frown className="w-3.5 h-3.5 text-rose-400" />
            <span>DELAYED</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeTab === 'DELAYED' ? 'bg-white text-rose-900' : 'bg-[#333333] text-zinc-300'
            }`}>
              {delayedOrdersCount}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            id="kds-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order # or item..."
            className="w-full pl-9 pr-3 py-2 bg-[#222222] border border-[#333333] text-white text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CDEBC5] placeholder-zinc-500 font-medium"
          />
        </div>
      </div>

      {/* Main Kitchen Orders Grid */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {isLoading ? (
          <div className="p-20 text-center text-zinc-400 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#CDEBC5] mb-3" />
            <p className="text-sm font-mono text-zinc-300">Connecting to Tagpuan Kitchen Stream...</p>
            <p className="text-xs text-zinc-500 mt-1">Listening for incoming POS and Kiosk orders.</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="p-20 text-center text-zinc-500 max-w-md mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-[#CDEBC5] mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">All Kitchen Orders Clear!</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              No orders pending in this queue. When cashiers process POS payments or self-ordering kiosk orders are paid, tickets will pop up here with instant audio chime and live timers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
            {displayedOrders.map((order) => (
              <KDSOrderCard
                key={order.id}
                order={order}
                onStart={handleStartOrder}
                onReady={handleMarkReady}
                onDeliver={handleDeliverOrder}
                onComplete={handleDeliverOrder}
                onRecall={handleRecallOrder}
              />
            ))}
          </div>
        )}
      </main>

      {/* Kitchen History Modal */}
      <KDSHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        branches={branches}
        selectedBranchId={selectedBranchId}
      />
    </div>
  );
};
