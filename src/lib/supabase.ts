import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Branch,
  Profile,
  Product,
  Ingredient,
  Recipe,
  Order,
  OrderItem,
  InventoryTransaction,
  CashRemittance,
  AttendanceRecord,
  LoyaltyCustomer
} from '../types/index';

// -----------------------------------------------------------------------------
// 1. SUPABASE CLIENT CONFIGURATION
// Safely reads both Vite and Next.js / Node environment variables:
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// -----------------------------------------------------------------------------

const rawSupabaseUrl: string =
  ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  'https://placeholder.supabase.co') as string;

const rawSupabaseKey: string =
  ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  'placeholder-anon-key') as string;

export const supabaseUrl: string = rawSupabaseUrl;
export const supabaseKey: string = rawSupabaseKey;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes('placeholder.supabase.co') &&
    typeof supabaseKey === 'string' &&
    supabaseKey.length > 0 &&
    !supabaseKey.includes('placeholder-anon-key')
  );
};

// -----------------------------------------------------------------------------
// 2. SUPABASE PRODUCTION REPOSITORY METHODS
// Directly queries Supabase tables when configured.
// When unconfigured, callers cleanly fallback to the local mock state.
// -----------------------------------------------------------------------------

export const supabaseAdapter = {
  isConfigured: isSupabaseConfigured,

  // --- ORDERS ---
  async getOrders(branchId?: string): Promise<Order[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (branchId && branchId !== 'ALL') {
        query = query.eq('branch_id', branchId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseAdapter:getOrders] query error:', error.message);
        return null;
      }
      return (data || []) as Order[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getOrders] exception:', err);
      return null;
    }
  },

  async insertOrder(order: any, items: any[]): Promise<{ success: boolean; orderId?: string; error?: string }> {
    return insertKioskOrderToSupabase(order, items);
  },

  // --- BRANCHES ---
  async getBranches(): Promise<Branch[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        console.warn('[SupabaseAdapter:getBranches] query error:', error.message);
        return null;
      }
      return (data || []) as Branch[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getBranches] exception:', err);
      return null;
    }
  },

  // --- MENU ITEMS / PRODUCTS ---
  async getMenuItems(): Promise<Product[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) {
        console.warn('[SupabaseAdapter:getMenuItems] query error:', error.message);
        return null;
      }
      return (data || []) as Product[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getMenuItems] exception:', err);
      return null;
    }
  },

  // --- INGREDIENTS ---
  async getIngredients(): Promise<Ingredient[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('item_name', { ascending: true });
      if (error) {
        console.warn('[SupabaseAdapter:getIngredients] query error:', error.message);
        return null;
      }
      return (data || []) as Ingredient[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getIngredients] exception:', err);
      return null;
    }
  },

  // --- INVENTORY TRANSACTIONS ---
  async getInventoryTransactions(branchId?: string): Promise<InventoryTransaction[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false });
      if (branchId && branchId !== 'ALL') {
        query = query.eq('branch_id', branchId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseAdapter:getInventoryTransactions] error:', error.message);
        return null;
      }
      return (data || []) as InventoryTransaction[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getInventoryTransactions] exception:', err);
      return null;
    }
  },

  async insertInventoryTransaction(tx: Partial<InventoryTransaction>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('inventory_transactions').insert({
        id: tx.id || crypto.randomUUID(),
        branch_id: tx.branch_id,
        branch_name: tx.branch_name,
        ingredient_id: tx.ingredient_id,
        ingredient_name: tx.ingredient_name,
        quantity: tx.quantity,
        transaction_type: tx.transaction_type,
        previous_stock: tx.previous_stock || 0,
        new_stock: tx.new_stock || 0,
        reason: tx.reason,
        user_id: tx.user_id,
        user_email: tx.user_email,
        created_at: tx.created_at || new Date().toISOString()
      });
      return !error;
    } catch (err) {
      console.warn('[SupabaseAdapter:insertInventoryTransaction] error:', err);
      return false;
    }
  },

  // --- CASH REMITTANCES ---
  async getRemittances(branchId?: string): Promise<CashRemittance[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('cash_remittances').select('*').order('created_at', { ascending: false });
      if (branchId && branchId !== 'ALL') {
        query = query.eq('branch_id', branchId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseAdapter:getRemittances] error:', error.message);
        return null;
      }
      return (data || []) as CashRemittance[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getRemittances] exception:', err);
      return null;
    }
  },

  async insertRemittance(remittance: Partial<CashRemittance>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('cash_remittances').insert({
        id: remittance.id || crypto.randomUUID(),
        remittance_number: remittance.remittance_number,
        shift_id: remittance.shift_id,
        branch_id: remittance.branch_id,
        branch_name: remittance.branch_name,
        cashier_id: remittance.cashier_id,
        cashier_name: remittance.cashier_name,
        date: remittance.date || new Date().toISOString().slice(0, 10),
        expected_cash: remittance.expected_cash || 0,
        actual_cash: remittance.actual_cash || 0,
        remitted_amount: remittance.remitted_amount || 0,
        cash_variance: remittance.cash_variance || 0,
        remittance_variance: remittance.remittance_variance || 0,
        variance_flag: remittance.variance_flag || 'TALLY',
        denomination_breakdown: remittance.denomination_breakdown || {},
        status: remittance.status || 'SUBMITTED',
        manager_id: remittance.manager_id,
        manager_name: remittance.manager_name,
        manager_verified_at: remittance.manager_verified_at,
        manager_verified_amount: remittance.manager_verified_amount,
        notes: remittance.notes,
        created_at: remittance.created_at || new Date().toISOString(),
        updated_at: remittance.updated_at || new Date().toISOString()
      });
      return !error;
    } catch (err) {
      console.warn('[SupabaseAdapter:insertRemittance] error:', err);
      return false;
    }
  },

  // --- ATTENDANCE ---
  async getAttendance(branchId?: string): Promise<AttendanceRecord[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('attendance_records').select('*').order('clock_in', { ascending: false });
      if (branchId && branchId !== 'ALL') {
        query = query.eq('branch_id', branchId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseAdapter:getAttendance] error:', error.message);
        return null;
      }
      return (data || []) as AttendanceRecord[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getAttendance] exception:', err);
      return null;
    }
  },

  async insertAttendanceRecord(record: Partial<AttendanceRecord>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('attendance_records').insert({
        id: record.id || crypto.randomUUID(),
        user_id: record.user_id,
        employee_name: record.employee_name,
        role: record.role,
        branch_id: record.branch_id,
        branch_name: record.branch_name,
        date: record.date || new Date().toISOString().slice(0, 10),
        clock_in: record.clock_in,
        clock_out: record.clock_out,
        total_minutes: record.total_minutes || 0,
        payable_hours: record.payable_hours || 0,
        status: record.status || 'PRESENT',
        created_at: record.created_at || new Date().toISOString(),
        updated_at: record.updated_at || new Date().toISOString()
      });
      return !error;
    } catch (err) {
      console.warn('[SupabaseAdapter:insertAttendanceRecord] error:', err);
      return false;
    }
  },

  // --- LOYALTY CUSTOMERS ---
  async getLoyaltyCustomers(): Promise<LoyaltyCustomer[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('loyalty_customers')
        .select('*')
        .order('customer_name', { ascending: true });
      if (error) {
        console.warn('[SupabaseAdapter:getLoyaltyCustomers] error:', error.message);
        return null;
      }
      return (data || []) as LoyaltyCustomer[];
    } catch (err) {
      console.warn('[SupabaseAdapter:getLoyaltyCustomers] exception:', err);
      return null;
    }
  },

  async upsertLoyaltyCustomer(customer: Partial<LoyaltyCustomer>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('loyalty_customers').upsert({
        id: customer.id || crypto.randomUUID(),
        customer_name: customer.customer_name,
        phone_number: customer.phone_number,
        email: customer.email,
        current_points: customer.current_points || 0,
        total_points_earned: customer.total_points_earned || 0,
        total_points_redeemed: customer.total_points_redeemed || 0,
        registered_branch_id: customer.registered_branch_id,
        registered_branch_name: customer.registered_branch_name,
        notes: customer.notes,
        created_at: customer.created_at || new Date().toISOString(),
        updated_at: customer.updated_at || new Date().toISOString()
      }, { onConflict: 'phone_number' });
      return !error;
    } catch (err) {
      console.warn('[SupabaseAdapter:upsertLoyaltyCustomer] error:', err);
      return false;
    }
  }
};

