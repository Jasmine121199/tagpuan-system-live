import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  Bot,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Building,
  Check,
  X,
  Edit3,
  Flame,
  ArrowRight,
  ShieldCheck,
  Layers,
  PackageCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { CreateBranchRequestModal } from './CreateBranchRequestModal';
import {
  RequestOrder,
  RequestOrderItem,
  RequestOrderStatus,
  PriorityLevel,
  Ingredient,
  AIStockRecommendation,
  Branch
} from '../../types';

export const BranchRequestOrdersView: React.FC = () => {
  const { user, isOwner, isManager } = useAuth();
  const { addNotification } = useNotifications();

  const isWarehouseman = user?.role === 'WAREHOUSEMAN';
  const canDispatch = isOwner || isWarehouseman;
  const canReceive = isOwner || isManager || user?.role === 'MANAGER' || user?.role === 'CREW';

  const [requestOrders, setRequestOrders] = useState<RequestOrder[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIStockRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [stockReceivedToast, setStockReceivedToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestOrder | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Step 2 Dispatch Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchingRequest, setDispatchingRequest] = useState<RequestOrder | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    driver_name: 'Commissary Logistics Team',
    vehicle_info: 'Reefer Van #01',
    tracking_number: '',
    estimated_arrival: 'En route / Within 2 hours',
    notes: ''
  });
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Step 3 Receiving State
  const [receivingRequestId, setReceivingRequestId] = useState<string | null>(null);

  // Create Form State
  const [targetBranchId, setTargetBranchId] = useState<string>(user?.branch_id || '');

  // Owner/Manager Review / Edit State
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'EDIT'>('APPROVE');
  const [overrideReason, setOverrideReason] = useState('');
  const [editedItemQuantities, setEditedItemQuantities] = useState<Record<string, number>>({});
  const [submittingReview, setSubmittingReview] = useState(false);

  // Triggering AI restock
  const [triggeringRecId, setTriggeringRecId] = useState<string | null>(null);

  // Fetch all requests, ingredients, branches, and AI recommendations
  const fetchData = async () => {
    try {
      setLoading(true);
      const [loadedRequests, loadedIngredients, loadedBranches] = await Promise.all([
        api.getRequestOrders().catch(() => []),
        api.getIngredients().catch(() => []),
        api.getBranches().catch(() => [])
      ]);

      setRequestOrders(loadedRequests);
      setIngredients(loadedIngredients);
      setBranches(loadedBranches);

      fetchAIRecommendations();
    } catch (err) {
      console.error('Failed to load request orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIRecommendations = async () => {
    try {
      setLoadingAI(true);
      const res = await fetch('/api/ai/stock-recommendations', {
        headers: { ...api.getAuthHeaders() },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAiRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter requests
  const filteredRequests = requestOrders.filter((req) => {
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || req.branch_id === branchFilter;
    const matchesSearch =
      searchQuery === '' ||
      req.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.branch_name && req.branch_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (req.notes && req.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesBranch && matchesSearch;
  });

  // STEP 2: Open Warehouse Dispatch Modal
  const handleOpenDispatchModal = (req: RequestOrder) => {
    setDispatchingRequest(req);
    setDispatchForm({
      driver_name: 'Commissary Logistics Team',
      vehicle_info: 'Reefer Van #01',
      tracking_number: `TRK-${req.request_number}`,
      estimated_arrival: 'En route / Within 2 hours',
      notes: req.delivery_notes || ''
    });
    setIsDispatchModalOpen(true);
  };

  // STEP 2: Execute Warehouse Dispatch
  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingRequest) return;
    try {
      setSubmittingDispatch(true);
      const res = await api.dispatchRequestOrder(dispatchingRequest.id, dispatchForm);
      addNotification(
        'Stock Dispatched En Route',
        res.message || `Request #${dispatchingRequest.request_number} is now OUT FOR DELIVERY / IN TRANSIT to ${dispatchingRequest.branch_name || 'branch'}.`,
        'SUCCESS'
      );
      setIsDispatchModalOpen(false);
      setDispatchingRequest(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch request order.');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  // STEP 3: Branch Receiving & Auto-Stock Update
  const handleConfirmReceive = async (req: RequestOrder) => {
    try {
      setReceivingRequestId(req.id);
      const res = await api.confirmReceiveRequestOrder(req.id);
      setStockReceivedToast('Stock successfully added to branch inventory!');
      addNotification(
        'Delivery Confirmed & Stock Incremented',
        res.message || `Request #${req.request_number} delivered. Stock successfully added to ${req.branch_name || 'branch'} inventory!`,
        'SUCCESS'
      );
      setTimeout(() => {
        setStockReceivedToast(null);
      }, 7000);
      fetchData();
    } catch (err: any) {
      console.error('Failed to confirm physical delivery receipt:', err);
      addNotification('Receiving Error', err.message || 'Failed to confirm physical delivery receipt.', 'ALERT');
    } finally {
      setReceivingRequestId(null);
    }
  };

  // Trigger Autonomous AI Restock
  const handleTriggerAI = async (rec: AIStockRecommendation) => {
    try {
      setTriggeringRecId(rec.id);
      const res = await fetch('/api/ai/stock-requests/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          branch_id: rec.branch_id,
          ingredient_id: rec.ingredient_id,
          quantity: rec.suggested_quantity
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger AI restock.');
      }

      const data = await res.json();
      addNotification(
        'AI Restock Triggered',
        `AI generated Request #${data.requestOrder.request_number} for ${rec.branch_name}.`,
        'SUCCESS'
      );

      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error triggering AI request');
    } finally {
      setTriggeringRecId(null);
    }
  };

  // Open Review / Approve Modal (Owner Only)
  const handleOpenReviewModal = (req: RequestOrder) => {
    setSelectedRequest(req);
    const initialApproved: Record<string, number> = {};
    req.items.forEach((item) => {
      initialApproved[item.ingredient_id] = item.approved_quantity || item.requested_quantity;
    });
    setEditedItemQuantities(initialApproved);
    setReviewAction('APPROVE');
    setOverrideReason('');
    setIsReviewModalOpen(true);
  };

  // Submit Review (Owner Only)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setSubmittingReview(true);
      const itemsPayload = Object.entries(editedItemQuantities).map(([ingId, qty]) => ({
        ingredient_id: ingId,
        approved_quantity: Number(qty)
      }));

      const res = await fetch(`/api/request-orders/${selectedRequest.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: reviewAction,
          editData: {
            override_reason: overrideReason || undefined,
            items: reviewAction === 'EDIT' ? itemsPayload : undefined
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to review request order.');
      }

      addNotification(
        `Request ${reviewAction}`,
        `Request #${selectedRequest.request_number} marked as ${reviewAction}.`,
        'SUCCESS'
      );

      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error reviewing request');
    } finally {
      setSubmittingReview(false);
    }
  };

  // 1-Click Approve & Deliver Instantly from Review modal
  const handleApproveAndDeliverNow = async () => {
    if (!selectedRequest) return;
    try {
      setSubmittingReview(true);
      await api.reviewRequestOrder(selectedRequest.id, 'APPROVE');
      const res = await api.directFulfillRequestOrder(selectedRequest.id);
      addNotification(
        'Stock Approved & Restocked',
        res.message || `Request #${selectedRequest.request_number} approved, delivered, and added to ${selectedRequest.branch_name} inventory!`,
        'SUCCESS'
      );
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error fulfilling request: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: RequestOrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#CDEBC5] text-[#111111] border border-[#a3dc95]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
            Delivered & Received
          </span>
        );
      case 'PARTIALLY_DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3" />
            Partially Delivered
          </span>
        );
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300 animate-pulse">
            <Truck className="w-3.5 h-3.5 text-sky-700" />
            OUT FOR DELIVERY / EN ROUTE
          </span>
        );
      case 'READY_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
            <Check className="w-3 h-3" />
            Packed / Ready for Dispatch
          </span>
        );
      case 'APPROVED':
      case 'FOR_PREPARATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Clock className="w-3 h-3" />
            Approved • In Warehouse Prep
          </span>
        );
      case 'SUBMITTED':
      case 'FOR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            SUBMITTED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
            <X className="w-3 h-3" />
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

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white">
            <Flame className="w-3 h-3" />
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
            HIGH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner for Stock In */}
      {stockReceivedToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 border border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-sm">{stockReceivedToast}</p>
              <p className="text-xs text-emerald-100">
                All delivered items have been automatically incremented into your branch active inventory and verified in the central ledger.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStockReceivedToast(null)}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition cursor-pointer"
          >
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
              Branch Stock Request & Replenishment
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {isOwner
              ? 'Multi-branch replenishment approval center with AI-driven inventory depletion intelligence.'
              : `Stock replenishment requests for assigned branch (${user?.branch_name || 'My Branch'}).`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-branch-new-stock-request"
            onClick={() => {
              setTargetBranchId(user?.branch_id || (branches[0]?.id || ''));
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#CDEBC5]" />
            New Stock Request
          </button>
        </div>
      </div>

      {/* AI AGENT RESTOCK INTELLIGENCE PANEL */}
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-6 rounded-3xl border border-zinc-800 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  AI Replenishment Agent
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#CDEBC5] text-[#111111] rounded-full">
                  AUTONOMOUS GUARD
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Continuous real-time inventory scan comparing POS depletions against reorder thresholds.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAIRecommendations}
            disabled={loadingAI}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#CDEBC5]" />}
            Rescan Stock
          </button>
        </div>

        {/* AI Recommendations Grid */}
        <div className="mt-5">
          {loadingAI ? (
            <div className="py-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#CDEBC5]" />
              Analyzing branch stock ratios...
            </div>
          ) : aiRecommendations.length === 0 ? (
            <div className="py-6 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#CDEBC5]" />
              All branches are currently operating above their configured safe reorder thresholds.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {aiRecommendations.slice(0, 6).map((rec) => {
                const isDepleted = rec.current_stock === 0;
                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                      isDepleted
                        ? 'bg-red-950/40 border-red-800/80 ring-1 ring-red-500/30'
                        : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-zinc-400 font-bold bg-zinc-800 px-2 py-0.5 rounded">
                            {rec.branch_name}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">{rec.ingredient_name}</h4>
                        </div>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isDepleted
                            ? 'text-red-400 bg-red-950/80 border-red-700 animate-pulse'
                            : 'text-amber-400 bg-amber-950/60 border-amber-800/50'
                        }`}>
                          {isDepleted ? '0 LEFT (DEPLETED)' : `${rec.current_stock} ${rec.unit} left`}
                        </span>
                      </div>

                      <p className={`text-[11px] mt-2 leading-relaxed font-medium ${isDepleted ? 'text-red-300' : 'text-zinc-300'}`}>
                        {rec.reason || `AI Restock Order: Request replenishment of ${rec.ingredient_name} from Central Commissary Warehouse.`}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-mono">Suggested Qty</span>
                        <span className="text-xs font-black text-[#CDEBC5] font-mono">
                          +{rec.suggested_quantity} {rec.unit}
                        </span>
                      </div>

                      {rec.has_pending_request ? (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-1 rounded border border-amber-800/50 flex items-center gap-1" title="Request already in-flight">
                          <Clock className="w-3 h-3" />
                          In-Flight ({rec.pending_request_numbers[0]})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTriggerAI(rec)}
                          disabled={triggeringRecId === rec.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 shadow-sm ${
                            isDepleted
                              ? 'bg-red-600 hover:bg-red-500 text-white'
                              : 'bg-[#CDEBC5] hover:bg-[#bde3b3] text-[#111111]'
                          }`}
                        >
                          {triggeringRecId === rec.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bot className="w-3.5 h-3.5" />
                          )}
                          ⚡ 1-Click Approve Restock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search request number, branch, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#111111]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white"
            >
              <option value="ALL">All 17 Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white"
          >
            <option value="ALL">All Request Statuses</option>
            <option value="SUBMITTED">Pending Approval</option>
            <option value="APPROVED">Approved / In Prep</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* REQUEST ORDERS TABLE */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
          <p className="text-xs text-zinc-500 font-mono">Loading request orders...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-zinc-700">No Request Orders Found</p>
          <p className="text-xs text-zinc-400 mt-1">
            Submit a new stock replenishment request to notify the Central Commissary.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-mono font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Request #</th>
                  <th className="px-5 py-3.5">Branch</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Items Requested</th>
                  <th className="px-5 py-3.5">Requester</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50 transition">
                    <td className="px-5 py-4 font-mono font-bold text-[#111111]">
                      <div className="flex items-center gap-1.5">
                        {req.request_number}
                        {req.is_ai_generated && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#CDEBC5] text-[#111111]">
                            AI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-zinc-900">{req.branch_name}</div>
                      {req.notes && <div className="text-[11px] text-zinc-400 truncate max-w-xs">{req.notes}</div>}

                      {/* Step 2 En Route Tracking Display for Branch Managers & All Roles */}
                      {(req.status === 'OUT_FOR_DELIVERY' || req.status === 'IN_TRANSIT') && (
                        <div className="mt-2 p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex flex-col gap-1 max-w-sm">
                          <div className="flex items-center gap-1.5 font-bold text-sky-900 text-[11px]">
                            <Truck className="w-3.5 h-3.5 text-sky-600 animate-pulse flex-shrink-0" />
                            <span>Stocks En Route from Commissary</span>
                          </div>
                          <div className="text-[10px] text-sky-800 flex items-center gap-1.5 flex-wrap">
                            <span>Driver: <strong className="font-bold">{req.driver_name || 'Commissary Courier'}</strong></span>
                            <span>•</span>
                            <span>Van: <strong className="font-bold">{req.vehicle_info || 'Reefer Van #01'}</strong></span>
                            <span>•</span>
                            <span className="text-sky-900 font-bold bg-sky-100 px-1.5 py-0.5 rounded">ETA: {req.estimated_arrival || 'Within 2h'}</span>
                          </div>
                          {req.tracking_number && (
                            <span className="text-[9px] font-mono text-sky-600">Tracking: {req.tracking_number}</span>
                          )}
                        </div>
                      )}

                      {req.status === 'DELIVERED' && req.received_at && (
                        <div className="mt-1 text-[10px] font-mono text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span>Received: {new Date(req.received_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {getPriorityBadge(req.priority)}
                    </td>
                    <td className="px-5 py-4 text-zinc-600">
                      <span className="font-semibold">{req.items.length} item{req.items.length > 1 ? 's' : ''}</span>
                      <div className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                        {req.items.map((i) => `${i.requested_quantity} ${i.unit} ${i.ingredient_name}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-zinc-900 font-medium">{req.requester_name}</div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        {new Date(req.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* STEP 2: Only WAREHOUSEMAN and MASTER OWNER can approve and process into OUT_FOR_DELIVERY / IN_TRANSIT */}
                        {canDispatch && ['SUBMITTED', 'FOR_REVIEW', 'APPROVED', 'FOR_PREPARATION', 'READY_FOR_DELIVERY'].includes(req.status) && (
                          <button
                            type="button"
                            id={`btn-dispatch-${req.id}`}
                            onClick={() => handleOpenDispatchModal(req)}
                            className="px-3 py-1.5 rounded-lg text-xs font-black bg-sky-600 hover:bg-sky-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                            title="Approve and dispatch stocks out for delivery"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Dispatch En Route
                          </button>
                        )}

                        {/* STEP 3: Action control when order reaches OUT_FOR_DELIVERY */}
                        {['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(req.status) && (
                          <button
                            type="button"
                            id={`btn-confirm-received-${req.id}`}
                            disabled={receivingRequestId === req.id}
                            onClick={() => handleConfirmReceive(req)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 disabled:opacity-50 ring-2 ring-emerald-400/40"
                            title="Confirm physical delivery arrival and automatically update branch active inventory"
                          >
                            {receivingRequestId === req.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Updating Inventory...</span>
                              </>
                            ) : (
                              <>
                                <span>✅ Confirm Received / Stock In</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Manager View indicator while waiting for warehouse dispatch */}
                        {!canDispatch && ['SUBMITTED', 'FOR_REVIEW', 'APPROVED', 'FOR_PREPARATION', 'READY_FOR_DELIVERY'].includes(req.status) && (
                          <span className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Warehouse Dispatch
                          </span>
                        )}

                        {/* Warehouseman View indicator while en route */}
                        {!canReceive && ['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(req.status) && (
                          <span className="px-2.5 py-1 text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-lg flex items-center gap-1">
                            <Truck className="w-3 h-3 text-sky-600 animate-pulse" />
                            En Route (Awaiting Branch Receipt)
                          </span>
                        )}

                        {/* Delivered state badge */}
                        {req.status === 'DELIVERED' && (
                          <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Restocked in Inventory
                          </span>
                        )}

                        {/* Owner/Manager Review option */}
                        {isOwner && ['SUBMITTED', 'FOR_REVIEW'].includes(req.status) && (
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(req)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REUSABLE CREATE BRANCH STOCK REQUEST MODAL */}
      <CreateBranchRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      {/* OWNER REVIEW / APPROVAL / OVERRIDE MODAL */}
      {isReviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div>
                <h2 className="text-base font-black text-[#111111]">
                  Review Request #{selectedRequest.request_number}
                </h2>
                <p className="text-xs text-zinc-500">
                  Branch: <span className="font-bold text-zinc-800">{selectedRequest.branch_name}</span> • Requester: {selectedRequest.requester_name}
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-2 uppercase tracking-wider font-mono">
                  Owner Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVE')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      reviewAction === 'APPROVE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Approve As-Is
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction('EDIT')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      reviewAction === 'EDIT'
                        ? 'bg-[#111111] text-[#CDEBC5] border-[#111111] shadow-sm'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Override Qty
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECT')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      reviewAction === 'REJECT'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Items List / Editable Quantities */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
                  Items to Fulfill
                </label>
                {selectedRequest.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-bold text-xs text-zinc-900">{item.ingredient_name}</div>
                      <div className="text-[11px] text-zinc-500">
                        Requested: {item.requested_quantity} {item.unit}
                      </div>
                    </div>

                    {reviewAction === 'EDIT' ? (
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-zinc-500">Approved:</label>
                        <input
                          type="number"
                          min="0"
                          value={editedItemQuantities[item.ingredient_id] ?? item.requested_quantity}
                          onChange={(e) =>
                            setEditedItemQuantities({
                              ...editedItemQuantities,
                              [item.ingredient_id]: Number(e.target.value)
                            })
                          }
                          className="w-24 px-2 py-1 rounded-lg border border-zinc-300 text-xs font-mono font-bold text-center bg-white"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-bold text-zinc-800">
                        {item.requested_quantity} {item.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {reviewAction === 'REJECT' ? 'Rejection Reason *' : 'Owner Notes / Override Reason'}
                </label>
                <textarea
                  rows={2}
                  required={reviewAction === 'REJECT'}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={
                    reviewAction === 'REJECT'
                      ? 'e.g. Excessive stock already at branch...'
                      : 'e.g. Approved for morning commissary run...'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={handleApproveAndDeliverNow}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Approve and directly restock destination branch inventory"
                >
                  <PackageCheck className="w-4 h-4" />
                  ⚡ Approve & Restock Branch Now
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#111111] hover:bg-black text-[#CDEBC5] transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {submittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Decision
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WAREHOUSE DISPATCH MODAL (STEP 2: WAREHOUSEMAN / MASTER OWNER) */}
      {isDispatchModalOpen && dispatchingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">
                    Dispatch Request #{dispatchingRequest.request_number}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Destination: <strong className="text-zinc-800">{dispatchingRequest.branch_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDispatchModalOpen(false);
                  setDispatchingRequest(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-xs">
              <div className="font-bold text-zinc-700 mb-1">
                Requested Items to Dispatch ({dispatchingRequest.items.length}):
              </div>
              <ul className="divide-y divide-zinc-200/60 max-h-28 overflow-y-auto pr-1">
                {dispatchingRequest.items.map((item) => (
                  <li key={item.id} className="py-1 flex items-center justify-between">
                    <span className="text-zinc-800 font-medium">{item.ingredient_name}</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {item.approved_quantity || item.requested_quantity} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleExecuteDispatch} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Courier / Driver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.driver_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500 font-medium"
                    placeholder="e.g. Kuya Noel (Logistics)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Vehicle / Plate #
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.vehicle_info}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_info: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500 font-medium"
                    placeholder="e.g. Reefer Van #01 (NEX-4421)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Estimated Arrival (ETA)
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.estimated_arrival}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, estimated_arrival: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500 font-medium"
                    placeholder="e.g. Today at 2:30 PM (Within 2 hrs)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Tracking / Waybill #
                  </label>
                  <input
                    type="text"
                    value={dispatchForm.tracking_number}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500 font-mono"
                    placeholder="e.g. TRK-00123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Dispatch Notes / Chill Temp (Optional)
                </label>
                <input
                  type="text"
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g. Sealed insulated reefer containers at -2°C"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDispatchModalOpen(false);
                    setDispatchingRequest(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {submittingDispatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      Confirm & Dispatch En Route
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
