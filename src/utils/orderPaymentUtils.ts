import { Order, ReceiptData, PaymentMethod } from '../types';
import { googleSheetsPersistence } from '../lib/googleSheetsPersistence';

/**
 * Deducts stock from current inventory map according to product recipes, saves to localStorage,
 * and syncs stock deduction to Google Sheets Tab 2 ("Menu_Inventory").
 */
export const deductInventoryForOrderItems = (
  items: { product_name: string; quantity: number }[],
  currentInventoryMap?: Record<string, { id?: string; name: string; stock: number; unit: string }>
): Record<string, { id?: string; name: string; stock: number; unit: string }> => {
  let inv: Record<string, { id?: string; name: string; stock: number; unit: string }> = {};

  if (currentInventoryMap && Object.keys(currentInventoryMap).length > 0) {
    inv = { ...currentInventoryMap };
  } else {
    try {
      const saved = localStorage.getItem('inventory');
      if (saved) {
        inv = JSON.parse(saved);
      }
    } catch (e) {}
  }

  // Fallback defaults if inventory is empty
  if (Object.keys(inv).length === 0) {
    inv = {
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
  }

  items.forEach(item => {
    const pName = (item.product_name || '').toLowerCase();
    const qty = item.quantity || 1;

    if (pName.includes('siomai')) {
      if (inv['ING-06']) inv['ING-06'].stock = Math.max(0, inv['ING-06'].stock - (4 * qty));
      if (inv['ING-14']) inv['ING-14'].stock = Math.max(0, Math.round((inv['ING-14'].stock - (0.05 * qty)) * 100) / 100);
      if (inv['ING-15']) inv['ING-15'].stock = Math.max(0, inv['ING-15'].stock - (1 * qty));
    } else if (pName.includes('burger')) {
      const isOverload = pName.includes('overload') || pName.includes('double') || pName.includes('special');
      const pattyCount = isOverload ? 2 : 1;
      if (inv['ING-07']) inv['ING-07'].stock = Math.max(0, inv['ING-07'].stock - qty);
      if (inv['ING-01']) inv['ING-01'].stock = Math.max(0, inv['ING-01'].stock - (pattyCount * qty));
      if ((pName.includes('cheese') || isOverload) && inv['ING-11']) {
        inv['ING-11'].stock = Math.max(0, inv['ING-11'].stock - qty);
      }
      if ((pName.includes('egg') || isOverload) && inv['ING-09']) {
        inv['ING-09'].stock = Math.max(0, inv['ING-09'].stock - qty);
      }
    } else if (pName.includes('fries')) {
      if (inv['ING-04']) inv['ING-04'].stock = Math.max(0, Math.round((inv['ING-04'].stock - (0.15 * qty)) * 100) / 100);
      if (inv['ING-11']) inv['ING-11'].stock = Math.max(0, inv['ING-11'].stock - qty);
    } else if (pName.includes('hotdog')) {
      if (inv['ING-02']) inv['ING-02'].stock = Math.max(0, inv['ING-02'].stock - qty);
      if (inv['ING-08']) inv['ING-08'].stock = Math.max(0, inv['ING-08'].stock - qty);
    } else if (pName.includes('silog') || pName.includes('rice')) {
      if (inv['ING-12']) inv['ING-12'].stock = Math.max(0, Math.round((inv['ING-12'].stock - (0.2 * qty)) * 100) / 100);
      if (inv['ING-09']) inv['ING-09'].stock = Math.max(0, inv['ING-09'].stock - qty);
    } else if (pName.includes('drink') || pName.includes('coke') || pName.includes('sprite') || pName.includes('royal')) {
      if (inv['ING-13']) inv['ING-13'].stock = Math.max(0, inv['ING-13'].stock - qty);
    } else if (pName.includes('water')) {
      if (inv['ING-16']) inv['ING-16'].stock = Math.max(0, inv['ING-16'].stock - qty);
    }
  });

  try {
    localStorage.setItem('inventory', JSON.stringify(inv));
  } catch (e) {}

  // Also sync deduction directly to Google Sheets Tab 2 ("Menu_Inventory") + LocalStorage fallback
  void googleSheetsPersistence.deductInventoryInSheet(items);

  (window as any).inventory = inv;
  return inv;
};

/**
 * Instantly dispatches a paid order to the Kitchen Display System (KDS)
 * via custom DOM event, localStorage sync, and Google Sheets Tab 1 ("Orders_Log")
 */
export const dispatchOrderToKDS = (paidOrder: Order): void => {
  // Ensure kitchen status is NEW if not already preparing
  const orderForKDS: Order = {
    ...paidOrder,
    status: paidOrder.status || 'PAID',
    payment_status: paidOrder.payment_status || (paidOrder.status === 'PAID' ? 'PAID' : 'PENDING'),
    kitchen_status: paidOrder.kitchen_status || 'NEW',
    kitchen_received_at: paidOrder.kitchen_received_at || new Date().toISOString()
  };

  // 1. Dispatch custom DOM event
  window.dispatchEvent(new CustomEvent('tagpuan:order_paid', { detail: orderForKDS }));

  // 2. Persist latest order trigger for cross-tab synchronization
  try {
    localStorage.setItem('tagpuan_latest_kitchen_order', JSON.stringify({
      timestamp: Date.now(),
      order: orderForKDS
    }));
  } catch (e) {}

  // 3. Update or prepend to kds_orders in localStorage
  try {
    const raw = localStorage.getItem('kds_orders');
    let existing: Order[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
      } catch (e) {}
    }
    const filtered = existing.filter(o => o.id !== orderForKDS.id);
    const updated = [orderForKDS, ...filtered];
    localStorage.setItem('kds_orders', JSON.stringify(updated));
    (window as any).kitchenOrders = updated;
  } catch (e) {}

  // 4. Sync directly to Google Sheets Tab 1 ("Orders_Log") with LocalStorage fallback
  void googleSheetsPersistence.logOrderToSheet(orderForKDS, false);
};

/**
 * Generates thermal printable receipt data for an order and automatically saves PDF e-Receipt to Google Drive
 */
export const generateReceiptForOrder = (
  order: Order,
  paymentMethod: PaymentMethod = 'CASH',
  amountReceived?: number,
  changeAmount?: number,
  referenceNumber?: string
): ReceiptData => {
  const tender = typeof amountReceived === 'number' ? amountReceived : order.total;
  const change = typeof changeAmount === 'number' ? changeAmount : Math.max(0, tender - order.total);

  const receipt: ReceiptData = {
    header: 'TAGPUAN OFFICIAL RECEIPT',
    reference_number: referenceNumber || `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
    order_number: order.order_number,
    branch_name: order.branch_name || 'Tagpuan Branch',
    branch_id: order.branch_id || 'branch-1',
    date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    cashier_name: order.cashier_name || 'Cashier',
    subtotal: order.subtotal,
    discount: order.discount_amount || 0,
    total: order.total,
    payment_method: paymentMethod,
    amount_received: tender,
    change: change,
    customer_name: order.customer_name || undefined,
    customer_phone: order.customer_phone || undefined,
    items: (order.items || []).map(i => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal || (i.quantity * i.unit_price),
      modifiers: (i.modifiers || []).map((m: any) => m.modifier_name || String(m))
    }))
  };

  // Automatically generate and save PDF e-Receipt to Google Drive (or LocalStorage Drive archive fallback)
  if (googleSheetsPersistence.getConfig().autoSaveReceiptsToDrive) {
    void googleSheetsPersistence.generateAndSaveEReceiptToDrive(receipt, { downloadLocally: false });
  }

  return receipt;
};
