import React, { useState, useEffect } from 'react';
import {
  Truck,
  Boxes,
  PackageCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  UserCheck,
  Calendar,
  Loader2,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  X,
  Plus,
  Send,
  MapPin,
  Car,
  AlertCircle,
  Zap,
  Flame
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import {
  WarehouseStockItem,
  RequestOrder,
  Delivery,
  DeliveryItem,
  DeliveryStatus
} from '../../types';

export const WarehouseDeliveryView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const { addNotification } = useNotifications();

  // Strict Role Restriction: Only MASTER OWNER and WAREHOUSEMAN allowed
  const hasCommissaryAccess = isOwner || user?.role === 'WAREHOUSEMAN';

  // Tabs: 'requests' | 'stock' | 'prep' | 'deliveries'
  const [activeTab, setActiveTab] = useState<'requests' | 'stock' | 'prep' | 'deliveries'>('requests');

  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>([]);
  const [requestOrders, setRequestOrders] = useState<RequestOrder[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Dedicated Request Monitoring States
  const [reqSearchQuery, setReqSearchQuery] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<string>('ALL');
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [selectedReqForDirectDispatch, setSelectedReqForDirectDispatch] = useState<RequestOrder | null>(null);
  const [isDirectDispatchModalOpen, setIsDirectDispatchModalOpen] = useState(false);
  const [directDispatchDriver, setDirectDispatchDriver] = useState('Mang Boy (Tagpuan Logistics)');
  const [directDispatchVehicle, setDirectDispatchVehicle] = useState('L300 Reefer Van - NAK-4821');
  const [directDispatchETA, setDirectDispatchETA] = useState('Within 2 Hours / Today');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Preparation Modal
  const [selectedReqToPrep, setSelectedReqToPrep] = useState<RequestOrder | null>(null);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [prepDriverName, setPrepDriverName] = useState('Mang Boy (Tagpuan Logistics)');
  const [prepVehicleInfo, setPrepVehicleInfo] = useState('L300 Van - Plate NAK-4821');
  const [prepETA, setPrepETA] = useState('Today at 3:30 PM');
  const [prepQuantities, setPrepQuantities] = useState<Record<string, number>>({});
  const [submittingPrep, setSubmittingPrep] = useState(false);

  // Dispatch Modal
  const [selectedDeliveryToDispatch, setSelectedDeliveryToDispatch] = useState<Delivery | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchDriver, setDispatchDriver] = useState('');
  const [dispatchVehicle, setDispatchVehicle] = useState('');
  const [dispatchETA, setDispatchETA] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Receiving Modal
  const [selectedDeliveryToReceive, setSelectedDeliveryToReceive] = useState<Delivery | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [rejectedQuantities, setRejectedQuantities] = useState<Record<string, number>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [receivingNotes, setReceivingNotes] = useState('');
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // Quick Restock Commissary State
  const [isQuickRestockModalOpen, setIsQuickRestockModalOpen] = useState(false);
  const [quickRestockIngredientId, setQuickRestockIngredientId] = useState<string>('');
  const [quickRestockQuantity, setQuickRestockQuantity] = useState<number | string>(50);
  const [quickRestockReason, setQuickRestockReason] = useState<string>('Central Commissary Direct Restock');
  const [isSubmittingQuickRestock, setIsSubmittingQuickRestock] = useState(false);
  const [quickRestockError, setQuickRestockError] = useState<string | null>(null);

  // Direct fulfillment state
  const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);

  // Fetch all warehouse and delivery data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockRes, reqRes, delRes] = await Promise.all([
        fetch('/api/warehouse/stock', { credentials: 'include' }),
        fetch('/api/request-orders', { credentials: 'include' }),
        fetch('/api/deliveries', { credentials: 'include' })
      ]);

      if (stockRes.ok) {
        const data = await stockRes.json();
        setWarehouseStock(data.stock || []);
      }
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequestOrders(data.requestOrders || []);
      }
      if (delRes.ok) {
        const data = await delRes.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (err) {
      console.error('Failed to load warehouse data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Approved requests waiting for preparation
  const pendingPrepRequests = requestOrders.filter(
    (req) => req.status === 'APPROVED' || req.status === 'FOR_PREPARATION'
  );

  // Dedicated Request Monitoring Actions
  const handleApproveRequest = async (req: RequestOrder) => {
    try {
      setProcessingReqId(req.id);
      await api.reviewRequestOrder(req.id, 'APPROVE');
      addNotification(
        'Stock Request Approved',
        `Request #${req.request_number} for ${req.branch_name} has been approved and moved to preparation queue.`,
        'SUCCESS'
      );
      fetchData();
    } catch (err: any) {
      console.error(err);
      addNotification('Approval Failed', err.message || 'Failed to approve request order.', 'ALERT');
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleOpenDirectDispatch = (req: RequestOrder) => {
    setSelectedReqForDirectDispatch(req);
    setDirectDispatchDriver(req.driver_name || 'Mang Boy (Tagpuan Logistics)');
    setDirectDispatchVehicle(req.vehicle_info || 'L300 Reefer Van - Plate NAK-4821');
    setDirectDispatchETA(req.estimated_arrival || 'Within 2 Hours / Today');
    setIsDirectDispatchModalOpen(true);
  };

  const handleExecuteDirectDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForDirectDispatch) return;
    try {
      setProcessingReqId(selectedReqForDirectDispatch.id);
      await api.dispatchRequestOrder(selectedReqForDirectDispatch.id, {
        driver_name: directDispatchDriver,
        vehicle_info: directDispatchVehicle,
        estimated_arrival: directDispatchETA,
        tracking_number: `TRK-${selectedReqForDirectDispatch.request_number}`
      });
      addNotification(
        'Dispatched Out for Delivery',
        `Request #${selectedReqForDirectDispatch.request_number} is now OUT FOR DELIVERY to ${selectedReqForDirectDispatch.branch_name}!`,
        'SUCCESS'
      );
      setIsDirectDispatchModalOpen(false);
      setSelectedReqForDirectDispatch(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      addNotification('Dispatch Failed', err.message || 'Failed to dispatch request order.', 'ALERT');
    } finally {
      setProcessingReqId(null);
    }
  };

  // Open Preparation Modal
  const handleOpenPrepModal = (req: RequestOrder) => {
    setSelectedReqToPrep(req);
    const initialPrep: Record<string, number> = {};
    req.items.forEach((item) => {
      initialPrep[item.ingredient_id] = item.approved_quantity || item.requested_quantity;
    });
    setPrepQuantities(initialPrep);
    setIsPrepModalOpen(true);
  };

  // Submit Preparation & Create Delivery
  const handleSubmitPreparation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqToPrep) return;

    try {
      setSubmittingPrep(true);
      const itemsToPrep = Object.entries(prepQuantities).map(([ingId, qty]) => ({
        ingredient_id: ingId,
        prepared_quantity: Number(qty)
      }));

      const res = await fetch('/api/warehouse/prepare-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          request_id: selectedReqToPrep.id,
          driver_name: prepDriverName,
          vehicle_info: prepVehicleInfo,
          estimated_arrival: prepETA,
          items: itemsToPrep
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to prepare delivery.');
      }

      const data = await res.json();
      addNotification(
        'Delivery Prepared',
        `Delivery #${data.delivery.delivery_number} packed and ready for dispatch.`,
        'SUCCESS'
      );

      setIsPrepModalOpen(false);
      setSelectedReqToPrep(null);
      fetchData();
      setActiveTab('deliveries');
    } catch (err: any) {
      alert(err.message || 'Error preparing delivery');
    } finally {
      setSubmittingPrep(false);
    }
  };

  // Open Dispatch Modal
  const handleOpenDispatchModal = (delivery: Delivery) => {
    setSelectedDeliveryToDispatch(delivery);
    setDispatchDriver(delivery.driver_name || 'Mang Boy (Tagpuan Logistics)');
    setDispatchVehicle(delivery.vehicle_info || 'L300 Van - Plate NAK-4821');
    setDispatchETA(delivery.estimated_arrival || 'En route (approx. 45 mins)');
    setIsDispatchModalOpen(true);
  };

  // Submit Dispatch
  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliveryToDispatch) return;

    try {
      setSubmittingDispatch(true);
      const res = await fetch(`/api/deliveries/${selectedDeliveryToDispatch.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          driver_name: dispatchDriver,
          vehicle_info: dispatchVehicle,
          estimated_arrival: dispatchETA
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to dispatch delivery.');
      }

      addNotification(
        'Delivery Dispatched',
        `Delivery #${selectedDeliveryToDispatch.delivery_number} is out for delivery to ${selectedDeliveryToDispatch.destination_branch_name}.`,
        'SUCCESS'
      );

      setIsDispatchModalOpen(false);
      setSelectedDeliveryToDispatch(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error dispatching delivery');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  // Open Receive Modal (Branch or Owner)
  const handleOpenReceiveModal = (delivery: Delivery) => {
    setSelectedDeliveryToReceive(delivery);
    const initialRec: Record<string, number> = {};
    const initialRej: Record<string, number> = {};
    const initialRejReas: Record<string, string> = {};

    delivery.items.forEach((item) => {
      initialRec[item.ingredient_id] = item.prepared_quantity;
      initialRej[item.ingredient_id] = 0;
      initialRejReas[item.ingredient_id] = '';
    });

    setReceivedQuantities(initialRec);
    setRejectedQuantities(initialRej);
    setRejectionReasons(initialRejReas);
    setReceivingNotes('');
    setIsReceiveModalOpen(true);
  };

  // Submit Receiving Inspection
  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliveryToReceive) return;

    try {
      setSubmittingReceive(true);
      const itemsPayload = selectedDeliveryToReceive.items.map((it) => ({
        ingredient_id: it.ingredient_id,
        received_quantity: Number(receivedQuantities[it.ingredient_id] || 0),
        rejected_quantity: Number(rejectedQuantities[it.ingredient_id] || 0),
        rejection_reason: rejectionReasons[it.ingredient_id] || undefined
      }));

      const res = await fetch(`/api/deliveries/${selectedDeliveryToReceive.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notes: receivingNotes || undefined,
          items: itemsPayload
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete receiving inspection.');
      }

      addNotification(
        'Delivery Received & Stock Synchronized',
        `Delivery #${selectedDeliveryToReceive.delivery_number} received. Branch stock updated without leakage.`,
        'SUCCESS'
      );

      setIsReceiveModalOpen(false);
      setSelectedDeliveryToReceive(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error receiving delivery');
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Direct 1-Click Fulfill & Dispatch Request
  const handleDirectFulfillRequest = async (req: RequestOrder) => {
    try {
      setFulfillingRequestId(req.id);
      const res = await fetch(`/api/branch-requests/${req.id}/direct-fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to direct fulfill branch request.');
      }
      addNotification(
        'Request Direct Dispatched',
        `Request #${req.request_number} packed and marked out for delivery to ${req.branch_name}!`,
        'SUCCESS'
      );
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error fulfilling request');
    } finally {
      setFulfillingRequestId(null);
    }
  };

  // Quick Restock Commissary Handlers
  const handleOpenQuickRestock = (ingredientId?: string) => {
    setQuickRestockIngredientId(ingredientId || (warehouseStock[0]?.ingredient_id || ''));
    setQuickRestockQuantity(50);
    setQuickRestockReason('Central Commissary Direct Restock');
    setQuickRestockError(null);
    setIsQuickRestockModalOpen(true);
  };

  const handleExecuteQuickRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    const ingId = quickRestockIngredientId || (warehouseStock[0]?.ingredient_id || '');
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

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#CDEBC5] text-[#111111] border border-[#a3dc95]">
            <CheckCircle2 className="w-3 h-3 text-[#111111]" />
            Delivered & Received
          </span>
        );
      case 'PARTIALLY_DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3" />
            Partially Received
          </span>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <Truck className="w-3 h-3" />
            Out for Delivery
          </span>
        );
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
            <Boxes className="w-3 h-3" />
            Ready for Dispatch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-800">
            {status}
          </span>
        );
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'FOR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Review
          </span>
        );
      case 'APPROVED':
      case 'FOR_PREPARATION':
      case 'READY_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <PackageCheck className="w-3 h-3 text-blue-600" />
            Approved & Preparing
          </span>
        );
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300 animate-pulse">
            <Truck className="w-3 h-3 text-purple-600" />
            Out for Delivery
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Delivered & Restocked
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
            <X className="w-3 h-3 text-red-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-800">
            {status}
          </span>
        );
    }
  };

  const getRequestPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-xs">
            <Flame className="w-3 h-3 fill-white" />
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
            HIGH PRIORITY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600">
            NORMAL
          </span>
        );
    }
  };

  const getCommissaryStock = (ingredientId: string) => {
    const item = warehouseStock.find((s) => s.ingredient_id === ingredientId);
    return item ? item.current_stock : 0;
  };

  const filteredRequests = requestOrders.filter((req) => {
    const matchesSearch =
      (req.branch_name || '').toLowerCase().includes(reqSearchQuery.toLowerCase()) ||
      (req.request_number || '').toLowerCase().includes(reqSearchQuery.toLowerCase()) ||
      req.items.some((i) => (i.ingredient_name || '').toLowerCase().includes(reqSearchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (reqStatusFilter === 'ALL') return true;
    if (reqStatusFilter === 'PENDING') return ['SUBMITTED', 'FOR_REVIEW'].includes(req.status);
    if (reqStatusFilter === 'APPROVED') return ['APPROVED', 'FOR_PREPARATION', 'READY_FOR_DELIVERY'].includes(req.status);
    if (reqStatusFilter === 'OUT_FOR_DELIVERY') return ['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(req.status);
    if (reqStatusFilter === 'DELIVERED') return req.status === 'DELIVERED';
    return req.status === reqStatusFilter;
  });

  const pendingApprovalCount = requestOrders.filter((r) =>
    ['SUBMITTED', 'FOR_REVIEW'].includes(r.status)
  ).length;

  if (!hasCommissaryAccess) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-red-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 font-black">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-zinc-900">Access Restricted: Master Owner & Warehouseman Only</h2>
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
          The Central Commissary & Logistics depot is strictly restricted to Master Owners and designated Warehousemen. Branch Managers, Cashiers, and Kitchen Crew must use the Branch Stock Requests tab to submit replenishment orders.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.href = '/?tab=requests'}
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
          >
            Go to Branch Stock Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#111111] text-[#CDEBC5]">
              PHASE 7
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#111111]">
              Central Commissary & Logistics
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Live branch replenishment monitoring, stock allocation, and dispatch tracking for Tagpuan Food Hub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isOwner || user?.role === 'WAREHOUSEMAN') && (
            <button
              type="button"
              id="btn-warehouse-quick-restock"
              onClick={() => handleOpenQuickRestock()}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              title="Directly increment Central Commissary stock for any raw ingredient"
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-200" />
              Quick Restock Commissary
            </button>
          )}
          <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            Central Commissary Depot: Pasig Hub
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'requests'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Live Branch Requests ({requestOrders.length})</span>
          {pendingApprovalCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white animate-pulse">
              {pendingApprovalCount} NEW
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'stock'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Commissary Stock ({warehouseStock.length})
        </button>

        <button
          onClick={() => setActiveTab('prep')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative whitespace-nowrap ${
            activeTab === 'prep'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          To Prepare & Pack ({pendingPrepRequests.length})
          {pendingPrepRequests.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'deliveries'
              ? 'bg-[#111111] text-[#CDEBC5]'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          Delivery Logistics ({deliveries.length})
        </button>
      </div>

      {/* TAB 0: LIVE DEDICATED REQUEST MONITORING DASHBOARD */}
      {activeTab === 'requests' && (
        <div className="space-y-5">
          {/* Live Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 block">Total Requests</span>
              <span className="text-xl font-black text-zinc-900">{requestOrders.length}</span>
            </div>
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-800 block">Pending Review</span>
              <span className="text-xl font-black text-amber-900">{pendingApprovalCount}</span>
            </div>
            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-blue-800 block">In Preparation</span>
              <span className="text-xl font-black text-blue-900">{pendingPrepRequests.length}</span>
            </div>
            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-purple-800 block">Out for Delivery</span>
              <span className="text-xl font-black text-purple-900">
                {requestOrders.filter((r) => ['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(r.status)).length}
              </span>
            </div>
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 block">Delivered & Restocked</span>
              <span className="text-xl font-black text-emerald-900">
                {requestOrders.filter((r) => r.status === 'DELIVERED').length}
              </span>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={reqSearchQuery}
                onChange={(e) => setReqSearchQuery(e.target.value)}
                placeholder="Search by branch, ticket (REQ-XXXXXX), or ingredient..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-[#111111] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {[
                { id: 'ALL', label: 'All Requests' },
                { id: 'PENDING', label: 'Pending Approval' },
                { id: 'APPROVED', label: 'Approved / In Prep' },
                { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
                { id: 'DELIVERED', label: 'Delivered' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReqStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    reqStatusFilter === tab.id
                      ? 'bg-[#111111] text-[#CDEBC5]'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Requests Cards / Monitoring List */}
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-zinc-200">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
              <p className="text-xs text-zinc-500 font-mono">Loading incoming branch stock requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 shadow-xs">
              <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-700">No branch requests match the filter criteria.</p>
              <p className="text-xs text-zinc-400 mt-1">
                New stock requests submitted by branch managers or autonomous AI will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden hover:border-zinc-300 transition"
                >
                  {/* Top Bar: Branch, Ticket, Date, Badges */}
                  <div className="p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#CDEBC5] flex items-center justify-center font-black shadow-xs">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-zinc-900">{req.branch_name}</h3>
                          <span className="font-mono text-xs font-bold text-zinc-600 bg-zinc-200/80 px-2 py-0.5 rounded-md">
                            {req.request_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {new Date(req.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          <span>•</span>
                          <span>By: <strong className="text-zinc-700">{req.created_by_name || 'Branch Manager'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getRequestPriorityBadge(req.priority)}
                      {getRequestStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Requested Items Breakdown with Commissary Stock Check */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
                      <span className="uppercase tracking-wider font-mono text-[11px]">
                        Requested Items Breakdown ({req.items.length} {req.items.length === 1 ? 'item' : 'items'}):
                      </span>
                      <span className="text-zinc-500 font-normal">
                        Depot: <strong className="text-zinc-800">Pasig Central Commissary</strong>
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-600 uppercase font-mono text-[10px]">
                          <tr>
                            <th className="px-3.5 py-2 rounded-l-lg">Raw Ingredient / Item</th>
                            <th className="px-3.5 py-2">Requested Qty</th>
                            <th className="px-3.5 py-2">Approved Qty</th>
                            <th className="px-3.5 py-2 rounded-r-lg">Commissary Depot Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {req.items.map((item) => {
                            const depotStock = getCommissaryStock(item.ingredient_id);
                            const isSufficient = depotStock >= (item.requested_quantity || 0);

                            return (
                              <tr key={item.id} className="hover:bg-zinc-50/50">
                                <td className="px-3.5 py-2.5">
                                  <div className="font-bold text-zinc-900">{item.ingredient_name}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">{item.ingredient_id.slice(0, 10)}...</div>
                                </td>
                                <td className="px-3.5 py-2.5 font-mono font-bold text-zinc-800">
                                  {item.requested_quantity} {item.unit}
                                </td>
                                <td className="px-3.5 py-2.5 font-mono font-bold">
                                  {item.approved_quantity !== null && item.approved_quantity !== undefined ? (
                                    <span className="text-blue-700">{item.approved_quantity} {item.unit}</span>
                                  ) : (
                                    <span className="text-zinc-400 font-normal italic">Pending review</span>
                                  )}
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                                      isSufficient
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    <Boxes className="w-3.5 h-3.5" />
                                    <span>{depotStock.toLocaleString()} {item.unit}</span>
                                    <span className="text-[9px] font-sans font-normal uppercase">
                                      ({isSufficient ? 'Ready' : 'Low Stock'})
                                    </span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {req.notes && (
                      <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600">
                        <strong className="text-zinc-800 font-semibold">Notes: </strong>
                        {req.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar for Warehouseman & Owner */}
                  <div className="p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-zinc-500">
                      {['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(req.status) ? (
                        <span className="inline-flex items-center gap-1.5 text-purple-700 font-bold">
                          <Truck className="w-4 h-4 animate-bounce" />
                          <span>Dispatched: Driver {req.driver_name || 'Logistics Team'} • {req.vehicle_info || 'Reefer Van'}</span>
                        </span>
                      ) : req.status === 'DELIVERED' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Delivery Confirmed & Restocked in Branch Inventory</span>
                        </span>
                      ) : (
                        <span>Status: <strong className="text-zinc-700">{req.status}</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* ACTION 1: APPROVE */}
                      {['SUBMITTED', 'FOR_REVIEW'].includes(req.status) && (
                        <button
                          type="button"
                          id={`btn-approve-req-${req.id}`}
                          disabled={processingReqId === req.id}
                          onClick={() => handleApproveRequest(req)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Approve this branch stock request"
                        >
                          {processingReqId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve</span>
                        </button>
                      )}

                      {/* ACTION 2: PREPARE DISPATCH */}
                      {['SUBMITTED', 'APPROVED', 'FOR_PREPARATION'].includes(req.status) && (
                        <button
                          type="button"
                          id={`btn-prepare-req-${req.id}`}
                          onClick={() => handleOpenPrepModal(req)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                          title="Inspect items, allocate quantities, and prepare packing delivery"
                        >
                          <PackageCheck className="w-3.5 h-3.5 text-[#CDEBC5]" />
                          <span>Prepare Dispatch</span>
                        </button>
                      )}

                      {/* ACTION 3: OUT FOR DELIVERY */}
                      {['SUBMITTED', 'APPROVED', 'FOR_PREPARATION', 'READY_FOR_DELIVERY'].includes(req.status) && (
                        <button
                          type="button"
                          id={`btn-dispatch-req-${req.id}`}
                          onClick={() => handleOpenDirectDispatch(req)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-sky-600 hover:bg-sky-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                          title="Assign vehicle/courier and dispatch out for delivery to branch"
                        >
                          <Truck className="w-3.5 h-3.5 text-white" />
                          <span>Out for Delivery</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: COMMISSARY STOCK */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 uppercase font-mono tracking-wider">
                Central Inventory Balance
              </span>
              <span className="text-xs text-zinc-500">
                Replenished via Owner Purchase Orders • Deducted via Dispatched Deliveries
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
                <p className="text-xs text-zinc-500 font-mono">Loading central commissary stock...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-mono font-bold text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Code</th>
                      <th className="px-5 py-3.5">Raw Ingredient</th>
                      <th className="px-5 py-3.5">Commissary On-Hand Stock</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {warehouseStock.map((stock) => (
                      <tr key={stock.ingredient_id} className="hover:bg-zinc-50 transition">
                        <td className="px-5 py-4 font-mono font-bold text-zinc-500">
                          {stock.item_code}
                        </td>
                        <td className="px-5 py-4 font-bold text-zinc-900">
                          {stock.ingredient_name}
                        </td>
                        <td className="px-5 py-4 font-mono font-black text-[#111111] text-sm">
                          {stock.current_stock.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">{stock.unit}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            stock.current_stock > 500
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : stock.current_stock > 100
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-red-100 text-red-900 border border-red-300'
                          }`}>
                            {stock.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickRestock(stock.ingredient_id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 transition flex items-center gap-1 ml-auto cursor-pointer"
                            title="Directly add intake to Commissary"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            Add Intake
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS TO PREPARE */}
      {activeTab === 'prep' && (
        <div className="space-y-4">
          {pendingPrepRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-700">All Approved Requests are Packed!</p>
              <p className="text-xs text-zinc-400 mt-1">
                No branch requests currently awaiting warehouse packaging.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingPrepRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-[#111111]">
                            {req.request_number}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                            Approved by Owner
                          </span>
                        </div>
                        <h3 className="text-base font-black text-zinc-900 mt-1">{req.branch_name}</h3>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-4 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2">
                      <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                        Approved Items to Pack
                      </div>
                      <div className="space-y-1">
                        {req.items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-800 font-medium">{it.ingredient_name}</span>
                            <span className="font-mono font-bold text-[#111111]">
                              {it.approved_quantity || it.requested_quantity} {it.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {req.delivery_notes && (
                      <p className="text-xs text-zinc-500 italic mt-3">
                        "{req.delivery_notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={fulfillingRequestId === req.id}
                      onClick={() => handleDirectFulfillRequest(req)}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                      title="1-Click Direct Dispatch: Bypass packing step to immediately fulfill request and dispatch delivery"
                    >
                      {fulfillingRequestId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      )}
                      1-Click Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPrepModal(req)}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                    >
                      <PackageCheck className="w-4 h-4" />
                      Pack & Prepare Delivery
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DELIVERIES & LOGISTICS */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          {deliveries.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
              <Truck className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-700">No Active Deliveries</p>
              <p className="text-xs text-zinc-400 mt-1">
                Deliveries appear here once packed by the warehouse team.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#111111]">
                        {delivery.delivery_number}
                      </span>
                      {getDeliveryStatusBadge(delivery.status)}
                      <span className="text-xs font-mono text-zinc-400">
                        Ref: {delivery.request_number}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-zinc-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Destination: <strong className="text-zinc-900">{delivery.destination_branch_name}</strong></span>
                      </div>

                      {delivery.driver_name && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Driver: <strong className="text-zinc-900">{delivery.driver_name}</strong></span>
                        </div>
                      )}

                      {delivery.vehicle_info && (
                        <div className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Vehicle: <strong className="text-zinc-900">{delivery.vehicle_info}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500">
                      <strong>Items ({delivery.items.length}):</strong>{' '}
                      {delivery.items.map((i) => `${i.prepared_quantity} ${i.unit} ${i.ingredient_name}`).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {delivery.status === 'READY_FOR_PICKUP' && (
                      <button
                        onClick={() => handleOpenDispatchModal(delivery)}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Dispatch Delivery
                      </button>
                    )}

                    {(delivery.status === 'OUT_FOR_DELIVERY' || delivery.status === 'PARTIALLY_DELIVERED') && (
                      <button
                        onClick={() => handleOpenReceiveModal(delivery)}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Inspect & Receive at Branch
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: PREPARE DELIVERY */}
      {isPrepModalOpen && selectedReqToPrep && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h2 className="text-base font-black text-[#111111]">
                  Pack Delivery for {selectedReqToPrep.branch_name}
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  Request #{selectedReqToPrep.request_number} • Warehouse Fulfillment
                </p>
              </div>
              <button
                onClick={() => setIsPrepModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPreparation} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Assigned Driver
                  </label>
                  <input
                    type="text"
                    required
                    value={prepDriverName}
                    onChange={(e) => setPrepDriverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Vehicle Details
                  </label>
                  <input
                    type="text"
                    required
                    value={prepVehicleInfo}
                    onChange={(e) => setPrepVehicleInfo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Estimated Arrival Time
                </label>
                <input
                  type="text"
                  value={prepETA}
                  onChange={(e) => setPrepETA(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              {/* Items to pack */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
                  Items to Pack (Quantity)
                </label>
                {selectedReqToPrep.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-bold text-xs text-zinc-900">{item.ingredient_name}</div>
                      <div className="text-[11px] text-zinc-500">
                        Approved: {item.approved_quantity || item.requested_quantity} {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-zinc-500">Packed ({item.unit}):</label>
                      <input
                        type="number"
                        min="1"
                        value={prepQuantities[item.ingredient_id] ?? (item.approved_quantity || item.requested_quantity)}
                        onChange={(e) =>
                          setPrepQuantities({
                            ...prepQuantities,
                            [item.ingredient_id]: Number(e.target.value)
                          })
                        }
                        className="w-24 px-2 py-1 rounded-lg border border-zinc-300 text-xs font-mono font-bold text-center bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrepModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPrep}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2"
                >
                  {submittingPrep && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Packaging
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH DELIVERY */}
      {isDispatchModalOpen && selectedDeliveryToDispatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h2 className="text-base font-black text-[#111111]">
                Dispatch Delivery #{selectedDeliveryToDispatch.delivery_number}
              </h2>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispatch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  required
                  value={dispatchDriver}
                  onChange={(e) => setDispatchDriver(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Vehicle / Plate Number
                </label>
                <input
                  type="text"
                  required
                  value={dispatchVehicle}
                  onChange={(e) => setDispatchVehicle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Estimated Arrival
                </label>
                <input
                  type="text"
                  value={dispatchETA}
                  onChange={(e) => setDispatchETA(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2"
                >
                  {submittingDispatch && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Dispatch Van
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BRANCH RECEIVING INSPECTION */}
      {isReceiveModalOpen && selectedDeliveryToReceive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h2 className="text-base font-black text-[#111111]">
                  Branch Receiving Inspection
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  Delivery #{selectedDeliveryToReceive.delivery_number} • Destination: {selectedDeliveryToReceive.destination_branch_name}
                </p>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Confirming this delivery automatically increments your branch inventory and transfers stock out of Central Commissary without double-deduction.
                </span>
              </div>

              {/* Items Inspection Table */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
                  Item Quality & Quantity Verification
                </label>
                {selectedDeliveryToReceive.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-zinc-900">{item.ingredient_name}</span>
                        <div className="text-[11px] text-zinc-500">
                          Dispatched: {item.prepared_quantity} {item.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <label className="block text-[10px] font-bold text-emerald-700 uppercase">Received</label>
                          <input
                            type="number"
                            min="0"
                            max={item.prepared_quantity}
                            value={receivedQuantities[item.ingredient_id] ?? item.prepared_quantity}
                            onChange={(e) =>
                              setReceivedQuantities({
                                ...receivedQuantities,
                                [item.ingredient_id]: Number(e.target.value)
                              })
                            }
                            className="w-full px-2 py-1 rounded border border-zinc-300 text-xs font-mono font-bold text-center bg-white"
                          />
                        </div>

                        <div className="w-24">
                          <label className="block text-[10px] font-bold text-red-700 uppercase">Rejected</label>
                          <input
                            type="number"
                            min="0"
                            value={rejectedQuantities[item.ingredient_id] ?? 0}
                            onChange={(e) =>
                              setRejectedQuantities({
                                ...rejectedQuantities,
                                [item.ingredient_id]: Number(e.target.value)
                              })
                            }
                            className="w-full px-2 py-1 rounded border border-zinc-300 text-xs font-mono font-bold text-center bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {(rejectedQuantities[item.ingredient_id] || 0) > 0 && (
                      <div>
                        <input
                          type="text"
                          placeholder="Reason for rejection (e.g. Broken packaging, melted patties)..."
                          value={rejectionReasons[item.ingredient_id] || ''}
                          onChange={(e) =>
                            setRejectionReasons({
                              ...rejectionReasons,
                              [item.ingredient_id]: e.target.value
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-red-300 text-xs bg-red-50 text-red-900 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Receiving / Delivery Notes
                </label>
                <textarea
                  rows={2}
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g. Delivered on time in good temperature conditions."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReceive}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2"
                >
                  {submittingReceive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Intake & Increment Stock
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
                  Instantly increments the Central Commissary stock balance so branch requests can be fulfilled without delay.
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
                  {warehouseStock.map(stock => (
                    <option key={stock.ingredient_id} value={stock.ingredient_id}>
                      {stock.ingredient_name} ({stock.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Quantity to Add ({warehouseStock.find(s => s.ingredient_id === quickRestockIngredientId)?.unit || 'units'})
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
                  Reason / Reference
                </label>
                <input
                  type="text"
                  value={quickRestockReason}
                  onChange={(e) => setQuickRestockReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-emerald-700"
                  placeholder="e.g. Central Commissary Production Batch Intake"
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

      {/* DIRECT DISPATCH MODAL FOR BRANCH REQUEST */}
      {isDirectDispatchModalOpen && selectedReqForDirectDispatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">
                    Dispatch Request #{selectedReqForDirectDispatch.request_number}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Destination: <strong className="text-zinc-800">{selectedReqForDirectDispatch.branch_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDirectDispatchModalOpen(false);
                  setSelectedReqForDirectDispatch(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-xs">
              <div className="font-bold text-zinc-700 mb-1">
                Dispatched Items Breakdown ({selectedReqForDirectDispatch.items.length}):
              </div>
              <ul className="divide-y divide-zinc-200/60 max-h-32 overflow-y-auto pr-1">
                {selectedReqForDirectDispatch.items.map((item) => (
                  <li key={item.id} className="py-1 flex items-center justify-between">
                    <span className="text-zinc-800 font-medium">{item.ingredient_name}</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {item.approved_quantity || item.requested_quantity} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleExecuteDirectDispatch} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Logistics Driver / Courier
                  </label>
                  <input
                    type="text"
                    required
                    value={directDispatchDriver}
                    onChange={(e) => setDirectDispatchDriver(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500 font-medium"
                    placeholder="e.g. Mang Boy (Tagpuan Logistics)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Vehicle / Reefer Info
                  </label>
                  <input
                    type="text"
                    required
                    value={directDispatchVehicle}
                    onChange={(e) => setDirectDispatchVehicle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500 font-medium"
                    placeholder="e.g. L300 Van - Plate NAK-4821"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Estimated Arrival (ETA)
                </label>
                <input
                  type="text"
                  required
                  value={directDispatchETA}
                  onChange={(e) => setDirectDispatchETA(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500 font-medium"
                  placeholder="e.g. Within 2 Hours / Today at 3:30 PM"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDirectDispatchModalOpen(false);
                    setSelectedReqForDirectDispatch(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingReqId === selectedReqForDirectDispatch.id}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {processingReqId === selectedReqForDirectDispatch.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Confirm & Out for Delivery</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
