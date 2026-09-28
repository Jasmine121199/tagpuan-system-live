import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { api } from '../../lib/api';
import {
  Monitor,
  Clock,
  User,
  Phone,
  ShoppingBag,
  UtensilsCrossed,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  DollarSign,
  X,
  Volume2
} from 'lucide-react';

interface IncomingKioskOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  onSelectOrderForPayment: (order: Order) => void;
}

export const IncomingKioskOrdersModal: React.FC<IncomingKioskOrdersModalProps> = ({
  isOpen,
  onClose,
  branchId,
  branchName,
  onSelectOrderForPayment
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const fetchKioskOrders = async () => {
    try {
      setError(null);
      const res = await api.getOrders({
        branch_id: branchId && branchId !== 'ALL' ? branchId : undefined,
        status: 'PENDING_PAYMENT',
        source: 'KIOSK'
      });
      // Filter strictly for this branch and pending status
      const filtered = (res.orders || []).filter(
        o => (!branchId || branchId === 'ALL' || o.branch_id === branchId) &&
             o.status === 'PENDING_PAYMENT' &&
             (o.source === 'SELF_ORDERING' || o.source === 'KIOSK')
      );
      setOrders(filtered);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incoming kiosk orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchKioskOrders();

    const interval = setInterval(fetchKioskOrders, 3500);
    return () => clearInterval(interval);
  }, [isOpen, branchId]);

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel Kiosk Order #${orderNumber}?`);
    if (!confirmCancel) return;

    try {
      setCancellingOrderId(orderId);
      await api.cancelKioskOrder(orderId, 'Cancelled by Cashier at POS Counter');
      await fetchKioskOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (!isOpen) return null;

  const calculateMinutesAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff <= 0) return 'Just now';
    if (diff === 1) return '1 min ago';
    return `${diff} mins ago`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Incoming Kiosk Orders</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#CDEBC5] text-[#111111]">
                  {orders.length} PENDING
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                {branchName} • Self-Ordering Queue awaiting counter payment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchKioskOrders}
              className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-zinc-50">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && orders.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-600" />
              <p className="text-xs font-bold">Checking for new kiosk orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 space-y-3 bg-white rounded-2xl border border-zinc-200">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800">Queue is Clear!</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  No unpaid kiosk orders waiting at the counter.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const isTakeOut = order.notes?.includes('[TAKE OUT]');
                const tableLabel = order.table_number
                  ? (order.table_number.toLowerCase().startsWith('table') ? order.table_number : `Table ${order.table_number}`)
                  : (order.notes?.match(/\[(Table\s*[^\]]+)\]/i)?.[1] || (order.is_mobile_order ? 'Mobile Dine-In' : null));

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl p-4.5 border border-zinc-200 hover:border-zinc-300 shadow-xs transition-all space-y-3.5"
                  >
                    {/* Top Row: Order #, Badge, Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-base font-black font-mono text-zinc-900">
                          #{order.order_number}
                        </span>

                        {tableLabel && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-300 flex items-center gap-1 shadow-xs">
                            <span>🍽️</span>
                            <span>[{tableLabel}]</span>
                          </span>
                        )}

                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isTakeOut
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {isTakeOut ? <ShoppingBag className="w-3 h-3" /> : <UtensilsCrossed className="w-3 h-3" />}
                          {isTakeOut ? 'TAKE OUT' : 'DINE IN'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                          {order.is_mobile_order || tableLabel ? 'TABLE QR MOBILE' : 'SELF-ORDER KIOSK'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{calculateMinutesAgo(order.created_at)}</span>
                      </div>
                    </div>

                    {/* Customer Info if provided */}
                    {(order.customer_name || order.customer_phone) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                        {order.customer_name && (
                          <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Customer: {order.customer_name}</span>
                          </div>
                        )}
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5 font-mono text-zinc-600">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{order.customer_phone}</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                              ★ Loyalty Eligible
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items Breakdown */}
                    <div className="space-y-1.5 text-xs text-zinc-700 bg-zinc-50/70 p-3 rounded-xl border border-zinc-100">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-zinc-900">{item.quantity}x</span>{' '}
                            <span>{item.product_name}</span>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="text-[11px] text-zinc-500 pl-4">
                                {item.modifiers.map(m => `+ ${m.modifier_name}`).join(', ')}
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-[11px] text-amber-800 italic pl-4">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>
                          <span className="font-mono font-semibold text-zinc-900">
                            ₱{item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Actions: Total & Collect Payment */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                      <div>
                        <span className="text-[11px] text-zinc-500 font-bold block uppercase tracking-wider">
                          Total Due:
                        </span>
                        <span className="text-xl font-black text-zinc-900 font-mono">
                          ₱{order.total.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={cancellingOrderId === order.id}
                          onClick={() => handleCancelOrder(order.id, order.order_number)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-red-600 hover:bg-red-50 border border-zinc-200 transition"
                        >
                          {cancellingOrderId === order.id ? 'Cancelling...' : 'Void Order'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectOrderForPayment(order);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-zinc-800 text-[#CDEBC5] font-black text-xs transition flex items-center gap-2 shadow-md active:scale-95"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Collect Payment (₱{order.total.toFixed(2)})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Auto-refreshing every 3.5 seconds</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
