import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Order,
  Product,
  BranchInventory,
  CashRemittance,
  ReceiptData,
  SalesSummaryMetrics
} from '../types/index';
import {
  INITIAL_PRODUCTS_DATA,
  INITIAL_INGREDIENTS_DATA
} from '../../server/phase3-data';

// ============================================================================
// PRODUCTION GOOGLE APPS SCRIPT WEB APP ENDPOINT
// ============================================================================
export const PRODUCTION_GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwqilwaEX_SEOo6hzUwFuMypKfbjJCla8Gv7kTVZJIOJlkBYe3y_YsHBy5UTiW-j9L6zQ/exec';

// ============================================================================
// GOOGLE SHEETS & GOOGLE DRIVE PERSISTENCE LAYER (Apps Script Web App API)
// Actions:
//   - GET  action="getMenu"     : Hydrate POS & Kiosk menu items on initial load
//   - POST action="createOrder" : Trigger when orders are placed via POS or Kiosk
//   - POST action="saveAudit"   : Send cash remittance & sales closing reports
// Offline Fallback:
//   - IndexedDB ("TagpuanOfflineDB") + localStorage with automatic online sync
// ============================================================================

export interface OrdersLogSheetRow {
  'Order ID': string;
  'Branch': string;
  'Items': string;
  'Amount': number;
  'Payment Status': string;
  'Timestamp': string;
  'Kitchen Status'?: string;
  'Source'?: string;
  'Customer Name'?: string;
  'Metadata JSON'?: string;
}

export interface MenuInventorySheetRow {
  'Item Name': string;
  'Price': number;
  'Category': string;
  'Stock Level': number;
  'Recipe Ingredients': string;
  'Item Code'?: string;
  'Unit'?: string;
  'Record Type'?: 'MENU_ITEM' | 'INGREDIENT';
}

export interface SalesAuditSheetRow {
  'Daily Remittances': number;
  'Cashier Name': string;
  'Cash Variance': number;
  'Expenses': number;
  'Branch'?: string;
  'Expected Cash'?: number;
  'Actual Cash Counted'?: number;
  'Status'?: string;
  'Timestamp'?: string;
  'Notes'?: string;
  'Report Type'?: 'CASH_REMITTANCE' | 'SALES_CLOSING_REPORT';
}

export interface GoogleDriveArchiveItem {
  id: string;
  type: 'E_RECEIPT' | 'SALES_SUMMARY';
  fileName: string;
  branchName: string;
  referenceId: string;
  amount: number;
  driveFileId?: string;
  driveFileUrl?: string;
  driveFolderName: string;
  status: 'SAVED_TO_DRIVE' | 'QUEUED_LOCAL_FALLBACK';
  createdAt: string;
  base64Pdf?: string;
}

export interface GoogleAppsScriptConfig {
  scriptUrl: string;
  driveFolderId: string;
  driveFolderName: string;
  autoSaveReceiptsToDrive: boolean;
  autoSaveSalesSummariesToDrive: boolean;
  timeoutMs: number;
}

export interface QueuedSheetMutation {
  id: string;
  action: 'createOrder' | 'saveAudit' | string;
  data: any;
  queuedAt: string;
}

const STORAGE_KEYS = {
  CONFIG: 'tagpuan_gas_config',
  ORDERS_LOG: 'tagpuan_gs_orders_log',
  MENU_INVENTORY: 'tagpuan_gs_menu_inventory',
  SALES_AUDIT: 'tagpuan_gs_sales_audit',
  DRIVE_ARCHIVE: 'tagpuan_gs_drive_archive',
  SYNC_QUEUE: 'tagpuan_gs_sync_queue',
  LAST_SYNC: 'tagpuan_gs_last_sync'
};

// ============================================================================
// INDEXEDDB OFFLINE PERSISTENCE ENGINE
// ============================================================================
const IDB_NAME = 'TagpuanOfflineDB';
const IDB_VERSION = 2;
const IDB_STORES = {
  ORDERS: 'offline_orders',
  SYNC_QUEUE: 'sync_queue',
  MENU_CACHE: 'menu_cache',
  AUDITS: 'offline_audits'
};

