import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  AlertCircle,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Eye,
  PlusCircle,
  TrendingUp,
  X,
  Bot,
  Zap,
  AlertTriangle,
  SlidersHorizontal,
  RefreshCw,
  Boxes
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { PurchaseOrder, Supplier, Ingredient, PurchaseOrderStatus, AIStockRecommendation, Branch, RequestOrder } from '../../types';
import { api } from '../../lib/api';
import { CreateBranchRequestModal } from '../requests/CreateBranchRequestModal';
import { BranchRequestOrdersView } from '../requests/BranchRequestOrdersView';

export const PurchasingView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const { addNotification } = useNotifications();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [requestOrders, setRequestOrders] = useState<RequestOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIStockRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [approvingRecId, setApprovingRecId] = useState<string | null>(null);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Active tabs: 'orders' | 'requests' | 'suppliers' | 'recommendations'
  const [activeTab, setActiveTab] = useState<'orders' | 'requests' | 'suppliers' | 'recommendations'>('orders');

  // Modals
  const [isBranchRequestModalOpen, setIsBranchRequestModalOpen] = useState(false);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [isCreateSupplierModalOpen, setIsCreateSupplierModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [submittingStockAction, setSubmittingStockAction] = useState(false);

  // Form states for creating PO
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('');
  const [poItems, setPoItems] = useState<{ ingredient_id: string; quantity: number; unit_cost: number }[]>([]);
  const [submittingPO, setSubmittingPO] = useState(false);

  // Form states for Stock In & Adjust
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

  // Form states for receiving PO
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // Form states for Commissary Quick Restock
  const [isQuickRestockModalOpen, setIsQuickRestockModalOpen] = useState(false);
  const [quickRestockIngredientId, setQuickRestockIngredientId] = useState<string>('');
  const [quickRestockQuantity, setQuickRestockQuantity] = useState<number | string>(50);
  const [quickRestockReason, setQuickRestockReason] = useState<string>('Central Commissary Direct Restock');
  const [isSubmittingQuickRestock, setIsSubmittingQuickRestock] = useState(false);
  const [quickRestockError, setQuickRestockError] = useState<string | null>(null);

  // Form states for creating Supplier
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContactPerson, setNewSupplierContactPerson] = useState('');
  const [newSupplierContactNumber, setNewSupplierContactNumber] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [submittingSupplier, setSubmittingSupplier] = useState(false);

  // Helper to safely resolve active branch ID
  const resolveActiveBranchId = (candidate?: string): string => {
    if (candidate && candidate !== 'ALL' && branches.some(b => b.id === candidate)) {
      return candidate;
    }
    if (user?.branch_id && branches.some(b => b.id === user.branch_id)) {
      return user.branch_id;
    }
    if (branches.length > 0) {
      return branches[0].id;
    }
    return '';
  };

  // Load POs, Suppliers, Ingredients, Branches, and Request Orders
  const fetchData = async () => {
    try {
      setLoading(true);
      const [posRes, supRes, ingRes, recsRes, branchesRes, reqs] = await Promise.all([
        fetch('/api/purchase-orders', { credentials: 'include' }),
        fetch('/api/suppliers', { credentials: 'include' }),
        fetch('/api/ingredients', { credentials: 'include' }),
        fetch('/api/ai/stock-recommendations', { credentials: 'include' }),
        fetch('/api/branches', { credentials: 'include' }),
        api.getRequestOrders().catch(() => [])
      ]);

      if (posRes.ok) {
        const posData = await posRes.json();
        setPurchaseOrders(posData.purchaseOrders || []);
      }
      if (supRes.ok) {
        const supData = await supRes.json();
        setSuppliers(supData.suppliers || []);
      }
      if (ingRes.ok) {
        const ingData = await ingRes.json();
        setIngredients(ingData.ingredients || []);
      }
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setAiRecommendations(recsData.recommendations || []);
      }
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData.branches || []);
      }
      setRequestOrders(reqs || []);
    } catch (err) {
      console.error('Failed to load purchasing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAIRecommendations = async () => {
    try {
      setLoadingRecs(true);
      const recs = await api.getAIStockRecommendations();
      setAiRecommendations(recs || []);
    } catch (err) {
      console.error('Failed to refresh AI recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleApproveAndDispatch = async (rec: AIStockRecommendation) => {
    console.log('[PurchasingView] ⚡ 1-Click Approve Restock triggered for recommendation:', rec);
    try {
      setApprovingRecId(rec.id);
      const res = await api.approveAndDispatchAIRestock({
        branch_id: rec.branch_id,
        ingredient_id: rec.ingredient_id,
        quantity: rec.suggested_quantity
      });
      console.log('[PurchasingView] AI Restock dispatched response:', res);

      setDispatchSuccessMsg(`⚡ Delivery #${res.delivery?.delivery_number || 'DEL'} Dispatched! Route to ${rec.branch_name} has been initiated in Central Commissary Logistics.`);
      setTimeout(() => setDispatchSuccessMsg(null), 6000);

      addNotification(
        'AI Restock Approved & Dispatched',
        `Restock for ${rec.ingredient_name} approved and dispatched (Delivery #${res.delivery?.delivery_number || ''}).`,
        'SUCCESS'
      );

      await loadAIRecommendations();
    } catch (err: any) {
      console.error('[PurchasingView] Failed to approve and dispatch restock:', err);
      alert(err.message || 'Failed to approve and dispatch restock.');
    } finally {
      setApprovingRecId(null);
    }
  };

  // Stock In Handlers
  const handleOpenStockIn = (branchId?: string, ingredientId?: string) => {
    console.log('[PurchasingView] 🟢 Stock In button clicked. branchId:', branchId, 'ingredientId:', ingredientId);
    const targetBranch = resolveActiveBranchId(branchId);
    const targetIng = ingredientId || (ingredients[0]?.id || '');
    setStockInForm({
      branch_id: targetBranch,
      ingredient_id: targetIng,
      quantity: 10,
      reason: 'Regular Supplier Delivery'
    });
    setIsStockInModalOpen(true);
  };

  const handleOpenAdjust = (branchId?: string, ingredientId?: string) => {
    console.log('[PurchasingView] 🟡 Adjust Stock button clicked. branchId:', branchId, 'ingredientId:', ingredientId);
    const targetBranch = resolveActiveBranchId(branchId);
    const targetIng = ingredientId || (ingredients[0]?.id || '');
    setAdjustForm({
      branch_id: targetBranch,
      ingredient_id: targetIng,
      new_stock: 0,
      reason: 'Physical Count Reconciliation'
    });
    setIsAdjustModalOpen(true);
  };

  const handleExecuteStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PurchasingView] 🚀 handleExecuteStockIn submitted:', stockInForm);
    const bId = resolveActiveBranchId(stockInForm.branch_id);
    const ingId = stockInForm.ingredient_id || (ingredients[0]?.id || '');
    const qty = Number(stockInForm.quantity);

    if (!bId) {
      alert('Please select a valid branch for Stock In.');
      return;
    }
    if (!ingId) {
      alert('Please select an ingredient.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a positive quantity greater than 0.');
      return;
    }

    try {
      setSubmittingStockAction(true);
      const res = await api.stockIn({
        branch_id: bId,
        ingredient_id: ingId,
        quantity: qty,
        reason: stockInForm.reason.trim() || 'Regular Supplier Delivery'
      });
      console.log('[PurchasingView] Stock In completed successfully:', res);
      setIsStockInModalOpen(false);
      addNotification(
        'Stock In Recorded',
        `Stock in of ${qty} units completed successfully for ${res.inventory?.ingredient_name || 'ingredient'}.`,
        'SUCCESS'
      );
      setDispatchSuccessMsg(`✅ Stock In of ${qty} units recorded for ${res.inventory?.ingredient_name || 'ingredient'}.`);
      setTimeout(() => setDispatchSuccessMsg(null), 5000);
      await loadAIRecommendations();
    } catch (err: any) {
      console.error('[PurchasingView] Stock In failed:', err);
      alert(err.message || 'Stock In failed.');
    } finally {
      setSubmittingStockAction(false);
    }
  };

  const handleExecuteAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PurchasingView] 🚀 handleExecuteAdjust submitted:', adjustForm);
    const bId = resolveActiveBranchId(adjustForm.branch_id);
    const ingId = adjustForm.ingredient_id || (ingredients[0]?.id || '');
    const newStock = Number(adjustForm.new_stock);

    if (!bId) {
      alert('Please select a valid branch for Stock Adjustment.');
      return;
    }
    if (!ingId) {
      alert('Please select an ingredient.');
      return;
    }
    if (isNaN(newStock) || newStock < 0) {
      alert('Adjusted stock quantity cannot be negative.');
      return;
    }
    if (!adjustForm.reason || adjustForm.reason.trim().length < 3) {
      alert('Please enter a mandatory adjustment reason (at least 3 characters).');
      return;
    }

    try {
      setSubmittingStockAction(true);
      const res = await api.adjustStock({
        branch_id: bId,
        ingredient_id: ingId,
        new_stock: newStock,
        reason: adjustForm.reason.trim()
      });
      console.log('[PurchasingView] Stock Adjustment completed successfully:', res);
      setIsAdjustModalOpen(false);
      addNotification(
        'Stock Adjustment Recorded',
        `Stock adjusted to ${newStock} for ${res.inventory?.ingredient_name || 'ingredient'}.`,
        'SUCCESS'
      );
      setDispatchSuccessMsg(`✅ Stock adjusted to ${newStock} units for ${res.inventory?.ingredient_name || 'ingredient'}.`);
      setTimeout(() => setDispatchSuccessMsg(null), 5000);
      await loadAIRecommendations();
    } catch (err: any) {
      console.error('[PurchasingView] Stock Adjustment failed:', err);
      alert(err.message || 'Stock Adjustment failed.');
    } finally {
      setSubmittingStockAction(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered POs
  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.notes && po.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate Purchasing KPI Stats
  const totalPOAmount = purchaseOrders.reduce((sum, po) => sum + po.total_cost, 0);
  const pendingReceivingCount = purchaseOrders.filter(
    (po) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED'
  ).length;
  const completedPOCount = purchaseOrders.filter((po) => po.status === 'RECEIVED').length;

  // Add Item to New PO
  const handleAddItemToPO = () => {
    if (ingredients.length === 0) return;
    const defaultIng = ingredients[0];
    setPoItems([
      ...poItems,
      {
        ingredient_id: defaultIng.id,
        quantity: 100,
        unit_cost: defaultIng.cost_price
      }
    ]);
  };

  const handleRemovePOItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleUpdatePOItem = (index: number, field: string, value: any) => {
    const updated = [...poItems];
    if (field === 'ingredient_id') {
      const ing = ingredients.find((i) => i.id === value);
      updated[index] = {
        ...updated[index],
        ingredient_id: value,
        unit_cost: ing ? ing.cost_price : updated[index].unit_cost
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    setPoItems(updated);
  };

  // Submit PO
  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Please select a supplier.');
      return;
    }
    if (poItems.length === 0) {
      alert('Please add at least one item to purchase.');
      return;
    }

    try {
      setSubmittingPO(true);
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          expected_delivery_date: expectedDeliveryDate || undefined,
          notes: poNotes || undefined,
          items: poItems
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create purchase order.');
      }

      const data = await res.json();
      addNotification(
        'Purchase Order Created',
        `PO #${data.purchaseOrder.po_number} successfully created and approved.`,
        'SUCCESS'
      );

      setIsCreatePOModalOpen(false);
      setPoItems([]);
      setSelectedSupplierId('');
      setPoNotes('');
      setExpectedDeliveryDate('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating purchase order');
    } finally {
      setSubmittingPO(false);
    }
  };

  // Open Receive Modal
  const handleOpenReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialRec: Record<string, number> = {};
    po.items.forEach((item) => {
      const remaining = Math.max(0, item.quantity - (item.received_quantity || 0));
      initialRec[item.id] = remaining > 0 ? remaining : item.quantity;
    });
    setReceiveQuantities(initialRec);
    setIsReceiveModalOpen(true);
  };

  // Direct 1-Click Receive PO into Central Commissary Stock
  const handleDirectReceivePO = async (po: PurchaseOrder) => {
    try {
      setSubmittingReceive(true);
      const res = await fetch(`/api/purchase-orders/${po.id}/direct-receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete direct stock intake.');
      }
      addNotification(
        'Stock Intake Recorded',
        `All items from PO #${po.po_number} directly received into Central Commissary Stock!`,
        'SUCCESS'
      );
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error receiving PO');
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Submit Receive PO
  const handleSubmitReceivePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    try {
      setSubmittingReceive(true);
      let itemsToReceive = selectedPO.items
        .map((it) => {
          const val = Number(receiveQuantities[it.id]);
          const remaining = Math.max(0, it.quantity - (it.received_quantity || 0));
          const qty = isNaN(val) || val <= 0 ? remaining : val;
          return {
            item_id: it.id,
            received_quantity: qty
          };
        })
        .filter((it) => it.received_quantity > 0);

      if (itemsToReceive.length === 0) {
        // Direct intake all items if all inputs were 0
        itemsToReceive = selectedPO.items
          .map((it) => ({
            item_id: it.id,
            received_quantity: Math.max(0, it.quantity - (it.received_quantity || 0)) || it.quantity
          }))
          .filter((it) => it.received_quantity > 0);
      }

      const res = await fetch(`/api/purchase-orders/${selectedPO.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ items: itemsToReceive })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record purchase receipt.');
      }

      addNotification(
        'Stock Intake Recorded',
        `Stock from PO #${selectedPO.po_number} received into Central Commissary Stock.`,
        'SUCCESS'
      );

      setIsReceiveModalOpen(false);
      setSelectedPO(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error receiving PO');
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Quick Restock Commissary Handlers
  const handleOpenQuickRestock = (ingredientId?: string) => {
    setQuickRestockIngredientId(ingredientId || (ingredients[0]?.id || ''));
    setQuickRestockQuantity(50);
    setQuickRestockReason('Central Commissary Direct Restock');
    setQuickRestockError(null);
    setIsQuickRestockModalOpen(true);
  };

  const handleExecuteQuickRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    const ingId = quickRestockIngredientId || (ingredients[0]?.id || '');
    const qty = Number(quickRestockQuantity);
    if (!ingId) {
      setQuickRestockError('Please select a target ingredient.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setQuickRestockError('Please enter a valid positive quantity.');
      return;
    }

    try {
      setIsSubmittingQuickRestock(true);
      setQuickRestockError(null);
      const res = await fetch('/api/warehouse/quick-restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          ingredient_id: ingId,
          quantity: qty,
          reason: quickRestockReason.trim() || 'Central Commissary Direct Restock'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to restock warehouse.');
      }

      const data = await res.json();
      const ingName = data.ingredient?.item_name || 'Ingredient';
      addNotification(
        'Commissary Restocked',
        `Added +${qty} ${data.ingredient?.unit || 'units'} of ${ingName} to Central Commissary Warehouse. New balance: ${data.current_stock}.`,
        'SUCCESS'
      );

      setIsQuickRestockModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setQuickRestockError(err.message || 'Restock failed.');
    } finally {
      setIsSubmittingQuickRestock(false);
    }
  };

  // Create Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      alert('Supplier name is required.');
      return;
    }

    try {
      setSubmittingSupplier(true);
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newSupplierName,
          contact_person: newSupplierContactPerson,
          contact_number: newSupplierContactNumber,
          email: newSupplierEmail,
          address: newSupplierAddress
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create supplier.');
      }

      addNotification(
        'Supplier Added',
        `Supplier ${newSupplierName} added to directory.`,
        'SUCCESS'
      );

      setIsCreateSupplierModalOpen(false);
      setNewSupplierName('');
      setNewSupplierContactPerson('');
      setNewSupplierContactNumber('');
      setNewSupplierEmail('');
      setNewSupplierAddress('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating supplier');
    } finally {
      setSubmittingSupplier(false);
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#CDEBC5] text-[#111111] border border-[#a3dc95]">
            <CheckCircle2 className="w-3 h-3 text-[#111111]" />
            Received (In Stock)
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3" />
            Partially Received
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Truck className="w-3 h-3" />
            Approved / In Transit
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
            <X className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-300">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  if (!isOwner) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white border border-red-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-zinc-900">Purchasing & Supplier Isolation</h2>
          <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
            Purchasing Orders, Supplier Directory, cost pricing, and procurement contracts are strictly isolated and restricted exclusively to the <span className="text-zinc-900 font-bold">Master Owner</span> role to safeguard vendor pricing agreements and commercial confidentiality.
          </p>
          <div className="pt-2">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              Current Role: {user?.role || 'STAFF'} • Access Blocked
            </span>
          </div>
        </div>
      </div>
    );
  }

  const depletedItems = aiRecommendations.filter(r => r.current_stock === 0);
  const lowStockItems = aiRecommendations.filter(r => r.current_stock > 0 && r.current_stock <= r.reorder_level);
  const impactedBranchesCount = new Set(aiRecommendations.map(r => r.branch_id)).size;

  return (
    <div className="space-y-6">
      {/* SUMMARY BAR: Depleted or Below Reorder Threshold Raw Ingredients Across Branches */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${depletedItems.length > 0 ? 'bg-rose-500 animate-pulse' : lowStockItems.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div>
              <h2 className="text-sm font-black text-zinc-900 tracking-tight flex items-center gap-2">
                Cross-Branch Raw Ingredient Stock Health
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                  17 Branches Monitored
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Live visibility into depleted stock and raw materials below replenishment thresholds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-black ${
              depletedItems.length > 0
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-zinc-100 text-zinc-600'
            }`}>
              🔴 {depletedItems.length} Depleted
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-black ${
              lowStockItems.length > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-zinc-100 text-zinc-600'
            }`}>
              🟠 {lowStockItems.length} Low Stock
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-100 text-zinc-700">
              🏢 {impactedBranchesCount} Affected Branch{impactedBranchesCount === 1 ? '' : 'es'}
            </span>
          </div>
        </div>

        {/* Depleted Items Immediate Action List */}
        {depletedItems.length > 0 && (
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Critical Stock Depletions (0 Portions Remaining)
              </span>
              <span className="text-[11px] font-mono text-rose-600 font-bold">Requires Immediate Commissary Dispatch</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {depletedItems.map(item => (
                <div key={item.id} className="bg-white border border-rose-200 rounded-lg p-3 flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                      <span className="text-rose-600 font-black">{item.ingredient_name}</span>
                      <span className="text-zinc-400 font-normal">at</span>
                      <span className="font-mono text-zinc-800">{item.branch_name}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      Current: <span className="font-bold text-rose-600">0 {item.unit}</span> • Threshold: {item.reorder_level} {item.unit}
                    </div>
                  </div>
                  <button
                    type="button"
                    id={`btn-approve-depleted-${item.id}`}
                    disabled={approvingRecId === item.id}
                    onClick={() => handleApproveAndDispatch(item)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1 shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {approvingRecId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        1-Click Restock
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Items (Below Reorder Threshold) List */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Raw Ingredients Operating Below Reorder Thresholds
              </span>
              <span className="text-[11px] font-mono text-amber-700 font-bold">1-15 Portions Remaining</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockItems.slice(0, 6).map(item => (
                <div key={item.id} className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="truncate">
                    <div className="font-bold text-xs text-zinc-900 truncate">
                      {item.ingredient_name}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono truncate">
                      {item.branch_name}: <span className="font-bold text-amber-700">{item.current_stock} {item.unit}</span> (Min: {item.reorder_level})
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={approvingRecId === item.id}
                    onClick={() => handleApproveAndDispatch(item)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    Replenish
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {depletedItems.length === 0 && lowStockItems.length === 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All raw ingredients across all 17 Tagpuan branches are currently healthy and above reorder thresholds.</span>
          </div>
        )}
      </div>

      {/* Dispatch Success Alert */}
      {dispatchSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{dispatchSuccessMsg}</span>
          </div>
          <button onClick={() => setDispatchSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#111111] text-[#CDEBC5]">
              PHASE 7
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#111111]">
              Purchasing & Supplier Orders
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Owner-governed commissary stock procurement and supplier catalog for Tagpuan Central Commissary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(isOwner || isManager) && (
            <>
              <button
                type="button"
                id="btn-purchasing-quick-restock-commissary"
                onClick={() => handleOpenQuickRestock()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                title="Directly increment Central Commissary stock for any raw ingredient"
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-200" />
                Quick Restock Commissary
              </button>
              <button
                type="button"
                id="btn-purchasing-stock-in"
                onClick={() => handleOpenStockIn()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-[#CDEBC5]" />
                Stock In
              </button>
              <button
                type="button"
                id="btn-purchasing-new-stock-request"
                onClick={() => setIsBranchRequestModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                title="Create a new stock replenishment request for a branch"
              >
                <Plus className="w-4 h-4 text-[#CDEBC5]" />
                New Branch Stock Request
              </button>
              <button
                type="button"
                id="btn-purchasing-adjust-stock"
                onClick={() => handleOpenAdjust()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
                Adjust Stock
              </button>
              <button
                type="button"
                id="btn-purchasing-add-supplier"
                onClick={() => setIsCreateSupplierModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Supplier
              </button>
              <button
                type="button"
                id="btn-purchasing-new-po"
                onClick={() => {
                  setPoItems([
                    {
                      ingredient_id: ingredients[0]?.id || '',
                      quantity: 500,
                      unit_cost: ingredients[0]?.cost_price || 0
                    }
                  ]);
                  setIsCreatePOModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-black text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                New Purchase Order
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Purchase Volume</span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#111111] mt-2">
            ₱{totalPOAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {purchaseOrders.length} Lifetime Purchase Orders
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pending Stock Receipts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {pendingReceivingCount} Orders
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Awaiting full intake into Central Warehouse
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Suppliers</span>
            <div className="w-8 h-8 rounded-xl bg-[#CDEBC5] flex items-center justify-center text-[#111111]">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#111111] mt-2">
            {suppliers.length} Partners
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            San Miguel, Magnolia, Farm Fresh, Bakeshop
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          id="tab-branch-requests"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Branch Stock Requests ({requestOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Supplier Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'recommendations'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <Bot className="w-4 h-4 text-emerald-500" />
          AI Restock Recommendations
          {aiRecommendations.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
              aiRecommendations.some(r => r.current_stock === 0)
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-zinc-800 text-zinc-200'
            }`}>
              {aiRecommendations.length}
            </span>
          )}
        </button>
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search PO number, supplier, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved / In Transit</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="RECEIVED">Fully Received</option>
              </select>
            </div>
          </div>

          {/* PO Table */}
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
              <p className="text-xs text-zinc-500 font-mono">Loading purchase orders...</p>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
              <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-700">No Purchase Orders Found</p>
              <p className="text-xs text-zinc-400 mt-1">
                Create a new purchase order to stock the Central Commissary Warehouse.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-mono font-bold text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">PO Number</th>
                      <th className="px-5 py-3.5">Supplier</th>
                      <th className="px-5 py-3.5">Items</th>
                      <th className="px-5 py-3.5">Total Amount</th>
                      <th className="px-5 py-3.5">Order Date</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredPOs.map((po) => (
                      <tr
                        key={po.id}
                        onClick={() => {
                          if (po.status !== 'RECEIVED') {
                            handleOpenReceiveModal(po);
                          } else {
                            setSelectedPO(po);
                            setIsReceiveModalOpen(false);
                          }
                        }}
                        className="hover:bg-zinc-50 transition cursor-pointer"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-[#111111]">
                          <span className="hover:underline text-emerald-800 flex items-center gap-1">
                            {po.po_number}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-zinc-900">{po.supplier_name}</div>
                          {po.notes && <div className="text-[11px] text-zinc-400 truncate max-w-xs">{po.notes}</div>}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          <span className="font-semibold">{po.items.length} item{po.items.length > 1 ? 's' : ''}</span>
                          <div className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                            {po.items.map((i) => `${i.quantity} ${i.unit} ${i.ingredient_name}`).join(', ')}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-[#111111]">
                          ₱{po.total_cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-zinc-500 font-mono text-[11px]">
                          {po.order_date}
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(po.status)}
                        </td>
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {po.status !== 'RECEIVED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDirectReceivePO(po)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                                  title="1-Click Direct Intake into Commissary Warehouse"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-current" />
                                  Receive All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReceiveModal(po)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  Receive
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPO(po);
                                setIsReceiveModalOpen(false);
                              }}
                              className="px-2 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BRANCH STOCK REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <BranchRequestOrdersView />
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                      {supplier.supplier_code}
                    </span>
                    <h3 className="text-base font-bold text-[#111111] mt-1.5">{supplier.name}</h3>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active Supplier" />
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-zinc-600">
                  {supplier.contact_person && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Contact:</span>
                      <span className="font-semibold text-zinc-800">{supplier.contact_person}</span>
                    </div>
                  )}
                  {supplier.contact_number && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Phone:</span>
                      <span className="font-mono text-zinc-800">{supplier.contact_number}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Email:</span>
                      <span className="text-zinc-800">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="text-zinc-500 text-[11px] pt-1">
                      {supplier.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-zinc-400 text-[11px]">
                  Added: {new Date(supplier.created_at).toLocaleDateString()}
                </span>
                {isOwner && (
                  <button
                    onClick={() => {
                      setSelectedSupplierId(supplier.id);
                      setPoItems([
                        {
                          ingredient_id: ingredients[0]?.id || '',
                          quantity: 500,
                          unit_cost: ingredients[0]?.cost_price || 0
                        }
                      ]);
                      setIsCreatePOModalOpen(true);
                    }}
                    className="text-xs font-bold text-[#111111] hover:underline flex items-center gap-1"
                  >
                    Issue PO
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI RESTOCK RECOMMENDATIONS TAB */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-black text-zinc-900">Autonomous AI Low-Stock Alert Pipeline</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Monitors critical items (Patties, Buns, Hotdogs, Siomai, Cheese, Oil) in real-time. Instantly dispatches replenishment into the Central Commissary Delivery pipeline.
              </p>
            </div>
            <button
              onClick={loadAIRecommendations}
              disabled={loadingRecs}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Loader2 className={`w-3.5 h-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
              Refresh AI Scan
            </button>
          </div>

          {loadingRecs ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
              <p className="text-xs text-zinc-500 font-mono">Scanning branch inventory thresholds...</p>
            </div>
          ) : aiRecommendations.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-800">All Branch Stocks Are Healthy</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                No critical depletion or low-stock thresholds breached across all branch inventories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiRecommendations.map((rec) => {
                const isDepleted = rec.current_stock === 0;
                return (
                  <div
                    key={rec.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition-all ${
                      isDepleted
                        ? 'border-red-300 ring-1 ring-red-400/30'
                        : 'border-amber-200'
                    }`}
                  >
                    <div>
                      {/* Badge & Branch Info */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {rec.branch_name}
                        </span>
                        {isDepleted ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                            DEPLETED (0 LEFT)
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            LOW STOCK ({rec.current_stock} {rec.unit})
                          </span>
                        )}
                      </div>

                      {/* Header Text */}
                      <h3 className="text-sm font-black text-zinc-900 leading-snug">
                        AI Restock Order: Request replenishment of {rec.ingredient_name} from Central Commissary Warehouse.
                      </h3>

                      {/* Alert Message */}
                      <p className={`text-xs mt-2 font-medium ${isDepleted ? 'text-red-600' : 'text-amber-800'}`}>
                        {rec.reason}
                      </p>

                      {/* Stock Metas */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-100 text-center">
                        <div className="bg-zinc-50 p-2 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Current</span>
                          <span className={`text-xs font-black ${isDepleted ? 'text-red-600 font-extrabold' : 'text-zinc-800'}`}>
                            {rec.current_stock} {rec.unit}
                          </span>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Threshold</span>
                          <span className="text-xs font-black text-zinc-800">
                            {rec.reorder_level} {rec.unit}
                          </span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Suggest Restock</span>
                          <span className="text-xs font-black text-emerald-800">
                            {rec.suggested_quantity} {rec.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-zinc-400">
                        {rec.has_pending_request ? 'Replenishment already queued' : 'Direct Dispatch Ready'}
                      </span>
                      <button
                        type="button"
                        id={`btn-approve-rec-${rec.id}`}
                        disabled={approvingRecId === rec.id}
                        onClick={() => handleApproveAndDispatch(rec)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95 ${
                          isDepleted
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-[#111111] hover:bg-black text-[#CDEBC5]'
                        }`}
                      >
                        {approvingRecId === rec.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Dispatching...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            ⚡ 1-Click Approve Restock
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {isCreatePOModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h2 className="text-base font-black text-[#111111]">Create Purchase Order</h2>
                <p className="text-xs text-zinc-500">
                  Bulk order raw materials to replenish Central Commissary Warehouse.
                </p>
              </div>
              <button
                onClick={() => setIsCreatePOModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseOrder} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold focus:ring-2 focus:ring-[#111111]"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplier_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
                    Order Items ({poItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemToPO}
                    className="text-xs font-bold text-[#111111] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {poItems.map((item, idx) => {
                    const ing = ingredients.find((i) => i.id === item.ingredient_id);
                    const subtotal = item.quantity * item.unit_cost;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">Ingredient</label>
                          <select
                            value={item.ingredient_id}
                            onChange={(e) => handleUpdatePOItem(idx, 'ingredient_id', e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-medium bg-white"
                          >
                            {ingredients.map((ingItem) => (
                              <option key={ingItem.id} value={ingItem.id}>
                                {ingItem.item_name} ({ingItem.item_code}) - ₱{ingItem.cost_price}/{ingItem.unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-28">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">
                            Qty ({ing?.unit || 'units'})
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdatePOItem(idx, 'quantity', Number(e.target.value))}
                            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono font-bold bg-white"
                          />
                        </div>

                        <div className="w-28">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">Unit Cost (₱)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) => handleUpdatePOItem(idx, 'unit_cost', Number(e.target.value))}
                            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono font-bold bg-white"
                          />
                        </div>

                        <div className="w-28 text-right">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase">Subtotal</label>
                          <div className="text-xs font-black text-[#111111] mt-1 font-mono">
                            ₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePOItem(idx)}
                          className="text-zinc-400 hover:text-red-600 p-1 self-end sm:self-center"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-zinc-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Total Purchase Cost:</span>
                  <span className="text-base font-black text-[#111111] font-mono">
                    ₱
                    {poItems
                      .reduce((sum, it) => sum + it.quantity * it.unit_cost, 0)
                      .toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Procurement Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Standard cold-storage delivery before 2:00 PM..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatePOModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPO}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2"
                >
                  {submittingPO && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Approve & Issue PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE PURCHASE ORDER MODAL */}
      {isReceiveModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h2 className="text-base font-black text-[#111111]">
                  Receive Delivery from {selectedPO.supplier_name}
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  PO #{selectedPO.po_number} • Direct Intake to Commissary Warehouse
                </p>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReceivePO} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Confirming this delivery will increase the Central Commissary stock and record an immutable <code>PURCHASE_RECEIPT</code> inventory transaction.
                </span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
                  Items to Intake
                </label>
                {selectedPO.items.map((item) => {
                  const alreadyReceived = item.received_quantity || 0;
                  const remaining = Math.max(0, item.quantity - alreadyReceived);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-xs text-zinc-900">{item.ingredient_name}</div>
                        <div className="text-[11px] text-zinc-500">
                          Ordered: {item.quantity} {item.unit} • Prev. Received: {alreadyReceived} {item.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-zinc-500">Intake ({item.unit}):</label>
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          value={receiveQuantities[item.id] || 0}
                          onChange={(e) =>
                            setReceiveQuantities({
                              ...receiveQuantities,
                              [item.id]: Number(e.target.value)
                            })
                          }
                          className="w-24 px-2 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono font-bold text-center bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPO) {
                      handleDirectReceivePO(selectedPO);
                      setIsReceiveModalOpen(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Receive All Remaining
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReceiveModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReceive}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReceive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Intake & Sync Inventory
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUPPLIER MODAL */}
      {isCreateSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h2 className="text-base font-black text-[#111111]">Add New Supplier</h2>
              <button
                onClick={() => setIsCreateSupplierModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Miguel Foods Inc."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-medium focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Juan De La Cruz"
                  value={newSupplierContactPerson}
                  onChange={(e) => setNewSupplierContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="0917-123-4567"
                    value={newSupplierContactNumber}
                    onChange={(e) => setNewSupplierContactNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="orders@supplier.ph"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Physical / Depot Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ortigas Industrial Center, Pasig City"
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSupplier}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2"
                >
                  {submittingSupplier && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK IN MODAL */}
      {isStockInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">Direct Stock In (Intake)</h2>
                  <p className="text-xs text-zinc-500">Record fresh arrival into branch or commissary storage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockInModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteStockIn} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Target Branch Location</label>
                <select
                  value={stockInForm.branch_id}
                  onChange={(e) => setStockInForm({ ...stockInForm, branch_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold bg-white text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  required
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Target Raw Ingredient</label>
                <select
                  value={stockInForm.ingredient_id}
                  onChange={(e) => setStockInForm({ ...stockInForm, ingredient_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold bg-white text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  required
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Quantity Received</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-sm font-black font-mono bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  placeholder="e.g. 50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Intake Reason / Supplier Reference</label>
                <input
                  type="text"
                  value={stockInForm.reason}
                  onChange={(e) => setStockInForm({ ...stockInForm, reason: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  placeholder="e.g. Regular Supplier Delivery #4912"
                  required
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockInModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStockAction}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingStockAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Stock Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">Adjust Physical Stock</h2>
                  <p className="text-xs text-zinc-500">Reconcile physical inventory counts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAdjust} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Target Branch Location</label>
                <select
                  value={adjustForm.branch_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, branch_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold bg-white text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  required
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Target Raw Ingredient</label>
                <select
                  value={adjustForm.ingredient_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, ingredient_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold bg-white text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  required
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">New Verified Physical Count</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={adjustForm.new_stock}
                  onChange={(e) => setAdjustForm({ ...adjustForm, new_stock: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-sm font-black font-mono bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  placeholder="e.g. 120"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Mandatory Audit Justification / Reason</label>
                <textarea
                  rows={2}
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-[#111111]"
                  placeholder="e.g. Monthly Physical Stock Count Reconciliation"
                  required
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStockAction}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingStockAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMISSARY QUICK RESTOCK MODAL (DIRECT WAREHOUSE INCREMENT) */}
      {isQuickRestockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-base font-black text-zinc-900">
                    Quick Restock Commissary
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono">
                    Direct warehouse intake for patties, buns, hotdogs, siomai
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickRestockModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickRestock} className="p-6 space-y-4">
              {quickRestockError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{quickRestockError}</span>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  This bypasses purchase order approvals to immediately increment the Central Commissary stock balance so branch requests can be fulfilled.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Target Raw Ingredient
                </label>
                <select
                  value={quickRestockIngredientId}
                  onChange={(e) => setQuickRestockIngredientId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-700"
                  required
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Quantity to Add ({ingredients.find(i => i.id === quickRestockIngredientId)?.unit || 'units'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={quickRestockQuantity}
                  onChange={(e) => setQuickRestockQuantity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-sm font-black font-mono bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-emerald-700"
                  placeholder="e.g. 50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Reason / Source Reference
                </label>
                <input
                  type="text"
                  value={quickRestockReason}
                  onChange={(e) => setQuickRestockReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-emerald-700"
                  placeholder="e.g. Emergency local supplier buy / Direct batch intake"
                  required
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickRestockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickRestock}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingQuickRestock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Direct Restock Commissary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* NEW BRANCH STOCK REQUEST MODAL */}
      <CreateBranchRequestModal
        isOpen={isBranchRequestModalOpen}
        onClose={() => setIsBranchRequestModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setActiveTab('requests');
        }}
      />
    </div>
  );
};
