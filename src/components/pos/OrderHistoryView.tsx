import React, { useState, useEffect } from 'react';
import { Order, Branch, UserRole, ReceiptData, PaymentMethod, PaymentConfiguration } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Ban,
  Printer,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Loader2,
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  Banknote,
  QrCode,
  CreditCard,
  Check
} from 'lucide-react';
import {
  deductInventoryForOrderItems,
  dispatchOrderToKDS,
  generateReceiptForOrder
} from '../../utils/orderPaymentUtils';

interface OrderHistoryViewProps {
  onBackToPOS: () => void;
  onViewReceipt: (orderId: string, directReceipt?: ReceiptData) => void;
  branches: Branch[];
  paymentConfigs?: PaymentConfiguration[];
  onLoadOrderToCart?: (order: Order) => void;
  onOrderPaid?: (order: Order, payment: any, receipt: ReceiptData) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  onBackToPOS,
  onViewReceipt,
  branches,
  paymentConfigs,
  onLoadOrderToCart,
  onOrderPaid
}) => {
  const { user, isOwner } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Payment Tender modal state
  const [isTenderActive, setIsTenderActive] = useState(false);
  const [tenderMethod, setTenderMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [tenderRefNumber, setTenderRefNumber] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [tenderError, setTenderError] = useState<string | null>(null);

  // Void modal state
  const [voidModalOrder, setVoidModalOrder] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const isOrderUnpaid = (order: Order | null): boolean => {
    if (!order) return false;
    const paymentStatus = order.payment_status as string | undefined;
    const orderStatus = order.status as string;
    return (
      paymentStatus === 'UNPAID' ||
      paymentStatus === 'PENDING' ||
      orderStatus === 'PENDING_PAYMENT' ||
      orderStatus === 'UNPAID' ||
      (orderStatus !== 'PAID' && orderStatus !== 'VOIDED' && orderStatus !== 'CANCELLED' && orderStatus !== 'COMPLETED')
    );
  };

  const handleStartPayment = (order: Order) => {
    setSelectedOrder(order);
    setIsTenderActive(true);
    setTenderMethod('CASH');
    setCashTendered(order.total.toString());
    setTenderRefNumber('');
    setTenderError(null);
  };

  const handleLoadOrderToCart = (order: Order) => {
    if (onLoadOrderToCart) {
      onLoadOrderToCart(order);
    } else {
      onBackToPOS();
    }
    setSelectedOrder(null);
    setIsTenderActive(false);
  };

  const handleConfirmOrderPayment = async () => {
    if (!selectedOrder) return;
    setTenderError(null);

    const total = selectedOrder.total;
    const numCash = parseFloat(cashTendered) || 0;
    const change = Math.max(0, Math.round((numCash - total) * 100) / 100);

    if (tenderMethod === 'CASH') {
      if (numCash < total) {
        setTenderError(`Cash tendered (₱${numCash.toFixed(2)}) is less than total bill (₱${total.toFixed(2)}).`);
        return;
      }
    } else {
      if (!tenderRefNumber.trim()) {
        setTenderError(`Reference Number is required for ${tenderMethod} payment.`);
        return;
      }
    }

    try {
      setIsProcessingPayment(true);
      const token = localStorage.getItem('tagpuan_token') || localStorage.getItem('tagpuan_auth_token');

      const response = await fetch(`/api/pos/orders/${selectedOrder.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          payment_method: tenderMethod,
          amount_received: tenderMethod === 'CASH' ? numCash : total,
          reference_number: tenderRefNumber.trim() || undefined,
          idempotency_key: `pay-${selectedOrder.id}-${Date.now()}`
        })
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {}

      // 1. Build updated paid order representation
      const updatedOrder: Order = (data && data.order) ? data.order : {
        ...selectedOrder,
        status: 'PAID',
        payment_status: 'PAID',
        kitchen_status: 'NEW',
        kitchen_received_at: new Date().toISOString(),
        payment: {
          id: `pay-${Date.now()}`,
          order_id: selectedOrder.id,
          order_number: selectedOrder.order_number,
          branch_id: selectedOrder.branch_id,
          payment_method: tenderMethod,
          amount: total,
          amount_received: tenderMethod === 'CASH' ? numCash : total,
          change_amount: change,
          reference_number: tenderRefNumber.trim() || null,
          payment_status: 'PAID',
          processed_by: user?.id || 'cashier',
          processed_by_name: user?.full_name || 'Cashier',
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      };

      // 2. Trigger automatic stock deduction for order ingredients
      deductInventoryForOrderItems(selectedOrder.items);

      // 3. Instantly dispatch order ticket to Kitchen Display System (KDS)
      dispatchOrderToKDS(updatedOrder);

      // 4. Generate thermal printable receipt
      const receipt: ReceiptData = (data && data.receipt) ? data.receipt : generateReceiptForOrder(
        updatedOrder,
        tenderMethod,
        tenderMethod === 'CASH' ? numCash : total,
        change,
        tenderRefNumber.trim() || undefined
      );

      // 5. Update orders list and local state
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setIsTenderActive(false);

      // Notify parent listeners
      if (onOrderPaid) {
        onOrderPaid(updatedOrder, updatedOrder.payment, receipt);
      }

      // Render thermal printable receipt
      onViewReceipt(updatedOrder.id, receipt);

      alert(`Payment Successful! Order #${updatedOrder.order_number} is now PAID, sent to KDS, and stock deducted.`);
    } catch (err: any) {
      setTenderError(err.message || 'Payment processing failed. Please check connection and retry.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('tagpuan_token');
      const params = new URLSearchParams();

      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (isOwner && branchFilter !== 'ALL') params.append('branch_id', branchFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await fetch(`/api/pos/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders || []);
        if (selectedOrder) {
          const refreshed = (data.orders || []).find((o: Order) => o.id === selectedOrder.id);
          if (refreshed) setSelectedOrder(refreshed);
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleUpdate = () => {
      fetchOrders();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tagpuan_kds_status_update' || e.key === 'tagpuan_latest_kitchen_order' || e.key === 'kds_orders') {
        fetchOrders();
      }
    };

    window.addEventListener('tagpuan:kds_order_updated', handleUpdate);
    window.addEventListener('tagpuan:order_paid', handleUpdate);
    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(fetchOrders, 5000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tagpuan:kds_order_updated', handleUpdate);
      window.removeEventListener('tagpuan:order_paid', handleUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [statusFilter, branchFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleVoidOrder = async () => {
    if (!voidModalOrder) return;
    if (!voidReason.trim()) {
      setVoidError('Void reason is mandatory.');
      return;
    }

    try {
      setIsVoiding(true);
      setVoidError(null);
      const token = localStorage.getItem('tagpuan_token');

      const response = await fetch(`/api/pos/orders/${voidModalOrder.id}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: voidReason.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to void order.');
      }

      setVoidModalOrder(null);
      setVoidReason('');
      fetchOrders();
    } catch (err: any) {
      setVoidError(err.message || 'Void operation failed.');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('Enter cancellation reason (e.g., Customer changed mind):');
    if (!reason) return;

    try {
      const token = localStorage.getItem('tagpuan_token');
      const response = await fetch(`/api/pos/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchOrders();
      } else {
        const data = await response.json();
        alert(data.error || 'Cancellation failed.');
      }
    } catch (err) {
      alert('Error cancelling order.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>PAID</span>
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            <span>UNPAID</span>
          </span>
        );
      case 'VOIDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
            <Ban className="w-3 h-3" />
            <span>VOIDED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-200 text-zinc-700">
            <XCircle className="w-3 h-3" />
            <span>CANCELLED</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  const getKitchenBadge = (kitchenStatus?: string | null) => {
    switch (kitchenStatus) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-zinc-900 text-[#CDEBC5]">
            <Clock className="w-2.5 h-2.5" />
            KITCHEN: NEW
          </span>
        );
      case 'PREPARING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
            <Clock className="w-2.5 h-2.5 text-orange-600" />
            PREPARING
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#CDEBC5] text-[#111111] border border-[#bfe3b6]">
            <CheckCircle2 className="w-2.5 h-2.5" />
            READY
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-600">
            SERVED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPOS}
            className="p-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
            title="Back to POS Terminal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight">
              Order Management & History
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              {isOwner ? 'All Branches Activity Log' : `${user?.branch_name || 'Assigned Branch'} Orders`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="p-2.5 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={onBackToPOS}
            className="px-4 py-2.5 rounded-xl bg-[#111111] text-[#CDEBC5] hover:bg-black font-extrabold text-xs transition"
          >
            Go to POS Register
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order # (e.g. TAG-000001), item, or cashier..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111]"
          />
        </form>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid Orders</option>
            <option value="PENDING_PAYMENT">Unpaid / Pending</option>
            <option value="VOIDED">Owner Voided</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Branch Filter (Owner only) */}
        {isOwner && (
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#111111]"
            >
              <option value="ALL">All 17 Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#111111] mb-2" />
            <p className="text-xs font-mono">Loading transaction records...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm font-bold text-zinc-700">No Orders Found</p>
            <p className="text-xs text-zinc-500 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-mono font-bold">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsTenderActive(false);
                    }}
                    className="hover:bg-zinc-50/80 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-black text-zinc-900">
                      {order.order_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-zinc-700">
                      {order.branch_name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {order.cashier_name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 max-w-[200px] truncate">
                      {order.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900">
                      ₱{order.total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div>{getStatusBadge(order.status)}</div>
                        {order.status === 'PAID' && order.kitchen_status && (
                          <div>{getKitchenBadge(order.kitchen_status)}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                      {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setIsTenderActive(false);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isOrderUnpaid(order) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartPayment(order);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-black text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] transition flex items-center gap-1 shadow-xs"
                            title="Collect Payment"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pay ₱{order.total.toFixed(2)}</span>
                          </button>
                        )}
                        {order.status === 'PAID' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewReceipt(order.id);
                            }}
                            className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        {isOwner && order.status === 'PAID' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVoidModalOrder(order);
                              setVoidReason('');
                              setVoidError(null);
                            }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
                            title="Owner Void Order"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === 'PENDING_PAYMENT' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                            className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition"
                            title="Cancel Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail & Payment Tender Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#111111] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isTenderActive ? (
                  <button
                    type="button"
                    onClick={() => setIsTenderActive(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition mr-1"
                    title="Back to Order Details"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : null}
                <div className="w-8 h-8 rounded-lg bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-bold">
                  {isTenderActive ? <DollarSign className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {isTenderActive
                      ? `Collect Payment: ${selectedOrder.order_number}`
                      : `Order Details: ${selectedOrder.order_number}`}
                  </h3>
                  <p className="text-xs text-zinc-400">{selectedOrder.branch_name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setIsTenderActive(false);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            {isTenderActive ? (
              /* PAYMENT TENDER INTERFACE */
              <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                {/* Total Due Card */}
                <div className="bg-[#111111] text-white p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#CDEBC5] font-bold">
                      Total Amount Due
                    </span>
                    <div className="text-2xl font-black font-mono text-white mt-0.5">
                      ₱{selectedOrder.total.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Order #{selectedOrder.order_number} • {selectedOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Order Type</span>
                    <div className="text-xs font-bold text-white uppercase mt-0.5">
                      {selectedOrder.order_type || 'DINE_IN'}
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase font-mono mb-2">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTenderMethod('CASH');
                        setTenderError(null);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                        tenderMethod === 'CASH'
                          ? 'bg-zinc-900 border-zinc-900 text-[#CDEBC5] font-black shadow-sm'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="text-xs">CASH</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTenderMethod('GCASH');
                        setTenderError(null);
                        if (!tenderRefNumber) {
                          setTenderRefNumber('GC-' + Math.floor(10000000 + Math.random() * 90000000));
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                        tenderMethod === 'GCASH'
                          ? 'bg-[#007DFE] border-[#007DFE] text-white font-black shadow-sm'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="text-xs">GCASH</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTenderMethod('MAYA');
                        setTenderError(null);
                        if (!tenderRefNumber) {
                          setTenderRefNumber('MY-' + Math.floor(10000000 + Math.random() * 90000000));
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                        tenderMethod === 'MAYA'
                          ? 'bg-[#299849] border-[#299849] text-white font-black shadow-sm'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs">MAYA</span>
                    </button>
                  </div>
                </div>

                {/* Cash Tendered & Change Computation */}
                {tenderMethod === 'CASH' ? (
                  <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase font-mono mb-1.5">
                        Cash Tendered (₱)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-zinc-500 text-base">
                          ₱
                        </span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={cashTendered}
                          onChange={(e) => {
                            setCashTendered(e.target.value);
                            setTenderError(null);
                          }}
                          placeholder={selectedOrder.total.toFixed(2)}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border-2 border-zinc-300 focus:border-zinc-900 rounded-xl text-lg font-mono font-black text-zinc-900 focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div>
                      <span className="block text-[10px] text-zinc-500 font-mono font-bold uppercase mb-1">
                        Quick Cash Presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCashTendered(selectedOrder.total.toString())}
                          className="px-2.5 py-1 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg font-mono font-bold text-xs text-zinc-800 cursor-pointer"
                        >
                          Exact ₱{selectedOrder.total.toFixed(2)}
                        </button>
                        {[100, 200, 500, 1000].map((preset) => {
                          if (preset >= selectedOrder.total) {
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCashTendered(preset.toString())}
                                className="px-2.5 py-1 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg font-mono font-bold text-xs text-zinc-800 cursor-pointer"
                              >
                                ₱{preset}
                              </button>
                            );
                          }
                          return null;
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(cashTendered) || selectedOrder.total;
                            setCashTendered((current + 50).toString());
                          }}
                          className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 rounded-lg font-mono font-bold text-xs text-zinc-800 cursor-pointer"
                        >
                          +₱50
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(cashTendered) || selectedOrder.total;
                            setCashTendered((current + 100).toString());
                          }}
                          className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 rounded-lg font-mono font-bold text-xs text-zinc-800 cursor-pointer"
                        >
                          +₱100
                        </button>
                      </div>
                    </div>

                    {/* Live Change Box */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        (parseFloat(cashTendered) || 0) >= selectedOrder.total
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider block">
                          {(parseFloat(cashTendered) || 0) >= selectedOrder.total ? 'Change Due to Customer' : 'Payment Status'}
                        </span>
                        <span className="text-xs">
                          {(parseFloat(cashTendered) || 0) >= selectedOrder.total
                            ? 'Exact tender verified'
                            : `Insufficient cash: needs ₱${(selectedOrder.total - (parseFloat(cashTendered) || 0)).toFixed(2)} more`}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black font-mono">
                          ₱{Math.max(0, (parseFloat(cashTendered) || 0) - selectedOrder.total).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Tagpuan Merchant Gateway</span>
                        <p className="font-bold text-zinc-900">{tenderMethod} Scan-to-Pay / Direct Transfer</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-zinc-900 text-[#CDEBC5]">
                        INSTANT VERIFIED
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase font-mono mb-1.5">
                        Transaction Reference / Approval Code *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tenderRefNumber}
                          onChange={(e) => {
                            setTenderRefNumber(e.target.value);
                            setTenderError(null);
                          }}
                          placeholder="e.g. 98234710129"
                          className="flex-1 px-3.5 py-2.5 bg-white border-2 border-zinc-300 focus:border-zinc-900 rounded-xl text-sm font-mono font-bold text-zinc-900 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setTenderRefNumber(`${tenderMethod.slice(0, 2)}-${Math.floor(10000000 + Math.random() * 90000000)}`)}
                          className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-xs font-bold text-zinc-800 transition cursor-pointer"
                          title="Generate Demo Ref #"
                        >
                          Auto Ref
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {tenderError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-xs font-medium">{tenderError}</span>
                  </div>
                )}
              </div>
            ) : (
              /* REGULAR ORDER DETAILS VIEW */
              <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Payment Status</p>
                    <div className="mt-0.5">{getStatusBadge(selectedOrder.status)}</div>
                    {selectedOrder.status === 'PAID' && selectedOrder.kitchen_status && (
                      <div className="mt-1.5">{getKitchenBadge(selectedOrder.kitchen_status)}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Cashier</p>
                    <p className="font-bold text-zinc-900">{selectedOrder.cashier_name}</p>
                  </div>
                </div>

                {selectedOrder.status === 'VOIDED' && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
                    <p className="font-bold">Order Voided by Owner</p>
                    <p className="mt-0.5">Reason: {selectedOrder.void_reason}</p>
                    <p className="text-[10px] text-red-600 mt-1">
                      Voided by {selectedOrder.voided_by_name} at{' '}
                      {selectedOrder.voided_at && new Date(selectedOrder.voided_at).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Line items */}
                <div>
                  <h4 className="font-bold text-zinc-900 uppercase font-mono text-[11px] mb-2">Order Line Items</h4>
                  <div className="space-y-2 border border-zinc-200 rounded-xl p-3 bg-zinc-50/50">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1.5 border-b border-zinc-200 last:border-0">
                        <div>
                          <p className="font-bold text-zinc-900">
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="pl-3 text-[11px] text-zinc-500">
                              {item.modifiers.map((m, mIdx) => (
                                <span key={mIdx} className="block">• {m.modifier_name} (+₱{m.additional_price.toFixed(2)})</span>
                              ))}
                            </div>
                          )}
                          {item.notes && <p className="text-[10px] text-zinc-400 italic pl-3">Note: {item.notes}</p>}
                        </div>
                        <span className="font-mono font-bold text-zinc-900">₱{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Subtotal:</span>
                    <span className="font-mono">₱{selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Discount:</span>
                      <span className="font-mono">-₱{selectedOrder.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-zinc-900 border-t border-zinc-200 pt-1">
                    <span>Grand Total:</span>
                    <span className="font-mono">₱{selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Info if paid */}
                {selectedOrder.payment && (
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                    <h4 className="font-bold text-zinc-900 uppercase font-mono text-[11px] mb-1">Payment Details</h4>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Payment Gateway:</span>
                      <span className="font-bold text-zinc-900">{selectedOrder.payment.payment_method}</span>
                    </div>
                    {selectedOrder.payment.payment_method === 'CASH' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Cash Received:</span>
                          <span className="font-mono">₱{(selectedOrder.payment.amount_received || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-zinc-700">Change Given:</span>
                          <span className="font-mono text-emerald-700">₱{(selectedOrder.payment.change_amount || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {selectedOrder.payment.reference_number && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Ref #:</span>
                        <span className="font-mono font-bold">{selectedOrder.payment.reference_number}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Controls */}
            {isTenderActive ? (
              <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsTenderActive(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition cursor-pointer"
                >
                  ← Back to Order
                </button>
                <button
                  type="button"
                  id="btn-confirm-collected-payment"
                  disabled={isProcessingPayment || (tenderMethod === 'CASH' && (parseFloat(cashTendered) || 0) < selectedOrder.total)}
                  onClick={handleConfirmOrderPayment}
                  className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition shadow-md cursor-pointer active:scale-95"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deducting Stock & Syncing KDS...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Payment (₱{selectedOrder.total.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Close
                  </button>
                  {isOrderUnpaid(selectedOrder) && (
                    <button
                      type="button"
                      id="btn-load-order-cart"
                      onClick={() => handleLoadOrderToCart(selectedOrder)}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-zinc-800 bg-zinc-200 hover:bg-zinc-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Load items to POS Cart for editing or adding more items"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Load Order to POS Cart</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(selectedOrder.payment_status === 'UNPAID' || selectedOrder.status === 'PENDING_PAYMENT' || isOrderUnpaid(selectedOrder)) ? (
                    <button
                      type="button"
                      id="btn-collect-payment"
                      onClick={() => handleStartPayment(selectedOrder)}
                      className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] flex items-center gap-2 transition shadow-md cursor-pointer active:scale-95"
                    >
                      <DollarSign className="w-4 h-4 text-[#111111]" />
                      <span>Collect Payment (₱{selectedOrder.total.toFixed(2)})</span>
                    </button>
                  ) : selectedOrder.status === 'PAID' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onViewReceipt(selectedOrder.id);
                        setSelectedOrder(null);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-[#111111] bg-[#CDEBC5] hover:bg-[#bce4b2] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Reprint Receipt</span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Void Modal */}
      {voidModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-red-200 overflow-hidden flex flex-col">
            <div className="bg-red-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">Owner Void Authorization</h3>
              </div>
              <button
                onClick={() => setVoidModalOrder(null)}
                className="p-1 rounded text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-zinc-700">
                You are about to void Order <span className="font-mono font-bold">#{voidModalOrder.order_number}</span> (₱{voidModalOrder.total.toFixed(2)}).
                This will mark the sales transaction as voided and record an audit log event.
              </p>

              {voidError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                  {voidError}
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-800 mb-1">
                  Mandatory Void Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Wrong customer order entered, cash refunded, items remade..."
                  className="w-full p-2.5 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-red-500 focus:outline-none bg-white text-zinc-900"
                />
              </div>
            </div>

            <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidModalOrder(null)}
                disabled={isVoiding}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVoidOrder}
                disabled={isVoiding || !voidReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isVoiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                <span>Confirm Order Void</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