class IndexedDBOfflineStore {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private openDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve(null);
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = () => {
          try {
            const db = request.result;
            if (!db.objectStoreNames.contains(IDB_STORES.ORDERS)) {
              db.createObjectStore(IDB_STORES.ORDERS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(IDB_STORES.SYNC_QUEUE)) {
              db.createObjectStore(IDB_STORES.SYNC_QUEUE, { keyPath: 'id' });
            }
            if (db.objectStoreNames.contains(IDB_STORES.MENU_CACHE)) {
              db.deleteObjectStore(IDB_STORES.MENU_CACHE);
            }
            db.createObjectStore(IDB_STORES.MENU_CACHE, { keyPath: 'itemKey' });
            if (!db.objectStoreNames.contains(IDB_STORES.AUDITS)) {
              db.createObjectStore(IDB_STORES.AUDITS, { keyPath: 'id' });
            }
          } catch (upgradeErr) {
            console.warn('[IndexedDB] Store upgrade warning:', upgradeErr);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private normalizeRecordKey<T>(storeName: string, record: T, fallbackIdx = 0): any {
    if (!record || typeof record !== 'object') return record;
    const obj = { ...(record as any) };
    if (storeName === IDB_STORES.MENU_CACHE) {
      obj.itemKey = String(obj.itemKey || obj['Item Code'] || obj['Item Name'] || `menu-${fallbackIdx}-${Date.now()}`);
    } else if (!obj.id) {
      obj.id = String(obj['Order ID'] || obj.order_number || `rec-${fallbackIdx}-${Date.now()}`);
    }
    return obj;
  }

  public async put<T>(storeName: string, record: T): Promise<void> {
    const db = await this.openDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(this.normalizeRecordKey(storeName, record));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async putBulk<T>(storeName: string, records: T[]): Promise<void> {
    const db = await this.openDB();
    if (!db || !records.length) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        records.forEach((rec, idx) => {
          store.put(this.normalizeRecordKey(storeName, rec, idx));
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.openDB();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async delete(storeName: string, key: string): Promise<void> {
    const db = await this.openDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clear(storeName: string): Promise<void> {
    const db = await this.openDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const idbOfflineStore = new IndexedDBOfflineStore();

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function writeLocal(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// Seed initial "Menu_Inventory" rows in LocalStorage if empty
function buildSeedMenuInventoryRows(): MenuInventorySheetRow[] {
  const menuRows: MenuInventorySheetRow[] = INITIAL_PRODUCTS_DATA.map((p) => {
    const recipeSummary = (p.recipe_components || [])
      .map((rc) => `${rc.ingredient_name}: ${rc.quantity} ${rc.unit}`)
      .join(', ');
    return {
      'Item Name': p.product_name,
      'Price': p.selling_price,
      'Category': p.category,
      'Stock Level': 150,
      'Recipe Ingredients': recipeSummary || p.description || 'Standard Tagpuan Recipe',
      'Item Code': p.product_code,
      'Unit': 'serving',
      'Record Type': 'MENU_ITEM'
    };
  });

  const ingredientRows: MenuInventorySheetRow[] = INITIAL_INGREDIENTS_DATA.map((ing) => ({
    'Item Name': ing.item_name,
    'Price': ing.cost_price,
    'Category': ing.category,
    'Stock Level': ing.initial_stock,
    'Recipe Ingredients': `Reorder at ${ing.reorder_level} ${ing.unit} (Max ${ing.maximum_stock} ${ing.unit})`,
    'Item Code': ing.item_code,
    'Unit': ing.unit,
    'Record Type': 'INGREDIENT'
  }));

  return [...menuRows, ...ingredientRows];
}

function buildSeedSalesAuditRows(): SalesAuditSheetRow[] {
  return [
    {
      'Daily Remittances': 5450.0,
      'Cashier Name': 'Angela Reyes (Cashier)',
      'Cash Variance': 0.0,
      'Expenses': 0.0,
      'Branch': 'Tagpuan - Narra Branch',
      'Expected Cash': 5450.0,
      'Actual Cash Counted': 5450.0,
      'Status': 'VERIFIED',
      'Timestamp': new Date().toISOString(),
      'Notes': 'Opening shift balanced cash remittance',
      'Report Type': 'CASH_REMITTANCE'
    }
  ];
}

/**
 * Normalizes any remote row returned by Google Sheets `getMenu` into `MenuInventorySheetRow`
 */
function normalizeRemoteMenuRow(raw: any, idx: number): MenuInventorySheetRow {
  const itemName = String(
    raw['Item Name'] || raw.item_name || raw.product_name || raw.name || raw.Item || `Menu Item #${idx + 1}`
  ).trim();
  const price = Number(
    raw['Price'] ?? raw.selling_price ?? raw.price ?? raw.cost_price ?? raw.Amount ?? 50
  );
  const category = String(
    raw['Category'] || raw.category || raw.CategoryName || 'CLASSIC'
  ).toUpperCase();
  const stockLevel = Number(
    raw['Stock Level'] ?? raw.stock_level ?? raw.current_stock ?? raw.stock ?? raw.Stock ?? 100
  );
  const recipeIngredients = String(
    raw['Recipe Ingredients'] || raw.recipe_ingredients || raw.description || raw.Recipe || ''
  );
  const itemCode = String(
    raw['Item Code'] || raw.item_code || raw.product_code || raw.code || raw.id || `PRD-${idx + 1}`
  );
  const unit = String(raw['Unit'] || raw.unit || 'serving');
  const recordTypeRaw = String(raw['Record Type'] || raw.record_type || 'MENU_ITEM').toUpperCase();
  const recordType: 'MENU_ITEM' | 'INGREDIENT' =
    recordTypeRaw === 'INGREDIENT' ? 'INGREDIENT' : 'MENU_ITEM';

  return {
    'Item Name': itemName,
    'Price': isNaN(price) ? 50 : price,
    'Category': category,
    'Stock Level': isNaN(stockLevel) ? 100 : stockLevel,
    'Recipe Ingredients': recipeIngredients,
    'Item Code': itemCode,
    'Unit': unit,
    'Record Type': recordType
  };
}

class GoogleSheetsPersistenceService {
  private isFlushing = false;
  private listenersSetup = false;

  constructor() {
    this.setupAutoSyncListeners();
  }

  private setupAutoSyncListeners(): void {
    if (typeof window === 'undefined' || this.listenersSetup) return;
    this.listenersSetup = true;

    // Ensure production endpoint is persisted in localStorage on boot
    const currentCfg = this.getConfig();
    if (!currentCfg.scriptUrl || currentCfg.scriptUrl !== PRODUCTION_GOOGLE_SCRIPT_URL) {
      writeLocal(STORAGE_KEYS.CONFIG, {
        ...currentCfg,
        scriptUrl: PRODUCTION_GOOGLE_SCRIPT_URL
      });
    }

    // Hydrate localStorage queue from IndexedDB if needed and flush when back online
    void this.syncIndexedDBQueueToLocal();

    window.addEventListener('online', () => {
      console.log('[GoogleSheetsAPI] Network connection restored — auto-syncing queued offline orders & audits...');
      void this.flushOfflineQueue();
    });

    // Periodic background sync heartbeat every 20 seconds when online
    setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const q = this.getSyncQueue();
        if (q.length > 0) {
          void this.flushOfflineQueue();
        }
      }
    }, 20000);
  }

  private async syncIndexedDBQueueToLocal(): Promise<void> {
    try {
      const idbQueue = await idbOfflineStore.getAll<QueuedSheetMutation>(IDB_STORES.SYNC_QUEUE);
      if (idbQueue.length > 0) {
        const localQueue = this.getSyncQueue();
        const existingIds = new Set(localQueue.map((item) => item.id));
        let merged = false;
        for (const item of idbQueue) {
          if (!existingIds.has(item.id)) {
            localQueue.push(item);
            merged = true;
          }
        }
        if (merged) {
          writeLocal(STORAGE_KEYS.SYNC_QUEUE, localQueue.slice(-250));
        }
      }
    } catch {
      // ignore
    }
  }

  public getConfig(): GoogleAppsScriptConfig {
    const envUrl =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL) ||
      PRODUCTION_GOOGLE_SCRIPT_URL;
    const envFolderId =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_DRIVE_FOLDER_ID) || '';

    const saved = readLocal<Partial<GoogleAppsScriptConfig>>(STORAGE_KEYS.CONFIG, {});
    const scriptUrl =
      saved.scriptUrl && saved.scriptUrl.trim().startsWith('https://script.google.com/')
        ? saved.scriptUrl.trim()
        : envUrl || PRODUCTION_GOOGLE_SCRIPT_URL;

    return {
      scriptUrl,
      driveFolderId: saved.driveFolderId ?? envFolderId ?? '',
      driveFolderName: saved.driveFolderName || 'Tagpuan_ERP_Drive_Archive',
      autoSaveReceiptsToDrive: saved.autoSaveReceiptsToDrive ?? true,
      autoSaveSalesSummariesToDrive: saved.autoSaveSalesSummariesToDrive ?? true,
      timeoutMs: saved.timeoutMs || 5000
    };
  }

  public saveConfig(partial: Partial<GoogleAppsScriptConfig>): GoogleAppsScriptConfig {
    const next = { ...this.getConfig(), ...partial };
    if (!next.scriptUrl) {
      next.scriptUrl = PRODUCTION_GOOGLE_SCRIPT_URL;
    }
    writeLocal(STORAGE_KEYS.CONFIG, next);
    return next;
  }

  public isConfigured(): boolean {
    const { scriptUrl } = this.getConfig();
    return Boolean(scriptUrl && scriptUrl.trim().startsWith('https://script.google.com/'));
  }

  public getLastSyncTimestamp(): string | null {
    return readLocal<string | null>(STORAGE_KEYS.LAST_SYNC, null);
  }

  public getSyncQueue(): QueuedSheetMutation[] {
    return readLocal<QueuedSheetMutation[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  private enqueueMutation(action: string, data: any): QueuedSheetMutation {
    const mutation: QueuedSheetMutation = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      data,
      queuedAt: new Date().toISOString()
    };
    const queue = this.getSyncQueue();
    queue.push(mutation);
    writeLocal(STORAGE_KEYS.SYNC_QUEUE, queue.slice(-250));
    void idbOfflineStore.put(IDB_STORES.SYNC_QUEUE, mutation);
    return mutation;
  }

  /**
   * Low-latency GET request to Google Apps Script `doGet` with timeout & IndexedDB/LocalStorage fallback
   */
  public async callDoGet(action: string, params: Record<string, string> = {}): Promise<any | null> {
    const config = this.getConfig();
    if (!this.isConfigured()) return null;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const url = new URL(config.scriptUrl);
      url.searchParams.set('action', action);
      Object.entries(params).forEach(([k, v]) => {
        if (v) url.searchParams.set(k, v);
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data) {
        writeLocal(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        return data;
      }
      return null;
    } catch (err) {
      clearTimeout(timer);
      console.warn(`[GoogleSheetsAPI:doGet] Offline or latency fallback for action="${action}":`, err);
      return null;
    }
  }

  /**
   * Low-latency POST request to Google Apps Script `doPost`
   * Uses Content-Type: text/plain;charset=utf-8 so browsers do not fail on OPTIONS preflight with script.google.com
   */
  public async callDoPost(
    action: string,
    payload: Record<string, any>,
    queueOnFailure = true
  ): Promise<any | null> {
    const config = this.getConfig();
    if (!this.isConfigured() || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      if (queueOnFailure) {
        this.enqueueMutation(action, payload);
      }
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action,
          ...payload
        }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data && data.success !== false) {
        writeLocal(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        return data;
      }
      throw new Error(data?.error || 'Google Apps Script returned unsuccessful response');
    } catch (err) {
      clearTimeout(timer);
      console.warn(
        `[GoogleSheetsAPI:doPost] Offline or latency fallback for action="${action}"; queued in IndexedDB & localStorage.`,
        err
      );
      if (queueOnFailure) {
        this.enqueueMutation(action, payload);
      }
      return null;
    }
  }

  /**
   * Flushes any offline IndexedDB & LocalStorage mutations to Google Sheets once back online.
   * Replays individual `createOrder` and `saveAudit` actions or batches them.
   */
  public async flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
    if (this.isFlushing) {
      return { synced: 0, remaining: this.getSyncQueue().length };
    }
    await this.syncIndexedDBQueueToLocal();
    const queue = this.getSyncQueue();
    if (queue.length === 0 || !this.isConfigured()) {
      return { synced: 0, remaining: queue.length };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { synced: 0, remaining: queue.length };
    }

    this.isFlushing = true;
    let syncedCount = 0;
    const remainingQueue: QueuedSheetMutation[] = [];

    try {
      for (const item of queue) {
        const res = await this.callDoPost(item.action, item.data, false);
        if (res && res.success !== false) {
          syncedCount++;
          await idbOfflineStore.delete(IDB_STORES.SYNC_QUEUE, item.id);
        } else {
          remainingQueue.push(item);
        }
      }
      writeLocal(STORAGE_KEYS.SYNC_QUEUE, remainingQueue);
      if (syncedCount > 0) {
        window.dispatchEvent(
          new CustomEvent('tagpuan:sheets_synced', {
            detail: { synced: syncedCount, remaining: remainingQueue.length }
          })
        );
      }
      return { synced: syncedCount, remaining: remainingQueue.length };
    } finally {
      this.isFlushing = false;
    }
  }

  // ==========================================================================
  // 1. GET action="getMenu" — Hydrate POS and Kiosk menu items on initial load
  // ==========================================================================

  public getLocalMenuInventoryRows(): MenuInventorySheetRow[] {
    const stored = readLocal<MenuInventorySheetRow[]>(STORAGE_KEYS.MENU_INVENTORY, []);
    if (stored.length > 0) return stored;
    const seeded = buildSeedMenuInventoryRows();
    writeLocal(STORAGE_KEYS.MENU_INVENTORY, seeded);
    void idbOfflineStore.putBulk(IDB_STORES.MENU_CACHE, seeded);
    return seeded;
  }

  /**
   * Calls GET `?action=getMenu` on the production Google Apps Script endpoint
   * and caches the result in IndexedDB + LocalStorage.
   */
  public async fetchMenuInventoryFromSheet(): Promise<MenuInventorySheetRow[]> {
    const remote = await this.callDoGet('getMenu');
    const rawArray =
      (remote && Array.isArray(remote.menu) && remote.menu) ||
      (remote && Array.isArray(remote.menu_inventory) && remote.menu_inventory) ||
      (remote && Array.isArray(remote.data) && remote.data) ||
      (remote && Array.isArray(remote.items) && remote.items) ||
      (Array.isArray(remote) ? remote : null);

    if (rawArray && rawArray.length > 0) {
      const normalized = rawArray.map((r: any, idx: number) => normalizeRemoteMenuRow(r, idx));
      // Merge with existing ingredient rows if the remote sheet only returned menu items
      const localExisting = this.getLocalMenuInventoryRows();
      const hasIngredientsInRemote = normalized.some((r: MenuInventorySheetRow) => r['Record Type'] === 'INGREDIENT');
      const merged = hasIngredientsInRemote
        ? normalized
        : [
            ...normalized,
            ...localExisting.filter((r) => r['Record Type'] === 'INGREDIENT')
          ];

      writeLocal(STORAGE_KEYS.MENU_INVENTORY, merged);
      void idbOfflineStore.putBulk(IDB_STORES.MENU_CACHE, merged);
      return merged;
    }

    // Fallback to IndexedDB cache if localStorage is empty
    const idbCached = await idbOfflineStore.getAll<MenuInventorySheetRow>(IDB_STORES.MENU_CACHE);
    if (idbCached && idbCached.length > 0) {
      writeLocal(STORAGE_KEYS.MENU_INVENTORY, idbCached);
      return idbCached;
    }

    return this.getLocalMenuInventoryRows();
  }

  /**
   * Hydrates POS and Kiosk `Product[]` directly using GET action `"getMenu"`
   * with instant fallback to IndexedDB / LocalStorage if offline or delayed.
   */
  public async getMenu(fallbackProducts: Product[] = []): Promise<Product[]> {
    await this.fetchMenuInventoryFromSheet();
    return this.getProductsFromMenuInventory(fallbackProducts);
  }

  // ==========================================================================
  // 2. POST action="createOrder" — Trigger when orders are placed via POS or Kiosk
  // ==========================================================================

  public getLocalOrdersLog(): OrdersLogSheetRow[] {
    const rows = readLocal<OrdersLogSheetRow[]>(STORAGE_KEYS.ORDERS_LOG, []);
    if (rows.length > 0) return rows;

    const existingOrders = readLocal<Order[]>('tagpuan_fallback_orders', []);
    if (existingOrders.length > 0) {
      const mapped = existingOrders.map((o) => this.orderToSheetRow(o));
      writeLocal(STORAGE_KEYS.ORDERS_LOG, mapped);
      return mapped;
    }
    return [];
  }

  public orderToSheetRow(order: Order): OrdersLogSheetRow {
    const itemsStr = (order.items || [])
      .map((i) => `${i.quantity}x ${i.product_name}`)
      .join(', ');
    return {
      'Order ID': order.order_number || order.id,
      'Branch': order.branch_name || 'Tagpuan - Narra Branch',
      'Items': itemsStr || 'Assorted Menu Items',
      'Amount': Number(order.total || order.subtotal || 0),
      'Payment Status': order.status || order.payment_status || 'PENDING_PAYMENT',
      'Timestamp': order.created_at || new Date().toISOString(),
      'Kitchen Status': order.kitchen_status || 'NEW',
      'Source': order.source || 'POS',
      'Customer Name': order.customer_name || 'Guest',
      'Metadata JSON': JSON.stringify(order)
    };
  }

  public sheetRowToOrder(row: OrdersLogSheetRow): Order {
    if (row['Metadata JSON']) {
      try {
        const parsed = JSON.parse(row['Metadata JSON']);
        if (parsed && parsed.id) {
          return {
            ...parsed,
            status: (row['Payment Status'] as any) || parsed.status || 'PAID',
            kitchen_status: (row['Kitchen Status'] as any) || parsed.kitchen_status || 'NEW'
          };
        }
      } catch {
        // fallback to constructing from columns
      }
    }

    const orderNum = String(row['Order ID'] || `TAG-${Date.now()}`);
    const parsedItems = String(row['Items'] || '')
      .split(',')
      .map((part, idx) => {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\d+)x\s+(.+)$/i);
        const qty = match ? Number(match[1]) : 1;
        const name = match ? match[2] : trimmed || 'Menu Item';
        return {
          id: `oi-${orderNum}-${idx}`,
          order_id: orderNum,
          product_id: `prod-${idx}`,
          product_name: name,
          unit_price: 50,
          quantity: qty,
          subtotal: qty * 50,
          modifiers: []
        };
      });

    return {
      id: orderNum,
      order_number: orderNum,
      branch_id: 'c561fe5a-c31c-4657-b040-562004c9daba',
      branch_name: String(row['Branch'] || 'Tagpuan - Narra Branch'),
      cashier_id: 'CASHIER',
      cashier_name: 'POS Cashier',
      source: (row['Source'] as any) || 'POS',
      status: (row['Payment Status'] as any) || 'PAID',
      kitchen_status: (row['Kitchen Status'] as any) || 'NEW',
      dining_option: 'DINE_IN',
      customer_name: row['Customer Name'] || 'Guest',
      subtotal: Number(row['Amount'] || 0),
      discount_type: 'NONE',
      discount_amount: 0,
      total: Number(row['Amount'] || 0),
      items: parsedItems,
      created_at: String(row['Timestamp'] || new Date().toISOString()),
      updated_at: String(row['Timestamp'] || new Date().toISOString())
    };
  }

  public async fetchOrdersFromSheet(branchFilter?: string): Promise<Order[]> {
    const remote = await this.callDoGet('GET_ORDERS', branchFilter ? { branch: branchFilter } : {});
    if (remote && Array.isArray(remote.orders_log)) {
      writeLocal(STORAGE_KEYS.ORDERS_LOG, remote.orders_log);
      const orders = remote.orders_log.map((r: OrdersLogSheetRow) => this.sheetRowToOrder(r));
      writeLocal('tagpuan_fallback_orders', orders);
      void idbOfflineStore.putBulk(IDB_STORES.ORDERS, orders);
      return orders;
    }

    const localRows = this.getLocalOrdersLog();
    let orders = localRows.map((r) => this.sheetRowToOrder(r));
    if (orders.length === 0) {
      const idbOrders = await idbOfflineStore.getAll<Order>(IDB_STORES.ORDERS);
      if (idbOrders.length > 0) orders = idbOrders;
    }

    if (branchFilter && branchFilter !== 'ALL') {
      return orders.filter(
        (o) =>
          o.branch_id === branchFilter ||
          (o.branch_name && o.branch_name.toLowerCase().includes(branchFilter.toLowerCase()))
      );
    }
    return orders;
  }

  /**
   * Sends POST action `"createOrder"` when an order is placed via POS or Kiosk.
   * Always persists immediately to IndexedDB (`offline_orders`) and `localStorage`,
   * and queues for automatic online sync if offline or latency occurs.
   */
  public async createOrder(order: Order, deductInventory = false): Promise<OrdersLogSheetRow> {
    const sheetRow = this.orderToSheetRow(order);
    const currentRows = this.getLocalOrdersLog();
    const existingIdx = currentRows.findIndex(
      (r) => String(r['Order ID']) === String(sheetRow['Order ID'])
    );

    if (existingIdx >= 0) {
      currentRows[existingIdx] = sheetRow;
    } else {
      currentRows.unshift(sheetRow);
    }
    writeLocal(STORAGE_KEYS.ORDERS_LOG, currentRows);

    // Save in localStorage fallback orders + IndexedDB offline_orders store
    const fallbackOrders = readLocal<Order[]>('tagpuan_fallback_orders', []);
    const ordIdx = fallbackOrders.findIndex(
      (o) => o.id === order.id || o.order_number === order.order_number
    );
    if (ordIdx >= 0) {
      fallbackOrders[ordIdx] = order;
    } else {
      fallbackOrders.unshift(order);
    }
    writeLocal('tagpuan_fallback_orders', fallbackOrders);
    void idbOfflineStore.put(IDB_STORES.ORDERS, {
      ...order,
      id: order.id || order.order_number || `ord-${Date.now()}`
    });

    if (deductInventory && order.items && order.items.length > 0) {
      await this.deductInventoryInSheet(order.items);
    }

    // Trigger POST action "createOrder" to production Google Apps Script endpoint
    void this.callDoPost('createOrder', {
      order,
      data: {
        ...order,
        ...sheetRow
      },
      deductInventory,
      items: order.items || []
    });

    return sheetRow;
  }

  /**
   * Alias for `createOrder` to maintain compatibility across all existing callers
   */
  public async logOrderToSheet(order: Order, deductInventory = false): Promise<OrdersLogSheetRow> {
    return this.createOrder(order, deductInventory);
  }

  public async updateOrderStatusInSheet(
    orderIdOrNumber: string,
    updates: { status?: string; payment_status?: string; kitchen_status?: string; payment_method?: string }
  ): Promise<void> {
    const rows = this.getLocalOrdersLog();
    let updated = false;
    for (const r of rows) {
      if (
        String(r['Order ID']) === String(orderIdOrNumber) ||
        (r['Metadata JSON'] && r['Metadata JSON'].includes(orderIdOrNumber))
      ) {
        if (updates.payment_status || updates.status) {
          r['Payment Status'] = (updates.payment_status || updates.status)!;
        }
        if (updates.kitchen_status) {
          r['Kitchen Status'] = updates.kitchen_status;
        }
        if (r['Metadata JSON']) {
          try {
            const parsed = JSON.parse(r['Metadata JSON']);
            if (updates.status || updates.payment_status) {
              parsed.status = updates.status || updates.payment_status;
            }
            if (updates.kitchen_status) {
              parsed.kitchen_status = updates.kitchen_status;
            }
            if (updates.payment_method) {
              parsed.payment_method = updates.payment_method;
            }
            r['Metadata JSON'] = JSON.stringify(parsed);
          } catch {
            // ignore
          }
        }
        updated = true;
      }
    }
    if (updated) {
      writeLocal(STORAGE_KEYS.ORDERS_LOG, rows);
    }

    const kdsOrders = readLocal<Order[]>('kds_orders', []);
    const kdsIdx = kdsOrders.findIndex((o) => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
    if (kdsIdx >= 0) {
      if (updates.kitchen_status) kdsOrders[kdsIdx].kitchen_status = updates.kitchen_status as any;
      if (updates.status) kdsOrders[kdsIdx].status = updates.status as any;
      writeLocal('kds_orders', kdsOrders);
    }

    void this.callDoPost('UPDATE_ORDER_STATUS', {
      orderId: orderIdOrNumber,
      ...updates
    });
  }

  // ==========================================================================
  // TAB 2 HELPERS: "Menu_Inventory"
  // ==========================================================================

  public async upsertMenuInventoryItem(row: Partial<MenuInventorySheetRow>): Promise<MenuInventorySheetRow> {
    const rows = this.getLocalMenuInventoryRows();
    const itemName = row['Item Name'] || 'Unnamed Item';
    const itemCode = row['Item Code'] || '';

    const idx = rows.findIndex(
      (r) =>
        r['Item Name'].toLowerCase() === itemName.toLowerCase() ||
        (itemCode && r['Item Code']?.toLowerCase() === itemCode.toLowerCase())
    );

    const normalized: MenuInventorySheetRow = {
      'Item Name': itemName,
      'Price': Number(row['Price'] ?? (idx >= 0 ? rows[idx]['Price'] : 0)),
      'Category': row['Category'] || (idx >= 0 ? rows[idx]['Category'] : 'GENERAL'),
      'Stock Level': Number(row['Stock Level'] ?? (idx >= 0 ? rows[idx]['Stock Level'] : 100)),
      'Recipe Ingredients':
        row['Recipe Ingredients'] ?? (idx >= 0 ? rows[idx]['Recipe Ingredients'] : 'Standard Recipe'),
      'Item Code': itemCode || (idx >= 0 ? rows[idx]['Item Code'] : `ITM-${Date.now().toString().slice(-4)}`),
      'Unit': row['Unit'] || (idx >= 0 ? rows[idx]['Unit'] : 'pcs'),
      'Record Type': row['Record Type'] || (idx >= 0 ? rows[idx]['Record Type'] : 'MENU_ITEM')
    };

    if (idx >= 0) {
      rows[idx] = normalized;
    } else {
      rows.push(normalized);
    }
    writeLocal(STORAGE_KEYS.MENU_INVENTORY, rows);
    void idbOfflineStore.put(IDB_STORES.MENU_CACHE, normalized);

    void this.callDoPost('UPSERT_MENU_INVENTORY', { data: normalized });
    return normalized;
  }

  public async deductInventoryInSheet(
    items: { product_name?: string; name?: string; quantity: number }[]
  ): Promise<MenuInventorySheetRow[]> {
    const rows = this.getLocalMenuInventoryRows();

    for (const item of items) {
      const targetName = (item.product_name || item.name || '').toLowerCase();
      const qty = Number(item.quantity || 1);
      if (!targetName) continue;

      for (const row of rows) {
        if (row['Item Name'].toLowerCase() === targetName || row['Item Name'].toLowerCase().includes(targetName)) {
          row['Stock Level'] = Math.max(0, Math.round((Number(row['Stock Level'] || 0) - qty) * 100) / 100);

          const recipeStr = row['Recipe Ingredients'] || '';
          if (recipeStr.includes(':')) {
            const parts = recipeStr.split(',');
            for (const part of parts) {
              const [ingNameRaw, qtyUnitRaw] = part.split(':');
              if (ingNameRaw && qtyUnitRaw) {
                const ingName = ingNameRaw.trim().toLowerCase();
                const numMatch = qtyUnitRaw.trim().match(/[\d.]+/);
                const ingQtyPerServing = numMatch ? parseFloat(numMatch[0]) : 1;
                const matchedIngRow = rows.find((r) => r['Item Name'].toLowerCase() === ingName);
                if (matchedIngRow) {
                  matchedIngRow['Stock Level'] = Math.max(
                    0,
                    Math.round((Number(matchedIngRow['Stock Level'] || 0) - ingQtyPerServing * qty) * 100) / 100
                  );
                }
              }
            }
          }
        }
      }
    }

    writeLocal(STORAGE_KEYS.MENU_INVENTORY, rows);
    void idbOfflineStore.putBulk(IDB_STORES.MENU_CACHE, rows);
    void this.callDoPost('DEDUCT_INVENTORY', { items });
    return rows;
  }

  /**
   * Maps "Menu_Inventory" rows to Tagpuan ERP `Product[]` for POS and Kiosk
   */
  public getProductsFromMenuInventory(fallbackProducts: Product[]): Product[] {
    const rows = this.getLocalMenuInventoryRows().filter((r) => r['Record Type'] !== 'INGREDIENT');
    if (rows.length === 0) return fallbackProducts;

    return rows.map((r, index) => {
      const existing = fallbackProducts.find(
        (p) =>
          p.product_name.toLowerCase() === r['Item Name'].toLowerCase() ||
          (r['Item Code'] && p.product_code.toLowerCase() === r['Item Code'].toLowerCase())
      );
      const stock = Number(r['Stock Level'] ?? 100);
      const code = r['Item Code'] || existing?.product_code || `PRD-${index + 1}`;
      return {
        ...(existing || {}),
        id: existing?.id || `prod-${code.toLowerCase()}`,
        product_code: code,
        code,
        product_name: r['Item Name'],
        name: r['Item Name'],
        category: (r['Category'] as any) || existing?.category || 'CLASSIC',
        description: r['Recipe Ingredients'] || existing?.description || '',
        selling_price: Number(r['Price'] || existing?.selling_price || 0),
        price: Number(r['Price'] || existing?.selling_price || 0),
        product_image: existing?.product_image || null,
        is_active: true,
        is_available: stock > 0,
        is_out_of_stock: stock <= 0,
        is_sold_out: stock <= 0,
        display_order: existing?.display_order || index + 1,
        has_recipe: true,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
  }

  /**
   * Maps "Menu_Inventory" rows to Tagpuan ERP `BranchInventory[]` for Inventory Management
   */
  public getBranchInventoryFromMenuInventory(branchId: string, branchName: string): BranchInventory[] {
    const rows = this.getLocalMenuInventoryRows().filter((r) => r['Record Type'] === 'INGREDIENT');
    return rows.map((r, idx) => {
      const code = r['Item Code'] || `ING-${String(idx + 1).padStart(2, '0')}`;
      const stock = Number(r['Stock Level'] ?? 0);
      const reorderLevel = 15;
      const status = stock <= 0 ? 'OUT_OF_STOCK' : stock <= reorderLevel ? 'LOW_STOCK' : 'IN_STOCK';
      return {
        id: `${branchId}_${code}`,
        branch_id: branchId,
        branch_name: branchName,
        ingredient_id: code,
        ingredient_name: r['Item Name'],
        item_code: code,
        category: r['Category'] || 'GENERAL',
        unit: r['Unit'] || 'pcs',
        cost_price: Number(r['Price'] || 0),
        current_stock: stock,
        reorder_level: reorderLevel,
        maximum_stock: 300,
        status,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
  }

  // ==========================================================================
  // 3. POST action="saveAudit" — Cash Remittance & Sales Closing Reports
  // ==========================================================================

  public getLocalSalesAuditRows(): SalesAuditSheetRow[] {
    const stored = readLocal<SalesAuditSheetRow[]>(STORAGE_KEYS.SALES_AUDIT, []);
    if (stored.length > 0) return stored;
    const seeded = buildSeedSalesAuditRows();
    writeLocal(STORAGE_KEYS.SALES_AUDIT, seeded);
    return seeded;
  }

  public async fetchSalesAuditFromSheet(branchFilter?: string): Promise<SalesAuditSheetRow[]> {
    const remote = await this.callDoGet('GET_SALES_AUDIT', branchFilter ? { branch: branchFilter } : {});
    if (remote && Array.isArray(remote.sales_audit) && remote.sales_audit.length > 0) {
      writeLocal(STORAGE_KEYS.SALES_AUDIT, remote.sales_audit);
      return remote.sales_audit;
    }
    const local = this.getLocalSalesAuditRows();
    if (branchFilter && branchFilter !== 'ALL') {
      return local.filter(
        (r) => !r['Branch'] || r['Branch'].toLowerCase().includes(branchFilter.toLowerCase())
      );
    }
    return local;
  }

  /**
   * Sends POST action `"saveAudit"` for cash remittances and sales closing reports.
   * Saves locally in IndexedDB + LocalStorage and auto-syncs when online.
   */
  public async saveAudit(
    remittanceOrClosingReport: Partial<CashRemittance> & {
      daily_remittance?: number;
      cashier_name?: string;
      cash_variance?: number;
      expenses?: number;
      branch_name?: string;
      report_type?: 'CASH_REMITTANCE' | 'SALES_CLOSING_REPORT';
      total_sales?: number;
      opening_cash?: number;
      closing_cash?: number;
    }
  ): Promise<SalesAuditSheetRow> {
    const remittedVal = Number(
      remittanceOrClosingReport.remitted_amount ??
        remittanceOrClosingReport.daily_remittance ??
        remittanceOrClosingReport.closing_cash ??
        remittanceOrClosingReport.actual_cash_counted ??
        remittanceOrClosingReport.total_sales ??
        0
    );
    const expectedVal = Number(
      remittanceOrClosingReport.expected_cash ?? remittedVal
    );
    const actualVal = Number(
      remittanceOrClosingReport.actual_cash_counted ??
        remittanceOrClosingReport.closing_cash ??
        remittedVal
    );
    const varianceVal = Number(
      remittanceOrClosingReport.variance ??
        remittanceOrClosingReport.cash_variance ??
        actualVal - expectedVal
    );

    const row: SalesAuditSheetRow = {
      'Daily Remittances': remittedVal,
      'Cashier Name': remittanceOrClosingReport.cashier_name || 'POS Cashier',
      'Cash Variance': varianceVal,
      'Expenses': Number(remittanceOrClosingReport.total_expenses ?? remittanceOrClosingReport.expenses ?? 0),
      'Branch': remittanceOrClosingReport.branch_name || 'Tagpuan - Narra Branch',
      'Expected Cash': expectedVal,
      'Actual Cash Counted': actualVal,
      'Status': remittanceOrClosingReport.status || 'SUBMITTED',
      'Timestamp': remittanceOrClosingReport.created_at || new Date().toISOString(),
      'Notes':
        remittanceOrClosingReport.notes ||
        (remittanceOrClosingReport.report_type === 'SALES_CLOSING_REPORT'
          ? 'Shift Sales Closing Report'
          : 'Cash Remittance Audit'),
      'Report Type': remittanceOrClosingReport.report_type || 'CASH_REMITTANCE'
    };

    const current = this.getLocalSalesAuditRows();
    current.unshift(row);
    writeLocal(STORAGE_KEYS.SALES_AUDIT, current);
    void idbOfflineStore.put(IDB_STORES.AUDITS, {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...row
    });

    // Trigger POST action "saveAudit" to production Google Apps Script endpoint
    void this.callDoPost('saveAudit', {
      audit: row,
      data: row
    });

    return row;
  }

  /**
   * Alias for `saveAudit` to maintain compatibility across existing callers
   */
  public async logSalesAuditToSheet(
    remittance: Partial<CashRemittance> & {
      daily_remittance?: number;
      cashier_name?: string;
      cash_variance?: number;
      expenses?: number;
      branch_name?: string;
      report_type?: 'CASH_REMITTANCE' | 'SALES_CLOSING_REPORT';
    }
  ): Promise<SalesAuditSheetRow> {
    return this.saveAudit(remittance);
  }

  // ==========================================================================
  // GOOGLE DRIVE AUTOMATION:
  // Automatic Generation & Saving of PDF Sales Summaries & e-Receipts
  // ==========================================================================

  public getDriveArchive(): GoogleDriveArchiveItem[] {
    return readLocal<GoogleDriveArchiveItem[]>(STORAGE_KEYS.DRIVE_ARCHIVE, []);
  }

  private recordDriveArchiveItem(item: GoogleDriveArchiveItem): void {
    const list = this.getDriveArchive();
    const filtered = list.filter((i) => i.id !== item.id);
    filtered.unshift(item);
    writeLocal(STORAGE_KEYS.DRIVE_ARCHIVE, filtered.slice(0, 150));
  }

  /**
   * Generates a thermal-style PDF e-Receipt (base64) and automatically saves it to Google Drive
   */
  public async generateAndSaveEReceiptToDrive(
    receipt: ReceiptData,
    options?: { downloadLocally?: boolean }
  ): Promise<GoogleDriveArchiveItem> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [260, 520]
    });

    let y = 28;
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text('TAGPUAN', 130, y, { align: 'center' });
    y += 13;

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('HOME OF AUTHENTIC BURGER & SIOMAI', 130, y, { align: 'center' });
    y += 12;
    doc.setFont('courier', 'bold');
    doc.text(receipt.branch_name || 'Tagpuan Branch', 130, y, { align: 'center' });
    y += 11;
    doc.setFont('courier', 'normal');
    doc.text('Official POS / Kiosk e-Receipt', 130, y, { align: 'center' });
    y += 12;

    doc.text('------------------------------------', 130, y, { align: 'center' });
    y += 12;

    doc.setFontSize(8);
    doc.text(`Order No : ${receipt.order_number}`, 18, y);
    y += 11;
    doc.text(`Ref No   : ${receipt.reference_number || '-'}`, 18, y);
    y += 11;
    doc.text(`Date/Time: ${receipt.date} ${receipt.time}`, 18, y);
    y += 11;
    doc.text(`Cashier  : ${receipt.cashier_name || 'Staff'}`, 18, y);
    y += 12;

    doc.text('------------------------------------', 130, y, { align: 'center' });
    y += 12;

    (receipt.items || []).forEach((item) => {
      const lineLeft = `${item.quantity}x ${item.product_name}`.slice(0, 24);
      const lineRight = `P${Number(item.subtotal || 0).toFixed(2)}`;
      doc.setFont('courier', 'bold');
      doc.text(lineLeft, 18, y);
      doc.text(lineRight, 242, y, { align: 'right' });
      y += 11;
      if (item.modifiers && item.modifiers.length > 0) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.text(`  + ${item.modifiers.join(', ').slice(0, 32)}`, 18, y);
        doc.setFontSize(8);
        y += 10;
      }
    });

    doc.setFont('courier', 'normal');
    doc.text('------------------------------------', 130, y, { align: 'center' });
    y += 12;

    doc.text('Subtotal:', 18, y);
    doc.text(`P${Number(receipt.subtotal || 0).toFixed(2)}`, 242, y, { align: 'right' });
    y += 11;

    if (receipt.discount > 0) {
      doc.text('Discount:', 18, y);
      doc.text(`-P${Number(receipt.discount || 0).toFixed(2)}`, 242, y, { align: 'right' });
      y += 11;
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', 18, y);
    doc.text(`P${Number(receipt.total || 0).toFixed(2)}`, 242, y, { align: 'right' });
    y += 14;

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text(`Payment Method: ${receipt.payment_method}`, 18, y);
    y += 11;
    if (receipt.amount_received !== undefined) {
      doc.text(`Amount Tendered: P${Number(receipt.amount_received).toFixed(2)}`, 18, y);
      y += 11;
      doc.text(`Change: P${Number(receipt.change || 0).toFixed(2)}`, 18, y);
      y += 12;
    }

    doc.text('------------------------------------', 130, y, { align: 'center' });
    y += 12;
    doc.text('THANK YOU FOR DINING AT TAGPUAN!', 130, y, { align: 'center' });

    const safeOrderNo = String(receipt.order_number || 'ORD').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `Tagpuan_eReceipt_${safeOrderNo}_${new Date().toISOString().slice(0, 10)}.pdf`;

    if (options?.downloadLocally) {
      doc.save(fileName);
    }

    const dataUri = doc.output('datauristring');
    const base64Pdf = dataUri.split(',')[1] || dataUri;
    const config = this.getConfig();

    const response = await this.callDoPost('SAVE_PDF_TO_DRIVE', {
      data: {
        fileName,
        folderId: config.driveFolderId,
        folderName: config.driveFolderName,
        subFolder: 'e-Receipts',
        base64Pdf
      }
    });

    const archiveItem: GoogleDriveArchiveItem = {
      id: `drv-rcp-${safeOrderNo}-${Date.now()}`,
      type: 'E_RECEIPT',
      fileName,
      branchName: receipt.branch_name || 'Tagpuan Branch',
      referenceId: receipt.order_number,
      amount: Number(receipt.total || 0),
      driveFileId: response?.file?.fileId,
      driveFileUrl: response?.file?.fileUrl,
      driveFolderName: `${config.driveFolderName}/e-Receipts`,
      status: response?.file?.fileId ? 'SAVED_TO_DRIVE' : 'QUEUED_LOCAL_FALLBACK',
      createdAt: new Date().toISOString(),
      base64Pdf
    };

    this.recordDriveArchiveItem(archiveItem);
    return archiveItem;
  }

  /**
   * Generates a complete PDF Sales Summary Report, triggers "saveAudit" for the closing summary,
   * and saves the PDF to Google Drive
   */
  public async generateAndSaveSalesSummaryToDrive(
    metrics: SalesSummaryMetrics,
    branchName: string,
    periodLabel: string,
    options?: { downloadLocally?: boolean }
  ): Promise<GoogleDriveArchiveItem> {
    // Also trigger "saveAudit" for the sales closing report
    void this.saveAudit({
      daily_remittance: Number(metrics.total_remittances || metrics.net_sales || 0),
      cashier_name: 'Manager / Sales Closing Audit',
      cash_variance: Number(metrics.cash_variance || 0),
      expenses: Number(metrics.total_expenses || 0),
      branch_name: branchName,
      expected_cash: Number(metrics.expected_cash || metrics.net_sales || 0),
      actual_cash_counted: Number(metrics.actual_cash || metrics.net_sales || 0),
      status: 'VERIFIED',
      report_type: 'SALES_CLOSING_REPORT',
      notes: `Sales Closing Report (${periodLabel.toUpperCase()}) - Net Sales: PHP ${(metrics.net_sales || 0).toFixed(2)}`
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    doc.setFontSize(16);
    doc.setTextColor(17, 17, 17);
    doc.text('TAGPUAN: HOME OF AUTHENTIC BURGER & SIOMAI', 40, 42);

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Official Sales & Audit Summary Report (${periodLabel.toUpperCase()})`, 40, 60);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Branch Scope: ${branchName}   |   Generated: ${new Date().toLocaleString('en-PH')}`, 40, 76);

    const pb = metrics.payment_breakdown || {
      cash: { amount: 0, count: 0 },
      gcash: { amount: 0, count: 0 },
      maya: { amount: 0, count: 0 },
      qrph: { amount: 0, count: 0 },
      bank: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 }
    };

    const bodyRows = [
      ['Gross Sales', `PHP ${(metrics.gross_sales || 0).toFixed(2)}`],
      ['Total Discounts', `PHP ${(metrics.discounts || 0).toFixed(2)}`],
      ['Net Sales', `PHP ${(metrics.net_sales || 0).toFixed(2)}`],
      ['Cost of Goods Sold (COGS)', `PHP ${(metrics.cogs || 0).toFixed(2)}`],
      ['Gross Profit', `PHP ${(metrics.gross_profit || 0).toFixed(2)} (${(metrics.profit_margin || 0).toFixed(1)}%)`],
      ['Total Completed Orders', `${metrics.order_count || 0} orders`],
      ['Average Order Value', `PHP ${(metrics.average_order_value || 0).toFixed(2)}`],
      ['POS Counter Sales', `PHP ${(metrics.pos_sales || 0).toFixed(2)}`],
      ['Self-Order Kiosk Sales', `PHP ${(metrics.kiosk_sales || 0).toFixed(2)}`],
      ['Cash Payments', `PHP ${(pb.cash?.amount || 0).toFixed(2)} (${pb.cash?.count || 0})`],
      ['GCash Payments', `PHP ${(pb.gcash?.amount || 0).toFixed(2)} (${pb.gcash?.count || 0})`],
      ['Maya / QRPH / Bank', `PHP ${((pb.maya?.amount || 0) + (pb.qrph?.amount || 0) + (pb.bank?.amount || 0)).toFixed(2)}`],
      ['Allowable Branch Expenses', `PHP ${(metrics.total_expenses || 0).toFixed(2)}`],
      ['Expected Cash in Drawer', `PHP ${(metrics.expected_cash || 0).toFixed(2)}`],
      ['Actual Cash Counted', `PHP ${(metrics.actual_cash || 0).toFixed(2)}`],
      ['Cash Variance', `PHP ${(metrics.cash_variance || 0).toFixed(2)}`],
      ['Total Cash Remitted', `PHP ${(metrics.total_remittances || 0).toFixed(2)}`]
    ];

    autoTable(doc, {
      head: [['Financial & Audit Metric', 'Recorded Value']],
      body: bodyRows,
      startY: 94,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [17, 17, 17], textColor: [205, 235, 197], fontStyle: 'bold' }
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const safeBranch = branchName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Tagpuan_SalesSummary_${safeBranch}_${periodLabel}_${dateStr}.pdf`;

    if (options?.downloadLocally) {
      doc.save(fileName);
    }

    const dataUri = doc.output('datauristring');
    const base64Pdf = dataUri.split(',')[1] || dataUri;
    const config = this.getConfig();

    const response = await this.callDoPost('SAVE_PDF_TO_DRIVE', {
      data: {
        fileName,
        folderId: config.driveFolderId,
        folderName: config.driveFolderName,
        subFolder: 'Sales_Summaries',
        base64Pdf
      }
    });

    const archiveItem: GoogleDriveArchiveItem = {
      id: `drv-sum-${dateStr}-${Date.now()}`,
      type: 'SALES_SUMMARY',
      fileName,
      branchName,
      referenceId: `${periodLabel.toUpperCase()}-${dateStr}`,
      amount: Number(metrics.net_sales || metrics.gross_sales || 0),
      driveFileId: response?.file?.fileId,
      driveFileUrl: response?.file?.fileUrl,
      driveFolderName: `${config.driveFolderName}/Sales_Summaries`,
      status: response?.file?.fileId ? 'SAVED_TO_DRIVE' : 'QUEUED_LOCAL_FALLBACK',
      createdAt: new Date().toISOString(),
      base64Pdf
    };

    this.recordDriveArchiveItem(archiveItem);
    return archiveItem;
  }
}

export const googleSheetsPersistence = new GoogleSheetsPersistenceService();
