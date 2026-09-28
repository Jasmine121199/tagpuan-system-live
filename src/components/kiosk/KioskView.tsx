import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Product,
  ProductCategory,
  ModifierGroup,
  PaymentConfiguration,
  DiningOption,
  KioskCartItem,
  CartItemModifierInput,
  PaymentMethod,
  Order,
  KioskMenuData
} from '../../types';
import { KioskWelcomeScreen, formatKioskBranchHeader } from './KioskWelcomeScreen';
import { KioskModifierModal } from './KioskModifierModal';
import { KioskCartDrawer } from './KioskCartDrawer';
import { KioskPaymentScreen } from './KioskPaymentScreen';
import { KioskConfirmationScreen } from './KioskConfirmationScreen';
import { KioskStaffAuthModal } from './KioskStaffAuthModal';
import { KioskTerminalSetup } from './KioskTerminalSetup';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { normalizeCategory } from '../../lib/api';
import { insertKioskOrderToSupabase } from '../../lib/supabase';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';
import { dispatchOrderToKDS } from '../../utils/orderPaymentUtils';
import {
  Search,
  ShoppingBag,
  UtensilsCrossed,
  ArrowRight,
  Flame,
  Plus,
  Sparkles,
  Layers,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Tag,
  Check,
  Ban,
  ChefHat,
  Image as ImageIcon
} from 'lucide-react';

type KioskScreen = 'TERMINAL_SETUP' | 'WELCOME' | 'ORDERING' | 'CHECKOUT_PAYMENT' | 'ORDER_CONFIRMED';

interface KioskViewProps {
  initialBranchId?: string;
  initialTable?: string;
  onExitToERP?: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({
  initialBranchId,
  initialTable,
  onExitToERP
}) => {
  // Check for assigned branch in URL or persistent localStorage
  const getInitialBranchId = (): string => {
    if (typeof window === 'undefined') return initialBranchId || '';
    const params = new URLSearchParams(window.location.search);
    const urlBranchId = params.get('branch_id') || params.get('branchId');
    const storedBranchId = localStorage.getItem('kiosk_assigned_branch_id') || localStorage.getItem('tagpuan_kiosk_branch_id');
    const resolved = (urlBranchId && urlBranchId.trim()) || (initialBranchId && initialBranchId.trim()) || (storedBranchId && storedBranchId.trim()) || '';
    if (resolved) {
      localStorage.setItem('kiosk_assigned_branch_id', resolved);
      localStorage.setItem('tagpuan_kiosk_branch_id', resolved);
    }
    return resolved;
  };

  const getInitialTable = (): string | null => {
    if (typeof window === 'undefined') return initialTable || null;
    const params = new URLSearchParams(window.location.search);
    const urlTable = params.get('table') || params.get('table_number') || params.get('tableNumber');
    const storedTable = localStorage.getItem('kiosk_table_number');
    const resolved = (urlTable && urlTable.trim()) || (initialTable && initialTable.trim()) || (storedTable && storedTable.trim()) || null;
    if (resolved) {
      localStorage.setItem('kiosk_table_number', resolved);
    }
    return resolved;
  };

  const initialBranch = getInitialBranchId();
  const initialTableNum = getInitialTable();

  // --- KIOSK STATE ---
  const [branchId, setBranchId] = useState<string>(initialBranch);
  const [tableNumber, setTableNumber] = useState<string | null>(initialTableNum);
  const [screen, setScreen] = useState<KioskScreen>(() => {
    if (initialBranch && initialTableNum) return 'ORDERING';
    return initialBranch ? 'WELCOME' : 'TERMINAL_SETUP';
  });
  const [diningOption, setDiningOption] = useState<DiningOption>('DINE_IN');

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [menuData, setMenuData] = useState<KioskMenuData | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(Boolean(initialBranch));
  const [menuError, setMenuError] = useState<string | null>(null);

  // Active Category & Search Filter
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  const [isCartReviewOpen, setIsCartReviewOpen] = useState<boolean>(false);

  // Customization Modal State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<KioskCartItem | null>(null);

  // Checkout & Submission State
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Staff PIN / Device Settings Modal
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);

