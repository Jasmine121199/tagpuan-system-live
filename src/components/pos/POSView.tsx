import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Product,
  ProductCategory,
  Branch,
  ModifierGroup,
  CartItemInput,
  CartItemModifierInput,
  Order,
  ReceiptData,
  PaymentConfiguration,
  CashierSession,
  BranchInventory,
  LoyaltyCustomer,
  SavedTicket
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { ProductModifierModal } from './ProductModifierModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { CashierSessionModal } from './CashierSessionModal';
import { PaymentConfigModal } from './PaymentConfigModal';
import { OrderHistoryView } from './OrderHistoryView';
import { IncomingKioskOrdersModal } from './IncomingKioskOrdersModal';
import { api, getAuthToken, normalizeCategory } from '../../lib/api';
import { formatPeso } from '../../utils/currency';
import { subscribeToKioskOrdersRealtime } from '../../lib/supabase';
import { googleSheetsPersistence } from '../../lib/googleSheetsPersistence';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';
import {
  deductInventoryForOrderItems,
  dispatchOrderToKDS
} from '../../utils/orderPaymentUtils';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Unlock,
  Lock,
  QrCode,
  FileText,
  History,
  Sliders,
  DollarSign,
  Tag,
  Building2,
  Loader2,
  Percent,
  Sparkles,
  ChefHat,
  Award,
  Gift,
  Ticket,
  UserCheck,
  Bookmark,
  Monitor,
  Image as ImageIcon,
  Bell,
  BellRing,
  X,
  ArrowRight,
  Check
} from 'lucide-react';

// Default menu catalog ensuring products are always visible and interactive
const DEFAULT_PRODUCTS: Product[] = [
  { id: 'prod-siomai', product_code: 'SIO-01', product_name: 'Pork Siomai (4 pcs)', description: 'Steamed pork siomai with chili garlic', selling_price: 50, category: 'SPECIALTY', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-siomai-rice', product_code: 'SIO-02', product_name: 'Siomai Rice Meal', description: 'Siomai served with steamed white rice', selling_price: 75, category: 'FAVORITE', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-classic-burger', product_code: 'BGR-01', product_name: 'Classic Burger', description: 'Classic grilled burger with special dressing', selling_price: 45, category: 'BURGERS', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-cheeseburger', product_code: 'BGR-02', product_name: 'Cheeseburger', description: 'Classic burger with melted cheddar slice', selling_price: 55, category: 'BURGERS', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-egg-burger', product_code: 'BGR-03', product_name: 'Egg Burger', description: 'Burger with fried egg and sauce', selling_price: 55, category: 'BURGERS', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-hotdog', product_code: 'HTD-01', product_name: 'Classic Hotdog Sandwich', description: 'Tender juicy hotdog sandwich', selling_price: 50, category: 'CLASSIC', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-fries', product_code: 'FRS-01', product_name: 'Double Cheese Fries', description: 'Crispy thick-cut fries with cheese powder', selling_price: 65, category: 'DOUBLE CHEESE FRIES', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-tapsilog', product_code: 'SLG-01', product_name: 'Tapsilog Special', description: 'Beef tapa with garlic rice and egg', selling_price: 110, category: 'FAVORITE', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-coke', product_code: 'DRK-01', product_name: 'Coca-Cola (Mismo)', description: 'Chilled softdrink bottle', selling_price: 25, category: 'DRINKS', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'prod-water', product_code: 'DRK-02', product_name: 'Mineral Water 500ml', description: 'Purified drinking water', selling_price: 20, category: 'DRINKS', product_image: null, is_active: true, is_available: true, is_sold_out: false, created_at: '2025-01-01', updated_at: '2025-01-01' }
];

// Initial ingredient inventory with ample stock for testing
const INITIAL_INVENTORY_STORE: Record<string, { id: string; name: string; stock: number; unit: string }> = {
  'ING-01': { id: 'ING-01', name: 'Patties', stock: 150, unit: 'pcs' },
  'ING-02': { id: 'ING-02', name: 'Hotdog', stock: 100, unit: 'pcs' },
  'ING-03': { id: 'ING-03', name: 'Chicken Fillet', stock: 80, unit: 'pcs' },
  'ING-04': { id: 'ING-04', name: 'Fries', stock: 45.0, unit: 'kg' },
  'ING-05': { id: 'ING-05', name: 'Shanghai', stock: 200, unit: 'pcs' },
  'ING-06': { id: 'ING-06', name: 'Siomai', stock: 350, unit: 'pcs' },
  'ING-07': { id: 'ING-07', name: 'Patty Bread', stock: 150, unit: 'pcs' },
  'ING-08': { id: 'ING-08', name: 'Hotdog Bread', stock: 100, unit: 'pcs' },
  'ING-09': { id: 'ING-09', name: 'Egg', stock: 120, unit: 'pcs' },
  'ING-10': { id: 'ING-10', name: 'Meatloaf', stock: 80, unit: 'pcs' },
  'ING-11': { id: 'ING-11', name: 'OK Cheese', stock: 160, unit: 'pcs' },
  'ING-12': { id: 'ING-12', name: 'Rice', stock: 50.0, unit: 'kg' },
  'ING-13': { id: 'ING-13', name: 'Soft Drinks', stock: 120, unit: 'bottle' },
  'ING-14': { id: 'ING-14', name: 'Chilli Oil', stock: 15, unit: 'bottle' },
  'ING-15': { id: 'ING-15', name: 'Fried Garlic', stock: 20, unit: 'packs' },
  'ING-16': { id: 'ING-16', name: 'H2O Mineral Water', stock: 60, unit: 'bottle' },
  'ING-17': { id: 'ING-17', name: 'Hot Sauce', stock: 15, unit: 'bottle' },
  'ING-18': { id: 'ING-18', name: 'Ketchup', stock: 8.0, unit: 'gal' },
  'ING-19': { id: 'ING-19', name: 'Mayo', stock: 8.0, unit: 'gal' },
  'ING-20': { id: 'ING-20', name: 'Cooking Oil', stock: 25, unit: 'bottle' }
};

