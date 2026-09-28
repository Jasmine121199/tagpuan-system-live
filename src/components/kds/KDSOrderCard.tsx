import React, { useState, useEffect } from 'react';
import { Order, OrderItem } from '../../types';
import { getProductImageWithFallback, getFoodSvgForProduct } from '../../utils/foodSvgAssets';
import {
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Utensils,
  ChevronRight,
  User,
  ShoppingBag,
  Smile,
  Meh,
  Frown,
  Loader2,
  Gift,
  HelpCircle
} from 'lucide-react';

interface KDSOrderCardProps {
  order: Order;
  onStart: (orderId: string) => Promise<void>;
  onReady: (orderId: string) => Promise<void>;
  onDeliver?: (orderId: string) => Promise<void>;
  onComplete?: (orderId: string) => Promise<void>;
  onRecall: (orderId: string, targetStatus: 'NEW' | 'PREPARING') => Promise<void>;
}

export const KDSOrderCard: React.FC<KDSOrderCardProps> = ({
  order,
  onStart,
  onReady,
  onDeliver,
  onComplete,
  onRecall
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false);

  // Authoritative elapsed time calculation based on server timestamp
  // Continues accurately across refreshes, device sleep, or reconnects
  useEffect(() => {
    const receivedTime = new Date(order.kitchen_received_at || order.created_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - receivedTime) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.kitchen_received_at, order.created_at]);

  // Format Elapsed Time MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const elapsedMinutes = elapsedSeconds / 60;
  const status = order.kitchen_status || 'NEW';

  // Urgency and Alert Levels:
  // Normal prep: 0 - 10 minutes (Normal / Happy indicator)
  // Warning: 10 - 15 minutes (Meh indicator)
  // Delayed: 15+ minutes (Angry icon / Delayed alert indicator)
  const isDelayed = elapsedMinutes >= 15;
  const isWarning = elapsedMinutes >= 10 && elapsedMinutes < 15;

  // Format Time Received
  const formatReceivedTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const handleAction = async (actionFn: () => Promise<void>) => {
    try {
      setIsProcessing(true);
      await actionFn();
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDeliver = async () => {
    setShowDeliverConfirm(false);
    if (onDeliver) {
      await handleAction(() => onDeliver(order.id));
    } else if (onComplete) {
      await handleAction(() => onComplete(order.id));
    }
  };

  // Border and Alert styling
  const getCardBorder = () => {
    if (status === 'READY') {
      return 'border-[#CDEBC5] bg-white ring-2 ring-[#CDEBC5]/60';
    }
    if (isDelayed) {
      return 'border-rose-600 bg-rose-50/20 ring-2 ring-rose-500 shadow-md';
    }
    if (isWarning) {
      return 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400';
    }
    return 'border-zinc-200 bg-white hover:border-zinc-300';
  };

  const isTakeOut =
    order.order_type === 'TAKE_OUT' ||
    order.order_type === 'TAKEOUT' ||
    order.notes?.toLowerCase().includes('take out') ||
    order.notes?.toLowerCase().includes('take_out');

  const tableLabel = order.table_number
    ? (order.table_number.toLowerCase().startsWith('table') ? order.table_number : `Table ${order.table_number}`)
    : (order.notes?.match(/\[(Table\s*[^\]]+)\]/i)?.[1] || (order.is_mobile_order ? 'Mobile Dine-In' : null));

  return (
    <div
      id={`kds-card-${order.id}`}
      className={`rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden relative ${getCardBorder()}`}
    >
      {/* 15m+ Delayed Alert Banner */}
      {isDelayed && (
        <div className="bg-rose-600 text-white px-3 py-1.5 flex items-center justify-between text-xs font-black font-mono tracking-tight animate-pulse">
          <div className="flex items-center gap-1.5">
            <Frown className="w-4 h-4 text-white shrink-0" />
            <span>DELAYED • ORDER #{order.order_number} 15+ MINUTES</span>
          </div>
          <span className="bg-rose-800 px-2 py-0.5 rounded text-[10px]">ALERT ACTIVE</span>
        </div>
      )}

      {/* Card Header */}
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xl font-black font-mono tracking-tight text-[#111111]">
                TICKET #{order.order_number}
              </span>

              {/* Tagged Clearly: Table Number or Takeout / Counter */}
              {tableLabel ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-300 text-amber-950 border border-amber-400 flex items-center gap-1.5 shadow-xs">
                  <span>🍽️</span>
                  <span>{tableLabel}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-zinc-200 text-zinc-900 border border-zinc-300 flex items-center gap-1.5">
                  <span>📦</span>
                  <span>{isTakeOut ? 'Takeout' : 'Takeout / Counter'}</span>
                </span>
              )}

              {/* Payment state badge */}
              {order.status === 'PENDING_PAYMENT' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                  Pay at Counter
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  PAID
                </span>
              )}
            </div>

            {/* Customer Name */}
            <p className="text-xs font-bold text-zinc-900 mt-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-zinc-500" />
              <span>Customer:</span>{' '}
              <span className="uppercase text-emerald-800 font-extrabold">
                {order.customer_name || 'Walk-in / Counter'}
              </span>
            </p>

            {/* Timestamp */}
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>Timestamp:</span>{' '}
              <span className="font-bold text-zinc-700">
                {formatReceivedTime(order.kitchen_received_at || order.created_at)}
              </span>
            </p>
          </div>

          <div className="text-right">
            {/* Status / Urgency Badge */}
            {status === 'READY' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-mono text-xs font-black shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                READY FOR PICKUP
              </span>
            ) : status === 'PREPARING' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-zinc-950 font-mono text-xs font-black shadow-xs">
                <Flame className="w-3.5 h-3.5 text-zinc-950" />
                IN PREPARATION
              </span>
            ) : isDelayed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono text-xs font-black shadow-xs">
                <Frown className="w-3.5 h-3.5" />
                DELAYED
              </span>
            ) : isWarning ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white font-mono text-xs font-bold shadow-xs">
                <Meh className="w-3.5 h-3.5" />
                10m+
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 text-zinc-800 font-mono text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                NEW TICKET
              </span>
            )}

            {/* Elapsed Time */}
            <div className="text-lg font-black font-mono mt-1 text-[#111111]">
              ELAPSED: {formatTimer(elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Assigned branch info (if owner view) */}
        {order.branch_name && (
          <div className="text-[11px] text-zinc-500 font-medium">
            Branch: <span className="text-zinc-800 font-bold">{order.branch_name}</span>
          </div>
        )}

        {/* Phase 10: Reward Redemption Notice */}
        {order.loyalty_reward_item_name && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
            <Gift className="w-3.5 h-3.5 text-emerald-600" />
            <span>REWARD REDEEMED: {order.loyalty_reward_item_name}</span>
          </div>
        )}
      </div>

      {/* Prominent Special Instruction Box (if present) */}
      {order.notes && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-950">
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-800 mb-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            SPECIAL INSTRUCTION:
          </div>
          <p className="text-sm font-black uppercase text-amber-950 leading-snug">
            {order.notes}
          </p>
        </div>
      )}

      {/* Items Section */}
      <div className="p-4 flex-1 space-y-3 divide-y divide-zinc-100 max-h-[360px] overflow-y-auto">
        {order.items?.map((item: OrderItem, idx: number) => (
          <div key={item.id || idx} className="pt-2.5 first:pt-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#111111] text-[#CDEBC5] font-black text-sm flex items-center justify-center shrink-0 font-mono">
                  {item.quantity}x
                </span>
                <img
                  src={getProductImageWithFallback(item.product_image, item.product_name, item.category)}
                  alt={item.product_name}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = getFoodSvgForProduct(item.product_name, item.category);
                  }}
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-200 shrink-0 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-zinc-900 leading-snug">
                    {item.product_name}
                  </h4>

                  {/* Item Specific Notes / Modifications */}
                  {item.notes && (
                    <div className="mt-1 text-xs text-zinc-800 bg-zinc-100 rounded-lg p-2 font-bold border border-zinc-200">
                      <span className="text-[10px] uppercase text-zinc-500 font-extrabold block">NOTE:</span>
                      {item.notes}
                    </div>
                  )}

                  {/* Structured Modifiers list */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.modifiers.map((m, mIdx) => (
                        <span
                          key={m.id || mIdx}
                          className="px-2 py-0.5 rounded-md bg-[#CDEBC5]/70 text-[#111111] text-[11px] font-black border border-[#CDEBC5]"
                        >
                          + {m.modifier_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Card Action Footer */}
      <div className="p-3 bg-zinc-50 border-t border-zinc-100">
        {status === 'NEW' && (
          <button
            type="button"
            id={`btn-start-${order.id}`}
            disabled={isProcessing}
            onClick={() => handleAction(() => onStart(order.id))}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
            ) : (
              <>
                <Flame className="w-5 h-5 text-zinc-950" />
                <span>START PREPARING</span>
              </>
            )}
          </button>
        )}

        {status === 'PREPARING' && (
          <div className="space-y-2">
            <button
              type="button"
              id={`btn-ready-${order.id}`}
              disabled={isProcessing}
              onClick={() => handleAction(() => onReady(order.id))}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>MARK AS READY</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 font-medium">
              <span className="text-amber-700 font-bold">In Preparation</span>
              <button
                type="button"
                onClick={() => handleAction(() => onRecall(order.id, 'NEW'))}
                className="text-zinc-400 hover:text-zinc-700 underline text-[11px] cursor-pointer"
              >
                Revert to New
              </button>
            </div>
          </div>
        )}

        {status === 'READY' && (
          <div className="space-y-2">
            <button
              type="button"
              id={`btn-deliver-${order.id}`}
              disabled={isProcessing}
              onClick={() => setShowDeliverConfirm(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#111111] text-[#CDEBC5] hover:bg-black font-black text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Utensils className="w-5 h-5 text-[#CDEBC5]" />
                  <span>COMPLETE / SERVED</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
              <span className="text-emerald-700 font-bold">Ready for Pickup</span>
              <button
                type="button"
                onClick={() => handleAction(() => onRecall(order.id, 'PREPARING'))}
                className="text-zinc-400 hover:text-zinc-700 underline cursor-pointer"
              >
                Back to Preparing
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for COMPLETE / SERVED */}
      {showDeliverConfirm && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20 text-center animate-fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-zinc-200">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center mb-3">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 mb-1">
              Order #{order.order_number}
            </h3>
            <p className="text-xs text-zinc-600 mb-4 font-medium">
              Mark this ticket as Complete / Served and archive to history?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDeliverConfirm(false)}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                NO / CANCEL
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={executeDeliver}
                className="py-2.5 px-3 rounded-xl bg-[#111111] hover:bg-black text-[#CDEBC5] text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'YES / SERVED'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