  // Idle Timer State (60s total, 15s warning)
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [showIdleWarning, setShowIdleWarning] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Active Branches and Load Menu on Mount
  const loadMenu = useCallback(async (bId?: string) => {
    setIsLoadingMenu(true);
    setMenuError(null);
    try {
      const targetBranchId = bId || branchId || localStorage.getItem('kiosk_assigned_branch_id') || '';
      if (!targetBranchId) {
        setIsLoadingMenu(false);
        setScreen('TERMINAL_SETUP');
        return;
      }

      const url = `/api/kiosk/menu?branch_id=${encodeURIComponent(targetBranchId)}`;
      console.log(`[Kiosk] Requesting menu: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to load menu');
      }
      const data: KioskMenuData = await res.json();
      setMenuData(data);
      if (data.branch?.id) {
        setBranchId(data.branch.id);
        localStorage.setItem('kiosk_assigned_branch_id', data.branch.id);
        localStorage.setItem('tagpuan_kiosk_branch_id', data.branch.id);
        if (data.branch.name) {
          localStorage.setItem('kiosk_assigned_branch_name', data.branch.name);
        }
      }
      console.log(`[Kiosk] Menu loaded: ${data.products?.length || 0} products for branch ${data.branch?.name}`);
    } catch (err: any) {
      console.error('[Kiosk] Menu load failed:', err);
      setMenuError(err.message || 'Error loading kiosk menu');
    } finally {
      setIsLoadingMenu(false);
    }
  }, [branchId]);

  useEffect(() => {
    const initKiosk = async () => {
      try {
        const res = await fetch('/api/kiosk/branches');
        let branchList: { id: string; name: string }[] = [];
        if (res.ok) {
          const data = await res.json();
          branchList = data.branches || [];
          setBranches(branchList);
        }

        const activeId = branchId || localStorage.getItem('kiosk_assigned_branch_id') || localStorage.getItem('tagpuan_kiosk_branch_id');

        if (!activeId) {
          // No branch assigned! Force Terminal Branch Setup screen
          console.log('[Kiosk] No branch assigned. Showing Terminal Branch Setup screen.');
          setScreen('TERMINAL_SETUP');
          setIsLoadingMenu(false);
          return;
        }

        // Verify that the assigned branch actually exists in available branches if list is loaded
        if (branchList.length > 0) {
          const matchedBranch = branchList.find(b => b.id === activeId);
          if (!matchedBranch) {
            console.warn(`[Kiosk] Branch ${activeId} not found in available branches.`);
            setScreen('TERMINAL_SETUP');
            setIsLoadingMenu(false);
            return;
          } else {
            localStorage.setItem('kiosk_assigned_branch_name', matchedBranch.name);
          }
        }

        await loadMenu(activeId);
      } catch (err) {
        console.error('Failed to fetch kiosk branches:', err);
        const activeId = branchId || localStorage.getItem('kiosk_assigned_branch_id');
        if (activeId) {
          await loadMenu(activeId);
        } else {
          setScreen('TERMINAL_SETUP');
          setIsLoadingMenu(false);
        }
      }
    };
    initKiosk();
  }, []);

  const handleTerminalSetupComplete = async (newBranchId: string, newBranchName: string) => {
    console.log(`[Kiosk] Terminal setup complete for branch: ${newBranchName} (${newBranchId})`);
    setBranchId(newBranchId);
    localStorage.setItem('kiosk_assigned_branch_id', newBranchId);
    localStorage.setItem('kiosk_assigned_branch_name', newBranchName);
    localStorage.setItem('tagpuan_kiosk_branch_id', newBranchId);
    await loadMenu(newBranchId);
    setScreen('WELCOME');
  };

  const handleResetTerminal = () => {
    localStorage.removeItem('kiosk_assigned_branch_id');
    localStorage.removeItem('kiosk_assigned_branch_name');
    localStorage.removeItem('tagpuan_kiosk_branch_id');
    setBranchId('');
    setMenuData(null);
    setCart([]);
    setScreen('TERMINAL_SETUP');
  };

  // 3. User Activity & Inactivity Auto-Reset Watcher
  const resetIdleTimer = useCallback(() => {
    setIdleSeconds(0);
    setShowIdleWarning(false);
  }, []);

  useEffect(() => {
    const handleUserActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    const interval = setInterval(() => {
      // Only track idle when ordering or reviewing (not on welcome screen)
      if (screen === 'ORDERING' || screen === 'CHECKOUT_PAYMENT') {
        setIdleSeconds(prev => {
          const next = prev + 1;
          if (next >= 45 && !showIdleWarning) {
            setShowIdleWarning(true);
          }
          if (next >= 60) {
            // Reset Session
            handleResetSession();
            return 0;
          }
          return next;
        });
      }
    }, 1000);

    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      clearInterval(interval);
    };
  }, [screen, showIdleWarning]);

  // Reset entire customer session
  const handleResetSession = () => {
    setCart([]);
    setConfirmedOrder(null);
    setCustomizingProduct(null);
    setEditingCartItem(null);
    setIsCartReviewOpen(false);
    setShowIdleWarning(false);
    setIdleSeconds(0);
    setOrderError(null);
    setScreen('WELCOME');
  };

  // Switch Branch
  const handleSelectBranch = (newBranchId: string) => {
    setBranchId(newBranchId);
    localStorage.setItem('tagpuan_kiosk_branch_id', newBranchId);
    handleResetSession();
    loadMenu(newBranchId);
  };

  // Start Ordering from Welcome Screen
  const handleSelectDiningOption = (option: DiningOption) => {
    setDiningOption(option);
    setScreen('ORDERING');
    resetIdleTimer();
  };

  // Products filtered by Category and Search Query
  const filteredProducts = useMemo(() => {
    if (!menuData) return [];
    let list = menuData.products;

    if (activeCategory !== 'ALL') {
      list = list.filter(p => normalizeCategory(p.category) === normalizeCategory(activeCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.product_name.toLowerCase().includes(q) ||
          (p.product_code && p.product_code.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [menuData, activeCategory, searchQuery]);

  // Check if a product requires modifier customization
  const doesProductRequireCustomization = (prod: Product): boolean => {
    if (!menuData) return false;
    const cat = (prod.category || '') as string;
    if (cat.includes('FRIES') || cat.includes('MATCH') || cat.includes('TAKE 1') || cat.includes('SPECIALTY')) {
      return true;
    }

    // Check if any modifier group applies
    return menuData.modifierGroups.some(g => {
      if (g.applicable_product_ids && g.applicable_product_ids.length > 0) {
        return g.applicable_product_ids.includes(prod.id);
      }
      return g.applicable_categories.some(c => normalizeCategory(c) === normalizeCategory(prod.category));
    });
  };

  // Add or Customize Product Click
  const handleProductClick = (prod: Product) => {
    resetIdleTimer();
    setCustomizingProduct(prod);
    setEditingCartItem(null);
  };

  // Save Customized Item from Modal
  const handleSaveCustomizedItem = (itemData: {
    product: Product;
    quantity: number;
    modifiers: CartItemModifierInput[];
    notes: string;
    unitPrice: number;
    totalPrice: number;
  }) => {
    if (editingCartItem) {
      // Update existing item
      setCart(prev =>
        prev.map(item =>
          item.id === editingCartItem.id
            ? {
                ...item,
                product: itemData.product,
                quantity: itemData.quantity,
                modifiers: itemData.modifiers,
                notes: itemData.notes,
                unitPrice: itemData.unitPrice,
                totalPrice: itemData.totalPrice
              }
            : item
        )
      );
      setEditingCartItem(null);
    } else {
      // Add new item to cart
      const newItem: KioskCartItem = {
        id: crypto.randomUUID(),
        product: itemData.product,
        quantity: itemData.quantity,
        modifiers: itemData.modifiers,
        notes: itemData.notes,
        unitPrice: itemData.unitPrice,
        totalPrice: itemData.totalPrice
      };
      setCart(prev => [...prev, newItem]);
    }
    setCustomizingProduct(null);
    resetIdleTimer();
  };

  // Cart Operations
  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    resetIdleTimer();
    if (newQty <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const totalPrice = Math.round(item.unitPrice * newQty * 100) / 100;
          return { ...item, quantity: newQty, totalPrice };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    resetIdleTimer();
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const handleEditCartItem = (item: KioskCartItem) => {
    resetIdleTimer();
    setEditingCartItem(item);
    setCustomizingProduct(item.product);
    setIsCartReviewOpen(false);
  };

  // Submit Order to Backend
  const handleSubmitKioskOrder = async (
    paymentMethod: PaymentMethod,
    customerName: string,
    referenceNumber: string,
    customerPhone: string,
    payNow?: boolean
  ) => {
    if (cart.length === 0 || !menuData) return;
    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      console.log('[KIOSK] submitting order');
      const targetBranchId = branchId || menuData.branch.id || localStorage.getItem('kiosk_assigned_branch_id') || '';
      if (!targetBranchId) {
        throw new Error('Terminal has no assigned branch. Please contact store staff.');
      }

      const formattedTable = tableNumber ? (tableNumber.toLowerCase().startsWith('table') ? tableNumber : `Table ${tableNumber}`) : null;
      const isOnlinePayment = payNow !== undefined ? payNow : (paymentMethod !== 'CASH');

      const payload = {
        branch_id: targetBranchId,
        source: 'KIOSK',
        dining_option: diningOption,
        table_number: formattedTable || undefined,
        is_mobile_order: Boolean(formattedTable),
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        intended_payment_method: paymentMethod,
        idempotency_key: `kiosk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        notes: [
          formattedTable ? `[${formattedTable}] • Mobile Dine-In` : null,
          referenceNumber ? `Ref: ${referenceNumber}` : null
        ].filter(Boolean).join(' | ') || undefined,
        reference_number: referenceNumber || undefined,
        pay_now: isOnlinePayment,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers
        }))
      };

