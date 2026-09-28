import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe server-side Supabase client initialization
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

let serverClient: SupabaseClient | null = null;

export function isServerSupabaseConfigured(): boolean {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes('placeholder.supabase.co') &&
    typeof supabaseKey === 'string' &&
    supabaseKey.length > 0 &&
    !supabaseKey.includes('placeholder-anon-key')
  );
}

export function getServerSupabaseClient(): SupabaseClient | null {
  if (!isServerSupabaseConfigured()) {
    return null;
  }
  if (!serverClient) {
    serverClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClient;
}

/**
 * Gracefully synchronizes an order record to Supabase if configured.
 * Does not block or fail if Supabase is offline or unconfigured.
 */
export async function syncOrderToSupabase(order: any, items: any[]): Promise<boolean> {
  if (!isServerSupabaseConfigured()) return false;
  try {
    const supabase = getServerSupabaseClient();
    if (!supabase) return false;

    const { error: orderError } = await supabase.from('orders').upsert({
      id: order.id,
      order_number: order.order_number,
      branch_id: order.branch_id,
      branch_name: order.branch_name || null,
      cashier_id: order.cashier_id || 'KIOSK',
      cashier_name: order.cashier_name || 'Self-Ordering Kiosk',
      source: order.source || 'POS',
      status: order.status || 'PENDING_PAYMENT',
      customer_name: order.customer_name || null,
      customer_phone: order.customer_phone || null,
      dining_option: order.dining_option || 'DINE_IN',
      table_number: order.table_number || null,
      subtotal: order.subtotal || 0,
      discount_type: order.discount_type || null,
      discount_amount: order.discount_amount || 0,
      total: order.total || order.subtotal || 0,
      notes: order.notes || null,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString(),
    });

    if (orderError) {
      console.warn('[ServerSupabase:syncOrder] order insert error:', orderError.message);
      return false;
    }

    if (items && items.length > 0) {
      const itemRows = items.map((i) => ({
        id: i.id || crypto.randomUUID(),
        order_id: order.id,
        branch_id: order.branch_id,
        product_id: i.product_id,
        product_code: i.product_code || null,
        product_name: i.product_name,
        product_image: i.product_image || null,
        category: i.category || null,
        unit_price: i.unit_price || 0,
        quantity: i.quantity || 1,
        subtotal: i.subtotal || 0,
        notes: i.notes || null,
        modifiers: i.modifiers || [],
        created_at: i.created_at || new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase.from('order_items').upsert(itemRows);
      if (itemsError) {
        console.warn('[ServerSupabase:syncOrder] items insert error:', itemsError.message);
      }
    }

    return true;
  } catch (err: any) {
    console.warn('[ServerSupabase:syncOrder] exception during sync:', err.message || err);
    return false;
  }
}
