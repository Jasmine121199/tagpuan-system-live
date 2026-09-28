import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  SlidersHorizontal,
  History,
  ChefHat,
  Play,
  Layers,
  Building2,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  Zap,
  Info,
  UtensilsCrossed
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { DailyIngredientUsagePanel } from './DailyIngredientUsagePanel';
import {
  Branch,
  BranchInventory,
  InventoryTransaction,
  InventoryLowStockEvent,
  Product,
  Ingredient,
  DeductionValidationResult
} from '../../types/index';

export const InventoryManagementView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'lowstock' | 'deduction' | 'usage'>('stock');

  // Master Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [inventoryList, setInventoryList] = useState<BranchInventory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [lowStockEvents, setLowStockEvents] = useState<InventoryLowStockEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<BranchInventory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Helper: Calculate Equivalent Servings for Tagpuan Food Hub Items
  const calculateEquivalentServings = (ingredientName: string, unit: string, stock: number): number => {
    const name = (ingredientName || '').toLowerCase();
    const current = Math.max(0, stock || 0);

    if (name.includes('siomai')) {
      return Math.floor(current / 4); // 4 pcs per Siomai order
    }
    if (name.includes('shanghai')) {
      return Math.floor(current / 4); // 4 pcs per Shanghai order
    }
    if (name.includes('fries') || name.includes('french fries')) {
      return Math.floor(current / 0.1); // 100g (0.1kg) per serving
    }
    if (name.includes('rice')) {
      return Math.floor(current / 0.1); // 100g per cup cooked rice
    }
    if (unit.toLowerCase() === 'gal' || name.includes('ketchup') || name.includes('mayo')) {
      return Math.floor(current / 0.01); // 100 servings per gal
    }
    if (unit.toLowerCase() === 'packs') {
      return Math.floor(current * 20); // ~20 servings per pack
    }
    if (unit.toLowerCase() === 'bottle' && (name.includes('oil') || name.includes('liquid') || name.includes('toyomansi'))) {
      return Math.floor(current * 25);
    }

    // Patties, hotdogs, chicken fillet, breads, egg, meatloaf, OK cheese, soft drinks, packaging: 1 pc = 1 serving
    return Math.floor(current);
  };

  // Helper: Color-Coded Alert: Green (>15), Orange/Low Stock (1-15), Red/Out of Stock (0)
  const getServingsAlert = (servings: number) => {
    if (servings > 15) {
      return {
        type: 'HEALTHY',
        text: `${servings} Servings (Healthy)`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
        dotClass: 'bg-emerald-500'
      };
    }
    if (servings >= 1) {
      return {
        type: 'LOW_STOCK',
        text: `${servings} Servings (Low Stock)`,
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
        dotClass: 'bg-amber-500'
      };
    }
    return {
      type: 'OUT_OF_STOCK',
      text: '0 Servings (Out of Stock)',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      dotClass: 'bg-rose-500'
    };
  };

  // Form States
  const [stockInForm, setStockInForm] = useState<{
    branch_id: string;
    ingredient_id: string;
    quantity: number | string;
    reason: string;
  }>({
    branch_id: '',
    ingredient_id: '',
    quantity: 10,
    reason: 'Regular Supplier Delivery'
  });

  const [adjustForm, setAdjustForm] = useState<{
    branch_id: string;
    ingredient_id: string;
    new_stock: number | string;
    reason: string;
  }>({
    branch_id: '',
    ingredient_id: '',
    new_stock: 0,
    reason: 'Physical Count Reconciliation'
  });

  const [rejectForm, setRejectForm] = useState({
    branch_id: '',
    ingredient_id: '',
    rejected_quantity: 1,
    reason: 'Damaged packaging upon receipt'
  });

  const [configForm, setConfigForm] = useState({
    cost_price: 0,
    reorder_level: 10,
    maximum_stock: 100,
    unit: 'pcs'
  });

  // Deduction Engine Simulator
  const [deductionBranchId, setDeductionBranchId] = useState<string>('');
  const [deductionProductId, setDeductionProductId] = useState<string>('');
  const [deductionQuantity, setDeductionQuantity] = useState<number>(1);
  const [validationResult, setValidationResult] = useState<DeductionValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isDeducting, setIsDeducting] = useState<boolean>(false);

  // Initial Load
  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [branchesData, prodsData, ingsData] = await Promise.all([
        api.getBranches(),
        api.getProducts(),
        api.getIngredients()
      ]);

      setBranches(branchesData);
      setProducts(prodsData);
      setIngredients(ingsData);

      let defaultBranch = '';
      if (isManager && user?.branch_id) {
        defaultBranch = user.branch_id;
      } else if (branchesData.length > 0) {
        defaultBranch = branchesData[0].id;
      }

      setSelectedBranchId(defaultBranch);
      setDeductionBranchId(defaultBranch);
      if (prodsData.length > 0) {
        setDeductionProductId(prodsData[0].id);
      }

      await loadBranchData(defaultBranch);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize inventory data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranchData = async (branchId: string) => {
    try {
      setIsLoading(true);
      const [invData, txData, lsData] = await Promise.all([
        api.getBranchInventory({ branch_id: branchId }),
        api.getInventoryTransactions({ branch_id: branchId }),
        api.getLowStockEvents({ branch_id: branchId })
      ]);
      setInventoryList(invData);
      setTransactions(txData);
      setLowStockEvents(lsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load branch inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Helper to safely resolve active branch ID
  const resolveActiveBranchId = (candidate?: string): string => {
    if (candidate && candidate !== 'ALL' && branches.some(b => b.id === candidate)) {
      return candidate;
    }
    if (selectedBranchId && selectedBranchId !== 'ALL' && branches.some(b => b.id === selectedBranchId)) {
      return selectedBranchId;
    }
    if (user?.branch_id && branches.some(b => b.id === user.branch_id)) {
      return user.branch_id;
    }
    if (branches.length > 0) {
      return branches[0].id;
    }
    return '';
  };

  const handleBranchChange = (newBranchId: string) => {
    console.log('[InventoryView] Switching branch view to:', newBranchId);
    setSelectedBranchId(newBranchId);
    setDeductionBranchId(newBranchId);
    setValidationResult(null);
    loadBranchData(newBranchId);
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // --- Handlers: Stock In ---
  const handleOpenStockIn = (item?: BranchInventory) => {
    console.log('[InventoryView] 🟢 Stock In button clicked. Candidate item:', item);
    const targetBranch = resolveActiveBranchId(item?.branch_id) || selectedBranchId || user?.branch_id || (branches[0]?.id || '');
    const targetIngId = item ? item.ingredient_id : (ingredients[0]?.id || '');

    console.log('[InventoryView] Resolved targetBranch:', targetBranch, 'targetIngId:', targetIngId);

    if (!selectedBranchId && targetBranch) {
      setSelectedBranchId(targetBranch);
    }

    const foundItem = item || inventoryList.find(i => i.ingredient_id === targetIngId && i.branch_id === targetBranch) || null;
    setSelectedInventoryItem(foundItem);

    setStockInForm({
      branch_id: targetBranch,
      ingredient_id: targetIngId,
      quantity: 10,
      reason: 'Regular Supplier Delivery'
    });
    setModalError(null);
    setIsStockInModalOpen(true);
  };

  const handleExecuteStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    console.log('[InventoryView] 🚀 handleExecuteStockIn submitted:', stockInForm);

    const activeBranch = resolveActiveBranchId(stockInForm.branch_id) || selectedBranchId || user?.branch_id || (branches[0]?.id || '');
    const activeIng = stockInForm.ingredient_id || (ingredients[0]?.id || '');
    const qty = parseFloat(String(stockInForm.quantity));

    if (!activeBranch) {
      setModalError('Please select or specify a valid branch for Stock In.');
      return;
    }
    if (!activeIng) {
      setModalError('Please select a target ingredient.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setModalError('Please enter a valid positive quantity greater than 0.');
      return;
    }

    const payload = {
      branch_id: activeBranch,
      ingredient_id: activeIng,
      quantity: qty,
      reason: stockInForm.reason?.trim() || 'Regular Supplier Delivery'
    };

    try {
      setIsSubmitting(true);
      setError(null);
      setModalError(null);
      console.log('[InventoryView] Sending Stock In API payload:', payload);
      const res = await api.stockIn(payload);
      console.log('[InventoryView] Stock In API response:', res);

      // Instant optimistic UI update
      if (res?.inventory) {
        setInventoryList(prev => {
          const matchIndex = prev.findIndex(
            i => i.ingredient_id === res.inventory.ingredient_id && i.branch_id === res.inventory.branch_id
          );
          if (matchIndex >= 0) {
            const next = [...prev];
            next[matchIndex] = res.inventory;
            return next;
          }
          return [res.inventory, ...prev];
        });
      }

      setIsStockInModalOpen(false);
      showNotification(`✅ Stock In of ${qty} units completed successfully!`);
      await loadBranchData(activeBranch);
    } catch (err: any) {
      console.error('[InventoryView] Stock In failed:', err);
      setModalError(err.message || 'Stock In failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Adjust Stock ---
  const handleOpenAdjust = (item?: BranchInventory) => {
    console.log('[InventoryView] 🟡 Adjust Stock button clicked. Candidate item:', item);
    const targetBranch = resolveActiveBranchId(item?.branch_id);
    const targetIngId = item ? item.ingredient_id : (ingredients[0]?.id || '');

    console.log('[InventoryView] Resolved targetBranch:', targetBranch, 'targetIngId:', targetIngId);

    if (!selectedBranchId && targetBranch) {
      setSelectedBranchId(targetBranch);
    }

    const foundItem = item || inventoryList.find(i => i.ingredient_id === targetIngId && i.branch_id === targetBranch) || null;
    setSelectedInventoryItem(foundItem);

    setAdjustForm({
      branch_id: targetBranch,
      ingredient_id: targetIngId,
      new_stock: foundItem ? foundItem.current_stock : 0,
      reason: 'Physical Count Reconciliation'
    });
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[InventoryView] 🚀 handleExecuteAdjust submitted:', adjustForm);

    const activeBranch = resolveActiveBranchId(adjustForm.branch_id);
    const activeIng = adjustForm.ingredient_id || (selectedInventoryItem ? selectedInventoryItem.ingredient_id : ingredients[0]?.id);
    const newStock = Number(adjustForm.new_stock);

    if (!activeBranch) {
      setError('Please select or specify a valid branch for Stock Adjustment.');
      return;
    }
    if (!activeIng) {
      setError('Please select an ingredient to adjust.');
      return;
    }
    if (isNaN(newStock) || newStock < 0) {
      setError('Adjusted stock quantity cannot be negative.');
      return;
    }
    if (!adjustForm.reason || adjustForm.reason.trim().length < 3) {
      setError('A mandatory adjustment reason is required (at least 3 characters).');
      return;
    }

    const payload = {
      branch_id: activeBranch,
      ingredient_id: activeIng,
      new_stock: newStock,
      reason: adjustForm.reason.trim()
    };

    try {
      setIsSubmitting(true);
      setError(null);
      console.log('[InventoryView] Sending Stock Adjustment API payload:', payload);
      const res = await api.adjustStock(payload);
      console.log('[InventoryView] Stock Adjustment API response:', res);

      // Instant optimistic UI update
      if (res?.inventory) {
        setInventoryList(prev => {
          const matchIndex = prev.findIndex(
            i => i.ingredient_id === res.inventory.ingredient_id && i.branch_id === res.inventory.branch_id
          );
          if (matchIndex >= 0) {
            const next = [...prev];
            next[matchIndex] = res.inventory;
            return next;
          }
          return [res.inventory, ...prev];
        });
      }

      setIsAdjustModalOpen(false);
      showNotification(`✅ Stock adjusted to ${newStock} units successfully!`);
      await loadBranchData(activeBranch);
    } catch (err: any) {
      console.error('[InventoryView] Stock Adjustment failed:', err);
      setError(err.message || 'Stock adjustment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Reject Stock ---
  const handleOpenReject = (item: BranchInventory) => {
    console.log('[InventoryView] 🔴 Reject Stock clicked. Item:', item);
    setSelectedInventoryItem(item);
    setRejectForm({
      branch_id: item.branch_id,
      ingredient_id: item.ingredient_id,
      rejected_quantity: 1,
      reason: 'Damaged packaging upon delivery'
    });
    setIsRejectModalOpen(true);
  };

  const handleExecuteReject = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[InventoryView] 🚀 handleExecuteReject submitted:', rejectForm);
    try {
      setIsSubmitting(true);
      setError(null);
      await api.recordRejectedStock(rejectForm);
      setIsRejectModalOpen(false);
      showNotification(`Rejection of ${rejectForm.rejected_quantity} units logged.`);
      loadBranchData(selectedBranchId);
    } catch (err: any) {
      console.error('[InventoryView] Stock rejection failed:', err);
      setError(err.message || 'Stock rejection logging failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Config ---
  const handleOpenConfig = (item: BranchInventory) => {
    setSelectedInventoryItem(item);
    setConfigForm({
      cost_price: item.cost_price,
      reorder_level: item.reorder_level,
      maximum_stock: item.maximum_stock,
      unit: item.unit
    });
    setIsConfigModalOpen(true);
  };

  const handleExecuteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryItem) return;
    try {
      setError(null);
      await api.updateInventoryConfig(selectedInventoryItem.id, configForm);
      setIsConfigModalOpen(false);
      showNotification(`Item inventory configuration updated.`);
      loadBranchData(selectedBranchId);
    } catch (err: any) {
      setError(err.message || 'Config update failed.');
    }
  };

  // --- Handlers: Low Stock Event Resolve ---
  const handleResolveEvent = async (eventId: string) => {
    try {
      await api.resolveLowStockEvent(eventId);
      showNotification(`Low stock alert marked as resolved.`);
      loadBranchData(selectedBranchId);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve low stock alert.');
    }
  };

  // --- Handlers: Recipe Deduction Engine Simulator ---
  const handleValidateDeduction = async () => {
    if (!deductionBranchId || !deductionProductId || deductionQuantity <= 0) return;
    try {
      setIsValidating(true);
      setError(null);
      const res = await api.validateProductDeduction({
        branch_id: deductionBranchId,
        product_id: deductionProductId,
        order_quantity: deductionQuantity
      });
      setValidationResult(res);
    } catch (err: any) {
      setError(err.message || 'Validation failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteDeduction = async () => {
    if (!deductionBranchId || !deductionProductId || deductionQuantity <= 0) return;
    try {
      setIsDeducting(true);
      setError(null);
      const selectedProd = products.find(p => p.id === deductionProductId);
      const res = await api.deductProductInventory({
        branch_id: deductionBranchId,
        product_id: deductionProductId,
        order_quantity: deductionQuantity,
        reason: `POS Sale Order: ${deductionQuantity}x ${selectedProd?.product_name || 'Product'}`
      });

      showNotification(`Deduction executed atomically! ${res.transactions.length} ingredient stocks updated.`);
      setValidationResult(null);
      loadBranchData(selectedBranchId);
    } catch (err: any) {
      setError(err.message || 'Atomic deduction failed.');
    } finally {
      setIsDeducting(false);
    }
  };

  // Summary Metrics for current view
  const totalItems = inventoryList.length;
  const inStockCount = inventoryList.filter(i => i.status === 'IN_STOCK').length;
  const lowStockCount = inventoryList.filter(i => i.status === 'LOW_STOCK').length;
  const outOfStockCount = inventoryList.filter(i => i.status === 'OUT_OF_STOCK').length;
  const totalValuation = inventoryList.reduce((acc, item) => acc + (item.current_stock * item.cost_price), 0);

  // Filtered inventory list
  const filteredInventory = inventoryList.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.ingredient_name?.toLowerCase().includes(q) ||
        item.item_code?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const currentBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'Selected Branch';

  if (!isOwner && !isManager) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white border border-amber-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-zinc-900">Role-Restricted Stock Visibility</h2>
          <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
            Live stock quantities, inventory thresholds, and remaining portions are strictly restricted to <span className="text-zinc-900 font-bold">Master Owners</span> and <span className="text-zinc-900 font-bold">Branch Managers</span>.
          </p>
          <div className="pt-2">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              Current Role: {user?.role || 'STAFF'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-mono font-black rounded-lg bg-[#CDEBC5] text-[#111111]">
              PHASE 3
            </span>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">
              Branch Inventory & Stock Movements
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
            Real-time branch inventory monitoring, stock movements (Stock In, Adjust, Reject), automated low-stock triggers, and atomic recipe ingredient deduction engine.
          </p>
        </div>

        {/* Branch Selector or Manager Badge */}
        <div className="flex items-center gap-3">
          {isOwner ? (
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Building2 className="w-4 h-4 text-zinc-500" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold uppercase text-zinc-400">Viewing Branch</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="bg-transparent text-xs font-black text-zinc-900 focus:outline-none cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2">
              <Building2 className="w-4 h-4 text-zinc-600" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold uppercase text-zinc-400">Assigned Branch</span>
                <span className="text-xs font-black text-zinc-900">{currentBranchName}</span>
              </div>
            </div>
          )}

          {(isOwner || isManager) && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenStockIn()}
                id="btn-stock-in-header"
                className="px-4 py-2.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#CDEBC5]" />
                <span>Stock In</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdjust()}
                id="btn-adjust-stock-header"
                className="px-3.5 py-2.5 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
                <span>Adjust Stock</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Tracked Items</span>
          <p className="text-xl font-black text-zinc-900 mt-1">{totalItems}</p>
          <span className="text-[10px] text-zinc-500">{currentBranchName}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-emerald-600">In Stock</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{inStockCount}</p>
          <span className="text-[10px] text-zinc-500">Above reorder level</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
          <span className="text-[10px] font-mono font-bold uppercase text-amber-700">Low Stock Alert</span>
          <p className="text-xl font-black text-amber-700 mt-1">{lowStockCount}</p>
          <span className="text-[10px] text-amber-800">Requires replenish</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
          <span className="text-[10px] font-mono font-bold uppercase text-rose-700">Out of Stock</span>
          <p className="text-xl font-black text-rose-700 mt-1">{outOfStockCount}</p>
          <span className="text-[10px] text-rose-800">0 remaining stock</span>
        </div>

        <div className="bg-zinc-900 p-4 rounded-xl shadow-sm text-white col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono font-bold uppercase text-[#CDEBC5]">Est. Stock Value</span>
          <p className="text-lg font-black text-white mt-1">
            ₱{totalValuation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-zinc-400">At ingredient cost</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stock')}
            id="tab-stock"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'stock'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Branch Stock Levels ({inventoryList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            id="tab-movements"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'movements'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Ledger ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lowstock')}
            id="tab-lowstock"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'lowstock'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Low Stock Incidents ({lowStockEvents.filter(e => e.status === 'OPEN').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deduction')}
            id="tab-deduction"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'deduction'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Zap className="w-4 h-4 text-[#CDEBC5]" />
            <span>Recipe Deduction Engine & POS Simulation</span>
          </button>

          <button
            onClick={() => setActiveTab('usage')}
            id="tab-usage-audit"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'usage'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
            <span>Today's Ingredient Deductions & Usage</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BRANCH STOCK LEVELS */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ingredients, codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CDEBC5] text-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-zinc-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-800">
                <thead className="bg-zinc-100 text-[10px] font-mono font-bold uppercase text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Ingredient Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Current Stock</th>
                    <th className="py-3.5 px-4 text-center">Equivalent Servings</th>
                    <th className="py-3.5 px-4 text-right">Reorder Point</th>
                    <th className="py-3.5 px-4 text-right">Max Stock</th>
                    <th className="py-3.5 px-4 text-right">Unit Cost</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    {(isOwner || isManager) && <th className="py-3.5 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-zinc-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                        Loading stock levels...
                      </td>
                    </tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-zinc-400">
                        No inventory records found.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const isLow = item.current_stock <= item.reorder_level && item.current_stock > 0;
                      const isOut = item.current_stock <= 0;
                      const servings = calculateEquivalentServings(item.ingredient_name, item.unit, item.current_stock);
                      const alert = getServingsAlert(servings);

                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                            {item.item_code}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-zinc-900">
                            {item.ingredient_name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-mono text-sm font-black text-zinc-900">
                              <span className={`${
                                isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-zinc-900'
                              }`}>
                                {item.current_stock}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono ml-1">{item.unit}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide inline-flex items-center gap-1.5 shadow-2xs ${alert.badgeClass}`}>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${alert.dotClass}`} />
                              <span>{alert.text}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-600">
                            {item.reorder_level} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-600">
                            {item.maximum_stock} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900">
                            ₱{item.cost_price.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                              item.status === 'IN_STOCK'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'LOW_STOCK'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.status === 'IN_STOCK' && <CheckCircle2 className="w-3 h-3" />}
                              {item.status === 'LOW_STOCK' && <AlertTriangle className="w-3 h-3" />}
                              {item.status === 'OUT_OF_STOCK' && <XCircle className="w-3 h-3" />}
                              <span>{item.status.replace('_', ' ')}</span>
                            </span>
                          </td>

                          {(isOwner || isManager) && (
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenStockIn(item);
                                  }}
                                  title={`Stock In ${item.ingredient_name}`}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 text-emerald-600" />
                                  Stock In
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAdjust(item);
                                  }}
                                  title={`Adjust Stock for ${item.ingredient_name}`}
                                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded font-bold text-[10px] transition cursor-pointer"
                                >
                                  Adjust
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenReject(item);
                                  }}
                                  title={`Record Spoilage / Reject for ${item.ingredient_name}`}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[10px] transition cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenConfig(item);
                                  }}
                                  title="Configure Thresholds"
                                  className="p-1 hover:bg-zinc-200 text-zinc-600 rounded transition cursor-pointer"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK LEDGER */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Authoritative Inventory Transaction Ledger
              </h3>
              <p className="text-xs text-zinc-500">
                Every stock delta (Stock In, Rejection, Count Adjustment, Recipe Sales Deduction) is permanently logged.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-600">
              {transactions.length} Transactions Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800">
              <thead className="bg-zinc-100 text-[10px] font-mono font-bold uppercase text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4 text-right">Delta</th>
                  <th className="py-3 px-4 text-right">Before → After</th>
                  <th className="py-3 px-4">Reason / Order Details</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No stock transactions recorded yet for this branch.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isPositive = tx.quantity > 0 && tx.transaction_type !== 'REJECT';
                    return (
                      <tr key={tx.id} className="hover:bg-zinc-50/80 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                          {new Date(tx.created_at).toLocaleString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            tx.transaction_type === 'STOCK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.transaction_type === 'RECIPE_DEDUCTION'
                              ? 'bg-blue-100 text-blue-800'
                              : tx.transaction_type === 'REJECT'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {tx.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-900">
                          {tx.ingredient_name || tx.ingredient_id}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black">
                          <span className={tx.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-600">
                          {tx.previous_stock} → <strong className="text-zinc-900">{tx.new_stock}</strong>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                          {tx.reason || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">
                          {tx.user_email || tx.user_id || 'SYSTEM'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOW STOCK EVENTS */}
      {activeTab === 'lowstock' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Automated Low Stock Incident Log
              </h3>
              <p className="text-xs text-zinc-500">
                Triggered automatically when branch current stock drops to or below the reorder threshold.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-700">
              {lowStockEvents.filter(e => e.status === 'OPEN').length} Open Incidents
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-800">
              <thead className="bg-zinc-100 text-[10px] font-mono font-bold uppercase text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4 text-right">Recorded Level</th>
                  <th className="py-3 px-4 text-right">Reorder Threshold</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {lowStockEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      No low stock incidents recorded for this branch. Stock levels are healthy!
                    </td>
                  </tr>
                ) : (
                  lowStockEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-zinc-50/80 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                        {new Date(evt.created_at).toLocaleString('en-PH')}
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-900">
                        {evt.ingredient_name || evt.ingredient_id}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                        {evt.current_stock} {evt.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-600">
                        {evt.reorder_level} {evt.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          evt.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {evt.status === 'OPEN' ? (
                          <button
                            onClick={() => handleResolveEvent(evt.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Resolved {evt.resolved_at ? new Date(evt.resolved_at).toLocaleTimeString() : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RECIPE DEDUCTION ENGINE SIMULATOR */}
      {activeTab === 'deduction' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulator Controls */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center font-black">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                  Recipe Deduction Test Engine
                </h3>
                <p className="text-xs text-zinc-500 font-mono">
                  Atomic multi-ingredient deduction verification
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 space-y-1">
              <p className="font-bold text-zinc-900">Key Rule Tested:</p>
              <p>
                Selling a product does <strong>NOT</strong> deduct 1 product from inventory. It resolves the product's recipe and atomically deducts all required ingredient quantities. If any single ingredient is insufficient, the transaction fails completely without partial deductions.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Target Branch</label>
                <select
                  disabled={!isOwner}
                  value={deductionBranchId}
                  onChange={(e) => {
                    setDeductionBranchId(e.target.value);
                    setValidationResult(null);
                  }}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-zinc-900"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Sellable Product</label>
                <select
                  value={deductionProductId}
                  onChange={(e) => {
                    setDeductionProductId(e.target.value);
                    setValidationResult(null);
                  }}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-zinc-900"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.product_code}) - ₱{p.selling_price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Order Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={deductionQuantity}
                  onChange={(e) => {
                    setDeductionQuantity(parseInt(e.target.value) || 1);
                    setValidationResult(null);
                  }}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleValidateDeduction}
                  disabled={isValidating}
                  className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Search className="w-4 h-4" />
                  <span>{isValidating ? 'Checking...' : '1. Validate Stock'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDeduction}
                  disabled={isDeducting || (validationResult !== null && !validationResult.valid)}
                  className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition ${
                    validationResult && !validationResult.valid
                      ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      : 'bg-[#111111] hover:bg-black text-white'
                  }`}
                >
                  <Play className="w-4 h-4 text-[#CDEBC5]" />
                  <span>{isDeducting ? 'Deducting...' : '2. Execute Deduction'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Validation Results Workbench */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-3">
                Recipe Breakdown & Stock Sufficiency Pre-Check
              </h4>

              {!validationResult ? (
                <div className="py-16 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                  <ChefHat className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                  Select a product and click <strong>"1. Validate Stock"</strong> to inspect how the recipe resolves into required raw ingredient deductions.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    validationResult.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {validationResult.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h5 className="font-bold text-xs">
                        {validationResult.valid
                          ? 'Stock Available: All Recipe Ingredients Satisfied'
                          : 'Stock Insufficient: Atomic Deduction Blocked'}
                      </h5>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        {validationResult.valid
                          ? `Branch has sufficient inventory to fulfill ${validationResult.order_quantity}x ${validationResult.product_name}.`
                          : validationResult.error_message}
                      </p>
                    </div>
                  </div>

                  {/* Component Breakdown Table */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 text-[10px] font-mono font-bold uppercase text-zinc-500 border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-3">Ingredient</th>
                          <th className="py-2.5 px-3 text-right">Required</th>
                          <th className="py-2.5 px-3 text-right">Available</th>
                          <th className="py-2.5 px-3 text-right">Stock After</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {validationResult.components.map((c) => (
                          <tr key={c.ingredient_id} className="hover:bg-zinc-50">
                            <td className="py-2.5 px-3 font-bold text-zinc-900">
                              {c.ingredient_name}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">
                              {c.total_required} {c.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                              {c.current_stock} {c.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              <span className={c.current_stock - c.total_required < 0 ? 'text-rose-600' : 'text-zinc-900'}>
                                {c.current_stock - c.total_required} {c.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                c.sufficient ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {c.sufficient ? 'SUFFICIENT' : 'SHORTFALL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Branch ID: {deductionBranchId}</span>
              <span>Target: Tagpuan Recipe v1.0</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TODAY'S INGREDIENT DEDUCTIONS & USAGE AUDIT */}
      {activeTab === 'usage' && (
        <DailyIngredientUsagePanel
          branches={branches}
          selectedBranchId={selectedBranchId}
          onBranchChange={(bId) => {
            setSelectedBranchId(bId);
            loadBranchData(bId);
          }}
        />
      )}

      {/* MODAL 1: STOCK IN */}
      {isStockInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleExecuteStockIn} className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                  Record Stock In (Delivery / Restock)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStockInModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="font-semibold">{modalError}</span>
                </div>
              )}

              {/* Context Summary Card */}
              {(() => {
                const targetIng = ingredients.find(i => i.id === stockInForm.ingredient_id);
                const targetInv = inventoryList.find(
                  i => i.ingredient_id === stockInForm.ingredient_id && i.branch_id === stockInForm.branch_id
                );
                const targetBranch = branches.find(b => b.id === stockInForm.branch_id);
                const currentStock = targetInv ? targetInv.current_stock : 0;
                const unit = targetInv?.unit || targetIng?.unit || 'units';

                return (
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Selected Item:</span>
                      <span className="font-mono font-black text-zinc-900">
                        {targetIng?.item_name || 'Select Ingredient'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Current Stock Recorded:</span>
                      <span className={`font-mono font-bold ${currentStock === 0 ? 'text-rose-600 font-black' : 'text-zinc-900'}`}>
                        {currentStock} {unit} {currentStock === 0 ? '(DEPLETED)' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Target Branch:</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {targetBranch?.name || currentBranchName}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Branch</label>
                <select
                  value={stockInForm.branch_id}
                  onChange={(e) => {
                    const bId = e.target.value;
                    console.log('[StockInModal] Branch changed to:', bId);
                    setStockInForm(prev => ({ ...prev, branch_id: bId }));
                  }}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-zinc-800 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Ingredient</label>
                <select
                  value={stockInForm.ingredient_id}
                  onChange={(e) => {
                    const ingId = e.target.value;
                    console.log('[StockInModal] Ingredient changed to:', ingId);
                    setStockInForm(prev => ({ ...prev, ingredient_id: ingId }));
                    const found = inventoryList.find(i => i.ingredient_id === ingId && i.branch_id === stockInForm.branch_id);
                    setSelectedInventoryItem(found || null);
                  }}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-zinc-800 cursor-pointer"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.item_name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">
                  Quantity In (Positive Value)
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  placeholder="e.g. 10 or 25.5"
                  value={stockInForm.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    console.log('[StockInModal] Quantity input changed to:', val);
                    setStockInForm(prev => ({ ...prev, quantity: val }));
                  }}
                  className="w-full mt-1 p-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#CDEBC5]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Reason / Delivery Ref</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regular Supplier Delivery #PO-1049"
                  value={stockInForm.reason}
                  onChange={(e) => setStockInForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStockInModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-stock-in"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-[#CDEBC5]" />
                    <span>Confirm Stock In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: ADJUST STOCK */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleExecuteAdjust} className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-200 text-zinc-800 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                  Inventory Stock Adjustment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Context Summary Card */}
              {(() => {
                const targetIng = ingredients.find(i => i.id === adjustForm.ingredient_id) || ingredients[0];
                const targetInv = inventoryList.find(
                  i => i.ingredient_id === adjustForm.ingredient_id && i.branch_id === adjustForm.branch_id
                ) || selectedInventoryItem;
                const targetBranch = branches.find(b => b.id === adjustForm.branch_id);
                const currentStock = targetInv ? targetInv.current_stock : 0;
                const unit = targetInv?.unit || targetIng?.unit || 'units';
                const enteredStock = Number(adjustForm.new_stock);
                const delta = isNaN(enteredStock) ? 0 : Math.round((enteredStock - currentStock) * 100) / 100;

                return (
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Ingredient:</span>
                      <span className="font-mono font-black text-zinc-900">
                        {targetIng?.item_name || targetInv?.ingredient_name || 'Select Ingredient'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Current Stock Recorded:</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {currentStock} {unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Branch Context:</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {targetBranch?.name || currentBranchName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-zinc-200">
                      <span className="text-zinc-500 font-medium">Resulting Delta:</span>
                      <span className={`font-mono font-bold ${
                        delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-zinc-500'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta} {unit}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Branch</label>
                <select
                  value={adjustForm.branch_id}
                  onChange={(e) => {
                    const bId = e.target.value;
                    console.log('[AdjustModal] Branch changed to:', bId);
                    setAdjustForm(prev => ({ ...prev, branch_id: bId }));
                  }}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-zinc-800 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Ingredient</label>
                <select
                  value={adjustForm.ingredient_id}
                  onChange={(e) => {
                    const ingId = e.target.value;
                    console.log('[AdjustModal] Ingredient changed to:', ingId);
                    const found = inventoryList.find(i => i.ingredient_id === ingId && i.branch_id === adjustForm.branch_id);
                    setSelectedInventoryItem(found || null);
                    setAdjustForm(prev => ({
                      ...prev,
                      ingredient_id: ingId,
                      new_stock: found ? found.current_stock : 0
                    }));
                  }}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-bold text-zinc-800 cursor-pointer"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.item_name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">
                  New Counted Stock (Physical Verification)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="e.g. 20 or 15.5"
                  value={adjustForm.new_stock}
                  onChange={(e) => {
                    const val = e.target.value;
                    console.log('[AdjustModal] New stock input changed to:', val);
                    setAdjustForm(prev => ({ ...prev, new_stock: val }));
                  }}
                  className="w-full mt-1 p-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#CDEBC5]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">
                  Mandatory Adjustment Reason
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Physical inventory count discrepancy reconciliation..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-adjust-stock"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#CDEBC5]" />
                    <span>Save Adjustment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: REJECT / SPOILAGE */}
      {isRejectModalOpen && selectedInventoryItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleExecuteReject} className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-black text-zinc-900 tracking-tight text-rose-700">
                Log Rejected Stock / Spoilage
              </h3>
              <button type="button" onClick={() => setIsRejectModalOpen(false)} className="text-zinc-400">✕</button>
            </div>

            <div className="p-6 space-y-3">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-medium">Item:</span>
                <span className="font-mono font-bold text-zinc-900">
                  {selectedInventoryItem.ingredient_name}
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Quantity Rejected</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={rejectForm.rejected_quantity}
                  onChange={(e) => setRejectForm({ ...rejectForm, rejected_quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Reason for Rejection</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Expired batch, broken vacuum seal..."
                  value={rejectForm.reason}
                  onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                  className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-reject-stock"
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: CONFIGURE ITEM */}
      {isConfigModalOpen && selectedInventoryItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleExecuteConfig} className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Configure Item: {selectedInventoryItem.ingredient_name}
              </h3>
              <button type="button" onClick={() => setIsConfigModalOpen(false)} className="text-zinc-400">✕</button>
            </div>

            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Cost Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={configForm.cost_price}
                    onChange={(e) => setConfigForm({ ...configForm, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Unit</label>
                  <input
                    type="text"
                    required
                    value={configForm.unit}
                    onChange={(e) => setConfigForm({ ...configForm, unit: e.target.value })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Reorder Threshold</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={configForm.reorder_level}
                    onChange={(e) => setConfigForm({ ...configForm, reorder_level: parseInt(e.target.value) || 10 })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Maximum Stock</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={configForm.maximum_stock}
                    onChange={(e) => setConfigForm({ ...configForm, maximum_stock: parseInt(e.target.value) || 100 })}
                    className="w-full mt-1 p-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-config-item"
                className="px-5 py-2 text-xs font-bold bg-[#111111] text-white rounded-xl shadow"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