      console.log('[KIOSK] database insert started');
      const res = await fetch('/api/kiosk/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[KIOSK] database insert failed:', data.error);
        throw new Error(data.error || 'Failed to submit order');
      }

      console.log('[KIOSK] database insert success');
      console.log(`[KIOSK] order_id = ${data.order.id}`);
      console.log('[KIOSK] order_items inserted');

      // Ensure branch_id is attached to order record
      const orderToPersist = {
        ...data.order,
        branch_id: data.order.branch_id || targetBranchId,
        kitchen_status: data.order.kitchen_status || 'NEW',
        kitchen_received_at: data.order.kitchen_received_at || new Date().toISOString()
      };

      // Immediately dispatch order to Kitchen Display System (KDS) for real-time visibility
      dispatchOrderToKDS(orderToPersist);

      // Attempt direct Supabase synchronization with logging if configured
      await insertKioskOrderToSupabase(orderToPersist, orderToPersist.items || []);

      setConfirmedOrder(orderToPersist);
      setCart([]);
      setScreen('ORDER_CONFIRMED');
    } catch (err: any) {
      console.error('[KIOSK] order submission error:', err);
      setOrderError(err.message || 'An error occurred while submitting your order.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  // 0. RENDER: Terminal Branch Setup Screen (when no branch is assigned)
  if (screen === 'TERMINAL_SETUP') {
    return (
      <KioskTerminalSetup
        onSetupComplete={handleTerminalSetupComplete}
        onExitToERP={onExitToERP}
      />
    );
  }

  // 1. RENDER: Welcome Screen
  if (screen === 'WELCOME') {
    return (
      <>
        <KioskWelcomeScreen
          branchName={menuData?.branch.name || localStorage.getItem('kiosk_assigned_branch_name') || 'Tagpuan Branch'}
          onSelectDiningOption={handleSelectDiningOption}
          onStaffSettings={() => setShowStaffModal(true)}
        />
        {showStaffModal && (
          <KioskStaffAuthModal
            currentBranchId={branchId}
            branches={branches}
            onSelectBranch={handleSelectBranch}
            onResetTerminal={handleResetTerminal}
            onExitToERP={onExitToERP || (() => {})}
            onClose={() => setShowStaffModal(false)}
          />
        )}
      </>
    );
  }

  // 2. RENDER: Order Confirmation Screen
  if (screen === 'ORDER_CONFIRMED' && confirmedOrder) {
    return (
      <KioskConfirmationScreen
        order={confirmedOrder}
        onReset={handleResetSession}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-between select-none relative pb-28">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-30 bg-[#18181B]/95 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg">
        {/* Brand & Branch Context */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetSession}
            className="w-10 h-10 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black text-lg shadow-md active:scale-95 transition"
          >
            T
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                {formatKioskBranchHeader(menuData?.branch.name || localStorage.getItem('kiosk_assigned_branch_name'))}
              </h1>
              {tableNumber ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-300 text-amber-950 border border-amber-400 flex items-center gap-1 shadow-xs">
                  <span>🍽️</span>
                  <span>[{tableNumber.toLowerCase().startsWith('table') ? tableNumber : `Table ${tableNumber}`}]</span>
                </span>
              ) : (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  diningOption === 'TAKE_OUT' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {diningOption === 'TAKE_OUT' ? 'Take Out' : 'Dine In'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3 h-3 text-[#CDEBC5] shrink-0" />
              <span>{menuData?.branch.name || localStorage.getItem('kiosk_assigned_branch_name') || 'Assigned Branch'}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-mono text-[9px] tracking-wide">TERMINAL LOCKED</span>
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                resetIdleTimer();
              }}
              placeholder="Search burger, siomai, fries..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#CDEBC5]"
            />
          </div>
        </div>

        {/* Right Controls: Staff PIN & Cancel & PWA Install */}
        <div className="flex items-center gap-2">
          <PWAInstallButton variant="kiosk" forceShow={true} />

          <button
            type="button"
            onClick={handleResetSession}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/30 text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Start Over</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <ShieldCheck className="w-4 h-4 text-[#CDEBC5]" />
          </button>
        </div>
      </header>

      {/* Table Dine-In Banner */}
      {tableNumber && (
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 py-2.5 px-4 text-center font-black text-xs border-b border-amber-500 shadow-sm flex items-center justify-center gap-2">
          <span>🍽️</span>
          <span>Ordering for {tableNumber.toLowerCase().startsWith('table') ? tableNumber.toUpperCase() : `TABLE ${tableNumber}`} • Mobile Dine-In</span>
          <span className="hidden sm:inline text-amber-950/80 font-medium">| Pagka-order, ihahatid diretso ang mainit na pagkain sa inyong lamesa!</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 flex-1">
        {/* Category Horizontal Scroll Tab Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('ALL');
              resetIdleTimer();
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === 'ALL'
                ? 'bg-[#CDEBC5] text-[#111111] shadow-lg shadow-[#CDEBC5]/10 scale-105'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>All Menu Items</span>
          </button>

          {menuData?.categories.map(cat => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  resetIdleTimer();
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#CDEBC5] text-[#111111] shadow-lg shadow-[#CDEBC5]/10 scale-105'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        {isLoadingMenu ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 rounded-3xl bg-zinc-900 border border-zinc-800" />
            ))}
          </div>
        ) : menuError ? (
          <div className="p-8 text-center bg-zinc-900/50 rounded-3xl border border-zinc-800 space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Hindi Ma-load ang Menu</h3>
            <p className="text-xs text-zinc-400">{menuError}</p>
            <button
              type="button"
              onClick={() => loadMenu(branchId)}
              className="px-5 py-2.5 rounded-xl bg-[#CDEBC5] text-[#111111] font-extrabold text-xs hover:bg-white transition shadow-sm"
            >
              Subukan Muli (Retry)
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800/80 space-y-2">
            <Search className="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-zinc-300">Walang Nakitang Pagkain</h3>
            <p className="text-xs text-zinc-500">Subukang mag-search ng ibang keyword o kategorya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredProducts.map(product => {
              const requiresCustomization = doesProductRequireCustomization(product);
              const isFries = product.category === 'DOUBLE CHEESE FRIES';
              const isOutOfStock = Boolean(
                product.is_out_of_stock ||
                menuData?.outOfStockProductIds?.includes(product.id)
              );

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && handleProductClick(product)}
                  className={`group bg-[#18181B] border rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-150 relative overflow-hidden ${
                    isOutOfStock
                      ? 'border-zinc-800/60 opacity-60 cursor-not-allowed'
                      : 'hover:bg-zinc-900 border-zinc-800 hover:border-[#CDEBC5] cursor-pointer shadow-lg active:scale-[0.98]'
                  }`}
                >
                  {/* Category Pill */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50 truncate max-w-[120px]">
                      {product.category}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
                        Out of Stock
                      </span>
                    ) : requiresCustomization ? (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#CDEBC5]/15 text-[#CDEBC5] border border-[#CDEBC5]/30">
                        Customize
                      </span>
                    ) : null}
                  </div>

                  {/* Image Container */}
                  <div className="w-full aspect-4/3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden mb-3 group-hover:scale-102 transition-transform relative">
                    <img
                      src={getProductImageWithFallback(product.product_image, product.product_name, product.category)}
                      alt={product.product_name}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.src = getFoodSvgForProduct(product.product_name, product.category);
                      }}
                      className="w-full h-full object-cover"
                    />

                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow-lg border border-red-400">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Title & Info */}
                  <div className="space-y-1 mb-3">
                    <h3 className={`text-sm sm:text-base font-black leading-tight transition-colors line-clamp-2 ${
                      isOutOfStock ? 'text-zinc-400' : 'text-white group-hover:text-[#CDEBC5]'
                    }`}>
                      {product.product_name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                      {product.description || 'Authentic Tagpuan Specialty'}
                    </p>
                  </div>

                  {/* Price & Add Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div>
                      <span className="text-xs text-zinc-400 block font-medium">Price</span>
                      <span className={`text-base sm:text-lg font-black ${isOutOfStock ? 'text-zinc-500' : 'text-[#CDEBC5]'}`}>
                        ₱{product.selling_price.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black transition shadow-md ${
                        isOutOfStock
                          ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-[#CDEBC5] text-[#111111] group-hover:bg-white active:scale-90'
                      }`}
                    >
                      {isOutOfStock ? (
                        <Ban className="w-4 h-4" />
                      ) : (
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => {
                setIsCartReviewOpen(true);
                resetIdleTimer();
              }}
              className="w-full p-4 sm:p-4.5 rounded-2xl bg-[#CDEBC5] text-[#111111] hover:bg-[#b8e2af] shadow-2xl transition flex items-center justify-between active:scale-[0.99] font-black"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center text-sm font-black shadow">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-zinc-800 block">
                    Your Order ({totalCartCount} {totalCartCount === 1 ? 'item' : 'items'})
                  </span>
                  <span className="text-xs font-bold text-zinc-700">
                    Tap to review & proceed to checkout
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl font-black text-[#111111]">
                  ₱{totalCartAmount.toFixed(2)}
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#111111] text-white flex items-center justify-center">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Customization Modal */}
      {customizingProduct && menuData && (
        <KioskModifierModal
          product={customizingProduct}
          allProducts={menuData.products}
          modifierGroups={menuData.modifierGroups}
          initialModifiers={editingCartItem ? editingCartItem.modifiers : []}
          initialQuantity={editingCartItem ? editingCartItem.quantity : 1}
          initialNotes={editingCartItem ? editingCartItem.notes : ''}
          onSave={handleSaveCustomizedItem}
          onClose={() => {
            setCustomizingProduct(null);
            setEditingCartItem(null);
          }}
        />
      )}

      {/* Cart Review Drawer / Modal */}
      {isCartReviewOpen && (
        <KioskCartDrawer
          cart={cart}
          diningOption={diningOption}
          tableNumber={tableNumber}
          onUpdateQuantity={handleUpdateCartQty}
          onRemoveItem={handleRemoveCartItem}
          onEditItem={handleEditCartItem}
          onClearCart={handleResetSession}
          onContinueOrdering={() => setIsCartReviewOpen(false)}
          onProceedToCheckout={() => {
            setIsCartReviewOpen(false);
            setScreen('CHECKOUT_PAYMENT');
          }}
        />
      )}

      {/* Checkout & Payment Screen */}
      {screen === 'CHECKOUT_PAYMENT' && menuData && (
        <KioskPaymentScreen
          cart={cart}
          diningOption={diningOption}
          tableNumber={tableNumber}
          paymentConfigs={menuData.paymentConfigs}
          branchName={menuData.branch.name}
          onBackToCart={() => setScreen('ORDERING')}
          onSubmitOrder={handleSubmitKioskOrder}
          isSubmitting={isSubmittingOrder}
          errorMessage={orderError}
        />
      )}

      {/* Staff Settings Modal */}
      {showStaffModal && (
        <KioskStaffAuthModal
          currentBranchId={branchId}
          branches={branches}
          onSelectBranch={handleSelectBranch}
          onResetTerminal={handleResetTerminal}
          onExitToERP={onExitToERP || (() => {})}
          onClose={() => setShowStaffModal(false)}
        />
      )}

      {/* Inactivity Warning Popup (15s before reset) */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 text-white max-w-sm w-full p-6 rounded-3xl border-2 border-[#CDEBC5] shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#CDEBC5]/20 text-[#CDEBC5] flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Nariyan ka pa ba?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Magre-reset ang screen para sa susunod na customer sa loob ng{' '}
                <strong className="text-[#CDEBC5] text-sm">{60 - idleSeconds} segundo</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetSession}
                className="py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs hover:text-white"
              >
                I-cancel
              </button>
              <button
                type="button"
                onClick={resetIdleTimer}
                className="py-3 rounded-xl bg-[#CDEBC5] text-[#111111] font-black text-xs hover:bg-[#b8e2af] transition"
              >
                Ituloy ang Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
