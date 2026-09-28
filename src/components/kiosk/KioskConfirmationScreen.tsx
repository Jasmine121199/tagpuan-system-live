import React, { useEffect, useState } from 'react';
import { Order, DiningOption } from '../../types';
import {
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  ArrowRight,
  Printer,
  RotateCcw,
  ChefHat,
  BellRing,
  Pause,
  Play
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatKioskBranchHeader } from './KioskWelcomeScreen';

interface KioskConfirmationScreenProps {
  order: Order;
  onReset: () => void;
}

export const KioskConfirmationScreen: React.FC<KioskConfirmationScreenProps> = ({
  order: initialOrder,
  onReset
}) => {
  const [currentOrder, setCurrentOrder] = useState<Order>(initialOrder);
  const [countdown, setCountdown] = useState<number>(30);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Poll for live order & kitchen status updates every 3 seconds + instant event/storage listeners
  useEffect(() => {
    const fetchLatestStatus = async () => {
      try {
        const res = await api.getKioskOrderByNumber(currentOrder.order_number);
        if (res?.order) {
          setCurrentOrder(res.order);
        }
      } catch (err) {
        // Silently ignore transient network drops
      }
    };

    const handleKdsUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail) {
        const { orderId, orderNumber, status } = customEv.detail;
        if (orderNumber === currentOrder.order_number || orderId === currentOrder.id) {
          setCurrentOrder(prev => ({
            ...prev,
            kitchen_status: status
          }));
          fetchLatestStatus();
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tagpuan_kds_status_update' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.orderNumber === currentOrder.order_number || parsed.orderId === currentOrder.id) {
            setCurrentOrder(prev => ({
              ...prev,
              kitchen_status: parsed.status
            }));
            fetchLatestStatus();
          }
        } catch (err) {}
      }
    };

    window.addEventListener('tagpuan:kds_order_updated', handleKdsUpdate);
    window.addEventListener('storage', handleStorageChange);

    const pollInterval = setInterval(fetchLatestStatus, 3000);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('tagpuan:kds_order_updated', handleKdsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentOrder.order_number, currentOrder.id]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onReset, isPaused]);

  const isTakeOut = currentOrder.notes?.includes('[TAKE OUT]');
  const isPaid = currentOrder.status === 'PAID' || currentOrder.status === 'COMPLETED';
  const kitchenStatus = currentOrder.kitchen_status;

  // Determine active step (0: Order Placed, 1: Paid, 2: Preparing, 3: Ready for Pickup, 4: Served)
  let currentStep = 0;
  if (isPaid) {
    currentStep = 1;
  }
  if (kitchenStatus === 'PREPARING') currentStep = 2;
  else if (kitchenStatus === 'READY') currentStep = 3;
  else if (kitchenStatus === 'DELIVERED' || currentOrder.status === 'COMPLETED') currentStep = 4;

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      {/* Decorative Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#CDEBC5] opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#CDEBC5] opacity-10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#CDEBC5] text-[#111111] flex items-center justify-center font-black text-xl shadow-lg">
            T
          </div>
          <div>
            <h1 className="text-xl font-black text-white">
              {formatKioskBranchHeader(currentOrder.branch_name)}
            </h1>
            <p className="text-xs text-zinc-400 font-medium">{currentOrder.branch_name || 'Tagpuan Branch'}</p>
          </div>
        </div>

        {/* Auto-reset Countdown & Pause Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPaused(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-300 transition"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-[#CDEBC5]" /> : <Pause className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{isPaused ? 'Resume Timer' : 'Keep Watching'}</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-[#CDEBC5]" />
            <span>{isPaused ? 'Timer Paused' : <>Resets in: <strong className="text-[#CDEBC5]">{countdown}s</strong></>}</span>
          </div>
        </div>
      </div>

      {/* Center Ticket Card */}
      <div className="my-auto max-w-lg w-full mx-auto z-10 space-y-5 text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#CDEBC5]/15 text-[#CDEBC5] border-2 border-[#CDEBC5]/30 mb-1">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {isPaid ? 'Payment Confirmed!' : 'Order Placed!'}
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            {isPaid ? 'Inihahanda na ng kusina ang iyong order' : 'Pakitandaan ang iyong Order Number:'}
          </p>
        </div>

        {/* Live Order Status Pipeline */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
            <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
              currentStep >= 0 ? 'bg-[#CDEBC5]/20 border-[#CDEBC5] text-[#CDEBC5]' : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1. Order Placed</span>
            </div>

            <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
              currentStep >= 1 ? 'bg-[#CDEBC5]/20 border-[#CDEBC5] text-[#CDEBC5]' : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{isPaid ? '2. Paid' : '2. Pay Counter'}</span>
            </div>

            <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
              currentStep >= 2 ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse' : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
            }`}>
              <ChefHat className="w-3.5 h-3.5" />
              <span>3. Cooking</span>
            </div>

            <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
              currentStep >= 3 ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 font-extrabold animate-bounce' : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
            }`}>
              <BellRing className="w-3.5 h-3.5" />
              <span>4. Ready!</span>
            </div>
          </div>
        </div>

        {/* Order Number Big Display */}
        <div className="bg-zinc-900 border-2 border-[#CDEBC5] rounded-3xl p-6 shadow-2xl space-y-3">
          <div className="flex items-center justify-center flex-wrap gap-2">
            {currentOrder.table_number && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-300 text-amber-950 border border-amber-400 flex items-center gap-1 shadow-xs">
                <span>🍽️</span>
                <span>[{currentOrder.table_number.toLowerCase().startsWith('table') ? currentOrder.table_number : `Table ${currentOrder.table_number}`}] • Mobile Dine-In</span>
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
              isTakeOut ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {isTakeOut ? <ShoppingBag className="w-3.5 h-3.5" /> : <UtensilsCrossed className="w-3.5 h-3.5" />}
              {isTakeOut ? 'TAKE OUT' : 'DINE IN'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isPaid ? 'PAID' : 'PENDING PAYMENT'}
            </span>
          </div>

          <div>
            <p className="text-[11px] uppercase font-extrabold tracking-widest text-zinc-400">Claim / Order Number</p>
            <h3 className="text-4xl sm:text-5xl font-black tracking-tight text-[#CDEBC5] mt-1 font-mono">
              {currentOrder.order_number}
            </h3>
          </div>

          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-sm">
            <span className="text-zinc-400 font-medium">Total Amount:</span>
            <span className="text-2xl font-black text-white">₱{currentOrder.total.toFixed(2)}</span>
          </div>

          {/* Instructions Box */}
          <div className="bg-zinc-950/80 rounded-2xl p-3.5 text-left border border-zinc-800/80 space-y-1">
            <p className="text-xs font-bold text-[#CDEBC5] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Status & Instructions:
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {!isPaid ? (
                <>
                  Ang iyong order para sa <strong>{currentOrder.table_number ? `Table ${currentOrder.table_number}` : 'Dine-In'}</strong> ay naitala na sa Kusina at Cashier! Pumunta sa <strong>Cashier Counter</strong> upang magbayad o hintayin ang staff.
                </>
              ) : kitchenStatus === 'READY' ? (
                <strong className="text-emerald-300">HANDA NA ANG IYONG ORDER! Ihahatid na ito sa iyong lamesa o maari nang kunin sa counter.</strong>
              ) : kitchenStatus === 'PREPARING' ? (
                <span className="text-amber-300">Inihahanda na ng kusina ang inyong pagkain. Mangyaring maghintay saglit sa inyong lamesa.</span>
              ) : (
                <span>Kumpirmado na ang bayad. Nasa pila na ang inyong order sa kusina para sa inyong lamesa.</span>
              )}
            </p>
          </div>
        </div>

        {/* Order Items summary */}
        <div className="bg-zinc-900/60 rounded-2xl p-3.5 border border-zinc-800 text-left text-xs space-y-1.5 max-h-36 overflow-y-auto">
          <p className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Summary ng Order:</p>
          {currentOrder.items.map((it, idx) => (
            <div key={idx} className="flex justify-between items-center text-zinc-300">
              <span>{it.quantity}x {it.product_name}</span>
              <span className="font-bold font-mono">₱{it.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Start New Order */}
      <div className="max-w-md mx-auto w-full z-10 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#CDEBC5] text-[#111111] hover:bg-[#b8e2af] font-black text-sm transition flex items-center justify-center gap-2 shadow-xl active:scale-[0.99]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Tapos Na / Start New Order</span>
        </button>
      </div>
    </div>
  );
};
