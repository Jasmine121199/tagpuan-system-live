import { db } from './db';
import { CashDenominationCount } from '../src/types/index';

export type N8NWebhookEvent =
  | 'sales.daily_summary'
  | 'inventory.low_stock'
  | 'remittance.submitted'
  | 'test.ping';

export interface N8NWebhookPayload {
  event: N8NWebhookEvent;
  timestamp: string;
  branch_id?: string;
  branch_name?: string;
  total_sales?: number;
  cash_breakdown?: {
    expected_cash?: number;
    actual_cash?: number;
    remitted_amount?: number;
    cash_sales?: number;
    non_cash_sales?: number;
    opening_cash?: number;
    cash_expenses?: number;
    denominations?: CashDenominationCount | Record<string, number> | null;
  };
  variance?: {
    amount: number;
    flag: 'TALLY' | 'SHORTAGE' | 'OVERAGE' | 'BALANCED' | 'SHORT' | 'OVER';
    status?: string;
    reason?: string | null;
  };
  order_metrics?: {
    total_orders?: number;
    completed_orders?: number;
    average_order_value?: number;
  };
  inventory_items?: Array<{
    item_id: string;
    item_name: string;
    sku?: string;
    current_stock: number;
    reorder_level: number;
    unit: string;
    branch_name?: string;
  }>;
  ingredient_deductions?: Array<{
    ingredient_name: string;
    quantity_deducted: number;
    unit: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Outgoing Webhook Dispatcher for n8n automation and external alerting (Telegram, Google Sheets, Gmail).
 * Safely dispatches structured JSON payloads asynchronously without blocking internal operations.
 */
export async function dispatchN8NWebhook(
  event: N8NWebhookEvent,
  data: Partial<N8NWebhookPayload>
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const settings = db.getSystemSettings();
    const webhookUrl = (settings as any).n8n_webhook_url;

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim().startsWith('http')) {
      return { success: false, error: 'No valid n8n Webhook URL configured in System Settings.' };
    }

    const payload: N8NWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      branch_id: data.branch_id || 'all-branches',
      branch_name: data.branch_name || 'Tagpuan Central',
      total_sales: data.total_sales ?? 0,
      cash_breakdown: data.cash_breakdown,
      variance: data.variance,
      order_metrics: data.order_metrics,
      inventory_items: data.inventory_items,
      ingredient_deductions: data.ingredient_deductions,
      metadata: {
        source: 'Tagpuan ERP Automation Engine',
        system_version: settings.system_version || '2.0.0',
        ...data.metadata
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tagpuan-ERP-n8n-Dispatcher/2.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`[n8n Webhook] Dispatched event '${event}' successfully to ${webhookUrl}`);
      return { success: true, status: response.status };
    } else {
      const errText = await response.text().catch(() => 'Unknown error response');
      console.warn(`[n8n Webhook] Non-200 response (${response.status}) for event '${event}': ${errText}`);
      return { success: false, status: response.status, error: `Webhook returned status ${response.status}` };
    }
  } catch (err: any) {
    console.error(`[n8n Webhook] Error dispatching event '${event}':`, err.message || err);
    return { success: false, error: err.message || 'Network error dispatching webhook' };
  }
}
