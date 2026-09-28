import React, { useState } from 'react';
import {
  KioskCartItem,
  DiningOption,
  PaymentMethod,
  PaymentConfiguration,
  Order
} from '../../types';
import {
  ArrowLeft,
  Banknote,
  QrCode,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { formatKioskBranchHeader } from './KioskWelcomeScreen';

interface KioskPaymentScreenProps {
  cart: KioskCartItem[];
  diningOption: DiningOption;
  tableNumber?: string | null;
  paymentConfigs: PaymentConfiguration[];
  branchName: string;
  onBackToCart: () => void;
  onSubmitOrder: (
    paymentMethod: PaymentMethod,
    customerName: string,
    referenceNumber: string,
    customerPhone: string,
    payNow?: boolean
  ) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export const KioskPaymentScreen: React.FC<KioskPaymentScreenProps> = ({
  cart,
  diningOption,
  tableNumber,
  paymentConfigs,
  branchName,
  onBackToCart,
  onSubmitOrder,
  isSubmitting,
  errorMessage
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  // Active config for selected e-wallet / bank method
  const activeConfig = paymentConfigs.find(
    c => c.payment_method === selectedMethod && c.is_active
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const isOnlinePay = selectedMethod === 'GCASH' || selectedMethod === 'MAYA' || selectedMethod === 'BANK_TRANSFER';
    await onSubmitOrder(
      selectedMethod,
      customerName.trim(),
      referenceNumber.trim(),
      customerPhone.trim(),
      isOnlinePay
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#18181B] text-white w-full max-w-2xl rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onBackToCart}
              className="p-2.5 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {formatKioskBranchHeader(branchName)}
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Checkout & Payment • Total: <strong className="text-[#CDEBC5]">₱{totalAmount.toFixed(2)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Table Number Banner if Assigned via QR */}
        {tableNumber && (
          <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-amber-300 text-amber-950 border-2 border-amber-400 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🍽️</span>
              <div>
                <p className="text-xs font-mono font-black uppercase tracking-wider">
                  ASSIGNED TABLE: {tableNumber.toLowerCase().startsWith('table') ? tableNumber.toUpperCase() : `TABLE ${tableNumber}`}
                </p>
                <p className="text-[11px] text-amber-950/80 font-medium">
                  Naka-lock ang iyong lamesa. Diretso ihahatid ang inyong pagkain dito!
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-950 text-amber-200 text-[10px] font-mono font-black rounded-lg uppercase tracking-wider shrink-0">
              Locked via QR
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Hindi Maaring Maituloy ang Order</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Pumili ng Paraan ng Pagbabayad / Select Payment Method:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* CASH / COUNTER */}
              <button
                type="button"
                onClick={() => setSelectedMethod('CASH')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[100px] ${
                  selectedMethod === 'CASH'
                    ? 'border-[#CDEBC5] bg-[#CDEBC5]/15 text-white shadow-lg'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMethod === 'CASH' ? 'bg-[#CDEBC5] text-[#111111]' : 'bg-zinc-800 text-zinc-300'}`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold block">Pay at Counter</span>
                  <span className="text-[10px] text-zinc-400">Cashier Unpaid Ticket</span>
                </div>
              </button>

              {/* GCASH ONLINE */}
              <button
                type="button"
                onClick={() => setSelectedMethod('GCASH')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[100px] ${
                  selectedMethod === 'GCASH'
                    ? 'border-[#CDEBC5] bg-[#CDEBC5]/15 text-white shadow-lg'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMethod === 'GCASH' ? 'bg-[#CDEBC5] text-[#111111]' : 'bg-zinc-800 text-zinc-300'}`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold block">Pay via GCash</span>
                  <span className="text-[10px] text-zinc-400">Online E-Wallet</span>
                </div>
              </button>

              {/* MAYA ONLINE */}
              <button
                type="button"
                onClick={() => setSelectedMethod('MAYA')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[100px] ${
                  selectedMethod === 'MAYA'
                    ? 'border-[#CDEBC5] bg-[#CDEBC5]/15 text-white shadow-lg'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMethod === 'MAYA' ? 'bg-[#CDEBC5] text-[#111111]' : 'bg-zinc-800 text-zinc-300'}`}>
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold block">Pay via Maya</span>
                  <span className="text-[10px] text-zinc-400">Online E-Wallet</span>
                </div>
              </button>

              {/* BANK TRANSFER / QRPH */}
              <button
                type="button"
                onClick={() => setSelectedMethod('BANK_TRANSFER')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[100px] ${
                  selectedMethod === 'BANK_TRANSFER'
                    ? 'border-[#CDEBC5] bg-[#CDEBC5]/15 text-white shadow-lg'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMethod === 'BANK_TRANSFER' ? 'bg-[#CDEBC5] text-[#111111]' : 'bg-zinc-800 text-zinc-300'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold block">Bank / QRPH</span>
                  <span className="text-[10px] text-zinc-400">Online Transfer</span>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Detail Display */}
          {selectedMethod === 'CASH' ? (
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#CDEBC5]/20 text-[#CDEBC5] flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Magbayad gamit ang Cash</h4>
                  <p className="text-xs text-zinc-400">Pakitandaan ang mga hakbang sa ibaba:</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#CDEBC5] text-[#111111] font-black text-[11px] flex items-center justify-center">1</span>
                  <p className="font-bold text-zinc-200">Kumuha ng Ticket</p>
                  <p className="text-zinc-400 text-[11px]">Pindutin ang "Submit Order" para makuha ang iyong Order #.</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#CDEBC5] text-[#111111] font-black text-[11px] flex items-center justify-center">2</span>
                  <p className="font-bold text-zinc-200">Pumunta sa Cashier</p>
                  <p className="text-zinc-400 text-[11px]">Ibigay ang eksaktong ₱{totalAmount.toFixed(2)} sa counter.</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#CDEBC5] text-[#111111] font-black text-[11px] flex items-center justify-center">3</span>
                  <p className="font-bold text-zinc-200">Hintayin ang Pagkain</p>
                  <p className="text-zinc-400 text-[11px]">Ihahanda agad ang pagkain pagkatapos magbayad.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* QR Code */}
                <div className="w-40 h-40 bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-lg border border-zinc-700 shrink-0">
                  {activeConfig?.qr_image_url ? (
                    <img
                      src={activeConfig.qr_image_url}
                      alt={`${selectedMethod} QR Code`}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-zinc-800 p-2">
                      <QrCode className="w-16 h-16 mx-auto mb-1 text-zinc-800" />
                      <span className="text-[10px] font-bold block uppercase">{selectedMethod} QR</span>
                    </div>
                  )}
                </div>

                {/* Account Details */}
                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#CDEBC5] text-[#111111] text-[11px] font-black uppercase">
                    {selectedMethod} Official Account
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Account Name:</p>
                    <p className="text-sm font-black text-white">
                      {activeConfig?.account_name || 'TAGPUAN FOOD VENTURES INC.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Account / Mobile Number:</p>
                    <p className="text-base font-black text-[#CDEBC5] tracking-wider">
                      {activeConfig?.account_number || (selectedMethod === 'GCASH' ? '0917-123-4567' : '0012-3456-7890')}
                    </p>
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] text-zinc-400 italic">
                      I-scan ang QR o ipadala ang eksaktong <strong>₱{totalAmount.toFixed(2)}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reference Number Input */}
              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Reference Code / Ref No. (Optional):
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="e.g. 100234857492"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#CDEBC5]"
                />
              </div>
            </div>
          )}

          {/* Customer Name & Loyalty Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Pangalan / Customer Name (Optional):
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Juan D."
                maxLength={40}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#CDEBC5]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  Mobile Phone (Optional):
                </label>
                <span className="text-[10px] text-[#CDEBC5] font-bold">
                  ★ Loyalty: 2 pts / ₱100
                </span>
              </div>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="e.g. 0917-123-4567"
                maxLength={20}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#CDEBC5] font-mono"
              />
            </div>
          </div>
        </form>

        {/* Footer: Confirm Button */}
        <div className="p-5 sm:p-6 border-t border-zinc-800 bg-zinc-900">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-4 px-6 rounded-2xl bg-[#CDEBC5] text-[#111111] hover:bg-[#b8e2af] font-black text-base transition flex items-center justify-between shadow-xl active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <span>{isSubmitting ? 'Submitting Order...' : 'Submit Order / Mag-Order Na'}</span>
            </div>
            <span className="text-xl font-black">
              ₱{totalAmount.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