// -----------------------------------------------------------------------------
// 3. STORAGE & REALTIME HELPERS
// -----------------------------------------------------------------------------

/**
 * Uploads a product image directly to Supabase Storage in the 'product-images' bucket.
 * Returns the public URL of the uploaded image to be stored in the central product record.
 * Falls back safely to the optimized data URL if Supabase credentials are not yet configured.
 */
export async function uploadProductImageToSupabase(
  dataUrlOrFile: string | File | Blob,
  productId: string
): Promise<string> {
  const configured = isSupabaseConfigured();

  if (configured) {
    try {
      const supabase = getSupabaseClient();
      let blob: Blob;
      let contentType = 'image/jpeg';

      if (typeof dataUrlOrFile === 'string') {
        const matches = dataUrlOrFile.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          contentType = matches[1];
          const binaryStr = atob(matches[2]);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: contentType });
        } else {
          blob = new Blob([dataUrlOrFile], { type: 'text/plain' });
        }
      } else {
        blob = dataUrlOrFile;
        contentType = blob.type || 'image/jpeg';
      }

      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const filePath = `products/${productId}-${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, blob, {
          contentType,
          upsert: true
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        if (publicData?.publicUrl) {
          console.log(`[Supabase Storage] Image successfully uploaded to bucket: ${publicData.publicUrl}`);
          return publicData.publicUrl;
        }
      } else if (error) {
        console.warn('[Supabase Storage] Bucket upload error, falling back to data URL:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Storage] Exception during upload:', err);
    }
  }

  // Fallback to data URL
  if (typeof dataUrlOrFile === 'string') {
    return dataUrlOrFile;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(dataUrlOrFile as Blob);
  });
}

/**
 * Removes a product image from Supabase Storage bucket if it was hosted there.
 */
export async function removeProductImageFromSupabase(imageUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !imageUrl.includes('/storage/v1/object/public/product-images/')) {
    return true;
  }
  try {
    const supabase = getSupabaseClient();
    const parts = imageUrl.split('/product-images/');
    if (parts.length > 1) {
      const filePath = parts[1];
      const { error } = await supabase.storage.from('product-images').remove([filePath]);
      if (error) {
        console.warn('[Supabase Storage] Failed to delete object:', error.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Storage] Error deleting image from bucket:', err);
    return false;
  }
}

/**
 * Inserts a customer kiosk order and its order items into Supabase.
 * Includes explicit debug logging per end-to-end database traceability requirements.
 */
export async function insertKioskOrderToSupabase(
  order: any,
  items: any[]
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  console.log('[KIOSK] submitting order');

  if (!isSupabaseConfigured()) {
    const reason = 'Supabase environment credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are placeholder or unconfigured in runtime environment.';
    console.warn(`[KIOSK] database insert skipped: ${reason}`);
    return { success: false, error: reason };
  }

  try {
    const supabase = getSupabaseClient();
    console.log('[KIOSK] database insert started');

    // 1. Insert into public.orders
    const orderRecord = {
      id: order.id,
      order_number: order.order_number,
      branch_id: order.branch_id,
      branch_name: order.branch_name || null,
      cashier_id: order.cashier_id || 'KIOSK',
      cashier_name: order.cashier_name || 'Self-Ordering Kiosk',
      source: order.source || 'KIOSK',
      status: order.status || 'PENDING_PAYMENT',
      customer_name: order.customer_name || null,
      customer_phone: order.customer_phone || null,
      dining_option: order.dining_option || 'DINE_IN',
      subtotal: order.subtotal || 0,
      discount_type: order.discount_type || null,
      discount_amount: order.discount_amount || 0,
      total: order.total || order.subtotal || 0,
      notes: order.notes || null,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString()
    };

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderRecord);

    if (orderError) {
      console.error('[KIOSK] database insert failed:', orderError.message, {
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint
      });
      return { success: false, error: orderError.message };
    }

    console.log('[KIOSK] database insert success');
    console.log(`[KIOSK] order_id = ${order.id}`);

    // 2. Insert into public.order_items using the SAME order_id and exact branch_id
    if (items && items.length > 0) {
      const itemRecords = items.map(item => ({
        id: item.id || crypto.randomUUID(),
        order_id: order.id,
        branch_id: order.branch_id,
        product_id: item.product_id,
        product_code: item.product_code || null,
        product_name: item.product_name,
        product_image: item.product_image || null,
        category: item.category || null,
        unit_price: item.unit_price || 0,
        quantity: item.quantity || 1,
        subtotal: item.subtotal || 0,
        notes: item.notes || null,
        modifiers: item.modifiers || [],
        created_at: item.created_at || new Date().toISOString()
      }));

      let { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemRecords);

      // Graceful fallback if remote Supabase schema does not have branch_id column on order_items
      if (itemsError && itemsError.message?.toLowerCase().includes('branch_id')) {
        console.warn('[KIOSK] retrying order_items insert without branch_id column:', itemsError.message);
        const fallbackRecords = itemRecords.map(({ branch_id, ...rest }) => rest);
        const retry = await supabase.from('order_items').insert(fallbackRecords);
        itemsError = retry.error;
      }

      if (itemsError) {
        console.error('[KIOSK] order_items insert failed:', itemsError.message);
        return { success: false, error: itemsError.message, orderId: order.id };
      }

      console.log('[KIOSK] order_items inserted with branch_id');
    }

    return { success: true, orderId: order.id };
  } catch (err: any) {
    console.error('[KIOSK] database insert unexpected error:', err.message || err);
    return { success: false, error: err.message || 'Database insert exception' };
  }
}

/**
 * Subscribes the POS counter to realtime new Kiosk orders.
 * Employs Supabase Realtime channel if configured, with full lifecycle management.
 */
export function subscribeToKioskOrdersRealtime(
  branchId: string,
  onNewOrder: (order: any) => void
): () => void {
  console.log(`[POS] realtime subscription started for branch: ${branchId}`);

  if (!isSupabaseConfigured()) {
    console.log('[POS] Supabase Realtime inactive (falling back to database REST polling)');
    return () => {};
  }

  try {
    const supabase = getSupabaseClient();
    const channelName = `pos-kiosk-orders-${branchId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: branchId && branchId !== 'ALL' ? `branch_id=eq.${branchId}` : undefined
        },
        async (payload: any) => {
          console.log('[POS] realtime event received:', payload.eventType);
          const newOrder = payload.new;
          if (newOrder) {
            console.log(`[POS] received order_id = ${newOrder.id}`);
            console.log(`[POS] order query result: Order #${newOrder.order_number}`);

            // Fetch items if missing
            let fullOrder = newOrder;
            try {
              const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', newOrder.id);
              fullOrder = { ...newOrder, items: items || [] };
            } catch {
              // use existing order
            }

            console.log('[POS] notification triggered');
            onNewOrder(fullOrder);
          }
        }
      )
      .subscribe((status: string) => {
        console.log(`[POS] Realtime channel status: ${status}`);
      });

    return () => {
      console.log(`[POS] Cleaning up realtime channel ${channelName}`);
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[POS] Failed to establish Supabase Realtime channel:', err);
    return () => {};
  }
}