const getInitialInventory = (): Record<string, { id: string; name: string; stock: number; unit: string }> => {
  try {
    const saved = localStorage.getItem('inventory');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return { ...INITIAL_INVENTORY_STORE };
};

export const POSView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();

  // Primary Data State (Initialized with fallback products so menu is always active)
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfiguration[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventoryList, setInventoryList] = useState<BranchInventory[]>([]);

  // 1. FORCE ACTIVE STATE: Default shift is automatically OPEN with starting fund
  const [activeSession, setActiveSession] = useState<CashierSession>({
    id: 'shift-open-auto',
    branch_id: user?.branch_id || 'branch-1',
    branch_name: 'Main Branch',
    cashier_id: user?.id || 'usr-cashier',
    cashier_name: user?.full_name || 'Cashier (Active Shift)',
    start_time: new Date().toISOString(),
    beginning_cash: 2000,
    expected_cash: 2000,
    total_sales: 0,
    total_orders: 0,
    cash_payments: 0,
    gcash_payments: 0,
    status: 'OPEN'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Standalone inventory & kitchen orders states
  const [currentInventoryMap, setCurrentInventoryMap] = useState<Record<string, any>>(getInitialInventory);
  const [currentKitchenOrders, setCurrentKitchenOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('kds_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Direct Standalone Payment Modal State
  const [isDirectPaymentModalOpen, setIsDirectPaymentModalOpen] = useState(false);
  const [directCashTendered, setDirectCashTendered] = useState<string>('');
  const [directPaymentMethod, setDirectPaymentMethod] = useState<'CASH' | 'GCASH' | 'CARD'>('CASH');

  // Active Branch Context: Assigned branch for Cashier/Staff; selectable/contextual for Owner
  const { selectedBranchId: globalBranchId } = useBranch();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (user?.branch_id) return user.branch_id;
    if (globalBranchId && globalBranchId !== 'ALL') return globalBranchId;
    return 'branch-1';
  });

  useEffect(() => {
    if (user?.branch_id) {
      setSelectedBranchId(user.branch_id);
    } else if (globalBranchId && globalBranchId !== 'ALL') {
      setSelectedBranchId(globalBranchId);
    }
  }, [user?.branch_id, globalBranchId]);

  // POS Navigation Sub-views
  const [currentPOSSubView, setCurrentPOSSubView] = useState<'REGISTER' | 'HISTORY'>('REGISTER');

  // Product Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State
  interface CartItem {
    id: string; // unique key in cart
    product: Product;
    quantity: number;
    modifiers: CartItemModifierInput[];
    notes: string;
    unitPrice: number;
    totalPrice: number;
  }

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKE_OUT'>('DINE_IN');
  const [discountType, setDiscountType] = useState<string>('NONE');
  const [customDiscountAmount, setCustomDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Toast / Feedback Notifications
  const [successToast, setSuccessToast] = useState<{
    orderNumber: string;
    orderId: string;
    total: number;
    orderType: string;
    itemCount: number;
    timestamp: string;
  } | null>(null);
  const [soldOutNotice, setSoldOutNotice] = useState<string | null>(null);

  // Modals State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [pendingOrderForPayment, setPendingOrderForPayment] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isPaymentConfigModalOpen, setIsPaymentConfigModalOpen] = useState(false);

  // Cart Pre-Validation State
  const [isValidatingCart, setIsValidatingCart] = useState(false);
  const [validationShortfall, setValidationShortfall] = useState<string | null>(null);

  // Phase 10: Loyalty & Held Tickets State
  const [loyaltyCustomers, setLoyaltyCustomers] = useState<LoyaltyCustomer[]>([]);
  const [savedTickets, setSavedTickets] = useState<SavedTicket[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [customerSearchText, setCustomerSearchText] = useState<string>('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSavedTicketsModalOpen, setIsSavedTicketsModalOpen] = useState(false);
  const [redeemRewardItem, setRedeemRewardItem] = useState<{ id: string; name: string } | null>(null);
  const [isHoldingTicket, setIsHoldingTicket] = useState(false);

  // Manual Customer Registration State for POS
  const [isRegisterCustomerOpen, setIsRegisterCustomerOpen] = useState(false);
  const [regCustomerName, setRegCustomerName] = useState('');
  const [regCustomerPhone, setRegCustomerPhone] = useState('');
  const [regCustomerEmail, setRegCustomerEmail] = useState('');
  const [regCustomerSubmitting, setRegCustomerSubmitting] = useState(false);
  const [regCustomerError, setRegCustomerError] = useState<string | null>(null);

  const handleRegisterCustomerFromPOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCustomerName.trim() || !regCustomerPhone.trim()) {
      setRegCustomerError('Name and Phone Number are required.');
      return;
    }
    try {
      setRegCustomerSubmitting(true);
      setRegCustomerError(null);
      const token = localStorage.getItem('tagpuan_token');
      const res = await fetch('/api/loyalty/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_name: regCustomerName.trim(),
          phone_number: regCustomerPhone.trim(),
          email: regCustomerEmail.trim() || undefined,
          registered_branch_id: selectedBranchId !== 'ALL' ? selectedBranchId : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register customer.');

      setLoyaltyCustomers(prev => [data.customer, ...prev]);
      setSelectedCustomer(data.customer);
      setIsRegisterCustomerOpen(false);
      setRegCustomerName('');
      setRegCustomerPhone('');
      setRegCustomerEmail('');
    } catch (err: any) {
      setRegCustomerError(err.message || 'Registration failed.');
    } finally {
      setRegCustomerSubmitting(false);
    }
  };

  // Phase 16: Kiosk Orders Queue State
  const [isKioskOrdersModalOpen, setIsKioskOrdersModalOpen] = useState(false);
  const [pendingKioskOrdersCount, setPendingKioskOrdersCount] = useState<number>(0);
  const [activeKioskNotification, setActiveKioskNotification] = useState<Order | null>(null);
  const dismissedKioskOrderIdsRef = useRef<Set<string>>(new Set());

  // Real-Time Kitchen Queue & Customer Call-Out State
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);
  const [isCalloutModalOpen, setIsCalloutModalOpen] = useState(false);
  const [calloutToast, setCalloutToast] = useState<{
    orderNumber: string;
    customerName?: string | null;
    tableNumber?: string | null;
  } | null>(null);

  const fetchKitchenOrders = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const branchParam = selectedBranchId && selectedBranchId !== 'ALL' ? `?branch_id=${selectedBranchId}` : '';
      const res = await fetch(`/api/kds/orders${branchParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKitchenOrders(data.orders || []);
      }
    } catch (e) {
      console.warn('Failed to load kitchen orders for POS:', e);
    }
  }, [selectedBranchId]);

  // Derived counts for kitchen prep and ready call-outs
  const preparingKitchenCount = useMemo(() => {
    return kitchenOrders.filter(o => o.kitchen_status === 'PREPARING').length;
  }, [kitchenOrders]);

  const readyKitchenOrders = useMemo(() => {
    return kitchenOrders.filter(o => o.kitchen_status === 'READY');
  }, [kitchenOrders]);

  // Fetch pending kiosk orders count and detect newly arrived customer orders
  const pollKioskOrdersCount = async () => {
    try {
      const res = await api.getOrders({
        branch_id: selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
        status: 'PENDING_PAYMENT',
        source: 'KIOSK'
      });
      const pending = (res.orders || []).filter(
        o => (!selectedBranchId || selectedBranchId === 'ALL' || o.branch_id === selectedBranchId) &&
             o.status === 'PENDING_PAYMENT' &&
             (o.source === 'SELF_ORDERING' || o.source === 'KIOSK')
      );
      setPendingKioskOrdersCount(pending.length);

      // Detect unhandled or newly arrived kiosk order for notification
      const unhandled = pending.filter(o => !dismissedKioskOrderIdsRef.current.has(o.id));
      if (unhandled.length > 0) {
        const newest = unhandled[0];
        if (!activeKioskNotification || activeKioskNotification.id !== newest.id) {
          console.log(`[POS] received order_id = ${newest.id}`);
          console.log(`[POS] order query result: Order #${newest.order_number}`);
          console.log('[POS] notification triggered');
          setActiveKioskNotification(newest);
        }
      } else if (pending.length === 0 && activeKioskNotification) {
        setActiveKioskNotification(null);
      }
    } catch (err: any) {
      console.warn('[POS] Failed to poll kiosk orders:', err.message || err);
    }
  };

  // Load Initial POS Data
  const fetchPOSData = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [prodRes, modRes, cfgRes, branchRes, invRes, sessRes, custRes, ticketsRes] = await Promise.all([
        fetch(`/api/products?activeOnly=true${selectedBranchId ? `&branch_id=${selectedBranchId}` : ''}`, { headers: authHeaders }),
        fetch('/api/pos/modifiers', { headers: authHeaders }),
        fetch(`/api/pos/payment-configs?branch_id=${selectedBranchId}`, { headers: authHeaders }),
        fetch('/api/branches', { headers: authHeaders }),
        fetch(`/api/inventory?branch_id=${selectedBranchId}`, { headers: authHeaders }),
        fetch(`/api/pos/session?branch_id=${selectedBranchId}`, { headers: authHeaders }),
        fetch(`/api/loyalty/customers?branch_id=${selectedBranchId}`, { headers: authHeaders }),
        fetch(`/api/loyalty/tickets?branch_id=${selectedBranchId}`, { headers: authHeaders })
      ]);

      const prodData = prodRes.ok ? await prodRes.json() : { products: [] };
      const modData = modRes.ok ? await modRes.json() : { groups: [] };
      const cfgData = cfgRes.ok ? await cfgRes.json() : { configs: [] };
      const branchData = branchRes.ok ? await branchRes.json() : { branches: [] };
      const invData = invRes.ok ? await invRes.json() : { inventory: [] };
      const sessData = sessRes.ok ? await sessRes.json() : { session: null };
      const custData = custRes.ok ? await custRes.json() : { customers: [] };
      const ticketsData = ticketsRes.ok ? await ticketsRes.json() : { tickets: [] };

      // Hydrate POS menu items on initial load via Google Apps Script GET action="getMenu"
      const hydratedMenu = await googleSheetsPersistence.getMenu(prodData.products || []);
      setProducts(hydratedMenu && hydratedMenu.length > 0 ? hydratedMenu : (prodData.products || []));
      setModifierGroups(modData.groups || []);
      setPaymentConfigs(cfgData.configs || []);
      if (branchData.branches && branchData.branches.length > 0) {
        setBranches(branchData.branches);
        if (!selectedBranchId || selectedBranchId === 'branch-1') {
          const userBranch = user?.branch_id ? branchData.branches.find((b: Branch) => b.id === user.branch_id) : null;
          const chosen = userBranch ? userBranch.id : branchData.branches[0].id;
          if (chosen && chosen !== selectedBranchId) {
            setSelectedBranchId(chosen);
          }
        }
      }
      setInventoryList(invData.inventory || []);
      setActiveSession(sessData.session || null);
      setLoyaltyCustomers(custData.customers || []);
      setSavedTickets(ticketsData.tickets || []);
      await pollKioskOrdersCount();
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPOSData();
    fetchKitchenOrders();
    const interval = setInterval(pollKioskOrdersCount, 2500);
    const kInterval = setInterval(fetchKitchenOrders, 4000);

    const handleKdsUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      fetchKitchenOrders();
      if (customEv.detail?.status === 'READY') {
        const ord = customEv.detail.order;
        setCalloutToast({
          orderNumber: customEv.detail.orderNumber || ord?.order_number || 'Order',
          customerName: ord?.customer_name,
          tableNumber: ord?.table_number
        });
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tagpuan_kds_status_update' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          fetchKitchenOrders();
          if (parsed.status === 'READY') {
            setCalloutToast({
              orderNumber: parsed.orderNumber || 'Order',
              customerName: null,
              tableNumber: null
            });
          }
        } catch (err) {}
      } else if (e.key === 'tagpuan_latest_kitchen_order' || e.key === 'kds_orders') {
        fetchKitchenOrders();
      }
    };

    window.addEventListener('tagpuan:kds_order_updated', handleKdsUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      clearInterval(kInterval);
      window.removeEventListener('tagpuan:kds_order_updated', handleKdsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedBranchId, fetchKitchenOrders]);

  // Realtime subscription for incoming Kiosk orders
  useEffect(() => {
    if (!selectedBranchId || selectedBranchId === 'ALL') return;
    const unsubscribe = subscribeToKioskOrdersRealtime(selectedBranchId, (newOrder) => {
      console.log('[POS] realtime event received: INSERT');
      console.log(`[POS] received order_id = ${newOrder.id}`);
      console.log(`[POS] order query result: Order #${newOrder.order_number}`);
      console.log('[POS] notification triggered');
      setActiveKioskNotification(newOrder);
      setPendingKioskOrdersCount(prev => prev + 1);
    });
    return () => {
      unsubscribe();
    };
  }, [selectedBranchId]);

  // Active Branch object
  const currentBranch = useMemo(() => {
    return branches.find(b => b.id === selectedBranchId) || {
      id: selectedBranchId,
      name: user?.branch_name || 'Tagpuan Branch'
    };
  }, [branches, selectedBranchId, user]);

  // Requirement 4: Expose inventory state as clean JSON in window.currentInventory with audit logging
  useEffect(() => {
    const formattedInventory = inventoryList.map(inv => {
      let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (inv.current_stock <= 0) {
        status = 'Out of Stock';
      } else if (inv.current_stock <= inv.reorder_level) {
        status = 'Low Stock';
      }

      return {
        itemId: inv.ingredient_id,
        itemName: inv.ingredient_name || inv.item_code || 'Ingredient',
        currentStock: inv.current_stock,
        unit: inv.unit,
        minThreshold: inv.reorder_level,
        status: status,
        category: inv.category,
        branchId: inv.branch_id
      };
    });

    (window as any).currentInventory = formattedInventory;

    // AI Employee Audit function for automated monitoring
    (window as any).auditStockStatus = () => {
      const inv = (window as any).currentInventory || [];
      const lowOrOut = inv.filter((i: any) => i.status === 'Low Stock' || i.status === 'Out of Stock');
      console.group('🤖 [TAGPUAN AI INVENTORY MONITOR] AUDIT REPORT');
      console.log(`Branch: ${currentBranch.name || selectedBranchId} | Total Tracked Supplies: ${inv.length}`);
      console.log(`Supplies Requiring Attention / Reorder: ${lowOrOut.length}`);
      if (lowOrOut.length > 0) {
        console.table(lowOrOut.map((i: any) => ({
          ID: i.itemId,
          Supply: i.itemName,
          'Current Stock': `${i.currentStock} ${i.unit}`,
          'Min Threshold': `${i.minThreshold} ${i.unit}`,
          Status: i.status
        })));
      } else {
        console.log('✅ All ingredient and supply levels are healthy.');
      }
      console.groupEnd();
      return {
        branch: currentBranch.name,
        totalTracked: inv.length,
        criticalCount: lowOrOut.length,
        criticalSupplies: lowOrOut,
        inventory: inv
      };
    };

    (window as any).getInventoryStatus = (window as any).auditStockStatus;
  }, [inventoryList, currentBranch, selectedBranchId]);

  // Auto-dismiss feedback toasts
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  useEffect(() => {
    if (soldOutNotice) {
      const timer = setTimeout(() => setSoldOutNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [soldOutNotice]);

  // Check if a menu item is sold out based on product availability or depleted inventory
  const isProductSoldOut = (product: Product) => {
    if (product.is_sold_out || product.is_available === false || product.is_out_of_stock) {
      return true;
    }
    // Also check if any ingredient in product's recipe has 0 stock in inventoryList
    if (product.recipe_items && product.recipe_items.length > 0 && inventoryList.length > 0) {
      for (const item of product.recipe_items) {
        const inv = inventoryList.find(i => i.ingredient_id === item.ingredient_id);
        if (inv && (inv.current_stock <= 0 || inv.current_stock < (item.quantity_consumed || 1))) {
          return true;
        }
      }
    }
    return false;
  };

  // Dynamic Categories list
  const categories: { id: string; label: string }[] = useMemo(() => {
    const defaultCats = [
      { id: 'ALL', label: 'All Items' },
      { id: 'BURGERS', label: 'Burgers' },
      { id: 'DOUBLE CHEESE FRIES', label: 'Cheese Fries' },
      { id: 'FAVORITE', label: 'Favorite' },
      { id: 'CLASSIC', label: 'Classic' },
      { id: 'SPECIALTY', label: 'Specialty' },
      { id: 'DRINKS', label: 'Drinks' },
      { id: 'ADD ONS', label: 'Add Ons' }
    ];
    const existingIds = new Set(defaultCats.map(c => normalizeCategory(c.id)));
    products.forEach(p => {
      if (p.category && !existingIds.has(normalizeCategory(p.category))) {
        existingIds.add(normalizeCategory(p.category));
        defaultCats.push({ id: p.category, label: p.category });
      }
    });
    return defaultCats;
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory =
        selectedCategory === 'ALL' ||
        normalizeCategory(p.category) === normalizeCategory(selectedCategory);
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        p.product_name.toLowerCase().includes(query) ||
        (p.product_code && p.product_code.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.code && p.code.toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add Product to Cart
  const handleSelectProduct = (product: Product) => {
    if (isProductSoldOut(product)) {
      setSoldOutNotice(`Cannot add "${product.product_name}" - this item is currently SOLD OUT due to depleted ingredient supplies.`);
      return;
    }

    // Check if product has applicable modifiers
    const hasModifiers = modifierGroups.some(g => {
      if (g.applicable_product_ids && g.applicable_product_ids.length > 0) {
        return g.applicable_product_ids.includes(product.id);
      }
      return g.applicable_categories.includes(product.category);
    });

    if (hasModifiers) {
      setCustomizingProduct(product);
      setIsModifierModalOpen(true);
    } else {
      // Add standard without modifiers
      addItemToCart(product, 1, [], '');
    }
  };

  const addItemToCart = (
    product: Product,
    quantity: number,
    modifiers: CartItemModifierInput[],
    notes: string
  ) => {
    let extra = 0;
    modifiers.forEach(m => {
      extra += m.additional_price || 0;
    });

    const unitPrice = product.selling_price + extra;
    const totalPrice = unitPrice * quantity;

    // Check if identical item already in cart (same product, modifiers, and notes)
    const modKey = JSON.stringify(modifiers.map(m => m.modifier_id).sort());
    const existingIndex = cartItems.findIndex(
      item =>
        item.product.id === product.id &&
        item.notes === notes &&
        JSON.stringify(item.modifiers.map(m => m.modifier_id).sort()) === modKey
    );

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCartItems(updated);
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        product,
        quantity,
        modifiers,
        notes,
        unitPrice,
        totalPrice
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems(
      cartItems
        .map(item => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== cartItemId));
  };

  const handleClearCart = () => {
    if (cartItems.length > 0) {
      if (confirm('Clear current order cart?')) {
        setCartItems([]);
        setDiscountType('NONE');
        setCustomDiscountAmount(0);
        setDiscountReason('');
        setOrderNotes('');
        setValidationShortfall(null);
      }
    }
  };

  // Subtotal & Discount calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cartItems]);

  const calculatedDiscount = useMemo(() => {
    if (discountType === 'SENIOR_PWD') {
      return Math.round(subtotal * 0.20 * 100) / 100;
    }
    if (discountType === 'PROMO') {
      return Math.round(subtotal * 0.10 * 100) / 100;
    }
    if (discountType === 'CUSTOM') {
      return Math.min(subtotal, Math.max(0, customDiscountAmount));
    }
    return 0;
  }, [subtotal, discountType, customDiscountAmount]);

  const grandTotal = useMemo(() => {
    return Math.max(0, Math.round((subtotal - calculatedDiscount) * 100) / 100);
  }, [subtotal, calculatedDiscount]);

  // Standalone Cart and POS global functions hook
  useEffect(() => {
    (window as any).cart = cartItems;
    (window as any).inventory = currentInventoryMap;
    (window as any).kitchenOrders = currentKitchenOrders;

    // Direct global addToCart function: e.g. addToCart('Siomai', 5) or addToCart(prod)
    (window as any).addToCart = (
      productNameOrItem: string | Product,
      qtyOrPrice: number = 1,
      productId?: string
    ) => {
      let targetProduct: Product | undefined;
      if (typeof productNameOrItem === 'object' && productNameOrItem !== null) {
        targetProduct = productNameOrItem as Product;
      } else {
        const q = String(productNameOrItem).toLowerCase().trim();
        targetProduct = products.find(
          p =>
            p.product_name.toLowerCase().includes(q) ||
            p.id === productId ||
            (p.product_code && p.product_code.toLowerCase() === q)
        );
      }

      if (!targetProduct) {
        const price = typeof qtyOrPrice === 'number' && qtyOrPrice > 10 ? qtyOrPrice : 50;
        targetProduct = {
          id: productId || `prod-${Date.now()}`,
          product_name: typeof productNameOrItem === 'string' ? productNameOrItem : 'Siomai Special',
          selling_price: price,
          category: 'SPECIALTY',
          is_available: true,
          is_sold_out: false
        } as Product;
      }

      const qty = typeof qtyOrPrice === 'number' && qtyOrPrice <= 10 && qtyOrPrice > 0 ? qtyOrPrice : 1;
      addItemToCart(targetProduct, qty, [], '');
    };

    (window as any).proceedToPayment = () => {
      handleProceedToPayment();
    };

    (window as any).confirmPayment = (cashAmount?: number) => {
      executeConfirmPayment(cashAmount);
    };

    (window as any).clearCart = () => {
      setCartItems([]);
      (window as any).cart = [];
    };
  }, [cartItems, products, currentInventoryMap, currentKitchenOrders, grandTotal, subtotal, calculatedDiscount, orderType]);

  // Robust Standalone Payment & Dispatch Execution
  const executeConfirmPayment = (cashAmount?: number) => {
    if (cartItems.length === 0) {
      alert("Cart is empty! Please add items before checking out.");
      return;
    }

    const tendered = typeof cashAmount === 'number' && !isNaN(cashAmount) ? cashAmount : grandTotal;
    const change = Math.max(0, Math.round((tendered - grandTotal) * 100) / 100);

    // 1. Automatic Ingredient & Supply Inventory Deduction
    const updatedInv = { ...currentInventoryMap };
    cartItems.forEach(item => {
      const pName = item.product.product_name.toLowerCase();
      const qty = item.quantity;
      if (pName.includes('siomai')) {
        if (updatedInv['ING-06']) updatedInv['ING-06'].stock = Math.max(0, updatedInv['ING-06'].stock - (4 * qty));
        if (updatedInv['ING-14']) updatedInv['ING-14'].stock = Math.max(0, Math.round((updatedInv['ING-14'].stock - (0.05 * qty)) * 100) / 100);
        if (updatedInv['ING-15']) updatedInv['ING-15'].stock = Math.max(0, updatedInv['ING-15'].stock - (1 * qty));
      } else if (pName.includes('burger')) {
        if (updatedInv['ING-01']) updatedInv['ING-01'].stock = Math.max(0, updatedInv['ING-01'].stock - qty);
        if (updatedInv['ING-07']) updatedInv['ING-07'].stock = Math.max(0, updatedInv['ING-07'].stock - qty);
        if (pName.includes('cheese') && updatedInv['ING-11']) updatedInv['ING-11'].stock = Math.max(0, updatedInv['ING-11'].stock - qty);
        if (pName.includes('egg') && updatedInv['ING-09']) updatedInv['ING-09'].stock = Math.max(0, updatedInv['ING-09'].stock - qty);
      } else if (pName.includes('fries')) {
        if (updatedInv['ING-04']) updatedInv['ING-04'].stock = Math.max(0, Math.round((updatedInv['ING-04'].stock - (0.15 * qty)) * 100) / 100);
        if (updatedInv['ING-11']) updatedInv['ING-11'].stock = Math.max(0, updatedInv['ING-11'].stock - qty);
      } else if (pName.includes('hotdog')) {
        if (updatedInv['ING-02']) updatedInv['ING-02'].stock = Math.max(0, updatedInv['ING-02'].stock - qty);
        if (updatedInv['ING-08']) updatedInv['ING-08'].stock = Math.max(0, updatedInv['ING-08'].stock - qty);
      } else if (pName.includes('silog') || pName.includes('rice')) {
        if (updatedInv['ING-12']) updatedInv['ING-12'].stock = Math.max(0, Math.round((updatedInv['ING-12'].stock - (0.2 * qty)) * 100) / 100);
        if (updatedInv['ING-09']) updatedInv['ING-09'].stock = Math.max(0, updatedInv['ING-09'].stock - qty);
      } else if (pName.includes('drink') || pName.includes('coke') || pName.includes('sprite')) {
        if (updatedInv['ING-13']) updatedInv['ING-13'].stock = Math.max(0, updatedInv['ING-13'].stock - qty);
      } else if (pName.includes('water')) {
        if (updatedInv['ING-16']) updatedInv['ING-16'].stock = Math.max(0, updatedInv['ING-16'].stock - qty);
      }
    });

    setCurrentInventoryMap(updatedInv);
    (window as any).inventory = updatedInv;
    try {
      localStorage.setItem('inventory', JSON.stringify(updatedInv));
    } catch (e) {
      console.warn('Inventory localStorage save error:', e);
    }

    // 2. Generate Unique Order ID and Push to window.kitchenOrders
    const newOrderId = `ord-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrderNumber = `POS-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: newOrderId,
      order_number: newOrderNumber,
      branch_id: selectedBranchId || 'branch-1',
      branch_name: currentBranch?.name || 'Main Branch',
      cashier_id: user?.id || 'cashier-1',
      cashier_name: user?.full_name || 'Cashier (Active)',
      order_type: orderType,
      source: 'POS',
      items: cartItems.map((ci, idx) => ({
        id: `item-${idx}-${Date.now()}`,
        order_id: newOrderId,
        product_id: ci.product.id,
        product_name: ci.product.product_name,
        quantity: ci.quantity,
        unit_price: ci.unitPrice,
        subtotal: ci.totalPrice,
        notes: ci.notes || undefined,
        modifiers: ci.modifiers || []
      })),
      subtotal: subtotal,
      discount_type: discountType !== 'NONE' ? (discountType as any) : undefined,
      discount_amount: calculatedDiscount,
      total: grandTotal,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.customer_name,
      customer_phone: selectedCustomer?.phone_number,
      status: 'PAID',
      payment_status: 'PAID',
      kitchen_status: 'NEW',
      kitchen_received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const nextKitchen = [newOrder, ...currentKitchenOrders];
    setCurrentKitchenOrders(nextKitchen);
    (window as any).kitchenOrders = nextKitchen;

    // 3. Real-Time KDS Multi-Tab and Local Storage Dispatch
    try {
      localStorage.setItem('kds_orders', JSON.stringify(nextKitchen));
      localStorage.setItem('tagpuan_latest_kitchen_order', JSON.stringify({
        timestamp: Date.now(),
        order: newOrder
      }));
    } catch (e) {
      console.warn('KDS localStorage save error:', e);
    }
    window.dispatchEvent(new CustomEvent('tagpuan:order_paid', { detail: newOrder }));

    // Trigger Google Apps Script POST action "createOrder" (saves to IndexedDB/localStorage if offline)
    void googleSheetsPersistence.createOrder(newOrder, true);

    // 4. Update Shift Statistics
    setActiveSession(prev => prev ? {
      ...prev,
      total_sales: prev.total_sales + grandTotal,
      total_orders: prev.total_orders + 1,
      cash_payments: prev.cash_payments + grandTotal
    } : null);

    // 5. Generate Receipt
    const receipt: ReceiptData = {
      header: 'TAGPUAN OFFICIAL RECEIPT',
      reference_number: `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
      order_number: newOrder.order_number,
      branch_name: currentBranch?.name || 'Tagpuan Main Branch',
      branch_id: selectedBranchId || 'branch-1',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      cashier_name: user?.full_name || 'Cashier',
      subtotal: subtotal,
      discount: calculatedDiscount,
      total: grandTotal,
      payment_method: directPaymentMethod as any,
      amount_received: tendered,
      change: change,
      items: (newOrder.items || []).map(i => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal || (i.quantity * i.unit_price),
        modifiers: (i.modifiers || []).map((m: any) => m.modifier_name || String(m))
      }))
    };

    setActiveReceipt(receipt);
    setIsDirectPaymentModalOpen(false);
    setIsPaymentModalOpen(false);

    // Trigger Toast Notification
    setSuccessToast({
      orderNumber: newOrder.order_number,
      orderId: newOrder.id,
      total: newOrder.total,
      orderType: newOrder.order_type || orderType,
      itemCount: newOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0,
      timestamp: new Date().toLocaleTimeString()
    });

    // 6. Alert confirmation per user specification:
    alert("Payment Successful! Order Sent to KDS & Inventory Deducted");

    // 7. Clear active cart
    if (selectedCustomer && grandTotal > 0) {
      const earned = Math.floor(grandTotal / 10);
      if (earned > 0) {
        api.adjustCustomerPoints({
          customer_id: selectedCustomer.id,
          points_delta: earned,
          reason: `POS Order #${newOrder.order_number}`
        }).catch(err => console.warn('Loyalty points grant error:', err));
      }
    }
    setSelectedCustomer(null);
    setCartItems([]);
    (window as any).cart = [];
    setDiscountType('NONE');
    setCustomDiscountAmount(0);
    setDiscountReason('');
    setOrderNotes('');
    setSelectedCustomer(null);
    setRedeemRewardItem(null);
    setPendingOrderForPayment(null);

    // Show printable receipt modal
    setIsReceiptModalOpen(true);

    // Non-blocking background API sync
    try {
      const token = getAuthToken();
      fetch('/api/pos/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          items: cartItems.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
            modifiers: item.modifiers
          })),
          order_type: orderType,
          discount_amount: calculatedDiscount,
          customer_id: selectedCustomer?.id,
          customer_name: selectedCustomer?.name,
          customer_phone: selectedCustomer?.phone
        })
      }).then(r => r.json()).then(res => {
        if (res && res.order) {
          fetch(`/api/pos/orders/${res.order.id}/pay`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              payment_method: directPaymentMethod,
              amount_received: tendered,
              customer_id: selectedCustomer?.id,
              customer_name: selectedCustomer?.name,
              customer_phone: selectedCustomer?.phone
            })
          }).catch(() => {});
        }
      }).catch(() => {});
    } catch (e) {}
  };

  // Place Order & Open Payment Modal (Direct, No Blocking Validation)
  const handleProceedToPayment = () => {
    if (cartItems.length === 0) {
      alert("Please add items to the cart first.");
      return;
    }
    setDirectCashTendered(grandTotal.toString());
    setIsDirectPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (result: { order: Order; payment: any; receipt: ReceiptData }) => {
    setActiveReceipt(result.receipt);
    setIsReceiptModalOpen(true);

    // Instant Real-Time KDS Routing
    window.dispatchEvent(new CustomEvent('tagpuan:order_paid', { detail: result.order }));
    // Trigger Google Apps Script POST action "createOrder" (saves to IndexedDB/localStorage if offline)
    void googleSheetsPersistence.createOrder(result.order, true);
    try {
      localStorage.setItem('tagpuan_latest_kitchen_order', JSON.stringify({
        timestamp: Date.now(),
        order: result.order
      }));
    } catch (e) {
      console.warn('Could not persist kitchen order event:', e);
    }

    // Trigger confirmation notification toast
    setSuccessToast({
      orderNumber: result.order.order_number,
      orderId: result.order.id,
      total: result.order.total,
      orderType: result.order.order_type || orderType,
      itemCount: result.order.items?.reduce((s, i) => s + i.quantity, 0) || 0,
      timestamp: new Date().toLocaleTimeString()
    });

    // Clear active cart & customer states
    setCartItems([]);
    (window as any).cart = [];
    setDiscountType('NONE');
    setCustomDiscountAmount(0);
    setDiscountReason('');
    setOrderNotes('');
    setSelectedCustomer(null);
    setRedeemRewardItem(null);
    setPendingOrderForPayment(null);

    // Refresh inventory and product stock status
    fetchPOSData();
  };

  const handleOpenReceiptById = async (orderId: string, directReceipt?: ReceiptData) => {
    if (directReceipt) {
      setActiveReceipt(directReceipt);
      setIsReceiptModalOpen(true);
      return;
    }
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/pos/orders/${orderId}/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await response.json();
      if (response.ok && data.receipt) {
        setActiveReceipt(data.receipt);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load order receipt.');
    }
  };

  const handleLoadOrderToCart = (order: Order) => {
    if (!order.items || order.items.length === 0) return;

    const newCartItems: CartItem[] = order.items.map((item, idx) => {
      const foundProduct = products.find(
        (p) => p.id === item.product_id || p.product_name.toLowerCase() === item.product_name.toLowerCase()
      );
      const prod: Product = foundProduct || {
        id: item.product_id || `prod-${idx}`,
        product_code: `ITM-${idx}`,
        product_name: item.product_name,
        description: '',
        selling_price: item.unit_price,
        category: 'SPECIALTY',
        product_image: null,
        is_active: true,
        is_available: true,
        is_sold_out: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const selectedMods: CartItemModifierInput[] = (item.modifiers || []).map((m: any, mIdx: number) => ({
        modifier_id: m.modifier_id || `mod-${mIdx}`,
        modifier_name: m.modifier_name || String(m),
        modifier_group: m.modifier_group || 'ADDON',
        additional_price: typeof m.additional_price === 'number' ? m.additional_price : 0,
        ingredient_id: m.ingredient_id || null,
        quantity_consumed: m.quantity_consumed ?? null,
        unit: m.unit || null
      }));

      return {
        id: `cart-loaded-${idx}-${Date.now()}`,
        product: prod,
        quantity: item.quantity,
        modifiers: selectedMods,
        notes: item.notes || '',
        unitPrice: item.unit_price,
        totalPrice: item.subtotal || item.quantity * item.unit_price
      };
    });

    setCartItems(newCartItems);
    (window as any).cart = newCartItems;
    if (order.order_type) setOrderType(order.order_type === 'TAKE_OUT' ? 'TAKE_OUT' : 'DINE_IN');
    if (order.notes) setOrderNotes(order.notes);
    setCurrentPOSSubView('REGISTER');
  };

  const handleOrderPaidFromHistory = (paidOrder: Order, _payment: any, receipt: ReceiptData) => {
    // 1. Sync inventory in POS state
    const newInv = deductInventoryForOrderItems(paidOrder.items, currentInventoryMap);
    setCurrentInventoryMap(newInv);
    (window as any).inventory = newInv;

    // 2. Dispatch to KDS
    dispatchOrderToKDS(paidOrder);

    // 3. Set active receipt
    setActiveReceipt(receipt);
    setIsReceiptModalOpen(true);

    // 4. Toast notification
    setSuccessToast({
      orderNumber: paidOrder.order_number,
      orderId: paidOrder.id,
      total: paidOrder.total,
      orderType: paidOrder.order_type || orderType,
      itemCount: paidOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0,
      timestamp: new Date().toLocaleTimeString()
    });

    // 5. Background refresh
    fetchPOSData();
  };

  if (currentPOSSubView === 'HISTORY') {
    return (
      <div className="space-y-6">
        <OrderHistoryView
          onBackToPOS={() => setCurrentPOSSubView('REGISTER')}
          onViewReceipt={handleOpenReceiptById}
          branches={branches}
          paymentConfigs={paymentConfigs}
          onLoadOrderToCart={handleLoadOrderToCart}
          onOrderPaid={handleOrderPaidFromHistory}
        />
        {activeReceipt && (
          <ReceiptModal
            receipt={activeReceipt}
            isOpen={isReceiptModalOpen}
            onClose={() => setIsReceiptModalOpen(false)}
            onNewOrder={() => {
              setIsReceiptModalOpen(false);
              setCurrentPOSSubView('REGISTER');
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Realtime Incoming Kiosk Order Alert Banner */}
      {activeKioskNotification && (
        <div className="bg-amber-400 text-zinc-950 px-4 py-3 rounded-2xl border-2 border-amber-500 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-md">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider bg-zinc-950 text-[#CDEBC5] px-2.5 py-0.5 rounded-lg font-mono">
                  🔔 NEW KIOSK ORDER #{activeKioskNotification.order_number}
                </span>
                <span className="text-xs font-black uppercase tracking-wider bg-amber-500/80 text-zinc-950 px-2 py-0.5 rounded-md border border-amber-600">
                  SOURCE: CUSTOMER KIOSK
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-950 mt-1">
                Branch: <strong className="font-bold text-black">{activeKioskNotification.branch_name || currentBranch.name}</strong>
                {' • '}
                Customer: <strong className="font-black text-black">{activeKioskNotification.customer_name || 'Walk-in Guest'}</strong>
                {' • '}
                Total: <strong className="font-black text-black font-mono text-sm">₱{activeKioskNotification.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                {' • '}
                <span className="font-semibold">{activeKioskNotification.items.length} item(s):</span> {activeKioskNotification.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => {
                dismissedKioskOrderIdsRef.current.add(activeKioskNotification.id);
                setPendingOrderForPayment(activeKioskNotification);
                setIsPaymentModalOpen(true);
                setActiveKioskNotification(null);
              }}
              className="px-4 py-2 bg-zinc-950 hover:bg-black text-[#CDEBC5] text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <span>Review & Process Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                dismissedKioskOrderIdsRef.current.add(activeKioskNotification.id);
                setActiveKioskNotification(null);
              }}
              className="p-2 hover:bg-amber-500 rounded-xl text-zinc-900 transition"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Cashier Shift Session Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center font-black">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-[#111111] tracking-tight">Point of Sale Terminal</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#CDEBC5] text-[#111111]">
                Phase 4 Live
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentBranch.name}</span>
              {isOwner && (
                <span className="text-[10px] text-zinc-400 font-mono">({branches.length} Branches Active)</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls & Session Pill */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Owner Branch Selector */}
          {isOwner && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111]"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Cashier Shift Pill */}
          <button
            type="button"
            onClick={() => setIsSessionModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSession && activeSession.status === 'OPEN'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {activeSession && activeSession.status === 'OPEN' ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Shift Open (₱{activeSession.total_sales.toFixed(2)})</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Start Shift Register</span>
              </>
            )}
          </button>

          {/* Orders History Button */}
          <button
            type="button"
            onClick={() => setCurrentPOSSubView('HISTORY')}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200 font-bold text-xs transition flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-zinc-600" />
            <span>Orders Log</span>
          </button>

          {/* Incoming Kiosk Orders Queue Button */}
          <button
            type="button"
            onClick={() => setIsKioskOrdersModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              pendingKioskOrdersCount > 0
                ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-300 shadow-md animate-pulse'
                : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
            }`}
            title="Incoming Self-Ordering Kiosk Orders"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Kiosk Orders</span>
            {pendingKioskOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-purple-700 font-black text-[10px] leading-none">
                {pendingKioskOrdersCount}
              </span>
            )}
          </button>

          {/* KDS Kitchen Monitor Button */}
          <button
            type="button"
            onClick={() => {
              window.open(`/?mode=kds&branch_id=${selectedBranchId}`, '_blank');
            }}
            className="px-3 py-1.5 rounded-xl bg-[#111111] text-[#CDEBC5] hover:bg-black font-bold text-xs transition flex items-center gap-1.5"
            title="Launch Kitchen Display System (KDS) monitor"
          >
            <ChefHat className="w-3.5 h-3.5 text-[#CDEBC5]" />
            <span className="hidden sm:inline">Kitchen (KDS)</span>
          </button>

          {/* Kitchen Orders Call-Out / Prep Status Indicator */}
          <button
            type="button"
            onClick={() => setIsCalloutModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              readyKitchenOrders.length > 0
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300 animate-pulse shadow-md'
                : preparingKitchenCount > 0
                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
            title="Kitchen Order Status & Customer Call-Outs"
          >
            <BellRing className={`w-3.5 h-3.5 ${readyKitchenOrders.length > 0 ? 'text-white animate-bounce' : 'text-zinc-600'}`} />
            <span>
              {readyKitchenOrders.length > 0
                ? `📢 ${readyKitchenOrders.length} Ready to Call-Out`
                : preparingKitchenCount > 0
                ? `🍳 ${preparingKitchenCount} Preparing`
                : 'Kitchen Queue'}
            </span>
          </button>

          {/* Customer Kiosk Mode Button */}
          <button
            type="button"
            id="btn-pos-launch-customer-kiosk"
            onClick={() => {
              const activeBranch = selectedBranchId && selectedBranchId !== 'ALL'
                ? selectedBranchId
                : (branches[0]?.id || 'branch-1');
              window.open(`/?mode=kiosk&branch_id=${activeBranch}`, '_blank');
            }}
            className="px-3 py-1.5 rounded-xl bg-[#CDEBC5] text-[#111111] hover:bg-[#bce0b3] font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            title={`Launch Customer Kiosk for ${currentBranch?.name || selectedBranchId}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customer Kiosk</span>
          </button>

          {/* Payment Gateway Settings (Owner Only) */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsPaymentConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#111111] text-white hover:bg-black font-bold text-xs transition flex items-center gap-1.5"
              title="Configure GCash, Maya, QRPh & Bank Transfer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#CDEBC5]" />
              <span className="hidden sm:inline">QR Gateways</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Call-Out Banner for Cashier */}
      {calloutToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl mb-4 flex items-center justify-between shadow-lg animate-fadeIn border border-emerald-500">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <div className="w-8 h-8 rounded-xl bg-white text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="font-black text-sm uppercase tracking-wide">
                CALL-OUT READY: Order #{calloutToast.orderNumber}
              </span>
              <p className="text-emerald-100 font-normal text-xs mt-0.5">
                {calloutToast.tableNumber ? `Table: ${calloutToast.tableNumber}` : 'Takeout / Counter'}{' '}
                {calloutToast.customerName ? `• Customer: ${calloutToast.customerName}` : ''} is cooked and ready for call-out!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCalloutModalOpen(true);
                setCalloutToast(null);
              }}
              className="px-3.5 py-1.5 bg-white text-emerald-800 rounded-xl text-xs font-black hover:bg-emerald-50 transition cursor-pointer shadow-xs"
            >
              Open Call-Out Board
            </button>
            <button
              type="button"
              onClick={() => setCalloutToast(null)}
              className="p-1.5 hover:bg-emerald-700 rounded-lg text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main POS Interface (Split Grid: Products Catalog Left, Order Cart Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Product Selection (7/12 on lg) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Category Tabs & Search Bar */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-3 sm:p-4 shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search burger, fries, siomai, drinks..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>

            {/* Category Pills (Horizontal scrollable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      isSelected
                        ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 bg-white rounded-2xl border border-zinc-200">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#111111]" />
              <p className="text-xs font-mono">Loading Product Catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 bg-white rounded-2xl border border-zinc-200">
              <p className="text-sm font-bold text-zinc-700">No products matching selection</p>
              <p className="text-xs text-zinc-500 mt-1">Try another category or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const soldOut = isProductSoldOut(product);
                return (
                  <div
                    key={product.id}
                    id={`product-card-${product.id}`}
                    onClick={() => {
                      if (!soldOut) {
                        (window as any).addToCart(product.product_name, product.selling_price, product.id);
                      }
                    }}
                    className={`rounded-2xl border p-3 transition flex flex-col justify-between group relative overflow-hidden ${
                      soldOut
                        ? 'bg-zinc-50 border-zinc-200 opacity-65 cursor-not-allowed'
                        : 'bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Product Image */}
                      <div className="w-full aspect-square rounded-xl bg-zinc-100 mb-2.5 overflow-hidden flex items-center justify-center relative">
                        <img
                          src={getProductImageWithFallback(product.product_image, product.product_name, product.category)}
                          alt={product.product_name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.src = getFoodSvgForProduct(product.product_name, product.category);
                          }}
                          className={`w-full h-full object-cover transition duration-300 ${
                            soldOut ? 'grayscale-50 brightness-75' : 'group-hover:scale-105'
                          }`}
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white font-mono text-[9px] font-bold">
                          {product.product_code || product.code || product.sku || 'ITEM'}
                        </span>

                        {/* Sold Out Banner Overlay */}
                        {soldOut && (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                            <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] tracking-wider uppercase shadow-md">
                              SOLD OUT
                            </span>
                            <span className="text-[10px] text-zinc-200 mt-1 font-semibold leading-tight line-clamp-1">
                              {product.out_of_stock_reason || 'Supply Depleted'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <h3 className={`font-extrabold text-xs leading-snug line-clamp-2 ${soldOut ? 'text-zinc-500' : 'text-zinc-900'}`}>
                        {product.product_name}
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{product.category}</p>
                    </div>

                    {/* Price & Add Action */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100">
                      <span className={`font-black text-sm font-mono ${soldOut ? 'text-zinc-400' : 'text-[#111111]'}`}>
                        ₱{product.selling_price.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        id={`btn-add-${product.id}`}
                        disabled={soldOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!soldOut) {
                            (window as any).addToCart(product.product_name, product.selling_price, product.id);
                          }
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition shadow-xs cursor-pointer ${
                          soldOut
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : 'bg-[#CDEBC5] text-[#111111] hover:bg-[#111111] hover:text-[#CDEBC5] active:scale-95'
                        }`}
                        title={soldOut ? 'Item is sold out' : `Add ${product.product_name} to cart`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Cart & Checkout Panel (5/12 on lg) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col overflow-hidden sticky top-4">
          {/* Cart Header */}
          <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#CDEBC5]" />
              <h2 className="font-extrabold text-sm text-white">Current Order Cart</h2>
              <span className="text-[11px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                {cartItems.reduce((sum, i) => sum + i.quantity, 0)} items
              </span>
            </div>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dining Mode Toggle (Dine-In vs Take-Out) */}
          <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-700">Dining Mode:</span>
            <div className="grid grid-cols-2 gap-1.5 flex-1 max-w-[210px]">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`py-1 px-3 rounded-lg text-xs font-black transition ${
                  orderType === 'DINE_IN'
                    ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Dine In
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TAKE_OUT')}
                className={`py-1 px-3 rounded-lg text-xs font-black transition ${
                  orderType === 'TAKE_OUT'
                    ? 'bg-[#111111] text-[#CDEBC5] shadow-xs'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Take Out
              </button>
            </div>
          </div>

          {/* Customer Loyalty & Dual Capture Strip */}
          <div className="p-3 bg-purple-50/70 border-b border-purple-100 flex flex-col gap-2">
            {selectedCustomer ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    ★
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-black text-purple-950 truncate">
                      {selectedCustomer.customer_name}
                    </p>
                    <p className="text-[10px] text-purple-700 font-mono">
                      {selectedCustomer.phone_number} • <span className="font-bold text-purple-900">{selectedCustomer.current_points} pts</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedCustomer.current_points >= 200 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                      200+ pts Ready
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-[10px] font-semibold text-zinc-400 hover:text-red-600 px-1.5 py-0.5 rounded"
                    title="Detach customer"
                  >
                    Detach
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-purple-900 font-bold">
                  <Award className="w-3.5 h-3.5 text-purple-700" />
                  <span>Loyalty Club:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-register-customer-pos"
                    onClick={() => setIsRegisterCustomerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Register Customer</span>
                  </button>
                  <button
                    type="button"
                    id="btn-attach-customer-pos"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="px-2 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 font-bold text-[11px] transition cursor-pointer"
                  >
                    Attach
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stock Shortfall Warning Alert */}
          {validationShortfall && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ingredient Stock Shortfall</p>
                <p className="text-[11px] mt-0.5">{validationShortfall}</p>
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="p-4 overflow-y-auto max-h-[380px] divide-y divide-zinc-100 flex-1">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-xs font-bold text-zinc-600">Cart is Empty</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Click any product from the catalog to add.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-extrabold text-xs text-zinc-900 leading-snug">
                        {item.product.product_name}
                      </h4>
                      <p className="text-[11px] font-mono text-zinc-500">
                        ₱{item.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                    <span className="font-black font-mono text-xs text-zinc-900">
                      ₱{item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Chosen Modifiers & Notes */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.modifiers.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px] font-medium"
                        >
                          +{m.modifier_name} {m.additional_price > 0 && `(₱${m.additional_price})`}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-[10px] text-zinc-400 italic">Note: {item.notes}</p>
                  )}

                  {/* Quantity & Delete Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs text-zinc-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCartItem(item.id)}
                      className="p-1 rounded text-zinc-400 hover:text-red-600 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount & Order Settings */}
          {cartItems.length > 0 && (
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 space-y-3">
              {/* Discount Selector */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-zinc-500" />
                  <span>Discounts & Promos</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'NONE', label: 'None' },
                    { id: 'SENIOR_PWD', label: 'Senior/PWD (-20%)' },
                    { id: 'PROMO', label: 'Promo (-10%)' },
                    { id: 'CUSTOM', label: 'Custom ₱' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiscountType(d.id)}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition truncate ${
                        discountType === d.id
                          ? 'bg-[#111111] text-[#CDEBC5]'
                          : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {discountType === 'CUSTOM' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Discount ₱"
                      value={customDiscountAmount || ''}
                      onChange={(e) => setCustomDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono bg-white text-zinc-900"
                    />
                    <input
                      type="text"
                      placeholder="Reason (e.g. VIP)"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs bg-white text-zinc-900"
                    />
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Order Note / Table # (e.g. Dine-In Table 4)"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-xs bg-white text-zinc-900 focus:ring-1 focus:ring-[#111111]"
                />
              </div>
            </div>
          )}

          {/* Pricing Summary & Checkout Button */}
          <div className="p-4 bg-zinc-100 border-t border-zinc-200 space-y-2.5">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">₱{subtotal.toFixed(2)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount:</span>
                  <span className="font-mono">-₱{calculatedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-zinc-900 pt-1 border-t border-zinc-200">
                <span>Total Due:</span>
                <span className="font-mono text-lg text-[#111111]">₱{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              id="btn-proceed-payment"
              onClick={() => {
                if ((window as any).proceedToPayment) {
                  (window as any).proceedToPayment();
                } else {
                  handleProceedToPayment();
                }
              }}
              disabled={cartItems.length === 0}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xs ${
                cartItems.length === 0
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-[#CDEBC5] hover:bg-[#bce4b2] text-[#111111] cursor-pointer active:scale-[0.99]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>PROCEED TO PAYMENT (₱{grandTotal.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Cash Payment & Direct KDS Modal */}
      {isDirectPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
                  ₱
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">POS Checkout & KDS Routing</h3>
                  <p className="text-[11px] text-[#CDEBC5]">Cash Register Payment Confirmation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectPaymentModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Total Due Banner */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 font-bold block">Total Amount Due</span>
                  <span className="text-[11px] text-zinc-400">
                    {cartItems.reduce((s, i) => s + i.quantity, 0)} item(s) • {orderType === 'DINE_IN' ? 'Dine-In' : 'Take-Out'}
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-[#111111]">
                  ₱{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash' },
                    { id: 'GCASH', label: 'GCash' },
                    { id: 'CARD', label: 'Card' }
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setDirectPaymentMethod(pm.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        directPaymentMethod === pm.id
                          ? 'bg-[#111111] text-[#CDEBC5] border-[#111111]'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Tendered Input */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Cash Tendered (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-zinc-400">₱</span>
                  <input
                    type="number"
                    id="input-cash-tendered"
                    min={grandTotal}
                    step="any"
                    value={directCashTendered}
                    onChange={(e) => setDirectCashTendered(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 text-lg font-mono font-black focus:ring-2 focus:ring-[#111111] focus:border-[#111111] text-zinc-900 bg-white"
                    placeholder={grandTotal.toFixed(2)}
                  />
                </div>
              </div>

              {/* Quick Cash Presets */}
              <div>
                <span className="text-[11px] font-bold text-zinc-500 block mb-1.5">Quick Presets:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDirectCashTendered(grandTotal.toString())}
                    className="py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold text-zinc-800 transition cursor-pointer"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectCashTendered((Math.ceil(grandTotal / 50) * 50 || grandTotal).toString())}
                    className="py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold text-zinc-800 transition cursor-pointer"
                  >
                    ₱{Math.ceil(grandTotal / 50) * 50 || 50}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectCashTendered((Math.ceil(grandTotal / 100) * 100 || grandTotal).toString())}
                    className="py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold text-zinc-800 transition cursor-pointer"
                  >
                    ₱{Math.ceil(grandTotal / 100) * 100 || 100}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectCashTendered('500')}
                    className="py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold text-zinc-800 transition cursor-pointer"
                  >
                    ₱500
                  </button>
                </div>
              </div>

              {/* Change Display */}
              <div className="p-3 bg-[#CDEBC5]/30 rounded-xl border border-[#CDEBC5] flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800">Change Due:</span>
                <span className="text-lg font-black font-mono text-zinc-900">
                  ₱{Math.max(0, (parseFloat(directCashTendered) || 0) - grandTotal).toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  id="btn-confirm-payment-kds"
                  onClick={() => {
                    const tenderedVal = parseFloat(directCashTendered) || grandTotal;
                    if (tenderedVal < grandTotal) {
                      alert(`Cash tendered (₱${tenderedVal.toFixed(2)}) is less than total due (₱${grandTotal.toFixed(2)})`);
                      return;
                    }
                    executeConfirmPayment(tenderedVal);
                  }}
                  className="w-full py-3.5 bg-[#CDEBC5] hover:bg-[#bce4b2] text-[#111111] font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment & Send to KDS</span>
                </button>

                <button
                  type="button"
                  id="btn-quick-confirm"
                  onClick={() => {
                    if (window.confirm(`Confirm payment of ₱${grandTotal.toFixed(2)} for ${cartItems.length} item(s)?`)) {
                      executeConfirmPayment(grandTotal);
                    }
                  }}
                  className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition text-center cursor-pointer"
                >
                  ⚡ Quick Browser Confirm (Exact ₱{grandTotal.toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals Container */}
      {customizingProduct && (
        <ProductModifierModal
          product={customizingProduct}
          modifierGroups={modifierGroups}
          isOpen={isModifierModalOpen}
          onClose={() => {
            setIsModifierModalOpen(false);
            setCustomizingProduct(null);
          }}
          onConfirm={(prod, qty, mods, notes) => {
            addItemToCart(prod, qty, mods, notes);
          }}
        />
      )}

      {pendingOrderForPayment && (
        <PaymentModal
          order={pendingOrderForPayment}
          paymentConfigs={paymentConfigs}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onNewOrder={() => {
            setIsReceiptModalOpen(false);
          }}
        />
      )}

      <CashierSessionModal
        session={activeSession}
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        onSessionChange={fetchPOSData}
        branchId={selectedBranchId}
        branchName={currentBranch.name}
      />

      <PaymentConfigModal
        configs={paymentConfigs}
        isOpen={isPaymentConfigModalOpen}
        onClose={() => setIsPaymentConfigModalOpen(false)}
        onRefresh={fetchPOSData}
      />

      <IncomingKioskOrdersModal
        isOpen={isKioskOrdersModalOpen}
        onClose={() => setIsKioskOrdersModalOpen(false)}
        branchId={selectedBranchId}
        branchName={currentBranch.name}
        onSelectOrderForPayment={order => {
          setPendingOrderForPayment(order);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Manual Customer Registration Modal (POS) */}
      {isRegisterCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
            <div className="bg-[#111111] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Enroll Loyalty Customer</h3>
                  <p className="text-[11px] text-purple-200">Manual Dual Capture (Tagpuan Club)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterCustomerOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterCustomerFromPOS} className="p-5 space-y-3.5">
              {regCustomerError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{regCustomerError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={regCustomerName}
                  onChange={(e) => setRegCustomerName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={regCustomerPhone}
                  onChange={(e) => setRegCustomerPhone(e.target.value)}
                  placeholder="09171234567"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">Used for kiosk self-ordering and points lookup.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={regCustomerEmail}
                  onChange={(e) => setRegCustomerEmail(e.target.value)}
                  placeholder="juan@example.com"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 bg-white focus:ring-2 focus:ring-[#111111] outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-[11px] text-purple-900">
                ⭐ Earns 1 Point for every ₱10 spent. Free meal reward unlocked at 200 points!
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regCustomerSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{regCustomerSubmitting ? 'Registering...' : 'Register & Attach to Cart'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Member Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <h3 className="font-extrabold text-sm text-white">Attach Loyalty Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-100">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchText}
                  onChange={(e) => setCustomerSearchText(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-xs bg-white text-zinc-900 outline-none focus:ring-2 focus:ring-[#111111]"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-zinc-100 flex-1">
              {loyaltyCustomers
                .filter(c => {
                  const q = customerSearchText.toLowerCase().trim();
                  return !q || c.customer_name.toLowerCase().includes(q) || c.phone_number.includes(q);
                })
                .map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setIsCustomerModalOpen(false);
                      setCustomerSearchText('');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl hover:bg-purple-50 flex items-center justify-between text-left transition cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{c.customer_name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{c.phone_number}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-xs text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full">
                        {c.current_points} pts
                      </span>
                      {c.current_points >= 200 && (
                        <span className="block text-[9px] font-bold text-emerald-600 mt-0.5">
                          Eligible for Free Meal!
                        </span>
                      )}
                    </div>
                  </button>
                ))}

              {loyaltyCustomers.length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No loyalty members found. Click "+ Register Customer" to enroll.
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  setIsRegisterCustomerOpen(true);
                }}
                className="text-xs font-bold text-purple-800 hover:text-purple-950 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Register New Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-3 py-1 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Order Paid & Routed Toast Banner */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#111111] text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-start gap-3 animate-slideUp">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-[#111111] flex items-center justify-center font-black shrink-0 shadow-sm">
            <Check className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-emerald-400 uppercase tracking-wider">
                Order Confirmed & Routed to KDS
              </h4>
              <button
                type="button"
                onClick={() => setSuccessToast(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm font-extrabold text-white mt-0.5">
              Order #{successToast.orderNumber}
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {successToast.orderType === 'TAKE_OUT' ? 'Take Out' : 'Dine In'}
              </span>
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
              <span className="text-emerald-400 font-bold">₱{successToast.total.toFixed(2)}</span>
              <span>•</span>
              <span>{successToast.itemCount} items</span>
              <span>•</span>
              <span className="text-zinc-300">Stock Deducted</span>
            </div>
          </div>
        </div>
      )}

      {/* Sold Out Notice Toast */}
      {soldOutNotice && (
        <div className="fixed top-20 right-6 z-50 max-w-md bg-zinc-900 text-white p-3.5 rounded-2xl shadow-2xl border border-rose-500 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-black text-xs text-rose-400 uppercase tracking-wider">Item Unavailable</h5>
            <p className="text-xs text-zinc-200 mt-0.5">{soldOutNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setSoldOutNotice(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-Time Kitchen Call-Out & Prep Status Modal */}
      {isCalloutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#111111] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
                  <BellRing className="w-5 h-5 text-[#111111]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Kitchen Orders & Call-Out Board</h3>
                  <p className="text-[11px] text-[#CDEBC5]">
                    {readyKitchenOrders.length} Ready for Call-Out • {preparingKitchenCount} Preparing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCalloutModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Ready Orders Section (Priority) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase font-mono tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ready for Call-Out ({readyKitchenOrders.length})
                  </h4>
                  <span className="text-[11px] text-zinc-500">Call out to customer for counter pickup or table delivery</span>
                </div>

                {readyKitchenOrders.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-500 text-xs">
                    No orders currently waiting for call-out.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {readyKitchenOrders.map(order => (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 flex flex-col justify-between space-y-3 shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-base font-black font-mono text-zinc-950">
                              TICKET #{order.order_number}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-600 text-white">
                              READY
                            </span>
                          </div>

                          <div className="text-xs font-bold text-zinc-800">
                            {order.table_number ? (
                              <span className="text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded font-black">
                                🍽️ {order.table_number.toLowerCase().startsWith('table') ? order.table_number : `Table ${order.table_number}`}
                              </span>
                            ) : (
                              <span className="text-zinc-700 bg-zinc-200/80 px-2 py-0.5 rounded font-bold">
                                📦 Takeout / Counter
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-extrabold text-emerald-950 mt-1">
                            Customer: {order.customer_name || 'Walk-in / Counter'}
                          </p>

                          <div className="mt-2 text-xs text-zinc-700 font-medium space-y-0.5 border-t border-emerald-200/60 pt-1.5">
                            {order.items?.map((it, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>{it.quantity}x {it.product_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const token = getAuthToken();
                              await fetch(`/api/kds/orders/${order.id}/deliver`, {
                                method: 'POST',
                                headers: token ? { Authorization: `Bearer ${token}` } : {}
                              });
                              window.dispatchEvent(new CustomEvent('tagpuan:kds_order_updated', {
                                detail: { orderId: order.id, orderNumber: order.order_number, status: 'DELIVERED' }
                              }));
                              fetchKitchenOrders();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="w-full py-2.5 px-3 bg-[#111111] hover:bg-black text-[#CDEBC5] text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="w-4 h-4 text-[#CDEBC5]" />
                          <span>Handoff Complete / Served</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cooking / In Preparation Section */}
              <div className="pt-2 border-t border-zinc-200">
                <h4 className="text-xs font-black uppercase font-mono tracking-wider text-amber-800 flex items-center gap-1.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  In Preparation / Kitchen Cooking ({preparingKitchenCount})
                </h4>

                {preparingKitchenCount === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-400 text-xs">
                    No orders currently cooking in the kitchen.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kitchenOrders
                      .filter(o => o.kitchen_status === 'PREPARING')
                      .map(order => (
                        <div
                          key={order.id}
                          className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-zinc-900">
                              #{order.order_number}
                            </span>
                            <span className="font-medium text-zinc-700">
                              {order.table_number || 'Takeout / Counter'}
                            </span>
                            <span className="text-zinc-500">
                              {order.items?.length || 0} items
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-200 text-amber-900">
                            COOKING IN PROGRESS
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCalloutModalOpen(false)}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
