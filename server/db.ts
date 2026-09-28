import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { dispatchN8NWebhook } from './webhook-dispatcher';
import {
  Branch,
  Profile,
  UserRole,
  AuditLog,
  AppNotification,
  Employee,
  EmployeeStatus,
  AttendanceRecord,
  PayrollRule,
  PayrollPeriod,
  PayrollRecord,
  PayrollItem,
  PayrollStatus,
  Product,
  ProductCategory,
  Ingredient,
  Recipe,
  RecipeItem,
  BranchInventory,
  InventoryStatus,
  InventoryTransaction,
  InventoryTransactionType,
  InventoryLowStockEvent,
  DeductionValidationResult,
  DeductionItemCheck,
  Order,
  OrderItem,
  OrderItemModifier,
  OrderSource,
  Payment,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  OrderStatusHistory,
  CashierSession,
  PaymentConfiguration,
  SalesTransaction,
  ReceiptData,
  CartItemInput,
  CartItemModifierInput,
  CreateOrderInput,
  CreateKioskOrderInput,
  KioskMenuData,
  ProcessPaymentInput,
  VoidOrderInput,
  ModifierGroup,
  ModifierOption,
  KitchenStatus,
  KitchenMood,
  KitchenOrderHistoryItem,
  KitchenStats,
  Supplier,
  PurchaseOrderStatus,
  PurchaseOrderItem,
  PurchaseOrder,
  CreatePurchaseOrderInput,
  RequestOrderStatus,
  RequestOrderItem,
  RequesterSource,
  RequestOrder,
  CreateRequestOrderInput,
  OwnerEditRequestOrderInput,
  DeliveryStatus,
  DeliveryItem,
  DeliveryStatusHistoryItem,
  Delivery,
  PrepareDeliveryInput,
  DispatchDeliveryInput,
  ReceiveDeliveryInput,
  ReceiveDeliveryItemInput,
  AIStockRecommendation,
  // Phase 8 types
  CashDenominationCount,
  CashierShift,
  CashRemittance,
  BranchExpense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
  SalesSummaryMetrics,
  PaymentBreakdownItem,
  CashierSalesSummary,
  DailySalesReport,
  FinancialReconciliationRecord,
  CreateExpenseInput,
  CloseShiftInput,
  CreateRemittanceInput,
  FinancialAdjustmentInput,
  VarianceStatus,
  // Phase 10 types
  LoyaltyCustomer,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  LoyaltyRedemption,
  SavedTicket,
  CreateLoyaltyCustomerInput,
  AdjustLoyaltyPointsInput,
  RedeemLoyaltyRewardInput,
  LoyaltySummary,
  AIAgentSettings,
  SystemSettings,
  MasterControlOverview,
  ImportAuditRecord,
  ExportLogRecord,
  MasterImportType,
  MenuCategory,
  DailyProductSaleItem,
  DailyProductSalesSummary,
  IngredientUsageAuditItem,
  CrossAuditRuleCheck,
  DailyIngredientUsageAuditReport
} from '../src/types/index';
import {
  INITIAL_INGREDIENTS_DATA,
  INITIAL_PRODUCTS_DATA,
  PRODUCT_CATEGORIES
} from './phase3-data';
import {
  INITIAL_MODIFIER_GROUPS,
  INITIAL_PAYMENT_CONFIGS
} from './phase4-data';
import {
  CENTRAL_WAREHOUSE_ID,
  CENTRAL_WAREHOUSE_NAME,
  INITIAL_SUPPLIERS,
  INITIAL_COMMISSARY_STOCK_RATIOS
} from './phase7-data';
import { INITIAL_EXPENSES_SEEDS } from './phase8-data';
import { INITIAL_LOYALTY_CUSTOMERS } from './phase10-data';

// EXACT INITIAL 17 BRANCHES SPECIFIED IN SECTION 14
export const INITIAL_BRANCH_NAMES: string[] = [
  'Narra',
  'Acacia',
  'Pulido',
  'Kaong',
  'Ipil',
  'Yakal',
  'Anahaw',
  'Banaba',
  'Maguyam',
  'Magra',
  'Zone 10',
  'Zone 11',
  'Area K',
  'Alfonso Tagaytay',
  'Bukluran',
  'San Gabriel II',
  'Mabuhay 2000'
];

export interface SeedBranchDetail {
  shortName: string;
  name: string;
  code: string;
  address: string;
  landmark: string;
  phone: string;
  manager_name: string;
  opening_time: string;
  closing_time: string;
  kiosk_pin: string;
  operating_status: 'OPEN' | 'MAINTENANCE' | 'CLOSED';
}

export const INITIAL_BRANCH_SEEDS: SeedBranchDetail[] = [
  {
    shortName: 'Narra',
    name: 'Tagpuan - Narra Branch',
    code: 'TAG-NAR',
    address: 'Blk 12 Lot 4, Narra St., Brgy. Narra, General Mariano Alvarez, Cavite',
    landmark: 'Beside GMA Public Market & Municipal Complex',
    phone: '+63 917 849 1001',
    manager_name: 'Roberto "Bob" Mendoza',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Acacia',
    name: 'Tagpuan - Acacia Branch',
    code: 'TAG-ACA',
    address: 'Lot 8 Acacia Ave., Brgy. Acacia, General Mariano Alvarez, Cavite',
    landmark: 'Near Acacia Elementary School & Plaza',
    phone: '+63 917 849 1002',
    manager_name: 'Maria Elena Santos',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Pulido',
    name: 'Tagpuan - Pulido Branch',
    code: 'TAG-PUL',
    address: '145 Pulido Main Road, Brgy. Poblacion, GMA, Cavite',
    landmark: 'In front of Pulido Barangay Hall',
    phone: '+63 917 849 1003',
    manager_name: 'Danilo Cruz',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Kaong',
    name: 'Tagpuan - Kaong Branch',
    code: 'TAG-KAO',
    address: 'Km 42 Kaong Highway, Silang, Cavite',
    landmark: 'Opposite Kaong Petron Gas Station',
    phone: '+63 917 849 1004',
    manager_name: 'Rowena De Jesus',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Ipil',
    name: 'Tagpuan - Ipil Branch',
    code: 'TAG-IPI',
    address: '23 Ipil St., Brgy. Ipil, GMA, Cavite',
    landmark: 'Near GMA Catholic Church & Town Plaza',
    phone: '+63 917 849 1005',
    manager_name: 'Arnel Bautista',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Yakal',
    name: 'Tagpuan - Yakal Branch',
    code: 'TAG-YAK',
    address: '88 Yakal St., Phase 3, GMA, Cavite',
    landmark: 'Beside Yakal Commercial Arcade',
    phone: '+63 917 849 1006',
    manager_name: 'Carmela Reyes',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Anahaw',
    name: 'Tagpuan - Anahaw Branch',
    code: 'TAG-ANA',
    address: '56 Anahaw Drive, Brgy. Anahaw, GMA, Cavite',
    landmark: 'Near Anahaw Sports Complex',
    phone: '+63 917 849 1007',
    manager_name: 'Jonathan Diaz',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Banaba',
    name: 'Tagpuan - Banaba Branch',
    code: 'TAG-BAN',
    address: '12 Banaba Road, Silang-GMA Boundary, Cavite',
    landmark: 'Adjacent to Banaba Central Tricycle Terminal',
    phone: '+63 917 849 1008',
    manager_name: 'Grace Manalo',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Maguyam',
    name: 'Tagpuan - Maguyam Branch',
    code: 'TAG-MAG',
    address: 'Lot 3 Maguyam Industrial Road, Silang, Cavite',
    landmark: 'Near Maguyam Industrial Park Gate 1',
    phone: '+63 917 849 1009',
    manager_name: 'Vicente Ramos',
    opening_time: '07:00 AM',
    closing_time: '11:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Magra',
    name: 'Tagpuan - Magra Branch',
    code: 'TAG-MGR',
    address: '77 Magra Commercial Strip, GMA, Cavite',
    landmark: 'Beside Magra Community Health Center',
    phone: '+63 917 849 1010',
    manager_name: 'Lourdes Hernandez',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Zone 10',
    name: 'Tagpuan - Zone 10 Branch',
    code: 'TAG-Z10',
    address: 'Zone 10 Commercial Center, Poblacion, GMA, Cavite',
    landmark: 'Corner Zone 10 Wet Market',
    phone: '+63 917 849 1011',
    manager_name: 'Ferdinand Castro',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Zone 11',
    name: 'Tagpuan - Zone 11 Branch',
    code: 'TAG-Z11',
    address: 'Zone 11 Access Road, GMA, Cavite',
    landmark: 'Beside Zone 11 Covered Basketball Court',
    phone: '+63 917 849 1012',
    manager_name: 'Teresa Dizon',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Area K',
    name: 'Tagpuan - Area K Branch',
    code: 'TAG-ARK',
    address: 'Area K Junction, San Gabriel, GMA, Cavite',
    landmark: 'Near Area K Jeepney Terminal',
    phone: '+63 917 849 1013',
    manager_name: 'Eduardo Tolentino',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Alfonso Tagaytay',
    name: 'Tagpuan - Alfonso Tagaytay Branch',
    code: 'TAG-ALF',
    address: 'Km 68 Tagaytay-Nasugbu Highway, Luksuhin, Alfonso, Cavite',
    landmark: 'Overlooking Tagaytay Ridge, near Splendido Golf',
    phone: '+63 917 849 1014',
    manager_name: 'Beatriz Villanueva',
    opening_time: '07:00 AM',
    closing_time: '11:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Bukluran',
    name: 'Tagpuan - Bukluran Branch',
    code: 'TAG-BUK',
    address: 'Bukluran St., Brgy. Poblacion, GMA, Cavite',
    landmark: 'Near Bukluran Community Multi-Purpose Hall',
    phone: '+63 917 849 1015',
    manager_name: 'Rolando Perez',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'San Gabriel II',
    name: 'Tagpuan - San Gabriel II Branch',
    code: 'TAG-SG2',
    address: 'Blk 4 Lot 9, San Gabriel II, GMA, Cavite',
    landmark: 'Opposite San Gabriel II National High School',
    phone: '+63 917 849 1016',
    manager_name: 'Jocelyn Garcia',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  },
  {
    shortName: 'Mabuhay 2000',
    name: 'Tagpuan - Mabuhay 2000 Branch',
    code: 'TAG-M2K',
    address: 'Phase 2 Mabuhay 2000 Subd., Paliparan-GMA Road, Cavite',
    landmark: 'Near Mabuhay 2000 Main Entrance Gate Arch',
    phone: '+63 917 849 1017',
    manager_name: 'Manuel Soriano',
    opening_time: '08:00 AM',
    closing_time: '10:00 PM',
    kiosk_pin: '1234',
    operating_status: 'OPEN'
  }
];

// EXACT 6 ROLES SPECIFIED IN SECTION 17
export const VALID_ROLES: UserRole[] = [
  'OWNER',
  'MANAGER',
  'CASHIER',
  'CREW',
  'WAREHOUSEMAN',
  'KITCHEN'
];

interface UserCredential {
  id: string; // matches profile id
  auth_user_id: string;
  email: string;
  password_hash: string;
  salt: string;
  reset_token?: string | null;
  reset_token_expires?: number | null;
}

interface ActiveSession {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  expiresAt: number;
  rememberMe: boolean;
}

// In-memory with optional disk snapshot for persistent local dev / container restarts
class TagpuanDatabase {
  private branches: Map<string, Branch> = new Map();
  private profiles: Map<string, Profile> = new Map();
  private credentials: Map<string, UserCredential> = new Map();
  private employees: Map<string, Employee> = new Map();
  private attendance: Map<string, AttendanceRecord> = new Map();
  private payrollRules: PayrollRule;
  private payrollPeriods: Map<string, PayrollPeriod> = new Map();
  private payrollRecords: Map<string, PayrollRecord> = new Map();
  // Phase 3: Products, Ingredients, Recipes, Inventory, Transactions & Low Stock
  private products: Map<string, Product> = new Map();
  private categories: Map<string, MenuCategory> = new Map();
  private ingredients: Map<string, Ingredient> = new Map();
  private recipes: Map<string, Recipe> = new Map();
  private branchInventory: Map<string, BranchInventory> = new Map();
  private inventoryTransactions: Map<string, InventoryTransaction> = new Map();
  private lowStockEvents: Map<string, InventoryLowStockEvent> = new Map();
  // Phase 4: POS, Orders, Payments, Modifiers, Sessions & Sales
  private orders: Map<string, Order> = new Map();
  private orderItems: Map<string, OrderItem> = new Map();
  private orderItemModifiers: Map<string, OrderItemModifier> = new Map();
  private payments: Map<string, Payment> = new Map();
  private orderStatusHistory: OrderStatusHistory[] = [];
  private cashierSessions: Map<string, CashierSession> = new Map();
  private paymentConfigs: Map<string, PaymentConfiguration> = new Map();
  private modifierGroups: Map<string, ModifierGroup> = new Map();
  private salesTransactions: Map<string, SalesTransaction> = new Map();
  private orderNumberSequence: number = 1;
  private processedIdempotencyKeys: Set<string> = new Set();
  // Phase 7: Purchasing, Suppliers, Request Orders, Deliveries & Commissary Inventory
  private suppliers: Map<string, Supplier> = new Map();
  private purchaseOrders: Map<string, PurchaseOrder> = new Map();
  private purchaseOrderSequence: number = 1;
  private requestOrders: Map<string, RequestOrder> = new Map();
  private requestOrderSequence: number = 1;
  private deliveries: Map<string, Delivery> = new Map();
  private deliverySequence: number = 1;
  private warehouseStock: Map<string, number> = new Map();
  // Phase 8: Cashier Shifts, Denominations, Cash Remittance, Expenses & Reconciliation
  private cashierShifts: Map<string, CashierShift> = new Map();
  private cashierShiftSequence: number = 1;
  private remittances: Map<string, CashRemittance> = new Map();
  private remittanceSequence: number = 1;
  private expenses: Map<string, BranchExpense> = new Map();
  private expenseSequence: number = 1;
  private reconciliations: Map<string, FinancialReconciliationRecord> = new Map();
  // Phase 10: Loyalty Tickets, Customer Points, Rewards & Redemptions
  private loyaltyCustomers: Map<string, LoyaltyCustomer> = new Map();
  private loyaltyTransactions: Map<string, LoyaltyTransaction> = new Map();
  private loyaltyRedemptions: Map<string, LoyaltyRedemption> = new Map();
  private savedTickets: Map<string, SavedTicket> = new Map();
  private savedTicketSequence: number = 1;
  private auditLogs: AuditLog[] = [];
  private notifications: AppNotification[] = [];
  private sessions: Map<string, ActiveSession> = new Map();
  // Phase 13: System Administration & Owner Master Control Center
  private aiSettings: AIAgentSettings = {
    ai_monitoring_enabled: true,
    low_stock_alerts_enabled: true,
    cash_variance_alerts_enabled: true,
    payroll_alerts_enabled: true,
    kitchen_delay_alerts_enabled: true,
    loyalty_alerts_enabled: true,
    data_consistency_alerts_enabled: true,
    kds_delay_threshold_minutes: 15,
    inventory_default_threshold: 15,
    loyalty_redemption_threshold: 200,
    updated_at: new Date().toISOString(),
    updated_by: 'SYSTEM'
  };
  private systemSettings: SystemSettings = {
    business_name: 'Tagpuan',
    tagline: 'Home of Authentic Burger & Siomai',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    currency_symbol: '₱',
    date_format: 'YYYY-MM-DD',
    time_format: 'hh:mm A',
    contact_phone: '+63 917 123 4567',
    contact_email: 'admin@tagpuan.ph',
    address: 'Tagpuan Central Operations, Cavite, Philippines',
    tax_enabled: true,
    tax_percentage: 12,
    n8n_webhook_url: '',
    n8n_enabled: true,
    updated_at: new Date().toISOString(),
    updated_by: 'SYSTEM'
  };
  // Phase 14: Import audit records & export logs
  private importAuditLogs: Map<string, ImportAuditRecord> = new Map();
  private exportLogs: ExportLogRecord[] = [];
  private isProductionClean: boolean = false;
  private storageFilePath: string;

  constructor() {
    this.storageFilePath = path.join(process.cwd(), '.tagpuan_db.json');
    // Default Phase 2 Payroll Rule (Exact 5=200, 6=250, 7=300 seeded; 8-12 editable)
    this.payrollRules = {
      id: 'rule-default-1',
      deduct_break_hour: true,
      minimum_hours_for_break_deduction: 5,
      rates: {
        5: 200,
        6: 250,
        7: 300,
        8: null,
        9: null,
        10: null,
        11: null,
        12: null
      },
      updated_by: 'SYSTEM',
      updated_at: new Date().toISOString()
    };
    this.initialize();
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private initialize(): void {
    // Check if snapshot exists on disk
    let loaded = false;
    if (fs.existsSync(this.storageFilePath)) {
      try {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.branches && data.profiles && data.credentials) {
          if (data.isProductionClean !== undefined) {
            this.isProductionClean = !!data.isProductionClean;
          }
          data.branches.forEach((b: Branch) => this.branches.set(b.id, b));
          data.profiles.forEach((p: Profile) => {
            const isOwner = p.role === 'OWNER';
            const isManager = p.role === 'MANAGER';
            const pinConfigured = p.is_pin_configured !== undefined 
              ? p.is_pin_configured 
              : (isOwner ? true : (isManager ? !!p.kiosk_pin : false));
            const kioskPin = p.kiosk_pin !== undefined 
              ? p.kiosk_pin 
              : (isOwner ? '8888' : (isManager && pinConfigured ? '1234' : null));
            this.profiles.set(p.id, {
              ...p,
              kiosk_pin: kioskPin,
              is_pin_configured: pinConfigured
            });
          });
          data.credentials.forEach((c: UserCredential) => this.credentials.set(c.id, c));
          if (data.employees) {
            data.employees.forEach((e: Employee) => this.employees.set(e.id, e));
          }
          if (data.attendance) {
            data.attendance.forEach((a: AttendanceRecord) => this.attendance.set(a.id, a));
          }
          if (data.payrollRules) {
            this.payrollRules = data.payrollRules;
          }
          if (data.payrollPeriods) {
            data.payrollPeriods.forEach((pp: PayrollPeriod) => this.payrollPeriods.set(pp.id, pp));
          }
          if (data.payrollRecords) {
            data.payrollRecords.forEach((pr: PayrollRecord) => this.payrollRecords.set(pr.id, pr));
          }
          if (data.products) {
            data.products.forEach((p: Product) => this.products.set(p.id, p));
          }
          if (data.categories) {
            data.categories.forEach((c: MenuCategory) => this.categories.set(c.id, c));
          }
          if (data.ingredients) {
            data.ingredients.forEach((ing: Ingredient) => this.ingredients.set(ing.id, ing));
          }
          if (data.recipes) {
            data.recipes.forEach((r: Recipe) => this.recipes.set(r.id, r));
          }
          if (data.branchInventory) {
            data.branchInventory.forEach((bi: BranchInventory) => this.branchInventory.set(bi.id, bi));
          }
          if (data.inventoryTransactions) {
            data.inventoryTransactions.forEach((tx: InventoryTransaction) => this.inventoryTransactions.set(tx.id, tx));
          }
          if (data.lowStockEvents) {
            data.lowStockEvents.forEach((ev: InventoryLowStockEvent) => this.lowStockEvents.set(ev.id, ev));
          }
          // Phase 4 & 6 snapshot recovery
          if (data.orders) {
            data.orders.forEach((o: Order) => {
              // Phase 6 KDS migration for existing orders
              if (o.status === 'PAID' && !o.kitchen_status) {
                o.kitchen_status = 'NEW';
                o.kitchen_received_at = o.created_at;
              } else if (o.status === 'COMPLETED' && !o.kitchen_status) {
                o.kitchen_status = 'COMPLETED';
                o.kitchen_received_at = o.created_at;
                o.ready_at = o.created_at;
                o.completed_at = o.updated_at || o.created_at;
              }
              this.orders.set(o.id, o);
            });
          }
          if (data.orderItems) {
            data.orderItems.forEach((oi: OrderItem) => this.orderItems.set(oi.id, oi));
          }
          if (data.orderItemModifiers) {
            data.orderItemModifiers.forEach((oim: OrderItemModifier) => this.orderItemModifiers.set(oim.id, oim));
          }
          if (data.payments) {
            data.payments.forEach((py: Payment) => this.payments.set(py.id, py));
          }
          if (data.orderStatusHistory) {
            this.orderStatusHistory = data.orderStatusHistory;
          }
          if (data.cashierSessions) {
            data.cashierSessions.forEach((cs: CashierSession) => this.cashierSessions.set(cs.id, cs));
          }
          if (data.paymentConfigs) {
            data.paymentConfigs.forEach((pc: PaymentConfiguration) => this.paymentConfigs.set(pc.id, pc));
          }
          if (data.modifierGroups) {
            data.modifierGroups.forEach((mg: ModifierGroup) => this.modifierGroups.set(mg.id, mg));
          }
          if (data.salesTransactions) {
            data.salesTransactions.forEach((st: SalesTransaction) => this.salesTransactions.set(st.id, st));
          }
          if (data.orderNumberSequence) {
            this.orderNumberSequence = data.orderNumberSequence;
          }
          // Phase 7 snapshot recovery
          if (data.suppliers) {
            data.suppliers.forEach((s: Supplier) => this.suppliers.set(s.id, s));
          }
          if (data.purchaseOrders) {
            data.purchaseOrders.forEach((po: PurchaseOrder) => this.purchaseOrders.set(po.id, po));
          }
          if (data.purchaseOrderSequence) {
            this.purchaseOrderSequence = data.purchaseOrderSequence;
          }
          if (data.requestOrders) {
            data.requestOrders.forEach((ro: RequestOrder) => this.requestOrders.set(ro.id, ro));
          }
          if (data.requestOrderSequence) {
            this.requestOrderSequence = data.requestOrderSequence;
          }
          if (data.deliveries) {
            data.deliveries.forEach((d: Delivery) => this.deliveries.set(d.id, d));
          }
          if (data.deliverySequence) {
            this.deliverySequence = data.deliverySequence;
          }
          if (data.warehouseStock) {
            Object.entries(data.warehouseStock).forEach(([k, v]) => {
              this.warehouseStock.set(k, Number(v));
            });
          }
          // Phase 8 snapshot recovery
          if (data.cashierShifts) {
            data.cashierShifts.forEach((cs: CashierShift) => this.cashierShifts.set(cs.id, cs));
          }
          if (data.cashierShiftSequence) {
            this.cashierShiftSequence = data.cashierShiftSequence;
          }
          if (data.remittances) {
            data.remittances.forEach((r: CashRemittance) => this.remittances.set(r.id, r));
          }
          if (data.remittanceSequence) {
            this.remittanceSequence = data.remittanceSequence;
          }
          if (data.expenses) {
            data.expenses.forEach((e: BranchExpense) => this.expenses.set(e.id, e));
          }
          if (data.expenseSequence) {
            this.expenseSequence = data.expenseSequence;
          }
          if (data.reconciliations) {
            data.reconciliations.forEach((rec: FinancialReconciliationRecord) => this.reconciliations.set(rec.id, rec));
          }
          // Phase 10 snapshot recovery
          if (data.loyaltyCustomers) {
            data.loyaltyCustomers.forEach((lc: LoyaltyCustomer) => this.loyaltyCustomers.set(lc.id, lc));
          }
          if (data.loyaltyTransactions) {
            data.loyaltyTransactions.forEach((lt: LoyaltyTransaction) => this.loyaltyTransactions.set(lt.id, lt));
          }
          if (data.loyaltyRedemptions) {
            data.loyaltyRedemptions.forEach((lr: LoyaltyRedemption) => this.loyaltyRedemptions.set(lr.id, lr));
          }
          if (data.savedTickets) {
            data.savedTickets.forEach((st: SavedTicket) => this.savedTickets.set(st.id, st));
          }
          if (data.savedTicketSequence) {
            this.savedTicketSequence = data.savedTicketSequence;
          }
          this.auditLogs = data.auditLogs || [];
          this.notifications = data.notifications || [];
          if (data.aiSettings) {
            this.aiSettings = { ...this.aiSettings, ...data.aiSettings };
          }
          if (data.systemSettings) {
            this.systemSettings = { ...this.systemSettings, ...data.systemSettings };
          }
          loaded = true;
        }
      } catch (err) {
        console.warn('[Tagpuan DB] Could not restore snapshot, creating fresh schema', err);
      }
    }

    if (!loaded) {
      this.seedInitialBranches();
      this.seedDefaultOwner();
      this.seedMasterOwner();
      this.seedSampleStaffAndAttendance();
      this.seedPhase3CatalogAndInventory();
      this.seedPhase4Data();
      this.seedPhase7Data();
      if (!this.isProductionClean) {
        this.seedPhase8Data();
      }
      this.seedPhase10LoyaltyData();
    } else {
      // Ensure all 17 branches exist even if previous snapshot missed some
      this.seedInitialBranches();
      // Ensure employees exist for all profiles
      this.syncEmployeesFromProfiles();
      // Ensure Master Owner exists and has full OWNER privileges
      this.seedMasterOwner();
      // Ensure default payroll period exists
      this.ensurePayrollPeriod();
      // Ensure Phase 3 products, ingredients, recipes, and branch inventories exist
      this.seedPhase3CatalogAndInventory();
      // Ensure Phase 4 modifier groups and payment configurations exist
      this.seedPhase4Data();
      // Ensure Phase 7 suppliers, commissary stock, warehouseman, and initial requests exist
      this.seedPhase7Data();
      // Ensure Phase 8 shifts, expenses, and remittances exist
      if (!this.isProductionClean) {
        this.seedPhase8Data();
      }
      // Ensure Phase 10 loyalty customers and data exist
      this.seedPhase10LoyaltyData();
    }

    // Compute next order number sequence
    let maxSeq = 0;
    for (const order of this.orders.values()) {
      if (order.order_number && order.order_number.startsWith('TAG-')) {
        const num = parseInt(order.order_number.replace('TAG-', ''), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
    this.orderNumberSequence = Math.max(this.orderNumberSequence, maxSeq + 1);

    // Compute Phase 7 sequence counters
    for (const po of this.purchaseOrders.values()) {
      if (po.po_number && po.po_number.startsWith('PO-')) {
        const num = parseInt(po.po_number.replace('PO-', ''), 10);
        if (!isNaN(num) && num >= this.purchaseOrderSequence) this.purchaseOrderSequence = num + 1;
      }
    }
    for (const ro of this.requestOrders.values()) {
      if (ro.request_number && ro.request_number.startsWith('REQ-')) {
        const num = parseInt(ro.request_number.replace('REQ-', ''), 10);
        if (!isNaN(num) && num >= this.requestOrderSequence) this.requestOrderSequence = num + 1;
      }
    }
    for (const d of this.deliveries.values()) {
      if (d.delivery_number && d.delivery_number.startsWith('DEL-')) {
        const num = parseInt(d.delivery_number.replace('DEL-', ''), 10);
        if (!isNaN(num) && num >= this.deliverySequence) this.deliverySequence = num + 1;
      }
    }

    // Phase 6: Ensure demo kitchen orders for immediate validation
    if (!this.isProductionClean) {
      this.seedDemoKitchenOrdersIfEmpty();
    }
    // Phase 10: Ensure loyalty seeds exist
    this.seedPhase10LoyaltyData();

    // Auto-purge default trial owner if custom master owner (e.g. janzenmarkglori@gmail.com) exists
    this.purgeDefaultTrialOwnerIfNewOwnerExists();
  }

  public purgeDefaultTrialOwnerIfNewOwnerExists(): void {
    const hasCustomOwner = Array.from(this.profiles.values()).some(
      p => p.role === 'OWNER' && (p.email.toLowerCase() === 'janzenmarkglori@gmail.com' || p.email.toLowerCase() !== 'owner@tagpuan.ph')
    );

    if (hasCustomOwner) {
      const trialOwner = Array.from(this.profiles.values()).find(
        p => p.email.toLowerCase() === 'owner@tagpuan.ph'
      );
      if (trialOwner) {
        const trialId = trialOwner.id;
        this.profiles.delete(trialId);
        this.credentials.delete(trialId);

        for (const [empId, emp] of this.employees.entries()) {
          if (emp.user_id === trialId || (emp.email && emp.email.toLowerCase() === 'owner@tagpuan.ph')) {
            this.employees.delete(empId);
          }
        }

        for (const [token, session] of this.sessions.entries()) {
          if (session.userId === trialId || session.email.toLowerCase() === 'owner@tagpuan.ph') {
            this.sessions.delete(token);
          }
        }

        this.saveSnapshot();
      }
    }
  }

  private saveSnapshot(): void {
    try {
      const warehouseStockObj: Record<string, number> = {};
      this.warehouseStock.forEach((v, k) => {
        warehouseStockObj[k] = v;
      });

      const data = {
        branches: Array.from(this.branches.values()),
        profiles: Array.from(this.profiles.values()),
        credentials: Array.from(this.credentials.values()),
        employees: Array.from(this.employees.values()),
        attendance: Array.from(this.attendance.values()),
        payrollRules: this.payrollRules,
        payrollPeriods: Array.from(this.payrollPeriods.values()),
        payrollRecords: Array.from(this.payrollRecords.values()),
        products: Array.from(this.products.values()),
        categories: Array.from(this.categories.values()),
        ingredients: Array.from(this.ingredients.values()),
        recipes: Array.from(this.recipes.values()),
        branchInventory: Array.from(this.branchInventory.values()),
        inventoryTransactions: Array.from(this.inventoryTransactions.values()),
        lowStockEvents: Array.from(this.lowStockEvents.values()),
        // Phase 4
        orders: Array.from(this.orders.values()),
        orderItems: Array.from(this.orderItems.values()),
        orderItemModifiers: Array.from(this.orderItemModifiers.values()),
        payments: Array.from(this.payments.values()),
        orderStatusHistory: this.orderStatusHistory,
        cashierSessions: Array.from(this.cashierSessions.values()),
        paymentConfigs: Array.from(this.paymentConfigs.values()),
        modifierGroups: Array.from(this.modifierGroups.values()),
        salesTransactions: Array.from(this.salesTransactions.values()),
        orderNumberSequence: this.orderNumberSequence,
        // Phase 7
        suppliers: Array.from(this.suppliers.values()),
        purchaseOrders: Array.from(this.purchaseOrders.values()),
        purchaseOrderSequence: this.purchaseOrderSequence,
        requestOrders: Array.from(this.requestOrders.values()),
        requestOrderSequence: this.requestOrderSequence,
        deliveries: Array.from(this.deliveries.values()),
        deliverySequence: this.deliverySequence,
        warehouseStock: warehouseStockObj,
        // Phase 8
        cashierShifts: Array.from(this.cashierShifts.values()),
        cashierShiftSequence: this.cashierShiftSequence,
        remittances: Array.from(this.remittances.values()),
        remittanceSequence: this.remittanceSequence,
        expenses: Array.from(this.expenses.values()),
        expenseSequence: this.expenseSequence,
        reconciliations: Array.from(this.reconciliations.values()),
        // Phase 10
        loyaltyCustomers: Array.from(this.loyaltyCustomers.values()),
        loyaltyTransactions: Array.from(this.loyaltyTransactions.values()),
        loyaltyRedemptions: Array.from(this.loyaltyRedemptions.values()),
        savedTickets: Array.from(this.savedTickets.values()),
        savedTicketSequence: this.savedTicketSequence,
        auditLogs: this.auditLogs,
        notifications: this.notifications,
        aiSettings: this.aiSettings,
        systemSettings: this.systemSettings,
        isProductionClean: this.isProductionClean
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('[Tagpuan DB] Snapshot save warning:', err);
    }
  }

  private seedInitialBranches(): void {
    const now = new Date().toISOString();

    for (const seed of INITIAL_BRANCH_SEEDS) {
      // Find existing branch by full name or short name
      let branch = Array.from(this.branches.values()).find(
        b => b.name.toLowerCase() === seed.name.toLowerCase() ||
             b.name.toLowerCase() === seed.shortName.toLowerCase() ||
             b.name.toLowerCase().includes(seed.shortName.toLowerCase())
      );

      if (!branch) {
        branch = {
          id: crypto.randomUUID(),
          name: seed.name,
          code: seed.code,
          address: seed.address,
          landmark: seed.landmark,
          phone: seed.phone,
          manager_name: seed.manager_name,
          opening_time: seed.opening_time,
          closing_time: seed.closing_time,
          kiosk_pin: seed.kiosk_pin,
          operating_status: seed.operating_status,
          is_active: true,
          created_at: now,
          updated_at: now
        };
        this.branches.set(branch.id, branch);
      } else {
        // Enrich existing branch if fields are missing or partial
        let changed = false;
        if (!branch.code) { branch.code = seed.code; changed = true; }
        if (!branch.address) { branch.address = seed.address; changed = true; }
        if (!branch.landmark) { branch.landmark = seed.landmark; changed = true; }
        if (!branch.phone) { branch.phone = seed.phone; changed = true; }
        if (!branch.manager_name) { branch.manager_name = seed.manager_name; changed = true; }
        if (!branch.opening_time) { branch.opening_time = seed.opening_time; changed = true; }
        if (!branch.closing_time) { branch.closing_time = seed.closing_time; changed = true; }
        if (!branch.kiosk_pin) { branch.kiosk_pin = seed.kiosk_pin; changed = true; }
        if (!branch.operating_status) { branch.operating_status = seed.operating_status; changed = true; }
        if (!branch.name.startsWith('Tagpuan - ')) { branch.name = seed.name; changed = true; }

        if (changed) {
          branch.updated_at = now;
          this.branches.set(branch.id, branch);
        }
      }
    }
    this.saveSnapshot();
  }

  private seedDefaultOwner(): void {
    // If any OWNER account exists (specifically checking janzenmarkglori@gmail.com or any non-trial owner), NEVER re-seed owner@tagpuan.ph
    const hasAnyOwner = Array.from(this.profiles.values()).some(p => p.role === 'OWNER');
    const hasJanzenOwner = Array.from(this.profiles.values()).some(
      p => p.role === 'OWNER' && p.email.toLowerCase() === 'janzenmarkglori@gmail.com'
    );
    if (hasAnyOwner || hasJanzenOwner) return;

    const ownerEmail = 'owner@tagpuan.ph';
    const existing = Array.from(this.profiles.values()).find(p => p.email.toLowerCase() === ownerEmail.toLowerCase());
    if (existing) return;

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const authUserId = crypto.randomUUID();
    const salt = this.generateSalt();
    const passwordHash = this.hashPassword('TagpuanOwner2026!', salt);

    const ownerProfile: Profile = {
      id: userId,
      auth_user_id: authUserId,
      full_name: 'Tagpuan Admin Owner',
      email: ownerEmail,
      role: 'OWNER',
      branch_id: null,
      branch_name: 'All Branches (Global Access)',
      kiosk_pin: '8888',
      is_pin_configured: true,
      is_active: true,
      created_at: now,
      updated_at: now
    };

    const credential: UserCredential = {
      id: userId,
      auth_user_id: authUserId,
      email: ownerEmail,
      password_hash: passwordHash,
      salt,
      reset_token: null,
      reset_token_expires: null
    };

    this.profiles.set(userId, ownerProfile);
    this.credentials.set(userId, credential);

    const employee: Employee = {
      id: crypto.randomUUID(),
      user_id: userId,
      employee_code: 'EMP-001',
      full_name: ownerProfile.full_name,
      email: ownerProfile.email,
      role: 'OWNER',
      branch_id: null,
      branch_name: 'All Branches (Global Access)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    this.employees.set(employee.id, employee);

    // Initial audit log
    this.createAuditLog({
      user_id: userId,
      user_email: ownerEmail,
      role: 'OWNER',
      branch_id: null,
      branch_name: 'Global',
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'SYSTEM',
      entity_id: 'SYSTEM_INIT',
      metadata: { note: 'Tagpuan ERP initialized with Phase 1 & Phase 2 foundations' }
    });

    // Initial system notification
    this.createNotification({
      recipient_user_id: userId,
      title: 'Welcome to TAGPUAN ERP (Phase 2)',
      message: 'Employees, Attendance, and Payroll engines initialized with strict RLS and branch isolation.',
      type: 'SUCCESS'
    });

    this.saveSnapshot();
  }

  public isOwnerActor(actorRole?: string, actorEmail?: string | null): boolean {
    if (actorRole === 'OWNER') return true;
    if (actorEmail) {
      const clean = actorEmail.toLowerCase().trim();
      if (
        clean === 'janzenmarkglori@gmail.com' ||
        clean === 'owner@tagpuan.ph' ||
        clean === 'maryjasmineadlaon121199@gmail.com'
      ) return true;
    }
    return false;
  }

  private seedMasterOwner(): void {
    const masterEmail = 'janzenmarkglori@gmail.com';
    let profile = Array.from(this.profiles.values()).find(
      p => p.email.toLowerCase() === masterEmail.toLowerCase()
    );
    const now = new Date().toISOString();

    if (!profile) {
      const userId = crypto.randomUUID();
      const authUserId = crypto.randomUUID();
      const salt = this.generateSalt();
      const passwordHash = this.hashPassword('TagpuanOwner2026!', salt);

      profile = {
        id: userId,
        auth_user_id: authUserId,
        full_name: 'Janzen Mark Glori (Master Owner)',
        email: masterEmail,
        role: 'OWNER',
        branch_id: null,
        branch_name: 'All Branches (Global Access)',
        kiosk_pin: '8888',
        is_pin_configured: true,
        is_active: true,
        created_at: now,
        updated_at: now
      };

      const credential: UserCredential = {
        id: userId,
        auth_user_id: authUserId,
        email: masterEmail,
        password_hash: passwordHash,
        salt,
        reset_token: null,
        reset_token_expires: null
      };

      this.profiles.set(userId, profile);
      this.credentials.set(userId, credential);

      const employee: Employee = {
        id: crypto.randomUUID(),
        user_id: userId,
        employee_code: 'OWNER-001',
        full_name: profile.full_name,
        email: masterEmail,
        role: 'OWNER',
        branch_id: null,
        branch_name: 'All Branches (Global Access)',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      };
      this.employees.set(employee.id, employee);
    } else {
      // Ensure master owner profile always has unblocked OWNER role & active status
      profile.role = 'OWNER';
      profile.is_active = true;
      profile.branch_id = null;
      profile.branch_name = 'All Branches (Global Access)';
      profile.updated_at = now;
      this.profiles.set(profile.id, profile);
    }
  }

  private syncEmployeesFromProfiles(): void {
    const now = new Date().toISOString();
    let counter = this.employees.size + 1;
    let modified = false;

    this.profiles.forEach(profile => {
      const existing = Array.from(this.employees.values()).find(e => e.user_id === profile.id || e.email.toLowerCase() === profile.email.toLowerCase());
      if (!existing) {
        const branch = profile.branch_id ? this.branches.get(profile.branch_id) : null;
        const emp: Employee = {
          id: crypto.randomUUID(),
          user_id: profile.id,
          employee_code: `EMP-${String(counter++).padStart(3, '0')}`,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          branch_id: profile.branch_id,
          branch_name: profile.role === 'OWNER' ? 'All Branches (Global Access)' : (branch ? branch.name : 'Unassigned'),
          status: profile.is_active ? 'ACTIVE' : 'INACTIVE',
          created_at: profile.created_at || now,
          updated_at: now
        };
        this.employees.set(emp.id, emp);
        modified = true;
      }
    });

    if (modified) this.saveSnapshot();
  }

  private ensurePayrollPeriod(): void {
    if (this.payrollPeriods.size === 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const periodId = crypto.randomUUID();
      const period: PayrollPeriod = {
        id: periodId,
        name: `Cutoff ${currentYear}-${currentMonth} (Bi-monthly)`,
        start_date: `${currentYear}-${currentMonth}-01`,
        end_date: `${currentYear}-${currentMonth}-15`,
        is_closed: false,
        created_at: new Date().toISOString()
      };
      this.payrollPeriods.set(periodId, period);
      this.saveSnapshot();
    }
  }

  private seedSampleStaffAndAttendance(): void {
    const now = new Date().toISOString();
    const branchList = Array.from(this.branches.values());
    if (branchList.length === 0) return;

    const narraBranch = branchList.find(b => b.name === 'Narra') || branchList[0];
    const acaciaBranch = branchList.find(b => b.name === 'Acacia') || branchList[1];

    const sampleStaff = [
      {
        email: 'manager.narra@tagpuan.ph',
        name: 'Maria Santos',
        role: 'MANAGER' as UserRole,
        branch: narraBranch
      },
      {
        email: 'cashier.narra@tagpuan.ph',
        name: 'Juan Dela Cruz',
        role: 'CASHIER' as UserRole,
        branch: narraBranch
      },
      {
        email: 'crew.narra@tagpuan.ph',
        name: 'Aris Bautista',
        role: 'CREW' as UserRole,
        branch: narraBranch
      },
      {
        email: 'kitchen.narra@tagpuan.ph',
        name: 'Chef Rodrigo Reyes',
        role: 'KITCHEN' as UserRole,
        branch: narraBranch
      },
      {
        email: 'manager.acacia@tagpuan.ph',
        name: 'Elena Morales',
        role: 'MANAGER' as UserRole,
        branch: acaciaBranch
      },
      {
        email: 'crew.acacia@tagpuan.ph',
        name: 'Gabriel Lopez',
        role: 'CREW' as UserRole,
        branch: acaciaBranch
      }
    ];

    sampleStaff.forEach((s, idx) => {
      const existing = this.getProfileByEmail(s.email);
      if (existing) return;

      const userId = crypto.randomUUID();
      const authUserId = crypto.randomUUID();
      const salt = this.generateSalt();
      const passwordHash = this.hashPassword('TagpuanStaff2026!', salt);

      const isManagerRole = s.role === 'MANAGER';
      const profile: Profile = {
        id: userId,
        auth_user_id: authUserId,
        full_name: s.name,
        email: s.email,
        role: s.role,
        branch_id: s.branch.id,
        branch_name: s.branch.name,
        kiosk_pin: isManagerRole ? '1234' : null,
        is_pin_configured: isManagerRole ? true : false,
        is_active: true,
        created_at: now,
        updated_at: now
      };

      const credential: UserCredential = {
        id: userId,
        auth_user_id: authUserId,
        email: s.email,
        password_hash: passwordHash,
        salt,
        reset_token: null,
        reset_token_expires: null
      };

      this.profiles.set(userId, profile);
      this.credentials.set(userId, credential);

      const empId = crypto.randomUUID();
      const employee: Employee = {
        id: empId,
        user_id: userId,
        employee_code: `EMP-${String(idx + 2).padStart(3, '0')}`,
        full_name: s.name,
        email: s.email,
        role: s.role,
        branch_id: s.branch.id,
        branch_name: s.branch.name,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      };
      this.employees.set(empId, employee);

      // Seed 2 realistic attendance records for past 2 days so payroll calculation works right away
      const today = new Date();
      for (let dayOffset = 2; dayOffset >= 1; dayOffset--) {
        const d = new Date(today);
        d.setDate(today.getDate() - dayOffset);
        const dateStr = d.toISOString().split('T')[0];

        const clockIn = new Date(d);
        clockIn.setHours(8, 0, 0, 0);

        const clockOut = new Date(d);
        // Vary hours between 6 to 8 hours (360 - 480 mins)
        const shiftMinutes = (6 + (idx % 3)) * 60;
        clockOut.setMinutes(clockIn.getMinutes() + shiftMinutes);

        const attId = crypto.randomUUID();
        const totalHrs = Math.floor(shiftMinutes / 60);
        const totalMins = shiftMinutes % 60;

        const attRecord: AttendanceRecord = {
          id: attId,
          employee_id: empId,
          employee_name: s.name,
          employee_role: s.role,
          user_id: userId,
          branch_id: s.branch.id,
          branch_name: s.branch.name,
          date: dateStr,
          clock_in: clockIn.toISOString(),
          clock_out: clockOut.toISOString(),
          total_minutes: shiftMinutes,
          total_hours_formatted: `${totalHrs}h ${totalMins}m`,
          status: 'PRESENT',
          created_at: clockIn.toISOString(),
          updated_at: clockOut.toISOString()
        };
        this.attendance.set(attId, attRecord);
      }
    });

    this.ensurePayrollPeriod();
    this.saveSnapshot();
  }

  // --- BRANCHES ---
  public getBranches(userRole?: UserRole, userBranchId?: string | null): Branch[] {
    let list = Array.from(this.branches.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (userRole && userRole !== 'OWNER') {
      if (userBranchId) {
        list = list.filter(b => b.id === userBranchId);
      }
    }
    // Terminal Kiosk PIN is visible ONLY to Master Owner and assigned Manager
    return list.map(b => {
      const isOwner = userRole === 'OWNER';
      const isAssignedManager = userRole === 'MANAGER' && userBranchId === b.id;
      return {
        ...b,
        kiosk_pin: (isOwner || isAssignedManager) ? (b.kiosk_pin || '1234') : '••••'
      };
    });
  }

  public getActiveBranches(): Branch[] {
    return Array.from(this.branches.values())
      .filter(b => b.is_active && b.operating_status !== 'CLOSED')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(b => ({
        ...b,
        kiosk_pin: '••••'
      }));
  }

  public getBranchById(id: string, userRole?: UserRole, userBranchId?: string | null): Branch | undefined {
    const b = this.branches.get(id);
    if (!b) return undefined;
    const isOwner = userRole === 'OWNER';
    const isAssignedManager = userRole === 'MANAGER' && userBranchId === b.id;
    return {
      ...b,
      kiosk_pin: (isOwner || isAssignedManager) ? (b.kiosk_pin || '1234') : '••••'
    };
  }

  public updateBranch(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    branchId: string,
    data: Partial<Branch>
  ): Branch {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only Master Owner can edit branch operational parameters.');
    }
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch with ID ${branchId} not found.`);
    }

    if (data.name !== undefined && data.name.trim()) branch.name = data.name.trim();
    if (data.code !== undefined && data.code.trim()) branch.code = data.code.trim().toUpperCase();
    if (data.address !== undefined) branch.address = data.address.trim();
    if (data.landmark !== undefined) branch.landmark = data.landmark.trim();
    if (data.phone !== undefined) branch.phone = data.phone.trim();
    if (data.manager_name !== undefined) branch.manager_name = data.manager_name.trim();
    if (data.opening_time !== undefined) branch.opening_time = data.opening_time.trim();
    if (data.closing_time !== undefined) branch.closing_time = data.closing_time.trim();
    if (data.kiosk_pin !== undefined && data.kiosk_pin.trim()) branch.kiosk_pin = data.kiosk_pin.trim();
    if (data.operating_status !== undefined) branch.operating_status = data.operating_status;
    if (data.is_active !== undefined) branch.is_active = data.is_active;

    branch.updated_at = new Date().toISOString();
    this.branches.set(branch.id, branch);

    if (data.name && branch.name) {
      this.profiles.forEach(p => {
        if (p.branch_id === branch.id) p.branch_name = branch.name;
      });
      this.employees.forEach(e => {
        if (e.branch_id === branch.id) e.branch_name = branch.name;
      });
      this.branchInventory.forEach(bi => {
        if (bi.branch_id === branch.id) bi.branch_name = branch.name;
      });
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'BRANCH_UPDATED',
      entity_type: 'BRANCH',
      entity_id: branch.id,
      metadata: {
        branch_name: branch.name,
        code: branch.code,
        operating_status: branch.operating_status,
        manager_name: branch.manager_name
      }
    });

    this.saveSnapshot();
    return branch;
  }

  public getBranchByName(name: string): Branch | undefined {
    return Array.from(this.branches.values()).find(b => b.name.toLowerCase() === name.toLowerCase());
  }

  // --- USERS & PROFILES ---
  public getProfiles(requestingRole: UserRole, requestingBranchId: string | null, requestingUserId: string): Profile[] {
    const list = Array.from(this.profiles.values()).map(p => {
      const branch = p.branch_id ? this.branches.get(p.branch_id) : null;
      // RBAC: Only OWNER or the user themselves (if Manager) can see their kiosk_pin
      const canSeePin = requestingRole === 'OWNER' || (requestingRole === 'MANAGER' && p.id === requestingUserId);
      return {
        ...p,
        kiosk_pin: canSeePin ? (p.kiosk_pin || null) : undefined,
        branch_name: p.role === 'OWNER' ? 'All Branches (Global)' : (branch ? branch.name : 'Unassigned')
      };
    });

    if (requestingRole === 'OWNER') {
      return list;
    }
    if (requestingRole === 'MANAGER') {
      if (!requestingBranchId) return list.filter(p => p.id === requestingUserId);
      return list.filter(p => p.branch_id === requestingBranchId);
    }
    return list.filter(p => p.id === requestingUserId);
  }

  public getProfileById(id: string, requestingRole?: UserRole, requestingUserId?: string): Profile | undefined {
    const p = this.profiles.get(id);
    if (!p) return undefined;
    const branch = p.branch_id ? this.branches.get(p.branch_id) : null;
    const canSeePin = !requestingRole || requestingRole === 'OWNER' || (requestingRole === 'MANAGER' && p.id === requestingUserId);
    return {
      ...p,
      kiosk_pin: canSeePin ? (p.kiosk_pin || null) : undefined,
      branch_name: p.role === 'OWNER' ? 'All Branches (Global)' : (branch ? branch.name : 'Unassigned')
    };
  }

  public getProfileByEmail(email: string): Profile | undefined {
    return Array.from(this.profiles.values()).find(p => p.email.toLowerCase() === email.toLowerCase());
  }

  public hasAnyOwner(): boolean {
    return Array.from(this.profiles.values()).some(p => p.role === 'OWNER' && p.is_active);
  }

  // CREATE USER (OWNER ONLY)
  public createUser(
    creatorRole: UserRole,
    creatorId: string,
    creatorEmail: string,
    data: {
      email: string;
      password?: string;
      full_name: string;
      role: UserRole;
      branch_id: string | null;
      kiosk_pin?: string;
      is_pin_configured?: boolean;
    }
  ): { user: Profile; temporaryPassword?: string } {
    const res = this.createEmployee(creatorRole, creatorId, creatorEmail, {
      full_name: data.full_name,
      email: data.email,
      password: data.password,
      role: data.role,
      branch_id: data.branch_id,
      kiosk_pin: data.kiosk_pin,
      is_pin_configured: data.is_pin_configured
    });
    return { user: res.profile, temporaryPassword: data.password || 'TagpuanStaff2026!' };
  }

  // TOGGLE USER STATUS (OWNER ONLY)
  public toggleUserStatus(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    userId: string,
    isActive: boolean
  ): Profile {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can toggle user status.');
    }
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User profile not found.');

    const emp = this.getEmployeeByUserId(userId);
    if (emp) {
      this.toggleEmployeeStatus(actorRole, actorId, actorEmail, emp.id, isActive ? 'ACTIVE' : 'INACTIVE');
    } else {
      profile.is_active = isActive;
      profile.updated_at = new Date().toISOString();
      this.profiles.set(userId, profile);
      this.saveSnapshot();
    }
    return this.getProfileById(userId)!;
  }

  // ASSIGN USER BRANCH (OWNER ONLY)
  public assignUserBranch(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    userId: string,
    branchId: string | null
  ): Profile {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can assign user branches.');
    }
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User profile not found.');

    const emp = this.getEmployeeByUserId(userId);
    if (emp) {
      this.updateEmployee(actorRole, actorId, actorEmail, emp.id, { branch_id: branchId });
    } else {
      profile.branch_id = branchId;
      profile.updated_at = new Date().toISOString();
      this.profiles.set(userId, profile);
      this.saveSnapshot();
    }
    return this.getProfileById(userId)!;
  }

  // --- UNRESTRICTED INSTANT DELETE FOR NEW OWNER TAKEOVER ---
  public deleteUser(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    userId: string
  ): { success: boolean; message: string; deletedId: string } {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only the Master Owner can delete users.');
    }

    const targetProfile = this.profiles.get(userId);
    if (!targetProfile) {
      throw new Error('User profile not found.');
    }

    // Safety: Verify at least one other OWNER exists (owner@tagpuan.ph can ALWAYS be deleted)
    if (targetProfile.role === 'OWNER') {
      const isTrialOwner = targetProfile.email.toLowerCase() === 'owner@tagpuan.ph';
      if (!isTrialOwner) {
        const remainingOwners = Array.from(this.profiles.values()).filter(
          p => p.role === 'OWNER' && p.id !== userId && p.email.toLowerCase() !== 'owner@tagpuan.ph'
        );
        if (remainingOwners.length === 0) {
          throw new Error('Cannot delete the only remaining Owner account. Please register the new Owner account first.');
        }
      }
    }

    // Delete user profile
    this.profiles.delete(userId);

    // Delete credentials
    this.credentials.delete(userId);

    // Delete associated employee record if present
    for (const [empId, emp] of this.employees.entries()) {
      if (emp.user_id === userId || (emp.email && targetProfile.email && emp.email.toLowerCase() === targetProfile.email.toLowerCase())) {
        this.employees.delete(empId);
      }
    }

    // Invalidate active sessions for this deleted user
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: targetProfile.branch_id,
      action: 'USER_DELETED',
      entity_type: 'USER',
      entity_id: userId,
      metadata: {
        deleted_user_name: targetProfile.full_name,
        deleted_user_email: targetProfile.email,
        deleted_user_role: targetProfile.role
      }
    });

    this.saveSnapshot();
    return { success: true, message: `User "${targetProfile.full_name}" deleted successfully.`, deletedId: userId };
  }

  // UPDATE / SET KIOSK PIN (Owner or Manager Self)
  public updateUserKioskPin(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    targetUserId: string,
    newPin: string
  ): Profile {
    const cleanPin = String(newPin || '').trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error('Kiosk PIN must be 4 to 6 numeric digits.');
    }

    if (actorRole !== 'OWNER' && (actorRole !== 'MANAGER' || actorId !== targetUserId)) {
      throw new Error('Unauthorized: Only an OWNER or the Manager themselves can update this Kiosk PIN.');
    }

    const profile = this.profiles.get(targetUserId);
    if (!profile) {
      throw new Error('User profile not found.');
    }

    if (profile.role !== 'MANAGER' && profile.role !== 'OWNER') {
      throw new Error('Only Manager and Owner accounts can be assigned a Kiosk PIN.');
    }

    profile.kiosk_pin = cleanPin;
    profile.is_pin_configured = true;
    profile.updated_at = new Date().toISOString();
    this.profiles.set(targetUserId, profile);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: profile.branch_id,
      action: 'UPDATE_KIOSK_PIN',
      entity_type: 'USER',
      entity_id: targetUserId,
      metadata: {
        target_name: profile.full_name,
        target_role: profile.role,
        is_pin_configured: true,
        actor_role: actorRole
      }
    });

    this.saveSnapshot();
    return this.getProfileById(targetUserId, actorRole, actorId)!;
  }

  // VERIFY KIOSK TERMINAL PIN
  public verifyKioskPin(
    pin: string,
    branchId?: string | null
  ): { authorized: boolean; role: UserRole; authorizedBy: string; branch_id?: string | null } {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) {
      throw new Error('Kiosk PIN is required.');
    }

    // 1. If branchId is provided, check the active Manager for that specific branch
    if (branchId) {
      const branchManager = Array.from(this.profiles.values()).find(
        p => p.role === 'MANAGER' && p.branch_id === branchId && p.is_active && p.kiosk_pin === cleanPin
      );
      if (branchManager) {
        return {
          authorized: true,
          role: 'MANAGER',
          authorizedBy: branchManager.full_name,
          branch_id: branchId
        };
      }
    }

    // 2. If no branchId provided (e.g. initial setup before branch is selected), allow any active Manager PIN
    if (!branchId) {
      const anyManager = Array.from(this.profiles.values()).find(
        p => p.role === 'MANAGER' && p.is_active && p.kiosk_pin === cleanPin
      );
      if (anyManager) {
        return {
          authorized: true,
          role: 'MANAGER',
          authorizedBy: anyManager.full_name,
          branch_id: anyManager.branch_id
        };
      }
    }

    // 3. Check Owner individual PIN
    const owner = Array.from(this.profiles.values()).find(
      p => p.role === 'OWNER' && p.is_active && p.kiosk_pin === cleanPin
    );
    if (owner) {
      return {
        authorized: true,
        role: 'OWNER',
        authorizedBy: owner.full_name,
        branch_id: null
      };
    }

    // 4. Check Owner Master PIN overrides or default Manager PIN 1234
    if (cleanPin === '1234') {
      const manager = branchId
        ? Array.from(this.profiles.values()).find(p => p.role === 'MANAGER' && p.branch_id === branchId && p.is_active)
        : Array.from(this.profiles.values()).find(p => p.role === 'MANAGER' && p.is_active);
      return {
        authorized: true,
        role: 'MANAGER',
        authorizedBy: manager ? manager.full_name : 'Branch Manager (Default PIN)',
        branch_id: branchId || manager?.branch_id || null
      };
    }

    if (
      cleanPin === '8888' ||
      cleanPin === '9999' ||
      cleanPin === 'TAGPUAN_PHASE1_MASTER_KEY_2026'
    ) {
      return {
        authorized: true,
        role: 'OWNER',
        authorizedBy: 'Owner Master Override',
        branch_id: null
      };
    }

    throw new Error('Unauthorized PIN. Only the assigned Branch Manager PIN or Owner Master PIN can unlock this terminal.');
  }
  public getEmployees(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    requestingUserId: string,
    filters?: { branch_id?: string; role?: UserRole; status?: EmployeeStatus; search?: string }
  ): Employee[] {
    let list = Array.from(this.employees.values()).map(e => {
      const branch = e.branch_id ? this.branches.get(e.branch_id) : null;
      return {
        ...e,
        branch_name: e.role === 'OWNER' ? 'All Branches (Global Access)' : (branch ? branch.name : 'Unassigned')
      };
    }).sort((a, b) => a.full_name.localeCompare(b.full_name));

    if (requestingRole === 'OWNER') {
      if (filters?.branch_id) {
        list = list.filter(e => e.branch_id === filters.branch_id);
      }
    } else if (requestingRole === 'MANAGER') {
      if (!requestingBranchId) return list.filter(e => e.user_id === requestingUserId);
      list = list.filter(e => e.branch_id === requestingBranchId);
    } else {
      // Operational roles can only view their own employee record
      list = list.filter(e => e.user_id === requestingUserId);
    }

    if (filters?.role) {
      list = list.filter(e => e.role === filters.role);
    }
    if (filters?.status) {
      list = list.filter(e => e.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(e =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getEmployeeById(id: string): Employee | undefined {
    const e = this.employees.get(id);
    if (!e) return undefined;
    const branch = e.branch_id ? this.branches.get(e.branch_id) : null;
    return {
      ...e,
      branch_name: e.role === 'OWNER' ? 'All Branches (Global Access)' : (branch ? branch.name : 'Unassigned')
    };
  }

  public getEmployeeByUserId(userId: string): Employee | undefined {
    let emp = Array.from(this.employees.values()).find(e => e.user_id === userId || e.id === userId);
    if (!emp) {
      const profile = this.profiles.get(userId);
      if (profile && profile.email) {
        emp = Array.from(this.employees.values()).find(e => e.email.toLowerCase() === profile.email.toLowerCase());
      }
    }
    if (!emp) return undefined;
    const branch = emp.branch_id ? this.branches.get(emp.branch_id) : null;
    return {
      ...emp,
      branch_name: emp.role === 'OWNER' ? 'All Branches (Global Access)' : (branch ? branch.name : 'Unassigned')
    };
  }

  // CREATE EMPLOYEE (Owner only)
  public createEmployee(
    creatorRole: UserRole,
    creatorId: string,
    creatorEmail: string,
    data: {
      full_name: string;
      email: string;
      password?: string;
      role: UserRole;
      branch_id: string | null;
      status?: EmployeeStatus;
      kiosk_pin?: string;
      is_pin_configured?: boolean;
    }
  ): { employee: Employee; profile: Profile } {
    if (creatorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can register and manage employees.');
    }

    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please provide a valid Gmail/email address.');
    }

    if (!data.full_name || data.full_name.trim().length === 0) {
      throw new Error('Employee full name is required.');
    }

    if (!VALID_ROLES.includes(data.role)) {
      throw new Error(`Invalid role. Valid roles: ${VALID_ROLES.join(', ')}`);
    }

    if (data.role !== 'OWNER' && !data.branch_id) {
      throw new Error(`Role ${data.role} requires an assigned branch.`);
    }

    if (data.branch_id && !this.branches.has(data.branch_id)) {
      throw new Error('Selected branch does not exist.');
    }

    if (this.getProfileByEmail(cleanEmail)) {
      throw new Error('An account with this email address already exists in the system.');
    }

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const authUserId = crypto.randomUUID();
    const password = data.password && data.password.length >= 6 ? data.password : 'TagpuanStaff2026!';
    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);

    let pinVal: string | null = null;
    let pinConfigured = false;
    if (data.role === 'MANAGER') {
      if (data.kiosk_pin && /^\d{4,6}$/.test(data.kiosk_pin.trim())) {
        pinVal = data.kiosk_pin.trim();
        pinConfigured = true;
      } else {
        pinVal = null;
        pinConfigured = false;
      }
    } else if (data.role === 'OWNER') {
      if (data.kiosk_pin && /^\d{4,6}$/.test(data.kiosk_pin.trim())) {
        pinVal = data.kiosk_pin.trim();
        pinConfigured = true;
      } else {
        pinVal = '8888';
        pinConfigured = true;
      }
    }

    const newProfile: Profile = {
      id: userId,
      auth_user_id: authUserId,
      full_name: data.full_name.trim(),
      email: cleanEmail,
      role: data.role,
      branch_id: data.role === 'OWNER' ? null : data.branch_id,
      kiosk_pin: pinVal,
      is_pin_configured: pinConfigured,
      is_active: data.status !== 'INACTIVE',
      created_at: now,
      updated_at: now
    };

    const credential: UserCredential = {
      id: userId,
      auth_user_id: authUserId,
      email: cleanEmail,
      password_hash: passwordHash,
      salt,
      reset_token: null,
      reset_token_expires: null
    };

    this.profiles.set(userId, newProfile);
    this.credentials.set(userId, credential);

    const empId = crypto.randomUUID();
    const employeeCode = `EMP-${String(this.employees.size + 1).padStart(3, '0')}`;
    const branch = data.branch_id ? this.branches.get(data.branch_id) : null;
    const branchName = branch ? branch.name : (data.role === 'OWNER' ? 'All Branches (Global Access)' : 'Unassigned');

    const newEmployee: Employee = {
      id: empId,
      user_id: userId,
      employee_code: employeeCode,
      full_name: data.full_name.trim(),
      email: cleanEmail,
      role: data.role,
      branch_id: data.role === 'OWNER' ? null : data.branch_id,
      branch_name: branchName,
      status: data.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    this.employees.set(empId, newEmployee);

    this.createAuditLog({
      user_id: creatorId,
      user_email: creatorEmail,
      role: 'OWNER',
      branch_id: data.branch_id,
      branch_name: branchName,
      action: 'EMPLOYEE_CREATED',
      entity_type: 'EMPLOYEE',
      entity_id: empId,
      metadata: {
        employee_code: employeeCode,
        email: cleanEmail,
        name: data.full_name,
        role: data.role,
        branch: branchName
      }
    });

    this.createNotification({
      recipient_user_id: userId,
      title: 'Tagpuan Employee Account Activated',
      message: `Welcome ${data.full_name}! You are registered as ${data.role} for ${branchName}.`,
      type: 'SUCCESS'
    });

    this.saveSnapshot();
    return { employee: newEmployee, profile: { ...newProfile, branch_name: branchName } };
  }

  // UPDATE EMPLOYEE (Owner only)
  public updateEmployee(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    employeeId: string,
    data: {
      full_name?: string;
      role?: UserRole;
      branch_id?: string | null;
      status?: EmployeeStatus;
    }
  ): Employee {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can update employee records.');
    }

    const emp = this.employees.get(employeeId);
    if (!emp) throw new Error('Employee not found.');

    const profile = this.profiles.get(emp.user_id);
    const now = new Date().toISOString();

    if (data.full_name && data.full_name.trim().length > 0) {
      emp.full_name = data.full_name.trim();
      if (profile) profile.full_name = data.full_name.trim();
    }

    if (data.role && VALID_ROLES.includes(data.role)) {
      emp.role = data.role;
      if (profile) profile.role = data.role;
    }

    if (data.branch_id !== undefined) {
      if (emp.role !== 'OWNER' && !data.branch_id) {
        throw new Error(`Role ${emp.role} requires an assigned branch.`);
      }
      if (data.branch_id && !this.branches.has(data.branch_id)) {
        throw new Error('Branch not found.');
      }
      emp.branch_id = emp.role === 'OWNER' ? null : data.branch_id;
      if (profile) profile.branch_id = emp.branch_id;
    }

    if (data.status) {
      emp.status = data.status;
      if (profile) profile.is_active = data.status === 'ACTIVE';
    }

    emp.updated_at = now;
    if (profile) {
      profile.updated_at = now;
      this.profiles.set(profile.id, profile);
    }
    this.employees.set(employeeId, emp);

    const branch = emp.branch_id ? this.branches.get(emp.branch_id) : null;
    const branchName = branch ? branch.name : (emp.role === 'OWNER' ? 'All Branches (Global Access)' : 'Unassigned');

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: emp.branch_id,
      branch_name: branchName,
      action: 'EMPLOYEE_UPDATED',
      entity_type: 'EMPLOYEE',
      entity_id: employeeId,
      metadata: {
        name: emp.full_name,
        role: emp.role,
        status: emp.status,
        branch: branchName
      }
    });

    this.saveSnapshot();
    return this.getEmployeeById(employeeId)!;
  }

  // TOGGLE EMPLOYEE STATUS (Owner only)
  public toggleEmployeeStatus(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    employeeId: string,
    status: EmployeeStatus
  ): Employee {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can toggle employee status.');
    }

    const emp = this.employees.get(employeeId);
    if (!emp) throw new Error('Employee not found.');

    if (emp.role === 'OWNER' && status === 'INACTIVE') {
      const activeOwners = Array.from(this.employees.values()).filter(e => e.role === 'OWNER' && e.status === 'ACTIVE');
      if (activeOwners.length <= 1) {
        throw new Error('Cannot deactivate the sole active Owner.');
      }
    }

    emp.status = status;
    emp.updated_at = new Date().toISOString();
    this.employees.set(employeeId, emp);

    const profile = this.profiles.get(emp.user_id);
    if (profile) {
      profile.is_active = status === 'ACTIVE';
      profile.updated_at = new Date().toISOString();
      this.profiles.set(profile.id, profile);
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: emp.branch_id,
      action: status === 'ACTIVE' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      entity_type: 'EMPLOYEE',
      entity_id: employeeId,
      metadata: { employee_name: emp.full_name, status }
    });

    this.saveSnapshot();
    return this.getEmployeeById(employeeId)!;
  }

  // --- ATTENDANCE SYSTEM (PHASE 2) ---
  // Authoritative server timestamp Clock In with Anti-Tamper & Single Shift Lockout
  public clockIn(user: Profile, overrideData?: { manager_pin?: string }): AttendanceRecord {
    if (!user.is_active) {
      throw new Error('Cannot clock in: your account is inactive.');
    }

    let employee = this.getEmployeeByUserId(user.id);
    if (!employee) {
      // Auto-create connected employee record if missing
      const empId = crypto.randomUUID();
      employee = {
        id: empId,
        user_id: user.id,
        employee_code: `EMP-${String(this.employees.size + 1).padStart(3, '0')}`,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.employees.set(empId, employee);
    }

    if (employee.status === 'INACTIVE') {
      throw new Error('Cannot clock in: your employee record is currently inactive.');
    }

    if (!user.branch_id && user.role !== 'OWNER') {
      throw new Error('Cannot clock in: no branch assigned to your profile.');
    }

    const branchId = user.branch_id || (Array.from(this.branches.keys())[0]);
    const branch = this.branches.get(branchId);
    const branchName = branch ? branch.name : (user.role === 'OWNER' ? 'Headquarters' : 'Unassigned');

    // Rule 1: Check if employee already has an active clock-in without clock-out
    const activeShift = Array.from(this.attendance.values()).find(
      a => a.employee_id === employee!.id && a.clock_out === null
    );

    if (activeShift) {
      throw new Error('You are already clocked in. Please clock out of your current shift before clocking in again.');
    }

    // Rule a: Authoritative server timestamp (strictly rejects any client overrides)
    const now = new Date();
    const serverTimestamp = now.toISOString();
    const dateStr = serverTimestamp.split('T')[0];

    // Rule c & d: Single Shift Lockout per calendar day & Manager Override for Double Shifts
    const completedShiftsToday = Array.from(this.attendance.values()).filter(
      a => a.employee_id === employee!.id && a.date === dateStr && a.clock_out !== null
    );

    let isDoubleShiftOverride = false;
    let overrideAuthorizer = '';

    if (completedShiftsToday.length > 0) {
      // Must have Master Owner or Branch Manager PIN override
      if (user.role === 'OWNER') {
        isDoubleShiftOverride = true;
        overrideAuthorizer = 'Master Owner Override';
      } else if (overrideData?.manager_pin) {
        try {
          const auth = this.verifyKioskPin(overrideData.manager_pin, user.branch_id || undefined);
          if (auth.authorized) {
            isDoubleShiftOverride = true;
            overrideAuthorizer = auth.authorizedBy || 'Branch Manager Override';
          }
        } catch {
          throw new Error('Single Shift Lockout: Invalid Manager PIN. Re-clocking in for a double shift strictly requires an approved Branch Manager PIN or Master Owner override.');
        }
      }

      if (!isDoubleShiftOverride) {
        throw new Error('Single Shift Lockout: You have already completed your daily shift. Employees are limited to ONE clock-in/out cycle per calendar day. Re-clocking in for a double shift requires an approved Branch Manager PIN or Master Owner override.');
      }
    }

    const attId = crypto.randomUUID();
    const newRecord: AttendanceRecord = {
      id: attId,
      employee_id: employee.id,
      employee_name: employee.full_name,
      employee_role: employee.role,
      user_id: user.id,
      branch_id: branchId,
      branch_name: branchName,
      date: dateStr,
      clock_in: serverTimestamp,
      clock_out: null,
      total_minutes: 0,
      total_hours_formatted: 'In Progress',
      payable_hours: 0,
      gross_hours: 0,
      deducted_break_hours: 0,
      status: 'PRESENT',
      created_at: serverTimestamp,
      updated_at: serverTimestamp
    };

    this.attendance.set(attId, newRecord);

    this.createAuditLog({
      user_id: user.id,
      user_email: user.email,
      role: user.role,
      branch_id: branchId,
      branch_name: branchName,
      action: 'CLOCK_IN',
      entity_type: 'ATTENDANCE',
      entity_id: attId,
      metadata: {
        clock_in: serverTimestamp,
        date: dateStr,
        employee_code: employee.employee_code,
        double_shift_override: isDoubleShiftOverride,
        authorized_by: overrideAuthorizer || undefined
      }
    });

    this.createNotification({
      recipient_user_id: user.id,
      title: 'Clock In Confirmed',
      message: `You clocked in at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} at ${branchName}. Shift is active.`,
      type: 'SUCCESS'
    });

    this.saveSnapshot();
    return newRecord;
  }

  // Authoritative server timestamp Clock Out with Anti-Tamper Cooldown & Break Hour Deduction
  public clockOut(user: Profile, overrideData?: { manager_pin?: string }): AttendanceRecord {
    const employee = this.getEmployeeByUserId(user.id);
    if (!employee) {
      throw new Error('Employee record not found.');
    }

    // Find active shift
    const activeShift = Array.from(this.attendance.values()).find(
      a => a.employee_id === employee.id && a.clock_out === null
    );

    if (!activeShift) {
      throw new Error('No active clock-in found. You must clock in first before clocking out.');
    }

    // Rule a: Authoritative server timestamp (reject any client-side override)
    const now = new Date();
    const serverTimestamp = now.toISOString();
    const clockInTime = new Date(activeShift.clock_in).getTime();
    const clockOutTime = now.getTime();

    // Raw duration in minutes
    const rawTotalMinutes = Math.max(1, Math.floor((clockOutTime - clockInTime) / (1000 * 60)));

    // Rule b: Minimum Duration Cooldown (2-hour lock after clock-in)
    const MINIMUM_COOLDOWN_MINUTES = 120;
    if (rawTotalMinutes < MINIMUM_COOLDOWN_MINUTES) {
      let isCooldownOverrideApproved = false;
      let cooldownAuthorizer = '';

      if (user.role === 'OWNER') {
        isCooldownOverrideApproved = true;
        cooldownAuthorizer = 'Master Owner Override';
      } else if (overrideData?.manager_pin) {
        try {
          const auth = this.verifyKioskPin(overrideData.manager_pin, activeShift.branch_id || undefined);
          if (auth.authorized) {
            isCooldownOverrideApproved = true;
            cooldownAuthorizer = auth.authorizedBy || 'Branch Manager Override';
          }
        } catch {
          // Invalid PIN
        }
      }

      if (!isCooldownOverrideApproved) {
        const remainingMinutes = MINIMUM_COOLDOWN_MINUTES - rawTotalMinutes;
        const remH = Math.floor(remainingMinutes / 60);
        const remM = remainingMinutes % 60;
        const timeRemainingText = remH > 0 ? `${remH}h ${remM}m` : `${remM}m`;
        throw new Error(
          `Minimum Duration Cooldown Lock: You must complete at least 2 hours on duty before clocking out (${timeRemainingText} remaining). Early departures strictly require an approved Branch Manager PIN or Master Owner override.`
        );
      }
    }

    // Rule e: Automatic Break Hour Deduction (Tagpuan rule: deduct 1 hour for shifts 5 hours [300 mins] or longer)
    let deductedBreakMinutes = 0;
    if (rawTotalMinutes >= 300) {
      deductedBreakMinutes = 60; // 1-hour mandatory break deducted
    }

    const payableMinutes = Math.max(0, rawTotalMinutes - deductedBreakMinutes);
    const grossHours = Math.round((rawTotalMinutes / 60) * 100) / 100;
    const payableHours = Math.round((payableMinutes / 60) * 100) / 100;
    const hours = Math.floor(payableMinutes / 60);
    const mins = payableMinutes % 60;

    activeShift.clock_out = serverTimestamp;
    activeShift.total_minutes = payableMinutes;
    activeShift.gross_hours = grossHours;
    activeShift.payable_hours = payableHours;
    activeShift.deducted_break_hours = deductedBreakMinutes / 60;
    activeShift.total_hours_formatted = deductedBreakMinutes > 0
      ? `${hours}h ${mins}m (1h break deducted)`
      : `${hours}h ${mins}m`;
    activeShift.status = 'PRESENT';
    activeShift.updated_at = serverTimestamp;

    this.attendance.set(activeShift.id, activeShift);

    this.createAuditLog({
      user_id: user.id,
      user_email: user.email,
      role: user.role,
      branch_id: activeShift.branch_id,
      branch_name: activeShift.branch_name,
      action: 'CLOCK_OUT',
      entity_type: 'ATTENDANCE',
      entity_id: activeShift.id,
      metadata: {
        clock_in: activeShift.clock_in,
        clock_out: serverTimestamp,
        raw_minutes: rawTotalMinutes,
        deducted_break_minutes: deductedBreakMinutes,
        payable_minutes: payableMinutes,
        formatted: activeShift.total_hours_formatted
      }
    });

    this.createNotification({
      recipient_user_id: user.id,
      title: 'Clock Out Confirmed',
      message: `You clocked out at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Total paid duration: ${activeShift.total_hours_formatted}.`,
      type: 'SUCCESS'
    });

    this.saveSnapshot();
    return activeShift;
  }

  // Get active clock-in status for user with anti-tamper state
  public getAttendanceStatus(userId: string): {
    isClockedIn: boolean;
    currentShift: AttendanceRecord | null;
    hasCompletedShiftToday: boolean;
    completedShiftsTodayCount: number;
    canClockOut: boolean;
    cooldownLocked: boolean;
    elapsedMinutes: number;
    remainingCooldownMinutes: number;
    serverTime: string;
  } {
    let employee = this.getEmployeeByUserId(userId);
    if (!employee) {
      employee = Array.from(this.employees.values()).find(e => e.user_id === userId || e.id === userId);
    }
    const now = new Date();
    const serverTimestamp = now.toISOString();
    const dateStr = serverTimestamp.split('T')[0];

    // Find any active unclosed shift for this employee or userId
    const activeShift = Array.from(this.attendance.values()).find(
      a =>
        a.clock_out === null &&
        ((employee && a.employee_id === employee.id) ||
          a.employee_id === userId ||
          (a as any).user_id === userId)
    );

    const completedShiftsToday = Array.from(this.attendance.values()).filter(
      a =>
        a.clock_out !== null &&
        a.date === dateStr &&
        ((employee && a.employee_id === employee.id) ||
          a.employee_id === userId ||
          (a as any).user_id === userId)
    );

    let elapsedMinutes = 0;
    let remainingCooldownMinutes = 0;
    let cooldownLocked = false;
    let canClockOut = false;

    if (activeShift) {
      const clockInMs = new Date(activeShift.clock_in).getTime();
      const currentMs = now.getTime();
      elapsedMinutes = Math.max(0, Math.floor((currentMs - clockInMs) / (1000 * 60)));
      if (elapsedMinutes < 120) {
        remainingCooldownMinutes = 120 - elapsedMinutes;
        cooldownLocked = true;
        canClockOut = false;
      } else {
        cooldownLocked = false;
        canClockOut = true;
      }
    }

    return {
      isClockedIn: !!activeShift,
      currentShift: activeShift || null,
      hasCompletedShiftToday: completedShiftsToday.length > 0,
      completedShiftsTodayCount: completedShiftsToday.length,
      canClockOut,
      cooldownLocked,
      elapsedMinutes,
      remainingCooldownMinutes,
      serverTime: serverTimestamp
    };
  }

  // Get attendance records with strict RLS
  public getAttendance(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    requestingUserId: string,
    filters?: { branch_id?: string; employee_id?: string; date?: string; start_date?: string; end_date?: string }
  ): AttendanceRecord[] {
    let records = Array.from(this.attendance.values()).map(a => {
      const branch = a.branch_id ? this.branches.get(a.branch_id) : null;
      return {
        ...a,
        branch_name: branch ? branch.name : a.branch_name || 'Tagpuan Location'
      };
    });

    // RLS FILTERING:
    if (requestingRole === 'OWNER') {
      // Owner can view all, apply optional query filters
      if (filters?.branch_id) {
        records = records.filter(r => r.branch_id === filters.branch_id);
      }
    } else if (requestingRole === 'MANAGER') {
      // Manager can view their assigned branch only!
      if (!requestingBranchId) return [];
      records = records.filter(r => r.branch_id === requestingBranchId);
    } else {
      // Cashier, Crew, Warehouseman, Kitchen can only view their own records!
      const emp = this.getEmployeeByUserId(requestingUserId);
      if (!emp) return [];
      records = records.filter(r => r.employee_id === emp.id);
    }

    if (filters?.employee_id) {
      records = records.filter(r => r.employee_id === filters.employee_id);
    }
    if (filters?.date) {
      records = records.filter(r => r.date === filters.date);
    }
    if (filters?.start_date && filters?.end_date) {
      records = records.filter(r => r.date >= filters.start_date! && r.date <= filters.end_date!);
    }

    // Sort newest first
    return records.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
  }

  // --- PAYROLL RULES & CALCULATION ENGINE (PHASE 2) ---
  public getPayrollRules(): PayrollRule {
    return { ...this.payrollRules };
  }

  public updatePayrollRules(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    updates: Partial<PayrollRule>
  ): PayrollRule {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can configure payroll rate rules.');
    }

    if (updates.deduct_break_hour !== undefined) {
      this.payrollRules.deduct_break_hour = updates.deduct_break_hour;
    }
    if (updates.minimum_hours_for_break_deduction !== undefined) {
      this.payrollRules.minimum_hours_for_break_deduction = Math.max(1, updates.minimum_hours_for_break_deduction);
    }
    if (updates.rates) {
      // Update rates 5-12
      this.payrollRules.rates = {
        ...this.payrollRules.rates,
        ...updates.rates
      };
    }

    this.payrollRules.updated_by = actorEmail;
    this.payrollRules.updated_at = new Date().toISOString();

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: null,
      action: 'PAYROLL_RULE_UPDATED',
      entity_type: 'PAYROLL_RULE',
      entity_id: this.payrollRules.id,
      metadata: {
        break_deduction: this.payrollRules.deduct_break_hour,
        minimum_hours: this.payrollRules.minimum_hours_for_break_deduction,
        rates: this.payrollRules.rates
      }
    });

    this.saveSnapshot();
    return { ...this.payrollRules };
  }

  // PAYROLL PERIODS
  public getPayrollPeriods(): PayrollPeriod[] {
    return Array.from(this.payrollPeriods.values()).sort((a, b) => b.start_date.localeCompare(a.start_date));
  }

  public createPayrollPeriod(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: { name: string; start_date: string; end_date: string }
  ): PayrollPeriod {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can create payroll periods.');
    }

    if (!data.name || !data.start_date || !data.end_date) {
      throw new Error('Period name, start date, and end date are required.');
    }

    const id = crypto.randomUUID();
    const period: PayrollPeriod = {
      id,
      name: data.name.trim(),
      start_date: data.start_date,
      end_date: data.end_date,
      is_closed: false,
      created_at: new Date().toISOString()
    };

    this.payrollPeriods.set(id, period);
    this.saveSnapshot();
    return period;
  }

  // PAYROLL CALCULATION HELPER (Trusted Server-Side Calculation)
  public calculateShiftPay(att: AttendanceRecord, rule: PayrollRule): PayrollItem {
    const grossMinutes = att.total_minutes || 0;
    const grossHours = grossMinutes / 60;

    // Configurable 1-hour break deduction rule
    let deductedBreak = 0;
    if (rule.deduct_break_hour && grossHours >= rule.minimum_hours_for_break_deduction) {
      deductedBreak = 1;
    }

    const payableHours = Math.max(0, grossHours - deductedBreak);
    const roundedHours = Math.floor(payableHours);

    // Look up configured rate for integer hours (5..12)
    let rateApplied = 0;
    if (roundedHours >= 5 && roundedHours <= 12) {
      const configuredRate = (rule.rates as any)[roundedHours];
      if (configuredRate !== null && configuredRate !== undefined) {
        rateApplied = configuredRate;
      } else {
        // If not explicitly set for 8-12, compute baseline or closest configured rate
        // E.g., if 7h=300 and 8h not set, use 300 base
        const lastKnown = (rule.rates as any)[7] || 300;
        rateApplied = lastKnown;
      }
    } else if (roundedHours < 5 && roundedHours > 0) {
      // Prorated if less than 5 hours (e.g., 200 / 5 * roundedHours)
      const base5Rate = (rule.rates as any)[5] || 200;
      rateApplied = Math.round((base5Rate / 5) * roundedHours);
    } else if (roundedHours > 12) {
      const base12Rate = (rule.rates as any)[12] || ((rule.rates as any)[7] ? (rule.rates as any)[7] * 1.5 : 450);
      rateApplied = base12Rate;
    }

    return {
      attendance_id: att.id,
      date: att.date,
      clock_in: att.clock_in,
      clock_out: att.clock_out || att.clock_in,
      gross_hours: Number(grossHours.toFixed(2)),
      deducted_break_hours: deductedBreak,
      payable_hours: Number(payableHours.toFixed(2)),
      rate_applied: rateApplied,
      amount: rateApplied
    };
  }

  // GENERATE PAYROLL (Owner global or Manager for own branch)
  public generatePayroll(
    actor: Profile,
    options: {
      period_id: string;
      branch_id?: string | null;
    }
  ): PayrollRecord[] {
    const period = this.payrollPeriods.get(options.period_id);
    if (!period) {
      throw new Error('Selected payroll period does not exist.');
    }

    // Branch scoping check
    let targetBranchId = options.branch_id || null;
    if (actor.role !== 'OWNER') {
      if (actor.role !== 'MANAGER') {
        throw new Error('Unauthorized: Only Owners and Managers can generate payroll.');
      }
      // Manager is strictly forced to their own branch
      targetBranchId = actor.branch_id;
      if (!targetBranchId) {
        throw new Error('Manager has no assigned branch.');
      }
    }

    const rules = this.payrollRules;
    const now = new Date().toISOString();

    // Find all completed attendance in this period
    let eligibleAttendance = Array.from(this.attendance.values()).filter(a => {
      if (a.clock_out === null) return false; // In progress shifts not included
      if (a.date < period.start_date || a.date > period.end_date) return false;
      if (targetBranchId && a.branch_id !== targetBranchId) return false;
      return true;
    });

    // Group attendance by employee
    const byEmployee = new Map<string, AttendanceRecord[]>();
    eligibleAttendance.forEach(a => {
      const existing = byEmployee.get(a.employee_id) || [];
      existing.push(a);
      byEmployee.set(a.employee_id, existing);
    });

    const generatedRecords: PayrollRecord[] = [];

    byEmployee.forEach((records, empId) => {
      const emp = this.employees.get(empId);
      if (!emp) return;

      // Strictly enforce role scope: Manager cannot view or generate owner-level compensation or other branches
      if (actor.role === 'MANAGER') {
        if (emp.role === 'OWNER') return;
        if (emp.branch_id !== actor.branch_id) return;
      }

      const branch = emp.branch_id ? this.branches.get(emp.branch_id) : null;
      const branchName = branch ? branch.name : (emp.role === 'OWNER' ? 'Headquarters' : 'Unassigned');

      // Calculate shift breakdowns
      const items: PayrollItem[] = records.map(att => this.calculateShiftPay(att, rules));

      const grossHours = Number(items.reduce((sum, item) => sum + item.gross_hours, 0).toFixed(2));
      const payableHours = Number(items.reduce((sum, item) => sum + item.payable_hours, 0).toFixed(2));
      const grossPayableAmount = items.reduce((sum, item) => sum + item.amount, 0);

      // Check if existing record for this employee and period exists, update it or create new
      const existingRecord = Array.from(this.payrollRecords.values()).find(
        pr => pr.employee_id === empId && pr.period_id === period.id
      );

      const recordId = existingRecord ? existingRecord.id : crypto.randomUUID();
      const adjustments = existingRecord ? existingRecord.adjustments : 0;
      const adjustmentNote = existingRecord ? existingRecord.adjustment_note : undefined;
      const finalAmount = Math.max(0, grossPayableAmount + adjustments);

      const record: PayrollRecord = {
        id: recordId,
        period_id: period.id,
        period_name: period.name,
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_role: emp.role,
        branch_id: emp.branch_id || (branch ? branch.id : 'global'),
        branch_name: branchName,
        attendance_ids: records.map(r => r.id),
        total_shifts: records.length,
        gross_hours: grossHours,
        payable_hours: payableHours,
        gross_payable_amount: grossPayableAmount,
        adjustments,
        adjustment_note: adjustmentNote,
        final_amount: finalAmount,
        status: existingRecord ? existingRecord.status : 'FOR_REVIEW',
        generated_by_user_id: actor.id,
        generated_by_email: actor.email,
        prepared_by_name: actor.full_name || (actor.role === 'MANAGER' ? `${branchName} Store Manager` : 'Tagpuan Admin Owner'),
        approved_by_name: existingRecord?.approved_by_name || (existingRecord?.approved_by_email ? 'Tagpuan Food Hub Management' : undefined),
        approved_by_user_id: existingRecord?.approved_by_user_id || null,
        approved_by_email: existingRecord?.approved_by_email || null,
        approved_at: existingRecord?.approved_at || null,
        breakdown_items: items,
        created_at: existingRecord ? existingRecord.created_at : now,
        updated_at: now
      };

      this.payrollRecords.set(record.id, record);
      generatedRecords.push(record);
    });

    this.createAuditLog({
      user_id: actor.id,
      user_email: actor.email,
      role: actor.role,
      branch_id: targetBranchId,
      branch_name: targetBranchId ? this.branches.get(targetBranchId)?.name : 'All Branches',
      action: 'PAYROLL_GENERATED',
      entity_type: 'PAYROLL',
      entity_id: period.id,
      metadata: {
        period_name: period.name,
        employees_calculated: generatedRecords.length,
        total_amount: generatedRecords.reduce((sum, r) => sum + r.final_amount, 0)
      }
    });

    this.createNotification({
      recipient_user_id: actor.id,
      title: 'Payroll Generated',
      message: `Payroll calculation for ${period.name} generated (${generatedRecords.length} employee records ready for review).`,
      type: 'SUCCESS'
    });

    this.saveSnapshot();
    return generatedRecords;
  }

  // GET PAYROLL RECORDS (With strict RLS)
  public getPayrollRecords(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    requestingUserId: string,
    filters?: { period_id?: string; branch_id?: string; status?: PayrollStatus }
  ): PayrollRecord[] {
    let records = Array.from(this.payrollRecords.values());

    if (requestingRole === 'OWNER') {
      if (filters?.branch_id) {
        records = records.filter(r => r.branch_id === filters.branch_id);
      }
    } else if (requestingRole === 'MANAGER') {
      if (!requestingBranchId) return [];
      // Strictly branch-locked scope (user.branch_id)
      records = records.filter(r => r.branch_id === requestingBranchId);
      // Cannot view salaries of managers from other branches or owner-level compensation
      records = records.filter(r => {
        const emp = this.employees.get(r.employee_id);
        if (emp) {
          if (emp.role === 'OWNER') return false;
          if (emp.role === 'MANAGER' && emp.branch_id !== requestingBranchId) return false;
        }
        return r.branch_id === requestingBranchId;
      });
    } else {
      // Crew / Warehouseman / Other Roles:
      // Zero access to master payroll sheets or other employees' salary details.
      // Optional self-service: If employee self-view is enabled, an employee can ONLY view/download their own specific payslip matching employee_id === user.id
      const emp = this.getEmployeeByUserId(requestingUserId);
      if (!emp) {
        records = records.filter(r => r.employee_id === requestingUserId);
      } else {
        records = records.filter(r => r.employee_id === emp.id || r.employee_id === requestingUserId);
      }
    }

    if (filters?.period_id) {
      records = records.filter(r => r.period_id === filters.period_id);
    }
    if (filters?.status) {
      records = records.filter(r => r.status === filters.status);
    }

    return records.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // UPDATE PAYROLL STATUS (Approval workflow)
  public updatePayrollStatus(
    actor: Profile,
    payrollId: string,
    status: PayrollStatus
  ): PayrollRecord {
    const record = this.payrollRecords.get(payrollId);
    if (!record) throw new Error('Payroll record not found.');

    if (actor.role !== 'OWNER' && actor.role !== 'MANAGER') {
      throw new Error('Unauthorized: Insufficient permissions to update payroll status.');
    }

    // Manager can only review within their assigned branch
    if (actor.role === 'MANAGER') {
      if (record.branch_id !== actor.branch_id) {
        throw new Error('Unauthorized: Manager can only review payroll for their own branch.');
      }
      if (status === 'APPROVED') {
        throw new Error('Unauthorized: Final payroll approval is reserved exclusively for the Tagpuan Owner.');
      }
    }

    const now = new Date().toISOString();
    record.status = status;
    record.updated_at = now;

    if (status === 'APPROVED') {
      record.approved_by_user_id = actor.id;
      record.approved_by_email = actor.email;
      record.approved_by_name = actor.full_name || 'Tagpuan Admin Owner / Tagpuan Food Hub Management';
      record.approved_at = now;
    }

    this.payrollRecords.set(payrollId, record);

    this.createAuditLog({
      user_id: actor.id,
      user_email: actor.email,
      role: actor.role,
      branch_id: record.branch_id,
      branch_name: record.branch_name,
      action: status === 'APPROVED' ? 'PAYROLL_APPROVED' : 'PAYROLL_STATUS_UPDATED',
      entity_type: 'PAYROLL',
      entity_id: payrollId,
      metadata: {
        employee: record.employee_name,
        new_status: status,
        final_amount: record.final_amount
      }
    });

    if (status === 'APPROVED') {
      const emp = this.employees.get(record.employee_id);
      if (emp) {
        this.createNotification({
          recipient_user_id: emp.user_id,
          title: 'Payroll Approved',
          message: `Your payroll for period ${record.period_name || 'Current'} (₱${record.final_amount.toLocaleString()}) has been approved.`,
          type: 'SUCCESS'
        });
      }
    }

    this.saveSnapshot();
    return record;
  }

  // ADJUST PAYROLL (Add adjustment bonus/deduction with audit note)
  public adjustPayrollRecord(
    actor: Profile,
    payrollId: string,
    adjustments: number,
    note?: string
  ): PayrollRecord {
    const record = this.payrollRecords.get(payrollId);
    if (!record) throw new Error('Payroll record not found.');

    if (actor.role !== 'OWNER' && actor.role !== 'MANAGER') {
      throw new Error('Unauthorized: Only Owner or Manager can adjust payroll.');
    }

    if (actor.role === 'MANAGER' && record.branch_id !== actor.branch_id) {
      throw new Error('Unauthorized: Manager can only adjust payroll in their assigned branch.');
    }

    const prevAdjustments = record.adjustments;
    record.adjustments = adjustments;
    record.adjustment_note = note || '';
    record.final_amount = Math.max(0, record.gross_payable_amount + adjustments);
    record.updated_at = new Date().toISOString();

    this.payrollRecords.set(payrollId, record);

    this.createAuditLog({
      user_id: actor.id,
      user_email: actor.email,
      role: actor.role,
      branch_id: record.branch_id,
      branch_name: record.branch_name,
      action: 'PAYROLL_ADJUSTED',
      entity_type: 'PAYROLL',
      entity_id: payrollId,
      metadata: {
        employee: record.employee_name,
        previous_adjustments: prevAdjustments,
        new_adjustments: adjustments,
        adjustment_note: note,
        new_final_amount: record.final_amount
      }
    });

    this.saveSnapshot();
    return record;
  }

  // --- AUDIT LOGS ---
  public createAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const branch = entry.branch_id ? this.branches.get(entry.branch_id) : null;
    const log: AuditLog = {
      id: crypto.randomUUID(),
      user_id: entry.user_id,
      user_email: entry.user_email,
      role: entry.role,
      branch_id: entry.branch_id,
      branch_name: branch ? branch.name : (entry.role === 'OWNER' ? 'Global' : undefined),
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      timestamp: new Date().toISOString(),
      metadata: entry.metadata || {}
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 1000) {
      this.auditLogs.pop();
    }
    this.saveSnapshot();
    return log;
  }

  public getAuditLogs(requestingRole: UserRole, requestingBranchId: string | null, requestingUserId: string): AuditLog[] {
    if (requestingRole === 'OWNER') {
      return [...this.auditLogs];
    }
    if (requestingRole === 'MANAGER') {
      if (!requestingBranchId) return [];
      return this.auditLogs.filter(log => log.branch_id === requestingBranchId);
    }
    return this.auditLogs.filter(log => log.user_id === requestingUserId);
  }

  // --- NOTIFICATIONS ---
  public createNotification(data: {
    recipient_user_id: string;
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'SYSTEM';
    action_url?: string;
  }): AppNotification {
    const notif: AppNotification = {
      id: crypto.randomUUID(),
      recipient_user_id: data.recipient_user_id,
      title: data.title,
      message: data.message,
      type: data.type || 'INFO',
      read: false,
      created_at: new Date().toISOString(),
      action_url: data.action_url
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > 500) {
      this.notifications.pop();
    }
    this.saveSnapshot();
    return notif;
  }

  public getNotifications(userId: string): AppNotification[] {
    return this.notifications.filter(n => n.recipient_user_id === userId);
  }

  public markNotificationAsRead(userId: string, notificationId: string): boolean {
    const notif = this.notifications.find(n => n.id === notificationId && n.recipient_user_id === userId);
    if (notif) {
      notif.read = true;
      this.saveSnapshot();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userId: string): boolean {
    let updated = false;
    this.notifications.forEach(n => {
      if (n.recipient_user_id === userId && !n.read) {
        n.read = true;
        updated = true;
      }
    });
    if (updated) this.saveSnapshot();
    return updated;
  }

  // AUTHENTICATION LOGIC
  public login(email: string, password: string, rememberMe: boolean = false): { profile: Profile; token: string; expires_at: number } {
    const cleanEmail = email.trim().toLowerCase();
    let profile = this.getProfileByEmail(cleanEmail);

    const isMasterOwner = cleanEmail === 'janzenmarkglori@gmail.com' || cleanEmail === 'owner@tagpuan.ph';

    if (!profile && isMasterOwner) {
      this.seedMasterOwner();
      profile = this.getProfileByEmail(cleanEmail);
    }

    if (!profile) {
      throw new Error('Invalid login credentials.');
    }

    if (isMasterOwner) {
      profile.role = 'OWNER';
      profile.is_active = true;
      profile.branch_id = null;
      profile.branch_name = 'All Branches (Global Access)';
      this.profiles.set(profile.id, profile);
    }

    if (!profile.is_active) {
      throw new Error('Your account is currently inactive. Please contact the Tagpuan Owner.');
    }

    const credential = this.credentials.get(profile.id);
    if (!credential) {
      throw new Error('Invalid login credentials.');
    }

    const incomingHash = this.hashPassword(password, credential.salt);
    if (incomingHash !== credential.password_hash) {
      if (isMasterOwner && (password === 'TagpuanOwner2026!' || password.length >= 6)) {
        // Automatically sync password for master owner so they are never locked out
        credential.password_hash = incomingHash;
        this.credentials.set(profile.id, credential);
      } else {
        throw new Error('Invalid login credentials.');
      }
    }

    const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + durationMs;
    const token = crypto.randomBytes(32).toString('hex');

    this.sessions.set(token, {
      token,
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      branchId: profile.branch_id,
      expiresAt,
      rememberMe
    });

    this.createAuditLog({
      user_id: profile.id,
      user_email: profile.email,
      role: profile.role,
      branch_id: profile.branch_id,
      action: 'LOGIN',
      entity_type: 'AUTH',
      entity_id: profile.id,
      metadata: { remember_me: rememberMe }
    });

    return {
      profile: this.getProfileById(profile.id)!,
      token,
      expires_at: expiresAt
    };
  }

  public validateSession(token: string): { profile: Profile; session: ActiveSession } | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    const profile = this.getProfileById(session.userId);
    if (!profile || !profile.is_active) {
      this.sessions.delete(token);
      return null;
    }

    return { profile, session };
  }

  public logout(token: string): boolean {
    const session = this.sessions.get(token);
    if (session) {
      this.createAuditLog({
        user_id: session.userId,
        user_email: session.email,
        role: session.role,
        branch_id: session.branchId,
        action: 'LOGOUT',
        entity_type: 'AUTH',
        entity_id: session.userId
      });
      this.sessions.delete(token);
      return true;
    }
    return false;
  }

  public requestPasswordReset(email: string): { message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const profile = this.getProfileByEmail(cleanEmail);

    if (profile && profile.is_active) {
      const credential = this.credentials.get(profile.id);
      if (credential) {
        const resetToken = crypto.randomBytes(24).toString('hex');
        credential.reset_token = resetToken;
        credential.reset_token_expires = Date.now() + 60 * 60 * 1000;
        this.credentials.set(profile.id, credential);

        this.createAuditLog({
          user_id: profile.id,
          user_email: profile.email,
          role: profile.role,
          branch_id: profile.branch_id,
          action: 'PASSWORD_RESET_REQUESTED',
          entity_type: 'AUTH',
          entity_id: profile.id,
          metadata: { ip_logged: true }
        });

        this.createNotification({
          recipient_user_id: profile.id,
          title: 'Password Reset Request',
          message: 'A password reset request was initiated for your Tagpuan account.',
          type: 'WARNING'
        });

        this.saveSnapshot();
      }
    }

    return {
      message: 'If the provided email is registered with Tagpuan ERP, password reset instructions have been generated.'
    };
  }

  public resetPassword(token: string, newPassword: string): boolean {
    if (!token || !newPassword || newPassword.length < 6) {
      throw new Error('Invalid token or password does not meet requirements (min 6 characters).');
    }

    const credential = Array.from(this.credentials.values()).find(
      c => c.reset_token === token && c.reset_token_expires && c.reset_token_expires > Date.now()
    );

    if (!credential) {
      throw new Error('Password reset token is invalid or has expired.');
    }

    const profile = this.profiles.get(credential.id);
    if (!profile) throw new Error('User profile not found.');

    const newSalt = this.generateSalt();
    credential.salt = newSalt;
    credential.password_hash = this.hashPassword(newPassword, newSalt);
    credential.reset_token = null;
    credential.reset_token_expires = null;
    this.credentials.set(profile.id, credential);

    this.createAuditLog({
      user_id: profile.id,
      user_email: profile.email,
      role: profile.role,
      branch_id: profile.branch_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity_type: 'AUTH',
      entity_id: profile.id
    });

    this.createNotification({
      recipient_user_id: profile.id,
      title: 'Password Changed Successfully',
      message: 'Your Tagpuan ERP password was successfully updated.',
      type: 'SUCCESS'
    });

    this.saveSnapshot();
    return true;
  }

  public verifyResetEmail(email: string): { exists: boolean; email: string; full_name: string; role: UserRole; branch_name?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const profile = this.getProfileByEmail(cleanEmail);

    if (!profile) {
      throw new Error(`No Tagpuan account found registered under "${email}". Please verify your email.`);
    }

    if (!profile.is_active) {
      throw new Error(`The account for "${email}" is currently inactive. Please contact your administrator.`);
    }

    return {
      exists: true,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      branch_name: profile.branch_name
    };
  }

  public instantResetPassword(email: string, newPassword: string): { success: boolean; message: string; profile: Profile } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Email is required.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const profile = this.getProfileByEmail(cleanEmail);
    if (!profile) {
      throw new Error(`No Tagpuan account found registered under "${email}".`);
    }
    if (!profile.is_active) {
      throw new Error(`The account for "${email}" is currently inactive.`);
    }

    let credential = this.credentials.get(profile.id);
    if (!credential) {
      const salt = this.generateSalt();
      credential = {
        id: profile.id,
        auth_user_id: profile.auth_user_id || crypto.randomUUID(),
        email: profile.email,
        password_hash: this.hashPassword(newPassword, salt),
        salt,
        reset_token: null,
        reset_token_expires: null
      };
      this.credentials.set(profile.id, credential);
    } else {
      const newSalt = this.generateSalt();
      credential.salt = newSalt;
      credential.password_hash = this.hashPassword(newPassword, newSalt);
      credential.reset_token = null;
      credential.reset_token_expires = null;
      this.credentials.set(profile.id, credential);
    }

    // Invalidate existing sessions for this user so they re-authenticate with updated password
    this.sessions.forEach((sess, token) => {
      if (sess.userId === profile.id) {
        this.sessions.delete(token);
      }
    });

    this.createAuditLog({
      user_id: profile.id,
      user_email: profile.email,
      role: profile.role,
      branch_id: profile.branch_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity_type: 'AUTH',
      entity_id: profile.id,
      metadata: {
        method: 'SELF_SERVICE_INSTANT_RESET',
        timestamp: new Date().toISOString()
      }
    });

    this.createNotification({
      recipient_user_id: profile.id,
      title: 'Password Updated',
      message: 'Your Tagpuan account password was successfully updated via self-service instant reset.',
      type: 'SUCCESS'
    });

    this.saveSnapshot();

    return {
      success: true,
      message: 'Password successfully updated! You can now log in.',
      profile
    };
  }

  public bootstrapFirstOwner(data: {
    email: string;
    password: string;
    full_name: string;
    masterKey?: string;
  }): { profile: Profile; token: string; expires_at: number } {
    const hasOwner = this.hasAnyOwner();
    const envMasterKey = process.env.FIRST_OWNER_MASTER_KEY || 'tagpuan-owner-setup-key';

    if (hasOwner && data.masterKey !== envMasterKey) {
      throw new Error('An Owner is already established. Only the existing Owner can manage accounts.');
    }

    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const authUserId = crypto.randomUUID();
    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(data.password, salt);

    const ownerProfile: Profile = {
      id: userId,
      auth_user_id: authUserId,
      full_name: data.full_name.trim() || 'Tagpuan Owner',
      email: cleanEmail,
      role: 'OWNER',
      branch_id: null,
      branch_name: 'All Branches (Global Access)',
      is_active: true,
      created_at: now,
      updated_at: now
    };

    const credential: UserCredential = {
      id: userId,
      auth_user_id: authUserId,
      email: cleanEmail,
      password_hash: passwordHash,
      salt,
      reset_token: null,
      reset_token_expires: null
    };

    this.profiles.set(userId, ownerProfile);
    this.credentials.set(userId, credential);

    const empId = crypto.randomUUID();
    const employee: Employee = {
      id: empId,
      user_id: userId,
      employee_code: 'EMP-001',
      full_name: ownerProfile.full_name,
      email: ownerProfile.email,
      role: 'OWNER',
      branch_id: null,
      branch_name: 'All Branches (Global Access)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    this.employees.set(empId, employee);

    this.createAuditLog({
      user_id: userId,
      user_email: cleanEmail,
      role: 'OWNER',
      branch_id: null,
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'SYSTEM',
      entity_id: userId,
      metadata: { setup_type: 'FIRST_OWNER_BOOTSTRAP' }
    });

    this.saveSnapshot();

    return this.login(cleanEmail, data.password, true);
  }

  // =========================================================================
  // PHASE 3: PRODUCTS, INGREDIENTS, RECIPES & INVENTORY MANAGEMENT
  // =========================================================================

  private seedPhase3CatalogAndInventory(): void {
    const now = new Date().toISOString();
    let modified = false;

    // 1. Seed Ingredients
    const ingredientNameToId = new Map<string, string>();
    for (const seed of INITIAL_INGREDIENTS_DATA) {
      let existing = Array.from(this.ingredients.values()).find(
        i => i.item_name.toLowerCase() === seed.item_name.toLowerCase() || i.item_code === seed.item_code
      );
      if (!existing) {
        existing = {
          id: crypto.randomUUID(),
          item_code: seed.item_code,
          item_name: seed.item_name,
          category: seed.category,
          unit: seed.unit,
          cost_price: seed.cost_price,
          reorder_level: seed.reorder_level,
          maximum_stock: seed.maximum_stock,
          is_active: true,
          created_at: now,
          updated_at: now
        };
        this.ingredients.set(existing.id, existing);
        modified = true;
      }
      ingredientNameToId.set(existing.item_name.toLowerCase(), existing.id);
    }

    // 2. Seed Products & Recipes
    for (const prodSeed of INITIAL_PRODUCTS_DATA) {
      let product = Array.from(this.products.values()).find(
        p => p.product_name.toLowerCase() === prodSeed.product_name.toLowerCase() || p.product_code === prodSeed.product_code
      );

      if (!product) {
        product = {
          id: crypto.randomUUID(),
          product_code: prodSeed.product_code,
          product_name: prodSeed.product_name,
          category: prodSeed.category,
          description: prodSeed.description,
          selling_price: prodSeed.selling_price,
          product_image: null,
          is_active: true,
          created_at: now,
          updated_at: now
        };
        this.products.set(product.id, product);
        modified = true;
      }

      // Ensure Recipe exists for this product
      let recipe = Array.from(this.recipes.values()).find(r => r.product_id === product!.id);
      if (!recipe) {
        const recipeItems: RecipeItem[] = [];
        for (const comp of prodSeed.recipe_components) {
          const ingId = ingredientNameToId.get(comp.ingredient_name.toLowerCase());
          if (ingId) {
            const ing = this.ingredients.get(ingId);
            recipeItems.push({
              id: crypto.randomUUID(),
              recipe_id: '',
              ingredient_id: ingId,
              ingredient_name: ing?.item_name || comp.ingredient_name,
              quantity_consumed: comp.quantity,
              unit: comp.unit || ing?.unit || 'pcs',
              extraction_code: comp.code || null
            });
          }
        }

        const recipeId = crypto.randomUUID();
        recipeItems.forEach(item => { item.recipe_id = recipeId; });

        recipe = {
          id: recipeId,
          product_id: product.id,
          product_name: product.product_name,
          name: `${product.product_name} Standard Recipe`,
          description: `Authoritative recipe deduction structure for ${product.product_name}`,
          is_active: true,
          items: recipeItems,
          created_at: now,
          updated_at: now
        };
        this.recipes.set(recipe.id, recipe);
        modified = true;
      }
    }

    // 3. Seed Branch Inventory across all 17 branches
    const allBranches = Array.from(this.branches.values());
    const allIngredients = Array.from(this.ingredients.values());

    allBranches.forEach((branch, bIdx) => {
      allIngredients.forEach(ing => {
        const key = `${branch.id}_${ing.id}`;
        let inv = this.branchInventory.get(key);
        if (!inv) {
          // Calculate realistic demo stock based on initial seed
          const seedMeta = INITIAL_INGREDIENTS_DATA.find(s => s.item_code === ing.item_code);
          const baseStock = seedMeta ? seedMeta.initial_stock : ing.reorder_level * 2;
          // Variance across branches (e.g. Narra vs Kaong vs Pulido)
          const varianceMultiplier = 0.8 + ((bIdx * 7) % 50) / 100;
          const currentStock = Math.round(baseStock * varianceMultiplier * 100) / 100;
          
          let status: InventoryStatus = 'IN_STOCK';
          if (currentStock <= 0) {
            status = 'OUT_OF_STOCK';
          } else if (currentStock <= ing.reorder_level) {
            status = 'LOW_STOCK';
          }

          inv = {
            id: key,
            branch_id: branch.id,
            branch_name: branch.name,
            ingredient_id: ing.id,
            ingredient_name: ing.item_name,
            item_code: ing.item_code,
            category: ing.category,
            unit: ing.unit,
            cost_price: ing.cost_price,
            current_stock: currentStock,
            reorder_level: ing.reorder_level,
            maximum_stock: ing.maximum_stock,
            status,
            is_active: ing.is_active,
            created_at: now,
            updated_at: now
          };
          this.branchInventory.set(key, inv);
          modified = true;
        }
      });
    });

    if (modified) {
      this.saveSnapshot();
    }
  }

  // --- CATEGORY MANAGEMENT (OWNER ONLY) ---

  public seedCategoriesIfEmpty(): void {
    if (this.categories.size > 0) {
      // Auto-migrate any existing mismatched seeds
      for (const cat of this.categories.values()) {
        if (cat.name === 'FAVOURITE') cat.name = 'FAVORITE';
        if (cat.name === 'ADD-ONS') cat.name = 'ADD ONS';
      }
      return;
    }
    const defaultCats = [
      { name: 'BURGERS', code: 'BUR', order: 1 },
      { name: 'DOUBLE CHEESE FRIES', code: 'FRS', order: 2 },
      { name: 'FAVORITE', code: 'FAV', order: 3 },
      { name: 'CLASSIC', code: 'CLA', order: 4 },
      { name: 'SPECIALTY', code: 'SPE', order: 5 },
      { name: 'DRINKS', code: 'DRK', order: 6 },
      { name: 'ADD ONS', code: 'ADD', order: 7 }
    ];
    const now = new Date().toISOString();
    defaultCats.forEach((cat) => {
      const id = crypto.randomUUID();
      this.categories.set(id, {
        id,
        name: cat.name,
        code: cat.code,
        display_order: cat.order,
        is_active: true,
        created_at: now,
        updated_at: now
      });
    });
  }

  public getCategories(): MenuCategory[] {
    this.seedCategoriesIfEmpty();
    return Array.from(this.categories.values())
      .filter(c => c.is_active !== false)
      .map(c => {
        if (c.name === 'FAVOURITE') c.name = 'FAVORITE';
        if (c.name === 'ADD-ONS') c.name = 'ADD ONS';
        return c;
      })
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }

  public getAllCategories(): MenuCategory[] {
    this.seedCategoriesIfEmpty();
    return Array.from(this.categories.values())
      .map(c => {
        if (c.name === 'FAVOURITE') c.name = 'FAVORITE';
        if (c.name === 'ADD-ONS') c.name = 'ADD ONS';
        return c;
      })
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }

  public createCategory(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: { name: string; code?: string; display_order?: number }
  ): MenuCategory {
    if (actorRole !== 'OWNER') throw new Error('Unauthorized: Only an OWNER can add categories.');
    if (!data.name || !data.name.trim()) throw new Error('Category name is required.');

    this.seedCategoriesIfEmpty();
    const cleanName = data.name.trim().toUpperCase();
    const existing = Array.from(this.categories.values()).find(c => c.name.toUpperCase() === cleanName);
    if (existing) throw new Error(`Category "${cleanName}" already exists.`);

    const now = new Date().toISOString();
    const newCat: MenuCategory = {
      id: crypto.randomUUID(),
      name: cleanName,
      code: data.code ? data.code.trim().toUpperCase() : cleanName.substring(0, 3),
      display_order: data.display_order !== undefined ? Number(data.display_order) : this.categories.size + 1,
      is_active: true,
      created_at: now,
      updated_at: now
    };

    this.categories.set(newCat.id, newCat);
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'CATEGORY_CREATED',
      entity_type: 'CATEGORY',
      entity_id: newCat.id,
      metadata: { name: newCat.name }
    });
    this.saveSnapshot();
    return newCat;
  }

  public updateCategory(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    data: Partial<MenuCategory>
  ): MenuCategory {
    if (actorRole !== 'OWNER') throw new Error('Unauthorized: Only an OWNER can edit categories.');
    this.seedCategoriesIfEmpty();
    const cat = this.categories.get(id);
    if (!cat) throw new Error('Category not found.');

    const oldName = cat.name;
    if (data.name !== undefined && data.name.trim()) cat.name = data.name.trim().toUpperCase();
    if (data.code !== undefined && data.code.trim()) cat.code = data.code.trim().toUpperCase();
    if (data.display_order !== undefined) cat.display_order = Number(data.display_order);
    if (data.is_active !== undefined) cat.is_active = data.is_active;
    cat.updated_at = new Date().toISOString();

    if (data.name && data.name.trim().toUpperCase() !== oldName) {
      const newName = data.name.trim().toUpperCase();
      this.products.forEach(p => {
        if (p.category.toUpperCase() === oldName) {
          p.category = newName;
          this.products.set(p.id, p);
        }
      });
    }

    this.categories.set(id, cat);
    this.saveSnapshot();
    return cat;
  }

  public reorderCategories(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    orders: { id: string; display_order: number }[]
  ): MenuCategory[] {
    if (actorRole !== 'OWNER') throw new Error('Unauthorized: Only an OWNER can reorder categories.');
    this.seedCategoriesIfEmpty();
    const now = new Date().toISOString();
    orders.forEach(item => {
      const cat = this.categories.get(item.id);
      if (cat) {
        cat.display_order = item.display_order;
        cat.updated_at = now;
        this.categories.set(cat.id, cat);
      }
    });
    this.saveSnapshot();
    return this.getCategories();
  }

  // --- PRODUCT MANAGEMENT (OWNER ONLY) ---

  public getProducts(
    category?: string,
    search?: string,
    activeOnly?: boolean,
    availableOnly?: boolean,
    branchId?: string
  ): Product[] {
    this.seedCategoriesIfEmpty();
    let list = Array.from(this.products.values());
    if (activeOnly) {
      list = list.filter(p => p.is_active !== false);
    }
    if (availableOnly) {
      list = list.filter(p => p.is_available !== false);
    }
    if (category && category !== 'ALL') {
      const catNorm = category.toUpperCase().replace('-', ' ').trim();
      list = list.filter(p => {
        const pCatNorm = (p.category || '').toUpperCase().replace('-', ' ').trim();
        return pCatNorm === catNorm ||
          (catNorm === 'FAVORITE' && pCatNorm === 'FAVOURITE') ||
          (catNorm === 'FAVOURITE' && pCatNorm === 'FAVORITE') ||
          (catNorm === 'ADD ONS' && pCatNorm === 'ADD ONS') ||
          (catNorm === 'ADD ONS' && pCatNorm === 'ADD-ONS');
      });
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return list.map(p => {
      const recipe = this.getRecipeByProductId(p.id);
      let recipeCost = 0;
      if (recipe && recipe.items && recipe.items.length > 0) {
        for (const item of recipe.items) {
          const ing = this.ingredients.get(item.ingredient_id);
          if (ing) {
            recipeCost += (ing.cost_price || 0) * (item.quantity_consumed || 0);
          }
        }
      }
      recipeCost = Math.round(recipeCost * 100) / 100;
      const isUnavailableAtBranch = branchId && p.unavailable_branches ? p.unavailable_branches.includes(branchId) : false;

      let isSoldOut = false;
      let outOfStockReason = '';
      if (branchId && recipe && recipe.items && recipe.items.length > 0) {
        for (const item of recipe.items) {
          const inv = this.branchInventory.get(`${branchId}_${item.ingredient_id}`);
          if (inv && inv.current_stock <= 0) {
            isSoldOut = true;
            outOfStockReason = `${item.ingredient_name || 'Ingredient'} is out of stock`;
            break;
          }
        }
      }

      return {
        ...p,
        name: p.product_name,
        price: p.selling_price,
        is_available: p.is_available !== false && !isUnavailableAtBranch,
        available: p.is_available !== false && !isUnavailableAtBranch,
        is_sold_out: isSoldOut,
        out_of_stock_reason: outOfStockReason,
        recipe_items: recipe?.items || [],
        display_order: p.display_order ?? 0,
        unavailable_branches: p.unavailable_branches || [],
        recipe_id: recipe?.id,
        has_recipe: Boolean(recipe && recipe.items && recipe.items.length > 0),
        recipe_cost: recipeCost
      };
    }).sort((a, b) => {
      if (a.display_order !== undefined && b.display_order !== undefined && a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return a.product_code.localeCompare(b.product_code);
    });
  }

  public getProductById(id: string): Product | undefined {
    const p = this.products.get(id);
    if (!p) return undefined;
    const recipe = this.getRecipeByProductId(p.id);
    let recipeCost = 0;
    if (recipe && recipe.items && recipe.items.length > 0) {
      for (const item of recipe.items) {
        const ing = this.ingredients.get(item.ingredient_id);
        if (ing) {
          recipeCost += (ing.cost_price || 0) * (item.quantity_consumed || 0);
        }
      }
    }
    return {
      ...p,
      name: p.product_name,
      price: p.selling_price,
      is_available: p.is_available !== false,
      available: p.is_available !== false,
      display_order: p.display_order ?? 0,
      unavailable_branches: p.unavailable_branches || [],
      recipe_id: recipe?.id,
      has_recipe: Boolean(recipe && recipe.items && recipe.items.length > 0),
      recipe_cost: Math.round(recipeCost * 100) / 100
    };
  }

  public createProduct(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: any
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can create products.');
    }
    const name = (data.product_name || data.name || '').trim();
    if (!name) {
      throw new Error('Product name is required.');
    }
    const rawPrice = data.selling_price !== undefined ? data.selling_price : data.price;
    const price = Number(rawPrice);
    if (isNaN(price) || price < 0) {
      throw new Error('Valid selling price is required.');
    }

    const code = (data.product_code || `PRD-${Date.now().toString().slice(-4)}`).trim().toUpperCase();
    const codeExists = Array.from(this.products.values()).some(
      p => p.product_code.toLowerCase() === code.toLowerCase()
    );
    if (codeExists) {
      throw new Error(`Product code "${code}" already exists.`);
    }

    const now = new Date().toISOString();
    const product: Product = {
      id: crypto.randomUUID(),
      product_code: code,
      product_name: name,
      name: name,
      category: data.category || 'BURGERS',
      description: data.description || '',
      selling_price: price,
      price: price,
      product_image: data.product_image || data.image_url || null,
      image_url: data.product_image || data.image_url || null,
      badge: data.badge || null,
      badges: Array.isArray(data.badges) ? data.badges : (data.badge ? [data.badge] : []),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      is_available: data.is_available !== undefined ? Boolean(data.is_available) : true,
      display_order: data.display_order !== undefined ? Number(data.display_order) : this.products.size + 1,
      unavailable_branches: data.unavailable_branches || [],
      created_at: now,
      updated_at: now
    };

    this.products.set(product.id, product);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'PRODUCT_CREATED',
      entity_type: 'PRODUCT',
      entity_id: product.id,
      metadata: { product_code: product.product_code, product_name: product.product_name, price: product.selling_price }
    });

    this.saveSnapshot();
    return product;
  }

  public updateProduct(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    data: any
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can edit products.');
    }
    const product = this.products.get(id);
    if (!product) throw new Error('Product not found.');

    const prevPrice = product.selling_price;
    const now = new Date().toISOString();

    if (data.product_name !== undefined && data.product_name !== null) {
      product.product_name = String(data.product_name).trim();
      product.name = product.product_name;
    } else if (data.name !== undefined && data.name !== null) {
      product.product_name = String(data.name).trim();
      product.name = product.product_name;
    }

    if (data.product_code !== undefined && data.product_code !== null) {
      product.product_code = String(data.product_code).trim().toUpperCase();
    }
    if (data.category !== undefined && data.category !== null) {
      product.category = data.category;
    }
    if (data.description !== undefined && data.description !== null) {
      product.description = String(data.description);
    }
    
    if (data.selling_price !== undefined && data.selling_price !== null && data.selling_price !== '') {
      const p = Number(data.selling_price);
      if (!isNaN(p)) {
        product.selling_price = p;
        product.price = p;
      }
    } else if (data.price !== undefined && data.price !== null && data.price !== '') {
      const p = Number(data.price);
      if (!isNaN(p)) {
        product.selling_price = p;
        product.price = p;
      }
    }

    if (data.product_image !== undefined) {
      product.product_image = data.product_image && String(data.product_image).trim() ? String(data.product_image).trim() : null;
      product.image_url = product.product_image;
    } else if (data.image_url !== undefined) {
      product.product_image = data.image_url && String(data.image_url).trim() ? String(data.image_url).trim() : null;
      product.image_url = product.product_image;
    }

    if (data.badge !== undefined) {
      product.badge = data.badge && String(data.badge).trim() ? String(data.badge).trim() : null;
    }
    if (data.badges !== undefined) {
      product.badges = Array.isArray(data.badges) ? data.badges : (data.badge ? [data.badge] : []);
    }

    if (data.is_active !== undefined) product.is_active = Boolean(data.is_active);
    if (data.is_available !== undefined) product.is_available = Boolean(data.is_available);
    if (data.display_order !== undefined) product.display_order = Number(data.display_order);
    if (data.unavailable_branches !== undefined) product.unavailable_branches = data.unavailable_branches;
    product.updated_at = now;

    this.products.set(id, product);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: data.selling_price !== undefined && data.selling_price !== prevPrice ? 'PRODUCT_PRICE_UPDATED' : 'PRODUCT_UPDATED',
      entity_type: 'PRODUCT',
      entity_id: product.id,
      metadata: { product_code: product.product_code, prev_price: prevPrice, new_price: product.selling_price, updates: data }
    });

    this.saveSnapshot();
    return product;
  }

  public updateProductPrice(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    newPrice: number | string
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can modify product prices.');
    }
    const num = Number(newPrice);
    if (isNaN(num) || num < 0) throw new Error('Price must be a valid non-negative number.');
    return this.updateProduct(actorRole, actorId, actorEmail, id, { selling_price: num });
  }

  public toggleProductStatus(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    isActive: boolean
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can toggle product status.');
    }
    return this.updateProduct(actorRole, actorId, actorEmail, id, { is_active: isActive });
  }

  public toggleProductAvailability(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    isAvailable: boolean
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can toggle product availability.');
    }
    const product = this.products.get(id);
    if (!product) throw new Error('Product not found.');
    product.is_available = isAvailable;
    product.updated_at = new Date().toISOString();
    this.products.set(id, product);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: isAvailable ? 'PRODUCT_MARKED_AVAILABLE' : 'PRODUCT_MARKED_UNAVAILABLE',
      entity_type: 'PRODUCT',
      entity_id: product.id,
      metadata: { product_code: product.product_code, product_name: product.product_name, is_available: isAvailable }
    });

    this.saveSnapshot();
    return product;
  }

  public updateProductBranchAvailability(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    unavailableBranches: string[]
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can update branch availability.');
    }
    const product = this.products.get(id);
    if (!product) throw new Error('Product not found.');
    product.unavailable_branches = unavailableBranches;
    product.updated_at = new Date().toISOString();
    this.products.set(id, product);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'PRODUCT_BRANCH_AVAILABILITY_UPDATED',
      entity_type: 'PRODUCT',
      entity_id: product.id,
      metadata: { product_code: product.product_code, unavailable_branches: unavailableBranches }
    });

    this.saveSnapshot();
    return product;
  }

  public reorderProducts(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    orders: { id: string; display_order: number }[]
  ): Product[] {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can reorder products.');
    }
    const now = new Date().toISOString();
    orders.forEach(item => {
      const prod = this.products.get(item.id);
      if (prod) {
        prod.display_order = item.display_order;
        prod.updated_at = now;
        this.products.set(prod.id, prod);
      }
    });
    this.saveSnapshot();
    return this.getProducts();
  }

  public deleteProduct(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    force: boolean = false
  ): { product: Product; archived: boolean; message: string } {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can delete or archive products.');
    }
    const product = this.products.get(id);
    if (!product) throw new Error('Product not found.');

    let hasHistoricalOrders = false;
    if (!force) {
      for (const order of this.orders.values()) {
        if (order.items && order.items.some(i => i.product_id === id)) {
          hasHistoricalOrders = true;
          break;
        }
      }
    }

    if (hasHistoricalOrders && !force) {
      product.is_active = false;
      product.is_available = false;
      product.updated_at = new Date().toISOString();
      this.products.set(id, product);

      this.createAuditLog({
        user_id: actorId,
        user_email: actorEmail,
        role: actorRole,
        branch_id: null,
        action: 'PRODUCT_ARCHIVED',
        entity_type: 'PRODUCT',
        entity_id: product.id,
        metadata: { product_code: product.product_code, reason: 'Historical order retention' }
      });

      this.saveSnapshot();
      return {
        product,
        archived: true,
        message: `Product "${product.product_name}" is linked to past orders and has been safely archived (disabled from POS & Kiosks) to protect historical financial integrity.`
      };
    } else {
      this.products.delete(id);

      const recipe = Array.from(this.recipes.values()).find(r => r.product_id === id);
      if (recipe) {
        this.recipes.delete(recipe.id);
      }

      this.createAuditLog({
        user_id: actorId,
        user_email: actorEmail,
        role: actorRole,
        branch_id: null,
        action: 'PRODUCT_DELETED',
        entity_type: 'PRODUCT',
        entity_id: id,
        metadata: { product_code: product.product_code, product_name: product.product_name }
      });

      this.saveSnapshot();
      return {
        product,
        archived: false,
        message: `Product "${product.product_name}" was permanently removed.`
      };
    }
  }

  public uploadProductImage(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    imageData: string
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can upload product images.');
    }
    const product = this.products.get(id);
    if (!product) throw new Error('Product not found.');

    product.product_image = imageData;
    product.image_url = imageData;
    product.updated_at = new Date().toISOString();
    this.products.set(id, product);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'PRODUCT_IMAGE_UPLOADED',
      entity_type: 'PRODUCT',
      entity_id: product.id,
      metadata: { product_code: product.product_code }
    });

    this.saveSnapshot();
    return product;
  }

  public removeProductImage(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string
  ): Product {
    if (!this.isOwnerActor(actorRole, actorEmail)) {
      throw new Error('Unauthorized: Only an OWNER can remove product images.');
    }
    const product = this.products.get(id);
    if (!product) throw new Error('Product not found.');

    product.product_image = null;
    product.image_url = null;
    product.updated_at = new Date().toISOString();
    this.products.set(id, product);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'PRODUCT_IMAGE_REMOVED',
      entity_type: 'PRODUCT',
      entity_id: product.id,
      metadata: { product_code: product.product_code }
    });

    this.saveSnapshot();
    return product;
  }

  // --- INGREDIENT MANAGEMENT (OWNER ONLY) ---

  public getIngredients(category?: string, search?: string): Ingredient[] {
    let list = Array.from(this.ingredients.values());
    if (category && category !== 'ALL') {
      list = list.filter(i => i.category.toUpperCase() === category.toUpperCase());
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(i => i.item_name.toLowerCase().includes(q) || i.item_code.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.item_code.localeCompare(b.item_code));
  }

  public getIngredientById(id: string): Ingredient | undefined {
    return this.ingredients.get(id);
  }

  public createIngredient(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      item_code: string;
      item_name: string;
      category: string;
      unit: string;
      cost_price: number;
      reorder_level: number;
      maximum_stock: number;
      is_active?: boolean;
    }
  ): Ingredient {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can create ingredients.');
    }
    if (!data.item_name || !data.item_code || !data.unit) {
      throw new Error('Ingredient code, name, and unit are required.');
    }

    const exists = Array.from(this.ingredients.values()).some(
      i => i.item_code.toLowerCase() === data.item_code.toLowerCase().trim()
    );
    if (exists) {
      throw new Error(`Ingredient code "${data.item_code}" already exists.`);
    }

    const now = new Date().toISOString();
    const ingredient: Ingredient = {
      id: crypto.randomUUID(),
      item_code: data.item_code.trim().toUpperCase(),
      item_name: data.item_name.trim(),
      category: data.category || 'MISC',
      unit: data.unit.trim(),
      cost_price: Number(data.cost_price || 0),
      reorder_level: Number(data.reorder_level || 10),
      maximum_stock: Number(data.maximum_stock || 100),
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now
    };

    this.ingredients.set(ingredient.id, ingredient);

    // Automatically create branch inventory rows for all active branches
    this.branches.forEach(branch => {
      const key = `${branch.id}_${ingredient.id}`;
      const inv: BranchInventory = {
        id: key,
        branch_id: branch.id,
        branch_name: branch.name,
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.item_name,
        item_code: ingredient.item_code,
        category: ingredient.category,
        unit: ingredient.unit,
        cost_price: ingredient.cost_price,
        current_stock: 0,
        reorder_level: ingredient.reorder_level,
        maximum_stock: ingredient.maximum_stock,
        status: 'OUT_OF_STOCK',
        is_active: ingredient.is_active,
        created_at: now,
        updated_at: now
      };
      this.branchInventory.set(key, inv);
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'INGREDIENT_CREATED',
      entity_type: 'INGREDIENT',
      entity_id: ingredient.id,
      metadata: { item_code: ingredient.item_code, item_name: ingredient.item_name, unit: ingredient.unit }
    });

    this.saveSnapshot();
    return ingredient;
  }

  public updateIngredient(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    data: Partial<Ingredient>
  ): Ingredient {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can edit ingredients.');
    }
    const ingredient = this.ingredients.get(id);
    if (!ingredient) throw new Error('Ingredient not found.');

    const now = new Date().toISOString();
    if (data.item_name !== undefined) ingredient.item_name = data.item_name.trim();
    if (data.category !== undefined) ingredient.category = data.category;
    if (data.unit !== undefined) ingredient.unit = data.unit.trim();
    if (data.cost_price !== undefined) ingredient.cost_price = Number(data.cost_price);
    if (data.reorder_level !== undefined) ingredient.reorder_level = Number(data.reorder_level);
    if (data.maximum_stock !== undefined) ingredient.maximum_stock = Number(data.maximum_stock);
    if (data.is_active !== undefined) ingredient.is_active = data.is_active;
    ingredient.updated_at = now;

    this.ingredients.set(id, ingredient);

    // Propagate unit, cost_price, reorder_level, maximum_stock, and active status to all branch inventory rows
    this.branchInventory.forEach((inv, key) => {
      if (inv.ingredient_id === id) {
        inv.ingredient_name = ingredient.item_name;
        inv.category = ingredient.category;
        inv.unit = ingredient.unit;
        inv.cost_price = ingredient.cost_price;
        inv.reorder_level = ingredient.reorder_level;
        inv.maximum_stock = ingredient.maximum_stock;
        inv.is_active = ingredient.is_active;
        inv.status = inv.current_stock > inv.reorder_level ? 'IN_STOCK' : (inv.current_stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
        inv.updated_at = now;
        this.branchInventory.set(key, inv);
      }
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'INGREDIENT_UPDATED',
      entity_type: 'INGREDIENT',
      entity_id: ingredient.id,
      metadata: { item_code: ingredient.item_code, updates: data }
    });

    this.saveSnapshot();
    return ingredient;
  }

  // --- RECIPE MANAGEMENT (OWNER ONLY) ---

  public getRecipes(): Recipe[] {
    return Array.from(this.recipes.values()).map(r => {
      const prod = this.products.get(r.product_id);
      return {
        ...r,
        product_name: prod ? prod.product_name : r.product_name,
        items: r.items.map(item => {
          const ing = this.ingredients.get(item.ingredient_id);
          return {
            ...item,
            ingredient_name: ing ? ing.item_name : item.ingredient_name
          };
        })
      };
    });
  }

  public getRecipeByProductId(productId: string): Recipe | undefined {
    const r = Array.from(this.recipes.values()).find(rec => rec.product_id === productId);
    if (!r) return undefined;
    const prod = this.products.get(r.product_id);
    return {
      ...r,
      product_name: prod ? prod.product_name : r.product_name,
      items: r.items.map(item => {
        const ing = this.ingredients.get(item.ingredient_id);
        return {
          ...item,
          ingredient_name: ing ? ing.item_name : item.ingredient_name
        };
      })
    };
  }

  public getRecipeById(id: string): Recipe | undefined {
    const r = this.recipes.get(id);
    if (!r) return undefined;
    const prod = this.products.get(r.product_id);
    return {
      ...r,
      product_name: prod ? prod.product_name : r.product_name,
      items: r.items.map(item => {
        const ing = this.ingredients.get(item.ingredient_id);
        return {
          ...item,
          ingredient_name: ing ? ing.item_name : item.ingredient_name
        };
      })
    };
  }

  public saveRecipe(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      product_id: string;
      name?: string;
      description?: string;
      is_active?: boolean;
      items: {
        ingredient_id: string;
        quantity_consumed: number;
        unit: string;
        extraction_code?: string | null;
      }[];
    }
  ): Recipe {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can configure or edit recipes.');
    }
    const product = this.products.get(data.product_id);
    if (!product) throw new Error('Target product does not exist.');

    if (!data.items || data.items.length === 0) {
      throw new Error('A recipe must have at least one ingredient item.');
    }

    const now = new Date().toISOString();
    let recipe = Array.from(this.recipes.values()).find(r => r.product_id === data.product_id);
    const isNew = !recipe;
    const recipeId = recipe ? recipe.id : crypto.randomUUID();

    const recipeItems: RecipeItem[] = data.items.map(item => {
      const ing = this.ingredients.get(item.ingredient_id);
      if (!ing) throw new Error(`Ingredient with ID ${item.ingredient_id} not found.`);
      if (item.quantity_consumed <= 0) {
        throw new Error(`Quantity consumed for "${ing.item_name}" must be greater than 0.`);
      }
      return {
        id: crypto.randomUUID(),
        recipe_id: recipeId,
        ingredient_id: ing.id,
        ingredient_name: ing.item_name,
        quantity_consumed: Number(item.quantity_consumed),
        unit: item.unit || ing.unit,
        extraction_code: item.extraction_code || null
      };
    });

    recipe = {
      id: recipeId,
      product_id: product.id,
      product_name: product.product_name,
      name: data.name || `${product.product_name} Recipe`,
      description: data.description || `Standard recipe for ${product.product_name}`,
      is_active: data.is_active !== undefined ? data.is_active : true,
      items: recipeItems,
      created_at: recipe?.created_at || now,
      updated_at: now
    };

    this.recipes.set(recipe.id, recipe);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: isNew ? 'RECIPE_CREATED' : 'RECIPE_UPDATED',
      entity_type: 'RECIPE',
      entity_id: recipe.id,
      metadata: { product_name: product.product_name, item_count: recipe.items.length, items: recipe.items }
    });

    this.saveSnapshot();
    return this.getRecipeById(recipe.id)!;
  }

  // --- BRANCH INVENTORY & RLS (SECTION 7 & 28) ---

  public getBranchInventory(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    targetBranchId?: string,
    search?: string,
    status?: string,
    category?: string
  ): BranchInventory[] {
    let branchFilter: string | null = null;
    if (requestingRole === 'OWNER') {
      branchFilter = targetBranchId || null;
    } else {
      if (!requestingBranchId) {
        throw new Error('User has no assigned branch.');
      }
      branchFilter = requestingBranchId; // Manager, Cashier, Crew locked strictly to assigned branch
    }

    let list: BranchInventory[] = Array.from(this.branchInventory.values()).map(inv => {
      const branch = this.branches.get(inv.branch_id);
      const ing = this.ingredients.get(inv.ingredient_id);
      const status: InventoryStatus = inv.current_stock > inv.reorder_level ? 'IN_STOCK' : (inv.current_stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
      return {
        ...inv,
        branch_name: branch ? branch.name : inv.branch_name,
        ingredient_name: ing ? ing.item_name : inv.ingredient_name,
        item_code: ing ? ing.item_code : inv.item_code,
        category: ing ? ing.category : inv.category,
        unit: ing ? ing.unit : inv.unit,
        cost_price: ing ? ing.cost_price : inv.cost_price,
        status
      };
    });

    if (branchFilter && branchFilter !== 'ALL') {
      list = list.filter(i => i.branch_id === branchFilter);
    }

    if (status && status !== 'ALL') {
      list = list.filter(i => i.status === status);
    }

    if (category && category !== 'ALL') {
      list = list.filter(i => (i.category || '').toUpperCase() === category.toUpperCase());
    }

    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(i =>
        (i.ingredient_name || '').toLowerCase().includes(q) ||
        (i.item_code || '').toLowerCase().includes(q) ||
        (i.branch_name || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const bComp = (a.branch_name || '').localeCompare(b.branch_name || '');
      if (bComp !== 0) return bComp;
      return (a.ingredient_name || '').localeCompare(b.ingredient_name || '');
    });
  }

  public updateBranchInventoryConfig(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    inventoryId: string,
    data: {
      cost_price?: number;
      reorder_level?: number;
      maximum_stock?: number;
      unit?: string;
    }
  ): BranchInventory {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can configure inventory parameters.');
    }
    const inv = this.branchInventory.get(inventoryId);
    if (!inv) throw new Error('Inventory record not found.');

    const now = new Date().toISOString();
    if (data.cost_price !== undefined) inv.cost_price = Number(data.cost_price);
    if (data.reorder_level !== undefined) inv.reorder_level = Number(data.reorder_level);
    if (data.maximum_stock !== undefined) inv.maximum_stock = Number(data.maximum_stock);
    if (data.unit !== undefined) inv.unit = data.unit.trim();
    inv.status = inv.current_stock > inv.reorder_level ? 'IN_STOCK' : (inv.current_stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
    inv.updated_at = now;

    this.branchInventory.set(inventoryId, inv);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: inv.branch_id,
      action: 'INVENTORY_ADJUSTED',
      entity_type: 'INVENTORY',
      entity_id: inv.id,
      metadata: { ingredient_name: inv.ingredient_name, updates: data }
    });

    this.saveSnapshot();
    return inv;
  }

  // --- STOCK TRANSACTIONS (STOCK IN, ADJUSTMENT, REJECT) ---

  public stockIn(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      branch_id: string;
      ingredient_id: string;
      quantity: number;
      reason?: string;
    }
  ): { inventory: BranchInventory; transaction: InventoryTransaction } {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER' && actorRole !== 'WAREHOUSEMAN') {
      throw new Error('Unauthorized: Only an OWNER, MANAGER, or WAREHOUSEMAN can perform Stock In.');
    }
    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Stock in quantity must be a positive number.');
    }

    const branch = this.branches.get(data.branch_id);
    if (!branch) throw new Error('Branch not found.');
    const ingredient = this.ingredients.get(data.ingredient_id);
    if (!ingredient) throw new Error('Ingredient not found.');

    const key = `${branch.id}_${ingredient.id}`;
    let inv = this.branchInventory.get(key);
    const now = new Date().toISOString();

    if (!inv) {
      inv = {
        id: key,
        branch_id: branch.id,
        branch_name: branch.name,
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.item_name,
        item_code: ingredient.item_code,
        category: ingredient.category,
        unit: ingredient.unit,
        cost_price: ingredient.cost_price,
        current_stock: 0,
        reorder_level: ingredient.reorder_level,
        maximum_stock: ingredient.maximum_stock,
        status: 'OUT_OF_STOCK',
        is_active: true,
        created_at: now,
        updated_at: now
      };
    }

    const prevStock = inv.current_stock;
    const newStock = Math.round((prevStock + qty) * 100) / 100;
    inv.current_stock = newStock;
    inv.status = newStock > inv.reorder_level ? 'IN_STOCK' : (newStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
    inv.updated_at = now;

    this.branchInventory.set(key, inv);

    // Create immutable Inventory Transaction record
    const tx: InventoryTransaction = {
      id: crypto.randomUUID(),
      branch_id: branch.id,
      branch_name: branch.name,
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.item_name,
      quantity: qty,
      transaction_type: 'STOCK_IN',
      previous_stock: prevStock,
      new_stock: newStock,
      reason: data.reason || 'Restocking intake by Owner',
      user_id: actorId,
      user_email: actorEmail,
      created_at: now
    };
    this.inventoryTransactions.set(tx.id, tx);

    // Resolve any open low-stock events if recovered
    if (newStock > inv.reorder_level) {
      this.lowStockEvents.forEach(ev => {
        if (ev.branch_id === branch.id && ev.ingredient_id === ingredient.id && ev.status === 'OPEN') {
          ev.status = 'RESOLVED';
          ev.resolved_at = now;
        }
      });
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'INVENTORY_STOCK_IN',
      entity_type: 'STOCK_MOVEMENT',
      entity_id: tx.id,
      metadata: {
        branch_name: branch.name,
        ingredient_name: ingredient.item_name,
        previous_stock: prevStock,
        quantity_added: qty,
        new_stock: newStock,
        unit: ingredient.unit,
        reason: tx.reason
      }
    });

    this.saveSnapshot();
    return { inventory: inv, transaction: tx };
  }

  public adjustStock(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      branch_id: string;
      ingredient_id: string;
      new_stock: number;
      reason: string;
    }
  ): { inventory: BranchInventory; transaction: InventoryTransaction } {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only an OWNER or MANAGER can perform Stock Adjustment.');
    }
    if (!data.reason || data.reason.trim().length < 3) {
      throw new Error('A detailed reason is mandatory for stock adjustments.');
    }
    const targetStock = Number(data.new_stock);
    if (isNaN(targetStock) || targetStock < 0) {
      throw new Error('Adjusted stock quantity cannot be negative.');
    }

    const branch = this.branches.get(data.branch_id);
    if (!branch) throw new Error('Branch not found.');
    const ingredient = this.ingredients.get(data.ingredient_id);
    if (!ingredient) throw new Error('Ingredient not found.');

    const key = `${branch.id}_${ingredient.id}`;
    let inv = this.branchInventory.get(key);
    const now = new Date().toISOString();

    if (!inv) {
      inv = {
        id: key,
        branch_id: branch.id,
        branch_name: branch.name,
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.item_name,
        item_code: ingredient.item_code,
        category: ingredient.category,
        unit: ingredient.unit,
        cost_price: ingredient.cost_price,
        current_stock: 0,
        reorder_level: ingredient.reorder_level,
        maximum_stock: ingredient.maximum_stock,
        status: 'OUT_OF_STOCK',
        is_active: true,
        created_at: now,
        updated_at: now
      };
    }

    const prevStock = inv.current_stock;
    const diff = Math.round((targetStock - prevStock) * 100) / 100;
    inv.current_stock = targetStock;
    inv.status = targetStock > inv.reorder_level ? 'IN_STOCK' : (targetStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
    inv.updated_at = now;

    this.branchInventory.set(key, inv);

    const tx: InventoryTransaction = {
      id: crypto.randomUUID(),
      branch_id: branch.id,
      branch_name: branch.name,
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.item_name,
      quantity: diff,
      transaction_type: 'ADJUSTMENT',
      previous_stock: prevStock,
      new_stock: targetStock,
      reason: data.reason.trim(),
      user_id: actorId,
      user_email: actorEmail,
      created_at: now
    };
    this.inventoryTransactions.set(tx.id, tx);

    this.checkAndTriggerLowStock(inv, branch, ingredient);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'INVENTORY_ADJUSTED',
      entity_type: 'STOCK_MOVEMENT',
      entity_id: tx.id,
      metadata: {
        branch_name: branch.name,
        ingredient_name: ingredient.item_name,
        previous_stock: prevStock,
        new_stock: targetStock,
        delta: diff,
        reason: data.reason.trim()
      }
    });

    this.saveSnapshot();
    return { inventory: inv, transaction: tx };
  }

  public recordRejectedStock(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      branch_id: string;
      ingredient_id: string;
      rejected_quantity: number;
      reason: string;
    }
  ): { transaction: InventoryTransaction } {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only an OWNER or MANAGER can record rejected stock.');
    }
    const rejQty = Number(data.rejected_quantity);
    if (isNaN(rejQty) || rejQty <= 0) {
      throw new Error('Rejected quantity must be greater than 0.');
    }
    if (!data.reason || data.reason.trim().length < 3) {
      throw new Error('A rejection reason (e.g. damaged packaging, expired) is required.');
    }

    const branch = this.branches.get(data.branch_id);
    if (!branch) throw new Error('Branch not found.');
    const ingredient = this.ingredients.get(data.ingredient_id);
    if (!ingredient) throw new Error('Ingredient not found.');

    const key = `${branch.id}_${ingredient.id}`;
    const inv = this.branchInventory.get(key);
    const curr = inv ? inv.current_stock : 0;
    const now = new Date().toISOString();

    const tx: InventoryTransaction = {
      id: crypto.randomUUID(),
      branch_id: branch.id,
      branch_name: branch.name,
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.item_name,
      quantity: rejQty,
      transaction_type: 'REJECT',
      previous_stock: curr,
      new_stock: curr, // Rejected stock is not added to usable inventory
      reason: data.reason.trim(),
      user_id: actorId,
      user_email: actorEmail,
      created_at: now
    };
    this.inventoryTransactions.set(tx.id, tx);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'INVENTORY_REJECTED',
      entity_type: 'STOCK_MOVEMENT',
      entity_id: tx.id,
      metadata: {
        branch_name: branch.name,
        ingredient_name: ingredient.item_name,
        rejected_quantity: rejQty,
        unit: ingredient.unit,
        reason: data.reason.trim()
      }
    });

    this.saveSnapshot();
    return { transaction: tx };
  }

  public getInventoryTransactions(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    branchId?: string,
    ingredientId?: string,
    type?: string
  ): InventoryTransaction[] {
    if (['CASHIER', 'CREW', 'KITCHEN', 'WAREHOUSEMAN'].includes(requestingRole)) {
      throw new Error('Unauthorized: Operational staff cannot view inventory history.');
    }

    let branchFilter: string | null = null;
    if (requestingRole === 'OWNER') {
      branchFilter = branchId || null;
    } else if (requestingRole === 'MANAGER') {
      branchFilter = requestingBranchId;
    }

    let list = Array.from(this.inventoryTransactions.values()).map(tx => {
      const branch = this.branches.get(tx.branch_id);
      const ing = this.ingredients.get(tx.ingredient_id);
      return {
        ...tx,
        branch_name: branch ? branch.name : tx.branch_name,
        ingredient_name: ing ? ing.item_name : tx.ingredient_name
      };
    });

    if (branchFilter && branchFilter !== 'ALL') {
      list = list.filter(t => t.branch_id === branchFilter);
    }
    if (ingredientId && ingredientId !== 'ALL') {
      list = list.filter(t => t.ingredient_id === ingredientId);
    }
    if (type && type !== 'ALL') {
      list = list.filter(t => t.transaction_type === type);
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- AI INVENTORY WATCHDOG & DEPLETION MONITORING ---

  public isCriticalInventoryItem(name: string, code?: string): boolean {
    const text = `${name} ${code || ''}`.toLowerCase();
    return (
      text.includes('patt') ||
      text.includes('bun') ||
      text.includes('bread') ||
      text.includes('hotdog') ||
      text.includes('siomai') ||
      text.includes('cheese') ||
      text.includes('oil')
    );
  }

  private checkAndTriggerLowStock(inv: BranchInventory, branch: Branch, ingredient: Ingredient): void {
    const now = new Date().toISOString();
    const isCritical = this.isCriticalInventoryItem(ingredient.item_name, ingredient.item_code);
    const isDepleted = inv.current_stock <= 0;
    const isLow = inv.current_stock <= inv.reorder_level;

    if (isLow || isDepleted) {
      // Check if open event already exists
      let existingOpen = Array.from(this.lowStockEvents.values()).find(
        e => e.branch_id === branch.id && e.ingredient_id === ingredient.id && e.status === 'OPEN'
      );

      // Trigger high priority alert if:
      // 1. It's a brand new open alert, OR
      // 2. It has now hit 0 (DEPLETED) and previously it was not recorded as 0 left
      const wasDepleted = existingOpen ? existingOpen.current_stock <= 0 : false;
      const shouldAlert = !existingOpen || (isDepleted && !wasDepleted);

      if (shouldAlert) {
        if (!existingOpen) {
          const evId = crypto.randomUUID();
          existingOpen = {
            id: evId,
            branch_id: branch.id,
            branch_name: branch.name,
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.item_name,
            current_stock: inv.current_stock,
            reorder_level: inv.reorder_level,
            unit: inv.unit,
            status: 'OPEN',
            created_at: now,
            resolved_at: null
          };
          this.lowStockEvents.set(evId, existingOpen);
        } else {
          existingOpen.current_stock = inv.current_stock;
        }

        // Exact AI Watchdog Alert formatting as specified
        const alertTitle = isDepleted
          ? `⚠️ AI STOCK ALERT: ${ingredient.item_name} DEPLETED`
          : `⚠️ AI STOCK ALERT: ${ingredient.item_name} LOW`;

        const alertMessage = isDepleted
          ? `⚠️ AI STOCK ALERT: ${ingredient.item_name} is DEPLETED (0 left) at ${branch.name}. Kitchen prep is stalled.`
          : `⚠️ AI STOCK ALERT: ${ingredient.item_name} is LOW (${inv.current_stock} left) at ${branch.name}. Reorder threshold breached.`;

        const alertType: 'ALERT' | 'WARNING' = isDepleted ? 'ALERT' : 'WARNING';

        // Notify Master Owner
        const ownerProfiles = Array.from(this.profiles.values()).filter(p => p.role === 'OWNER');
        ownerProfiles.forEach(op => {
          this.createNotification({
            recipient_user_id: op.id,
            title: alertTitle,
            message: alertMessage,
            type: alertType
          });
        });

        // Notify Branch Manager of this branch
        const managers = Array.from(this.profiles.values()).filter(
          p => p.role === 'MANAGER' && p.branch_id === branch.id
        );
        managers.forEach(mgr => {
          this.createNotification({
            recipient_user_id: mgr.id,
            title: alertTitle,
            message: alertMessage,
            type: alertType
          });
        });

        this.createAuditLog({
          user_id: 'AI_AGENT',
          user_email: 'ai.watchdog@tagpuan.system',
          role: 'OWNER',
          branch_id: branch.id,
          action: 'LOW_STOCK_EVENT',
          entity_type: 'INVENTORY',
          entity_id: existingOpen.id,
          metadata: {
            branch_name: branch.name,
            ingredient_name: ingredient.item_name,
            current_stock: inv.current_stock,
            reorder_level: inv.reorder_level,
            is_critical: isCritical,
            alert_message: alertMessage
          }
        });

        // Trigger n8n Automation Webhook for Low Stock
        dispatchN8NWebhook('inventory.low_stock', {
          branch_id: branch.id,
          branch_name: branch.name,
          inventory_items: [{
            item_id: ingredient.id,
            item_name: ingredient.item_name,
            sku: ingredient.item_code,
            current_stock: inv.current_stock,
            reorder_level: inv.reorder_level,
            unit: inv.unit,
            branch_name: branch.name
          }],
          metadata: {
            is_critical: isCritical,
            is_depleted: isDepleted,
            alert_title: alertTitle,
            alert_message: alertMessage
          }
        }).catch(err => console.warn('[n8n Webhook Warning]', err));
      }
    } else {
      // Resolve any open events when stock is replenished above reorder level
      this.lowStockEvents.forEach(ev => {
        if (ev.branch_id === branch.id && ev.ingredient_id === ingredient.id && ev.status === 'OPEN') {
          ev.status = 'RESOLVED';
          ev.resolved_at = now;
        }
      });
    }
  }

  /**
   * ATOMIC RECIPE-TO-INVENTORY REAL-TIME DEDUCTION:
   * Immediately deducts exact consumed ingredients from branch local inventory
   * and records immutable InventoryTransaction records (type: 'RECIPE_DEDUCTION').
   */
  public deductRecipeInventoryForOrder(
    order: Order,
    actorId: string,
    actorEmail: string,
    actorRole: UserRole
  ): InventoryTransaction[] {
    const transactions: InventoryTransaction[] = [];
    if ((order as any).inventory_deducted) {
      return transactions;
    }
    (order as any).inventory_deducted = true;

    const branch = this.branches.get(order.branch_id);
    if (!branch) return transactions;
    const now = new Date().toISOString();

    const applyDeduction = (ingredientId: string, ingredientName: string, reqQuantity: number, reason: string) => {
      const key = `${branch.id}_${ingredientId}`;
      const inv = this.branchInventory.get(key);
      const ingredient = this.ingredients.get(ingredientId);
      const req = Math.round(reqQuantity * 1000) / 1000;

      if (inv && ingredient) {
        const prevStock = inv.current_stock;
        const newStock = Math.round((prevStock - req) * 1000) / 1000;
        inv.current_stock = newStock;
        inv.status = newStock > inv.reorder_level ? 'IN_STOCK' : (newStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
        inv.updated_at = now;
        this.branchInventory.set(key, inv);

        this.checkAndTriggerLowStock(inv, branch, ingredient);

        const tx: InventoryTransaction = {
          id: crypto.randomUUID(),
          branch_id: branch.id,
          branch_name: branch.name,
          ingredient_id: ingredientId,
          ingredient_name: ingredient.item_name,
          quantity: -req,
          transaction_type: 'RECIPE_DEDUCTION',
          previous_stock: prevStock,
          new_stock: newStock,
          reason,
          user_id: actorId,
          user_email: actorEmail,
          created_at: now
        };
        this.inventoryTransactions.set(tx.id, tx);
        transactions.push(tx);
      }
    };

    const findIngredientId = (terms: string[]): string | undefined => {
      const match = Array.from(this.ingredients.values()).find(i =>
        terms.some(t => i.item_name.toLowerCase().includes(t.toLowerCase()) || i.item_code?.toLowerCase() === t.toLowerCase())
      );
      return match?.id;
    };

    for (const item of order.items) {
      const prodName = (item.product_name || '').toLowerCase();
      let handledByAnchorRule = false;

      // 1. Tagpuan Burger: Deduct 1x Beef Patty, 1x Burger Bun, 1x Cheese Slice
      if (prodName === 'tagpuan burger' || (prodName.includes('burger') && (prodName.includes('cheese') || prodName.includes('tagpuan')))) {
        const pattyId = findIngredientId(['patties', 'patty', 'ING-01']);
        const bunId = findIngredientId(['patty bread', 'bun', 'ING-07']);
        const cheeseId = findIngredientId(['ok cheese', 'cheese', 'ING-11']);

        if (pattyId) applyDeduction(pattyId, 'Patties', 1 * item.quantity, `Tagpuan Burger Beef Patty #${order.order_number}`);
        if (bunId) applyDeduction(bunId, 'Patty Bread', 1 * item.quantity, `Tagpuan Burger Bun #${order.order_number}`);
        if (cheeseId) applyDeduction(cheeseId, 'OK Cheese', 1 * item.quantity, `Tagpuan Burger Cheese Slice #${order.order_number}`);
        handledByAnchorRule = true;
      }
      // 2. Siomai Rice Meal: Deduct 4x Pork Siomai, 1x Rice cup portion
      else if (prodName.includes('siomai') && (prodName.includes('rice') || prodName.includes('meal'))) {
        const siomaiId = findIngredientId(['siomai', 'ING-06']);
        const riceId = findIngredientId(['rice', 'ING-12']);

        if (siomaiId) applyDeduction(siomaiId, 'Siomai', 4 * item.quantity, `Siomai Rice Meal (4x Siomai) #${order.order_number}`);
        if (riceId) applyDeduction(riceId, 'Rice', 0.15 * item.quantity, `Siomai Rice Meal (Rice Portion) #${order.order_number}`);
        handledByAnchorRule = true;
      }
      // 3. Jumbo Hotdog: Deduct 1x Hotdog, 1x Hotdog Bun
      else if (prodName.includes('hotdog')) {
        const hotdogId = findIngredientId(['hotdog', 'ING-02']);
        const hotdogBunId = findIngredientId(['hotdog bread', 'ING-08']);

        if (hotdogId) applyDeduction(hotdogId, 'Hotdog', 1 * item.quantity, `Jumbo Hotdog (1x Hotdog) #${order.order_number}`);
        if (hotdogBunId) applyDeduction(hotdogBunId, 'Hotdog Bread', 1 * item.quantity, `Jumbo Hotdog Bun #${order.order_number}`);
        handledByAnchorRule = true;
      }

      // If not handled by anchor rule, use standard recipe or direct ingredient
      if (!handledByAnchorRule) {
        const recipe = this.getRecipeByProductId(item.product_id);
        if (recipe && recipe.items && recipe.items.length > 0) {
          for (const rItem of recipe.items) {
            const req = Math.round(rItem.quantity_consumed * item.quantity * 1000) / 1000;
            applyDeduction(rItem.ingredient_id, rItem.ingredient_name, req, `Sale Order #${order.order_number} (${item.quantity}x ${item.product_name})`);
          }
        } else {
          // Direct product without composite recipe (e.g. direct beverage or add-on)
          const directIng = Array.from(this.ingredients.values()).find(
            i => i.item_code?.toLowerCase() === item.product_code?.toLowerCase() ||
                 i.item_name.toLowerCase() === item.product_name.toLowerCase()
          );
          if (directIng) {
            applyDeduction(directIng.id, directIng.item_name, item.quantity, `Sale Order #${order.order_number} (${item.quantity}x ${item.product_name})`);
          }
        }
      }

      // Modifiers deduction
      for (const mod of (item.modifiers || [])) {
        if (mod.ingredient_id && mod.quantity_consumed) {
          const req = Math.round(mod.quantity_consumed * item.quantity * 1000) / 1000;
          applyDeduction(mod.ingredient_id, mod.modifier_name, req, `Modifier #${order.order_number} (${mod.modifier_name} for ${item.product_name})`);
        }
      }
    }

    return transactions;
  }

  public getLowStockEvents(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    branchId?: string,
    status?: string
  ): InventoryLowStockEvent[] {
    if (['CASHIER', 'CREW', 'KITCHEN', 'WAREHOUSEMAN'].includes(requestingRole)) {
      throw new Error('Unauthorized: Operational staff cannot view low stock events.');
    }

    let list = Array.from(this.lowStockEvents.values()).map(ev => {
      const branch = this.branches.get(ev.branch_id);
      const ing = this.ingredients.get(ev.ingredient_id);
      return {
        ...ev,
        branch_name: branch ? branch.name : ev.branch_name,
        ingredient_name: ing ? ing.item_name : ev.ingredient_name
      };
    });

    if (requestingRole === 'MANAGER') {
      list = list.filter(e => e.branch_id === requestingBranchId);
    } else if (branchId && branchId !== 'ALL') {
      list = list.filter(e => e.branch_id === branchId);
    }

    if (status && status !== 'ALL') {
      list = list.filter(e => e.status === status);
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public resolveLowStockEvent(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    eventId: string
  ): InventoryLowStockEvent {
    const ev = this.lowStockEvents.get(eventId);
    if (!ev) throw new Error('Low stock event not found.');

    if (actorRole !== 'OWNER' && (actorRole !== 'MANAGER' || ev.branch_id !== actorId)) {
      // Only Owner or Manager of that branch can mark resolved
    }

    ev.status = 'RESOLVED';
    ev.resolved_at = new Date().toISOString();
    this.lowStockEvents.set(eventId, ev);
    this.saveSnapshot();
    return ev;
  }

  // --- REUSABLE ATOMIC INVENTORY DEDUCTION ENGINE (SECTION 23, 24, 25) ---

  public validateProductDeduction(
    branchId: string,
    productId: string,
    orderQuantity: number
  ): DeductionValidationResult {
    const qty = Number(orderQuantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Order quantity must be a positive number.');
    }

    const branch = this.branches.get(branchId);
    if (!branch) throw new Error('Target branch not found.');

    const product = this.products.get(productId);
    if (!product) throw new Error('Target product not found.');

    const recipe = this.getRecipeByProductId(productId);
    if (!recipe || !recipe.items || recipe.items.length === 0) {
      throw new Error(`No active recipe found configured for product "${product.product_name}".`);
    }

    const itemsNeeded: DeductionItemCheck[] = [];
    const insufficientItems: (DeductionItemCheck & { shortfall: number })[] = [];

    for (const item of recipe.items) {
      const ing = this.ingredients.get(item.ingredient_id);
      const ingName = ing ? ing.item_name : item.ingredient_name || 'Unknown Item';
      const unit = ing ? ing.unit : item.unit;
      const singleQty = item.quantity_consumed;
      const requiredQty = Math.round(singleQty * qty * 1000) / 1000;

      const key = `${branch.id}_${item.ingredient_id}`;
      const inv = this.branchInventory.get(key);
      const currentStock = inv ? inv.current_stock : 0;
      const hasSufficient = currentStock >= requiredQty;

      const check: DeductionItemCheck = {
        ingredient_id: item.ingredient_id,
        ingredient_name: ingName,
        unit,
        single_qty: singleQty,
        required_qty: requiredQty,
        current_stock: currentStock,
        has_sufficient: hasSufficient,
        extraction_code: item.extraction_code || null
      };

      itemsNeeded.push(check);

      if (!hasSufficient) {
        insufficientItems.push({
          ...check,
          shortfall: Math.round((requiredQty - currentStock) * 1000) / 1000
        });
      }
    }

    const valid = insufficientItems.length === 0;
    return {
      valid,
      product_id: product.id,
      product_name: product.product_name,
      order_quantity: qty,
      branch_id: branch.id,
      branch_name: branch.name,
      items_needed: itemsNeeded,
      insufficient_items: insufficientItems,
      error: valid ? undefined : `INSUFFICIENT STOCK: ${insufficientItems.map(i => `${i.ingredient_name} (Need: ${i.required_qty} ${i.unit}, Stock: ${i.current_stock} ${i.unit})`).join(', ')}`
    };
  }

  public deductProductInventory(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    branchId: string,
    productId: string,
    orderQuantity: number,
    reason?: string
  ): { success: boolean; result: DeductionValidationResult; transactions: InventoryTransaction[] } {
    // 1. Validate all recipe ingredients beforehand
    const validation = this.validateProductDeduction(branchId, productId, orderQuantity);

    if (!validation.valid) {
      // ATOMIC GUARANTEE: Throws immediately. No partial deduction occurs.
      const errorMsg = `INSUFFICIENT STOCK: Cannot deduct ${orderQuantity}x "${validation.product_name}" at ${validation.branch_name}. Shortfall on: ${validation.insufficient_items.map(i => `${i.ingredient_name} (-${i.shortfall} ${i.unit})`).join(', ')}.`;
      throw new Error(errorMsg);
    }

    const branch = this.branches.get(branchId)!;
    const product = this.products.get(productId)!;
    const now = new Date().toISOString();
    const createdTransactions: InventoryTransaction[] = [];

    // 2. Perform atomic inventory deduction
    for (const item of validation.items_needed) {
      const key = `${branch.id}_${item.ingredient_id}`;
      const inv = this.branchInventory.get(key);
      const ingredient = this.ingredients.get(item.ingredient_id)!;

      const prevStock = inv ? inv.current_stock : 0;
      const newStock = Math.round((prevStock - item.required_qty) * 1000) / 1000;

      if (inv) {
        inv.current_stock = newStock;
        inv.status = newStock > inv.reorder_level ? 'IN_STOCK' : (newStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
        inv.updated_at = now;
        this.branchInventory.set(key, inv);

        // Check low stock trigger
        this.checkAndTriggerLowStock(inv, branch, ingredient);
      }

      // Record transaction
      const tx: InventoryTransaction = {
        id: crypto.randomUUID(),
        branch_id: branch.id,
        branch_name: branch.name,
        ingredient_id: item.ingredient_id,
        ingredient_name: item.ingredient_name,
        quantity: -item.required_qty,
        transaction_type: 'RECIPE_DEDUCTION',
        previous_stock: prevStock,
        new_stock: newStock,
        reason: reason || `Recipe deduction for ${orderQuantity}x ${product.product_name}`,
        user_id: actorId,
        user_email: actorEmail,
        created_at: now
      };

      this.inventoryTransactions.set(tx.id, tx);
      createdTransactions.push(tx);
    }

    // 3. Create Audit Log for entire atomic recipe deduction
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'INVENTORY_DEDUCTED',
      entity_type: 'INVENTORY',
      entity_id: product.id,
      metadata: {
        product_code: product.product_code,
        product_name: product.product_name,
        order_quantity: orderQuantity,
        branch_name: branch.name,
        deducted_ingredients: validation.items_needed.map(i => ({
          name: i.ingredient_name,
          deducted: i.required_qty,
          unit: i.unit,
          code: i.extraction_code
        }))
      }
    });

    this.saveSnapshot();

    return {
      success: true,
      result: validation,
      transactions: createdTransactions
    };
  }

  // --- INVENTORY SUMMARY / DASHBOARD METRICS (SECTION 31) ---

  public getInventorySummary(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    branchId?: string
  ): {
    totalItems: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    branchName?: string;
  } {
    const list = this.getBranchInventory(requestingRole, requestingBranchId, branchId);
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    list.forEach(item => {
      if (item.status === 'IN_STOCK') inStock++;
      else if (item.status === 'LOW_STOCK') lowStock++;
      else if (item.status === 'OUT_OF_STOCK') outOfStock++;
    });

    const targetBranch = branchId && branchId !== 'ALL' ? this.branches.get(branchId)?.name : (requestingBranchId ? this.branches.get(requestingBranchId)?.name : 'All Branches');

    return {
      totalItems: list.length,
      inStock,
      lowStock,
      outOfStock,
      branchName: targetBranch
    };
  }

  // =========================================================================
  // --- PHASE 4: POS, ORDER ENGINE, PAYMENTS, SESSIONS & MODIFIERS ---
  // =========================================================================

  private seedPhase4Data(): void {
    if (this.modifierGroups.size === 0) {
      INITIAL_MODIFIER_GROUPS.forEach(group => {
        this.modifierGroups.set(group.id, group);
      });
    }

    if (this.paymentConfigs.size === 0) {
      INITIAL_PAYMENT_CONFIGS.forEach(cfg => {
        this.paymentConfigs.set(cfg.id, cfg);
      });
    }
  }

  public getModifierGroups(): ModifierGroup[] {
    return Array.from(this.modifierGroups.values());
  }

  public updateModifierGroup(
    actorRole: UserRole,
    groupId: string,
    data: Partial<ModifierGroup>
  ): ModifierGroup {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only OWNER can update modifier configurations.');
    }
    const group = this.modifierGroups.get(groupId);
    if (!group) throw new Error('Modifier group not found.');

    const updated = {
      ...group,
      ...data
    };
    this.modifierGroups.set(groupId, updated);
    this.saveSnapshot();
    return updated;
  }

  public createModifierGroup(
    actorRole: UserRole,
    data: Omit<ModifierGroup, 'id'>
  ): ModifierGroup {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only OWNER can create modifier configurations.');
    }
    const id = `mg-${Date.now()}`;
    const group: ModifierGroup = {
      ...data,
      id
    };
    this.modifierGroups.set(id, group);
    this.saveSnapshot();
    return group;
  }

  public deleteModifierGroup(
    actorRole: UserRole,
    groupId: string
  ): void {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only OWNER can delete modifier configurations.');
    }
    this.modifierGroups.delete(groupId);
    this.saveSnapshot();
  }

  public getPaymentConfigurations(branchId?: string | null): PaymentConfiguration[] {
    const list = Array.from(this.paymentConfigs.values());
    if (branchId) {
      const branchSpecific = list.filter(c => c.branch_id === branchId && c.is_active);
      if (branchSpecific.length > 0) return branchSpecific;
    }
    return list.filter(c => c.branch_id === null && c.is_active);
  }

  public getAllPaymentConfigurations(): PaymentConfiguration[] {
    return Array.from(this.paymentConfigs.values());
  }

  public updatePaymentConfiguration(
    actorRole: UserRole,
    configId: string,
    data: Partial<PaymentConfiguration>
  ): PaymentConfiguration {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only OWNER can modify payment configurations.');
    }
    const config = this.paymentConfigs.get(configId);
    if (!config) throw new Error('Payment configuration not found.');

    const updated: PaymentConfiguration = {
      ...config,
      ...data,
      updated_at: new Date().toISOString()
    };
    this.paymentConfigs.set(configId, updated);
    this.saveSnapshot();
    return updated;
  }

  public createPaymentConfiguration(
    actorRole: UserRole,
    data: Omit<PaymentConfiguration, 'id' | 'created_at' | 'updated_at'>
  ): PaymentConfiguration {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only OWNER can create payment configurations.');
    }
    const now = new Date().toISOString();
    const newConfig: PaymentConfiguration = {
      ...data,
      id: `pay-cfg-${crypto.randomUUID()}`,
      created_at: now,
      updated_at: now
    };
    this.paymentConfigs.set(newConfig.id, newConfig);
    this.saveSnapshot();
    return newConfig;
  }

  public generateOrderNumber(): string {
    const seq = this.orderNumberSequence++;
    return `TAG-${String(seq).padStart(6, '0')}`;
  }

  public validateOrderItems(
    branchId: string,
    items: CartItemInput[]
  ): {
    valid: boolean;
    calculatedSubtotal: number;
    itemsBreakdown: {
      productId: string;
      productCode: string;
      productName: string;
      category: ProductCategory;
      productImage?: string | null;
      unitPrice: number;
      quantity: number;
      itemSubtotal: number;
      modifiers: OrderItemModifier[];
      notes?: string | null;
    }[];
    insufficientItems: (DeductionItemCheck & { shortfall: number })[];
    error?: string;
  } {
    const branch = this.branches.get(branchId);
    if (!branch) throw new Error('Target branch not found.');

    if (!items || items.length === 0) {
      throw new Error('Cart cannot be empty.');
    }

    let calculatedSubtotal = 0;
    const itemsBreakdown: any[] = [];
    const ingredientDemand: Map<string, {
      ingredient_id: string;
      ingredient_name: string;
      unit: string;
      totalRequired: number;
      extraction_code?: string | null;
    }> = new Map();

    // 1. Authoritative price & recipe extraction
    for (const itemInput of items) {
      const product = this.products.get(itemInput.product_id);
      if (!product || !product.is_active) {
        throw new Error(`Product not found or inactive: ID ${itemInput.product_id}`);
      }

      const qty = Math.max(1, Number(itemInput.quantity) || 1);
      const unitPrice = product.selling_price; // DB Authoritative price
      let modifierExtraPriceTotal = 0;

      const orderItemMods: OrderItemModifier[] = [];

      if (itemInput.modifiers && itemInput.modifiers.length > 0) {
        for (const modInput of itemInput.modifiers) {
          let modPrice = Number(modInput.additional_price) || 0;
          let linkedIngId = modInput.ingredient_id || null;
          let modQtyConsumed = modInput.quantity_consumed || null;
          let modUnit = modInput.unit || null;

          for (const group of this.modifierGroups.values()) {
            const foundOpt = group.options.find(o => o.id === modInput.modifier_id || o.name.toLowerCase() === modInput.modifier_name.toLowerCase());
            if (foundOpt) {
              modPrice = foundOpt.price;
              linkedIngId = foundOpt.ingredient_id || linkedIngId;
              modQtyConsumed = foundOpt.quantity_consumed || modQtyConsumed;
              modUnit = foundOpt.unit || modUnit;
              break;
            }
          }

          modifierExtraPriceTotal += modPrice;

          const orderMod: OrderItemModifier = {
            id: crypto.randomUUID(),
            order_item_id: '',
            modifier_id: modInput.modifier_id,
            modifier_name: modInput.modifier_name,
            modifier_group: modInput.modifier_group,
            additional_price: modPrice,
            ingredient_id: linkedIngId,
            quantity_consumed: modQtyConsumed,
            unit: modUnit,
            created_at: new Date().toISOString()
          };
          orderItemMods.push(orderMod);

          if (linkedIngId && modQtyConsumed) {
            const ing = this.ingredients.get(linkedIngId);
            const ingName = ing ? ing.item_name : 'Modifier Ingredient';
            const unit = ing ? ing.unit : (modUnit || 'pcs');
            const totalModReq = Math.round(modQtyConsumed * qty * 1000) / 1000;

            const existing = ingredientDemand.get(linkedIngId) || {
              ingredient_id: linkedIngId,
              ingredient_name: ingName,
              unit,
              totalRequired: 0,
              extraction_code: null
            };
            existing.totalRequired = Math.round((existing.totalRequired + totalModReq) * 1000) / 1000;
            ingredientDemand.set(linkedIngId, existing);
          }
        }
      }

      // Base recipe ingredient demand
      const recipe = this.getRecipeByProductId(product.id);
      if (recipe && recipe.items) {
        for (const rItem of recipe.items) {
          const ing = this.ingredients.get(rItem.ingredient_id);
          const ingName = ing ? ing.item_name : rItem.ingredient_name;
          const unit = ing ? ing.unit : rItem.unit;
          const req = Math.round(rItem.quantity_consumed * qty * 1000) / 1000;

          const existing = ingredientDemand.get(rItem.ingredient_id) || {
            ingredient_id: rItem.ingredient_id,
            ingredient_name: ingName,
            unit,
            totalRequired: 0,
            extraction_code: rItem.extraction_code || null
          };
          existing.totalRequired = Math.round((existing.totalRequired + req) * 1000) / 1000;
          ingredientDemand.set(rItem.ingredient_id, existing);
        }
      }

      const itemSubtotal = Math.round((unitPrice + modifierExtraPriceTotal) * qty * 100) / 100;
      calculatedSubtotal = Math.round((calculatedSubtotal + itemSubtotal) * 100) / 100;

      itemsBreakdown.push({
        productId: product.id,
        productCode: product.product_code,
        productName: product.product_name,
        category: product.category,
        productImage: product.product_image,
        unitPrice,
        quantity: qty,
        itemSubtotal,
        modifiers: orderItemMods,
        notes: itemInput.notes || null
      });
    }

    // 2. Validate current branch inventory
    const insufficientItems: (DeductionItemCheck & { shortfall: number })[] = [];

    for (const demand of ingredientDemand.values()) {
      const key = `${branch.id}_${demand.ingredient_id}`;
      const inv = this.branchInventory.get(key);
      const currentStock = inv ? inv.current_stock : 0;

      if (currentStock < demand.totalRequired) {
        insufficientItems.push({
          ingredient_id: demand.ingredient_id,
          ingredient_name: demand.ingredient_name,
          unit: demand.unit,
          single_qty: 0,
          required_qty: demand.totalRequired,
          current_stock: currentStock,
          has_sufficient: false,
          shortfall: Math.round((demand.totalRequired - currentStock) * 1000) / 1000,
          extraction_code: demand.extraction_code || null
        });
      }
    }

    const valid = insufficientItems.length === 0;
    const error = valid
      ? undefined
      : `INSUFFICIENT STOCK: Cannot complete order at ${branch.name}. Shortfall on: ${insufficientItems.map(i => `${i.ingredient_name} (-${i.shortfall} ${i.unit})`).join(', ')}.`;

    return {
      valid,
      calculatedSubtotal,
      itemsBreakdown,
      insufficientItems,
      error
    };
  }

  public createOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: CreateOrderInput
  ): Order {
    // 1. Strict RLS Branch Check
    if (actorRole !== 'OWNER') {
      if (!actorBranchId) {
        throw new Error('User has no assigned branch.');
      }
      if (input.branch_id !== actorBranchId) {
        throw new Error('Forbidden: You cannot create orders for another branch.');
      }
    }

    const branch = this.branches.get(input.branch_id);
    if (!branch) throw new Error('Target branch not found.');

    const cashier = this.profiles.get(actorId);

    // 2. Validate Cart & Inventory
    const validation = this.validateOrderItems(input.branch_id, input.items);
    if (!validation.valid) {
      throw new Error(validation.error || 'Insufficient ingredient stock for this order.');
    }

    const orderId = crypto.randomUUID();
    const orderNumber = this.generateOrderNumber();
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = [];

    for (const item of validation.itemsBreakdown) {
      const orderItemId = crypto.randomUUID();
      const mods: OrderItemModifier[] = (item.modifiers || []).map((m: any) => ({
        ...m,
        id: crypto.randomUUID(),
        order_item_id: orderItemId
      }));

      mods.forEach(m => this.orderItemModifiers.set(m.id, m));

      const orderItem: OrderItem = {
        id: orderItemId,
        order_id: orderId,
        product_id: item.productId,
        product_code: item.productCode,
        product_name: item.productName,
        product_image: item.productImage || null,
        category: item.category,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.itemSubtotal,
        notes: item.notes,
        modifiers: mods,
        created_at: now
      };

      this.orderItems.set(orderItem.id, orderItem);
      orderItems.push(orderItem);
    }

    const subtotal = validation.calculatedSubtotal;
    const discountAmount = Math.max(0, Number(input.discount_amount) || 0);
    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const order: Order = {
      id: orderId,
      order_number: orderNumber,
      branch_id: branch.id,
      branch_name: branch.name,
      cashier_id: actorId,
      cashier_name: cashier ? cashier.full_name : actorEmail,
      order_type: (input.order_type as any) || 'DINE_IN',
      source: 'POS',
      status: 'PENDING_PAYMENT',
      items: orderItems,
      subtotal,
      discount_type: input.discount_type || null,
      discount_amount: discountAmount,
      discount_reason: input.discount_reason || null,
      discounted_by: discountAmount > 0 ? actorId : null,
      total,
      notes: input.notes || null,
      payment: null,
      customer_id: input.customer_id || null,
      customer_name: input.customer_name || null,
      customer_phone: input.customer_phone || null,
      loyalty_reward_item_id: input.loyalty_reward_item_id || null,
      loyalty_reward_item_name: input.loyalty_reward_item_name || null,
      created_at: now,
      updated_at: now
    };

    this.orders.set(order.id, order);

    this.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      from_status: null,
      to_status: 'PENDING_PAYMENT',
      changed_by: actorId,
      changed_by_name: cashier ? cashier.full_name : actorEmail,
      reason: 'Order created via Tagpuan POS',
      created_at: now
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'ORDER_CREATED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        branch_name: branch.name,
        total: order.total,
        item_count: orderItems.length,
        items: orderItems.map(i => `${i.quantity}x ${i.product_name}`)
      }
    });

    this.saveSnapshot();
    return order;
  }

  public processPayment(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: ProcessPaymentInput
  ): {
    success: boolean;
    order: Order;
    payment: Payment;
    salesTransaction: SalesTransaction;
    receipt: ReceiptData;
  } {
    // 1. Double Submission Check
    if (input.idempotency_key) {
      if (this.processedIdempotencyKeys.has(input.idempotency_key)) {
        throw new Error('Double submission detected: This transaction has already been processed.');
      }
      this.processedIdempotencyKeys.add(input.idempotency_key);
    }

    const order = this.orders.get(input.order_id);
    if (!order) throw new Error('Order not found.');

    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      throw new Error(`Order ${order.order_number} has already been paid and processed.`);
    }

    if (order.status === 'VOIDED' || order.status === 'CANCELLED') {
      throw new Error(`Cannot process payment for ${order.status.toLowerCase()} order.`);
    }

    // 2. Branch RLS Check
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      if (actorBranchId && order.branch_id && order.branch_id !== actorBranchId) {
        console.warn(`[Payment] Cashier branch ${actorBranchId} processing order from branch ${order.branch_id}`);
      }
    }

    const branch = this.branches.get(order.branch_id) || Array.from(this.branches.values())[0];
    const cashier = this.profiles.get(actorId);
    const now = new Date().toISOString();

    // 3. Payment Method & Amount Validation
    const validMethods: PaymentMethod[] = ['CASH', 'GCASH', 'MAYA', 'QRPH', 'BANK_TRANSFER'];
    if (!validMethods.includes(input.payment_method)) {
      throw new Error(`Invalid payment method: ${input.payment_method}`);
    }

    let amountReceived = input.amount_received;
    let changeAmount = 0;

    if (input.payment_method === 'CASH') {
      if (amountReceived === undefined || amountReceived === null || amountReceived < order.total) {
        throw new Error(`Insufficient cash: Amount received (₱${amountReceived || 0}) is less than total bill (₱${order.total}).`);
      }
      changeAmount = Math.round((amountReceived - order.total) * 100) / 100;
    } else {
      amountReceived = order.total;
    }

    // 4. ATOMIC RECIPE-TO-INVENTORY REAL-TIME DEDUCTION
    this.deductRecipeInventoryForOrder(order, actorId, actorEmail, actorRole);

    // 5. Payment Record
    const paymentId = crypto.randomUUID();
    const paymentRecord: Payment = {
      id: paymentId,
      order_id: order.id,
      order_number: order.order_number,
      branch_id: branch.id,
      payment_method: input.payment_method,
      amount: order.total,
      amount_received: amountReceived,
      change_amount: changeAmount,
      reference_number: input.reference_number || null,
      payment_status: 'PAID',
      processed_by: actorId,
      processed_by_name: cashier ? cashier.full_name : actorEmail,
      processed_at: now,
      created_at: now
    };
    this.payments.set(paymentRecord.id, paymentRecord);

    // 6. Sales Transaction Record
    const salesTxId = crypto.randomUUID();
    const salesTx: SalesTransaction = {
      id: salesTxId,
      order_id: order.id,
      order_number: order.order_number,
      branch_id: branch.id,
      branch_name: branch.name,
      cashier_id: actorId,
      cashier_name: cashier ? cashier.full_name : actorEmail,
      transaction_date: now,
      amount: order.total,
      payment_method: input.payment_method,
      source: 'POS',
      status: 'COMPLETED',
      created_at: now
    };
    this.salesTransactions.set(salesTx.id, salesTx);

    // 7. Update Order
    order.status = 'PAID';
    order.payment = paymentRecord;
    order.kitchen_status = 'NEW';
    order.kitchen_received_at = now;
    order.updated_at = now;
    this.orders.set(order.id, order);

    // 8. Order Status History
    this.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      from_status: 'PENDING_PAYMENT',
      to_status: 'PAID',
      changed_by: actorId,
      changed_by_name: cashier ? cashier.full_name : actorEmail,
      reason: `Payment completed via ${input.payment_method}`,
      created_at: now
    });

    // 9. Update Cashier Session
    for (const session of this.cashierSessions.values()) {
      if (session.cashier_id === actorId && session.branch_id === branch.id && session.status === 'OPEN') {
        session.total_sales = Math.round((session.total_sales + order.total) * 100) / 100;
        session.total_orders += 1;
        this.cashierSessions.set(session.id, session);
        break;
      }
    }

    // 10. Audit Log for Payment
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'PAYMENT_PROCESSED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        branch_name: branch.name,
        payment_method: input.payment_method,
        amount: order.total,
        amount_received: amountReceived,
        change: changeAmount,
        source: order.source
      }
    });

    // 11. Audit Log for Kitchen Dispatch
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'KITCHEN_ORDER_RECEIVED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        branch_name: branch.name,
        kitchen_status: 'NEW',
        kitchen_received_at: now,
        source: order.source,
        item_count: order.items.length
      }
    });

    // 12. Phase 10: Loyalty Point Earning & Reward Redemptions
    const targetCustId = input.customer_id || order.customer_id;
    const targetCustName = input.customer_name || order.customer_name;
    const targetCustPhone = input.customer_phone || order.customer_phone;

    let attachedCustomer: LoyaltyCustomer | null = null;
    if (targetCustId) {
      attachedCustomer = this.loyaltyCustomers.get(targetCustId) || null;
    }
    if (!attachedCustomer && ((targetCustName && targetCustName.trim().length > 0) || (targetCustPhone && targetCustPhone.trim().length > 0))) {
      const name = (targetCustName && targetCustName.trim()) || `Customer (${targetCustPhone?.trim()})`;
      attachedCustomer = this.getOrCreateLoyaltyCustomer(name, targetCustPhone, null, branch.id);
    }

    // A. Loyalty Point Earning: 2 points per ₱100 eligible completed and paid purchase
    const eligiblePoints = Math.floor(order.total / 100) * 2;
    if (attachedCustomer) {
      order.customer_id = attachedCustomer.id;
      order.customer_name = attachedCustomer.customer_name;
      if (targetCustPhone && !attachedCustomer.phone_number) {
        attachedCustomer.phone_number = targetCustPhone;
      }

      if (eligiblePoints > 0) {
        attachedCustomer.current_points += eligiblePoints;
        attachedCustomer.total_points_earned += eligiblePoints;
        attachedCustomer.updated_at = now;
        this.loyaltyCustomers.set(attachedCustomer.id, attachedCustomer);

        order.loyalty_points_earned = eligiblePoints;

        const earnTx: LoyaltyTransaction = {
          id: crypto.randomUUID(),
          customer_id: attachedCustomer.id,
          customer_name: attachedCustomer.customer_name,
          transaction_type: 'EARN',
          points: eligiblePoints,
          order_id: order.id,
          order_number: order.order_number,
          branch_id: branch.id,
          branch_name: branch.name,
          reason: `Points earned from paid order #${order.order_number} (₱${order.total.toFixed(2)})`,
          processed_by: actorId,
          processed_by_name: cashier ? cashier.full_name : actorEmail,
          created_at: now
        };
        this.loyaltyTransactions.set(earnTx.id, earnTx);

        this.createAuditLog({
          user_id: actorId,
          user_email: actorEmail,
          role: actorRole,
          branch_id: branch.id,
          action: 'LOYALTY_POINTS_EARNED',
          entity_type: 'CUSTOMER',
          entity_id: attachedCustomer.id,
          metadata: {
            customer_name: attachedCustomer.customer_name,
            points_earned: eligiblePoints,
            order_number: order.order_number,
            order_total: order.total,
            new_balance: attachedCustomer.current_points
          }
        });
      }

      // B. If order includes a loyalty reward item that requires deducting 200 points
      if (order.loyalty_reward_item_id && attachedCustomer.current_points >= 200) {
        attachedCustomer.current_points -= 200;
        attachedCustomer.total_points_redeemed += 200;
        attachedCustomer.updated_at = now;
        this.loyaltyCustomers.set(attachedCustomer.id, attachedCustomer);

        const redemptionId = crypto.randomUUID();
        const redemption: LoyaltyRedemption = {
          id: redemptionId,
          customer_id: attachedCustomer.id,
          customer_name: attachedCustomer.customer_name,
          points_spent: 200,
          product_id: order.loyalty_reward_item_id,
          product_name: order.loyalty_reward_item_name || 'Free Reward Product',
          order_id: order.id,
          order_number: order.order_number,
          branch_id: branch.id,
          branch_name: branch.name,
          cashier_id: actorId,
          cashier_name: cashier ? cashier.full_name : actorEmail,
          redeemed_at: now,
          status: 'COMPLETED'
        };
        this.loyaltyRedemptions.set(redemption.id, redemption);
        order.loyalty_redemption_id = redemption.id;

        const redeemTx: LoyaltyTransaction = {
          id: crypto.randomUUID(),
          customer_id: attachedCustomer.id,
          customer_name: attachedCustomer.customer_name,
          transaction_type: 'REDEEM',
          points: -200,
          order_id: order.id,
          order_number: order.order_number,
          branch_id: branch.id,
          branch_name: branch.name,
          reward_product_id: order.loyalty_reward_item_id,
          reward_product_name: order.loyalty_reward_item_name || 'Free Reward Product',
          reason: `Redeemed 200 points for ${order.loyalty_reward_item_name || 'Free Reward'} on order #${order.order_number}`,
          processed_by: actorId,
          processed_by_name: cashier ? cashier.full_name : actorEmail,
          created_at: now
        };
        this.loyaltyTransactions.set(redeemTx.id, redeemTx);

        this.createAuditLog({
          user_id: actorId,
          user_email: actorEmail,
          role: actorRole,
          branch_id: branch.id,
          action: 'LOYALTY_REWARD_REDEEMED',
          entity_type: 'CUSTOMER',
          entity_id: attachedCustomer.id,
          metadata: {
            customer_name: attachedCustomer.customer_name,
            points_spent: 200,
            product_name: order.loyalty_reward_item_name,
            order_number: order.order_number,
            new_balance: attachedCustomer.current_points
          }
        });
      }
    }
    this.orders.set(order.id, order);

    this.saveSnapshot();

    const receipt = this.buildReceiptData(order, paymentRecord, branch, cashier ? cashier.full_name : actorEmail);

    return {
      success: true,
      order,
      payment: paymentRecord,
      salesTransaction: salesTx,
      receipt
    };
  }

  public voidOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    input: VoidOrderInput
  ): Order {
    if (actorRole !== 'OWNER') {
      throw new Error('Forbidden: Only OWNER has authorization to void an order.');
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error('Void reason is mandatory.');
    }

    const order = this.orders.get(input.order_id);
    if (!order) throw new Error('Order not found.');

    if (order.status === 'VOIDED') {
      throw new Error('Order has already been voided.');
    }

    const now = new Date().toISOString();
    const prevStatus = order.status;

    order.status = 'VOIDED';
    order.void_reason = input.reason.trim();
    order.voided_by = actorId;
    order.voided_by_name = actorEmail;
    order.voided_at = now;
    order.updated_at = now;

    for (const st of this.salesTransactions.values()) {
      if (st.order_id === order.id) {
        st.status = 'VOIDED';
        this.salesTransactions.set(st.id, st);
      }
    }

    this.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      from_status: prevStatus,
      to_status: 'VOIDED',
      changed_by: actorId,
      changed_by_name: actorEmail,
      reason: `Owner Void: ${input.reason.trim()}`,
      created_at: now
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: order.branch_id,
      action: 'ORDER_VOIDED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        previous_status: prevStatus,
        reason: input.reason.trim(),
        total: order.total
      }
    });

    // Phase 10: Reverse earned loyalty points & redemptions if applicable
    if (order.customer_id && (order.loyalty_points_earned || 0) > 0) {
      const customer = this.loyaltyCustomers.get(order.customer_id);
      const pointsToReverse = order.loyalty_points_earned || 0;
      if (customer && pointsToReverse > 0) {
        customer.current_points = Math.max(0, customer.current_points - pointsToReverse);
        customer.total_points_earned = Math.max(0, customer.total_points_earned - pointsToReverse);
        customer.updated_at = now;
        this.loyaltyCustomers.set(customer.id, customer);

        const revTx: LoyaltyTransaction = {
          id: crypto.randomUUID(),
          customer_id: customer.id,
          customer_name: customer.customer_name,
          transaction_type: 'REVERSAL',
          points: -pointsToReverse,
          order_id: order.id,
          order_number: order.order_number,
          branch_id: order.branch_id,
          branch_name: order.branch_name,
          reason: `Reversal: Order #${order.order_number} voided (${input.reason.trim()})`,
          processed_by: actorId,
          processed_by_name: actorEmail,
          created_at: now
        };
        this.loyaltyTransactions.set(revTx.id, revTx);

        this.createAuditLog({
          user_id: actorId,
          user_email: actorEmail,
          role: actorRole,
          branch_id: order.branch_id,
          action: 'LOYALTY_POINTS_REVERSED',
          entity_type: 'CUSTOMER',
          entity_id: customer.id,
          metadata: {
            customer_name: customer.customer_name,
            reversed_points: pointsToReverse,
            order_number: order.order_number,
            new_balance: customer.current_points
          }
        });
      }
    }

    if (order.loyalty_redemption_id) {
      const redemption = this.loyaltyRedemptions.get(order.loyalty_redemption_id);
      if (redemption) {
        redemption.status = 'CANCELLED';
        this.loyaltyRedemptions.set(redemption.id, redemption);
        if (order.customer_id) {
          const customer = this.loyaltyCustomers.get(order.customer_id);
          if (customer) {
            customer.current_points += redemption.points_spent;
            customer.total_points_redeemed = Math.max(0, customer.total_points_redeemed - redemption.points_spent);
            customer.updated_at = now;
            this.loyaltyCustomers.set(customer.id, customer);

            const refundTx: LoyaltyTransaction = {
              id: crypto.randomUUID(),
              customer_id: customer.id,
              customer_name: customer.customer_name,
              transaction_type: 'ADJUSTMENT',
              points: redemption.points_spent,
              order_id: order.id,
              order_number: order.order_number,
              branch_id: order.branch_id,
              branch_name: order.branch_name,
              reason: `Refund of ${redemption.points_spent} reward points due to voided Order #${order.order_number}`,
              processed_by: actorId,
              processed_by_name: actorEmail,
              created_at: now
            };
            this.loyaltyTransactions.set(refundTx.id, refundTx);
          }
        }
      }
    }

    // Phase 15: Reverse recipe inventory deduction if the voided order was already paid or completed
    if (prevStatus === 'PAID' || prevStatus === 'COMPLETED') {
      for (const item of order.items) {
        const recipe = this.getRecipeByProductId(item.product_id);
        if (recipe && recipe.items) {
          for (const rItem of recipe.items) {
            const key = `${order.branch_id}_${rItem.ingredient_id}`;
            const inv = this.branchInventory.get(key);
            const ingredient = this.ingredients.get(rItem.ingredient_id);
            const req = Math.round(rItem.quantity_consumed * item.quantity * 1000) / 1000;
            if (inv && ingredient) {
              const prevStock = inv.current_stock;
              const newStock = Math.round((prevStock + req) * 1000) / 1000;
              inv.current_stock = newStock;
              inv.status = newStock > inv.reorder_level ? 'IN_STOCK' : (newStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
              inv.updated_at = now;
              this.branchInventory.set(key, inv);

              const tx: InventoryTransaction = {
                id: crypto.randomUUID(),
                branch_id: order.branch_id,
                branch_name: order.branch_name,
                ingredient_id: rItem.ingredient_id,
                ingredient_name: ingredient.item_name,
                quantity: req,
                transaction_type: 'ADJUSTMENT',
                previous_stock: prevStock,
                new_stock: newStock,
                reason: `Void Reversal: Order #${order.order_number} (${item.quantity}x ${item.product_name}) - ${input.reason.trim()}`,
                user_id: actorId,
                user_email: actorEmail,
                created_at: now
              };
              this.inventoryTransactions.set(tx.id, tx);
            }
          }
        }

        for (const mod of (item.modifiers || [])) {
          if (mod.ingredient_id && mod.quantity_consumed) {
            const key = `${order.branch_id}_${mod.ingredient_id}`;
            const inv = this.branchInventory.get(key);
            const ingredient = this.ingredients.get(mod.ingredient_id);
            const req = Math.round(mod.quantity_consumed * item.quantity * 1000) / 1000;
            if (inv && ingredient) {
              const prevStock = inv.current_stock;
              const newStock = Math.round((prevStock + req) * 1000) / 1000;
              inv.current_stock = newStock;
              inv.status = newStock > inv.reorder_level ? 'IN_STOCK' : (newStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
              inv.updated_at = now;
              this.branchInventory.set(key, inv);

              const tx: InventoryTransaction = {
                id: crypto.randomUUID(),
                branch_id: order.branch_id,
                branch_name: order.branch_name,
                ingredient_id: mod.ingredient_id,
                ingredient_name: ingredient.item_name,
                quantity: req,
                transaction_type: 'ADJUSTMENT',
                previous_stock: prevStock,
                new_stock: newStock,
                reason: `Void Reversal Modifier: Order #${order.order_number} (${mod.modifier_name}) - ${input.reason.trim()}`,
                user_id: actorId,
                user_email: actorEmail,
                created_at: now
              };
              this.inventoryTransactions.set(tx.id, tx);
            }
          }
        }
      }
    }

    this.saveSnapshot();
    return order;
  }

  public cancelOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    orderId: string,
    reason: string
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');

    if (actorRole !== 'OWNER' && order.branch_id !== actorBranchId) {
      throw new Error('Forbidden: You cannot cancel orders for another branch.');
    }

    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      throw new Error('Paid orders cannot be cancelled directly; they must be voided by Owner.');
    }

    if (order.status === 'CANCELLED' || order.status === 'VOIDED') {
      throw new Error(`Order is already ${order.status.toLowerCase()}.`);
    }

    const now = new Date().toISOString();
    const prevStatus = order.status;
    order.status = 'CANCELLED';
    order.notes = order.notes ? `${order.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`;
    order.updated_at = now;

    this.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      from_status: prevStatus,
      to_status: 'CANCELLED',
      changed_by: actorId,
      changed_by_name: actorEmail,
      reason: `Customer Cancel: ${reason}`,
      created_at: now
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: order.branch_id,
      action: 'ORDER_CANCELLED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: { order_number: order.order_number, reason }
    });

    this.saveSnapshot();
    return order;
  }

  public getOrders(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    filters?: {
      branch_id?: string;
      status?: string;
      search?: string;
      date?: string;
      cashier_id?: string;
      source?: string;
    }
  ): Order[] {
    let list = Array.from(this.orders.values()).map(o => {
      const branch = this.branches.get(o.branch_id);
      const rawItems = Array.isArray(o.items) && o.items.length > 0
        ? o.items
        : Array.from(this.orderItems.values()).filter(i => i.order_id === o.id);

      return {
        ...o,
        branch_name: branch ? branch.name : o.branch_name,
        items: rawItems.map(item => {
          const product = this.products.get(item.product_id);
          return {
            ...item,
            product_image: product ? product.product_image : (item.product_image || null)
          };
        })
      };
    });

    if (requestingRole === 'OWNER') {
      if (filters?.branch_id && filters.branch_id !== 'ALL') {
        list = list.filter(o => o.branch_id === filters.branch_id);
      }
    } else {
      if (!requestingBranchId) {
        throw new Error('User has no assigned branch.');
      }
      list = list.filter(o => o.branch_id === requestingBranchId);
    }

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter(o => o.status === filters.status);
    }

    if (filters?.cashier_id && filters.cashier_id !== 'ALL') {
      list = list.filter(o => o.cashier_id === filters.cashier_id);
    }

    if (filters?.source && filters.source !== 'ALL') {
      if (filters.source === 'SELF_ORDERING' || filters.source === 'KIOSK') {
        list = list.filter(o => o.source === 'SELF_ORDERING' || o.source === 'KIOSK');
      } else {
        list = list.filter(o => o.source === filters.source);
      }
    }

    if (filters?.date) {
      list = list.filter(o => o.created_at.startsWith(filters.date!));
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q) ||
        (o.cashier_name || '').toLowerCase().includes(q) ||
        (o.branch_name || '').toLowerCase().includes(q) ||
        o.items.some(i => i.product_name.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getOrderById(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    orderId: string
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');

    if (requestingRole !== 'OWNER' && order.branch_id !== requestingBranchId) {
      throw new Error('Forbidden: You cannot access orders from another branch.');
    }

    const branch = this.branches.get(order.branch_id);
    return {
      ...order,
      branch_name: branch ? branch.name : order.branch_name
    };
  }

  private buildReceiptData(order: Order, payment: Payment | null, branch: Branch, cashierName: string): ReceiptData {
    const orderDate = new Date(order.created_at);
    let customerBalance: number | undefined = undefined;
    if (order.customer_id) {
      const cust = this.loyaltyCustomers.get(order.customer_id);
      if (cust) customerBalance = cust.current_points;
    }

    return {
      header: 'TAGPUAN — HOME OF BURGER & SIOMAI',
      branch_name: branch.name,
      branch_id: branch.id,
      order_number: order.order_number,
      date: orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      cashier_name: cashierName,
      items: (order.items || []).map(i => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        modifiers: (i.modifiers || []).map(m => `${m.modifier_name}${m.additional_price > 0 ? ` (+₱${m.additional_price})` : ''}`)
      })),
      subtotal: order.subtotal,
      discount: order.discount_amount,
      total: order.total,
      payment_method: payment ? payment.payment_method : 'CASH',
      amount_received: payment?.amount_received,
      change: payment?.change_amount,
      reference_number: payment?.reference_number || undefined,
      customer_name: order.customer_name || undefined,
      customer_phone: order.customer_phone || undefined,
      loyalty_points_earned: order.loyalty_points_earned,
      loyalty_current_balance: customerBalance,
      loyalty_reward_redeemed: order.loyalty_reward_item_name || undefined
    };
  }

  public getReceiptData(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    orderId: string
  ): ReceiptData {
    const order = this.getOrderById(requestingRole, requestingBranchId, orderId);
    const branch = this.branches.get(order.branch_id)!;
    const payment = order.payment || Array.from(this.payments.values()).find(p => p.order_id === order.id) || null;
    return this.buildReceiptData(order, payment, branch, order.cashier_name || 'Cashier');
  }

  // --- CASHIER SESSIONS ---
  public getCashierSession(cashierId: string, branchId: string): CashierSession | null {
    for (const session of this.cashierSessions.values()) {
      if (session.cashier_id === cashierId && session.branch_id === branchId && session.status === 'OPEN') {
        return session;
      }
    }
    return null;
  }

  public openCashierSession(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    branchId: string,
    openingCash: number,
    notes?: string
  ): CashierSession {
    if (actorRole !== 'OWNER' && branchId !== actorBranchId) {
      throw new Error('Forbidden: You cannot open a session for another branch.');
    }

    const existing = this.getCashierSession(actorId, branchId);
    if (existing) {
      return existing;
    }

    const branch = this.branches.get(branchId);
    const cashier = this.profiles.get(actorId);
    const now = new Date().toISOString();

    const session: CashierSession = {
      id: crypto.randomUUID(),
      cashier_id: actorId,
      cashier_name: cashier ? cashier.full_name : actorEmail,
      branch_id: branchId,
      branch_name: branch ? branch.name : 'Unknown Branch',
      opened_at: now,
      closed_at: null,
      status: 'OPEN',
      opening_cash: Number(openingCash) || 0,
      closing_cash: null,
      total_sales: 0,
      total_orders: 0,
      notes: notes || null,
      created_at: now
    };

    this.cashierSessions.set(session.id, session);
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branchId,
      action: 'CASHIER_SESSION_OPENED',
      entity_type: 'CASHIER_SESSION',
      entity_id: session.id,
      metadata: { branch_name: branch?.name, opening_cash: openingCash }
    });

    this.saveSnapshot();
    return session;
  }

  public closeCashierSession(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    sessionId: string,
    closingCash: number,
    notes?: string
  ): CashierSession {
    const session = this.cashierSessions.get(sessionId);
    if (!session) throw new Error('Cashier session not found.');

    if (actorRole !== 'OWNER' && session.cashier_id !== actorId) {
      throw new Error('Forbidden: You can only close your own cashier session.');
    }

    const now = new Date().toISOString();
    session.status = 'CLOSED';
    session.closed_at = now;
    session.closing_cash = Number(closingCash) || 0;
    if (notes) session.notes = notes;

    this.cashierSessions.set(session.id, session);
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: session.branch_id,
      action: 'CASHIER_SESSION_CLOSED',
      entity_type: 'CASHIER_SESSION',
      entity_id: session.id,
      metadata: {
        branch_name: session.branch_name,
        opening_cash: session.opening_cash,
        closing_cash: session.closing_cash,
        total_sales: session.total_sales,
        total_orders: session.total_orders
      }
    });

    this.saveSnapshot();
    return session;
  }

  public getSalesTransactions(
    requestingRole: UserRole,
    requestingBranchId: string | null,
    filters?: { branch_id?: string; date?: string }
  ): SalesTransaction[] {
    let list = Array.from(this.salesTransactions.values());

    if (requestingRole === 'OWNER') {
      if (filters?.branch_id && filters.branch_id !== 'ALL') {
        list = list.filter(s => s.branch_id === filters.branch_id);
      }
    } else {
      if (!requestingBranchId) {
        throw new Error('User has no assigned branch.');
      }
      list = list.filter(s => s.branch_id === requestingBranchId);
    }

    if (filters?.date) {
      list = list.filter(s => s.transaction_date.startsWith(filters.date!));
    }

    return list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }

  // =========================================================================
  // --- PHASE 5: SELF-ORDERING / CUSTOMER KIOSK METHODS ---
  // =========================================================================

  public getKioskBranches(): { id: string; name: string }[] {
    return Array.from(this.branches.values())
      .filter(b => b.is_active)
      .map(b => ({ id: b.id, name: b.name }));
  }

  public getKioskMenu(branchId?: string): KioskMenuData {
    let branch = branchId ? this.branches.get(branchId) : undefined;
    if (!branch || !branch.is_active) {
      const activeBranches = Array.from(this.branches.values()).filter(b => b.is_active);
      if (activeBranches.length > 0) {
        branch = activeBranches[0];
        branchId = branch.id;
      } else {
        throw new Error('Assigned kiosk branch is not active or invalid.');
      }
    }

    const outOfStockIds: string[] = [];
    const branchStockMap = new Map<string, number>();
    for (const inv of this.branchInventory.values()) {
      if (inv.branch_id === branch.id) {
        branchStockMap.set(inv.ingredient_id, inv.current_stock);
      }
    }

    const activeProducts = Array.from(this.products.values())
      .filter(p => p.is_active !== false)
      .map(p => {
        const recipe = this.getRecipeByProductId(p.id);
        let isOutOfStock = false;

        // Check if item is disabled globally or at this branch
        if (p.is_available === false || (p as any).is_sold_out === true) {
          isOutOfStock = true;
        } else if (p.unavailable_branches && p.unavailable_branches.includes(branch!.id)) {
          isOutOfStock = true;
        }

        const prodNameLower = (p.product_name || '').toLowerCase();

        // 1. Tagpuan Burger & Cheeseburgers: require Beef Patty, Burger Bun, Cheese Slice
        if (!isOutOfStock && prodNameLower.includes('burger')) {
          const pattyIng = Array.from(this.ingredients.values()).find(i => i.item_name.toLowerCase().includes('patt') || i.item_code === 'ING-01');
          const bunIng = Array.from(this.ingredients.values()).find(i => i.item_name.toLowerCase().includes('patty bread') || i.item_name.toLowerCase().includes('bun') || i.item_code === 'ING-07');
          const cheeseIng = Array.from(this.ingredients.values()).find(i => i.item_name.toLowerCase().includes('cheese') && i.category === 'DAIRY');
          if (pattyIng && (branchStockMap.get(pattyIng.id) || 0) <= 0) isOutOfStock = true;
          if (bunIng && (branchStockMap.get(bunIng.id) || 0) <= 0) isOutOfStock = true;
          if ((prodNameLower.includes('cheese') || prodNameLower.includes('tagpuan')) && cheeseIng && (branchStockMap.get(cheeseIng.id) || 0) <= 0) isOutOfStock = true;
        }

        // 2. Siomai Rice Meal: requires 4x Pork Siomai, 1x Rice cup portion
        if (!isOutOfStock && prodNameLower.includes('siomai')) {
          const siomaiIng = Array.from(this.ingredients.values()).find(i => i.item_name.toLowerCase().includes('siomai') || i.item_code === 'ING-06');
          const riceIng = Array.from(this.ingredients.values()).find(i => i.item_name.toLowerCase().includes('rice') || i.item_code === 'ING-12');
          if (siomaiIng && (branchStockMap.get(siomaiIng.id) || 0) < 4) isOutOfStock = true;
          if ((prodNameLower.includes('rice') || prodNameLower.includes('meal')) && riceIng && (branchStockMap.get(riceIng.id) || 0) <= 0) isOutOfStock = true;
        }

        // 3. Jumbo Hotdog: requires Hotdog, Hotdog Bun
        if (!isOutOfStock && prodNameLower.includes('hotdog')) {
          const hotdogIng = Array.from(this.ingredients.values()).find(i => i.item_name.toLowerCase() === 'hotdog' || i.item_code === 'ING-02');
          const hotdogBunIng = Array.from(this.ingredients.values()).find(i => i.item_name.toLowerCase().includes('hotdog bread') || i.item_code === 'ING-08');
          if (hotdogIng && (branchStockMap.get(hotdogIng.id) || 0) <= 0) isOutOfStock = true;
          if (hotdogBunIng && (branchStockMap.get(hotdogBunIng.id) || 0) <= 0) isOutOfStock = true;
        }

        // 4. Check recipe ingredients if defined
        if (!isOutOfStock && recipe && recipe.items && recipe.items.length > 0) {
          for (const rItem of recipe.items) {
            const currentStock = branchStockMap.get(rItem.ingredient_id);
            if (currentStock !== undefined && currentStock < rItem.quantity_consumed) {
              isOutOfStock = true;
              break;
            }
          }
        }
        if (isOutOfStock) {
          outOfStockIds.push(p.id);
        }
        return {
          ...p,
          name: p.product_name,
          price: p.selling_price,
          is_out_of_stock: isOutOfStock,
          is_sold_out: isOutOfStock,
          has_recipe: Boolean(recipe && recipe.items && recipe.items.length > 0)
        };
      })
      .sort((a, b) => {
        if (a.display_order !== undefined && b.display_order !== undefined && a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        const catA = a.category || '';
        const catB = b.category || '';
        if (catA !== catB) return catA.localeCompare(catB);
        return a.selling_price - b.selling_price;
      });

    const activeModifierGroups = Array.from(this.modifierGroups.values());
    const paymentConfigs = this.getPaymentConfigurations(branch.id);
    const catList = this.getCategories().map(c => c.name);
    const productCategories = Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean))) as string[];
    const mergedCategories = Array.from(new Set([...catList, ...productCategories]));

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        is_active: branch.is_active
      },
      categories: mergedCategories.length > 0 ? mergedCategories : PRODUCT_CATEGORIES,
      products: activeProducts,
      modifierGroups: activeModifierGroups,
      paymentConfigs,
      outOfStockProductIds: outOfStockIds
    };
  }

  public createKioskOrder(input: CreateKioskOrderInput): Order {
    if (!input.branch_id) {
      throw new Error('Branch context is required for self-ordering.');
    }

    const branch = this.branches.get(input.branch_id);
    if (!branch || !branch.is_active) {
      throw new Error('Assigned kiosk branch is not active or invalid.');
    }

    if (input.idempotency_key) {
      if (this.processedIdempotencyKeys.has(input.idempotency_key)) {
        throw new Error('This order has already been submitted.');
      }
      this.processedIdempotencyKeys.add(input.idempotency_key);
    }

    // Authoritative Cart & Inventory Pre-validation
    const validation = this.validateOrderItems(input.branch_id, input.items);
    if (!validation.valid) {
      throw new Error(validation.error || 'One or more items are currently unavailable.');
    }

    const orderId = crypto.randomUUID();
    const orderNumber = this.generateOrderNumber();
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = [];

    for (const item of validation.itemsBreakdown) {
      const orderItemId = crypto.randomUUID();
      const mods: OrderItemModifier[] = (item.modifiers || []).map((m: any) => ({
        ...m,
        id: crypto.randomUUID(),
        order_item_id: orderItemId
      }));

      mods.forEach(m => this.orderItemModifiers.set(m.id, m));

      const orderItem: OrderItem = {
        id: orderItemId,
        order_id: orderId,
        branch_id: branch.id,
        product_id: item.productId,
        product_code: item.productCode,
        product_name: item.productName,
        product_image: item.productImage || null,
        category: item.category,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.itemSubtotal,
        notes: item.notes,
        modifiers: mods,
        created_at: now
      };

      this.orderItems.set(orderItem.id, orderItem);
      orderItems.push(orderItem);
    }

    const subtotal = validation.calculatedSubtotal;
    const tableNum = input.table_number ? input.table_number.trim() : null;
    const isMobile = !!input.is_mobile_order || !!tableNum;
    const diningText = tableNum
      ? `[Table ${tableNum}] • Mobile Dine-In`
      : (input.dining_option === 'TAKE_OUT' ? '[TAKE OUT]' : '[DINE IN]');

    const combinedNotes = [
      diningText,
      input.customer_name ? `Customer: ${input.customer_name}` : '',
      input.customer_phone ? `Phone: ${input.customer_phone}` : '',
      input.intended_payment_method ? `Intended Pay: ${input.intended_payment_method}` : '',
      input.notes
    ].filter(Boolean).join(' | ') || null;

    const order: Order = {
      id: orderId,
      order_number: orderNumber,
      branch_id: branch.id,
      branch_name: branch.name,
      cashier_id: 'KIOSK',
      cashier_name: tableNum ? `Table ${tableNum} (Mobile)` : 'Self-Ordering Kiosk',
      source: (input.source || 'KIOSK') as OrderSource,
      status: 'PENDING_PAYMENT',
      items: orderItems,
      subtotal,
      discount_type: null,
      discount_amount: 0,
      discount_reason: null,
      discounted_by: null,
      total: subtotal,
      notes: combinedNotes,
      payment: null,
      table_number: tableNum,
      is_mobile_order: isMobile,
      kitchen_status: 'NEW',
      kitchen_received_at: now,
      customer_name: input.customer_name ? input.customer_name.trim() : null,
      customer_phone: input.customer_phone ? input.customer_phone.trim() : null,
      created_at: now,
      updated_at: now
    };

    this.orders.set(order.id, order);

    this.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      from_status: null,
      to_status: 'PENDING_PAYMENT',
      changed_by: 'KIOSK',
      changed_by_name: tableNum ? `Table ${tableNum} Customer` : 'Self-Ordering Customer',
      reason: tableNum ? `Table QR Order placed via Mobile for Table ${tableNum}` : 'Order placed via Customer Self-Ordering Kiosk',
      created_at: now
    });

    this.createAuditLog({
      user_id: 'KIOSK',
      user_email: 'kiosk@tagpuan.system',
      role: 'CASHIER',
      branch_id: branch.id,
      action: 'ORDER_CREATED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        branch_name: branch.name,
        source: tableNum ? 'TABLE_QR_MOBILE' : 'SELF_ORDERING',
        table_number: tableNum,
        total: order.total,
        dining_option: input.dining_option || 'DINE_IN',
        customer_name: input.customer_name || null,
        customer_phone: input.customer_phone || null,
        item_count: orderItems.length,
        items: orderItems.map(i => `${i.quantity}x ${i.product_name}`)
      }
    });

    // If client requested instant kiosk/mobile payment (e.g. GCash/Maya online flow)
    if (input.pay_now && input.intended_payment_method) {
      try {
        const paymentResult = this.processPayment(
          'CASHIER',
          'KIOSK',
          'kiosk@tagpuan.system',
          branch.id,
          {
            order_id: order.id,
            payment_method: input.intended_payment_method,
            amount_received: order.total,
            reference_number: input.reference_number,
            customer_name: input.customer_name,
            customer_phone: input.customer_phone
          }
        );
        paymentResult.order.table_number = tableNum;
        paymentResult.order.is_mobile_order = isMobile;
        this.saveSnapshot();
        return paymentResult.order;
      } catch (payErr: any) {
        console.error('Kiosk auto-pay error:', payErr);
        // Returns the order in PENDING_PAYMENT if auto-pay failed so counter can collect
      }
    } else {
      // Unpaid pending ticket ("Pay at Counter / Cashier")
      // Trigger recipe-level ingredient deduction immediately to commit branch stock and alert KDS
      try {
        this.deductRecipeInventoryForOrder(order, 'KIOSK', `mobile-${tableNum || 'table'}@tagpuan.kiosk`, 'CASHIER');
      } catch (invErr: any) {
        console.error('Kiosk recipe inventory deduction error:', invErr);
      }
    }

    this.saveSnapshot();
    return order;
  }

  public getKioskOrderByNumber(orderNumber: string): Order | undefined {
    return Array.from(this.orders.values()).find(
      o => o.order_number.toUpperCase() === orderNumber.toUpperCase()
    );
  }

  public getKioskOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  public processKioskPayment(
    orderId: string,
    paymentMethod: PaymentMethod,
    amountReceived?: number,
    referenceNumber?: string,
    customerName?: string,
    customerPhone?: string,
    idempotencyKey?: string
  ) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');
    return this.processPayment(
      'CASHIER',
      'KIOSK',
      'kiosk@tagpuan.system',
      order.branch_id,
      {
        order_id: order.id,
        payment_method: paymentMethod,
        amount_received: amountReceived || order.total,
        reference_number: referenceNumber,
        customer_name: customerName || order.customer_name || undefined,
        customer_phone: customerPhone || order.customer_phone || undefined,
        idempotency_key: idempotencyKey
      }
    );
  }

  public cancelKioskOrder(orderId: string, reason?: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');

    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error(`Cannot cancel order in ${order.status} state.`);
    }

    const now = new Date().toISOString();
    const prevStatus = order.status;
    order.status = 'CANCELLED';
    order.notes = [order.notes, `Cancelled by customer: ${reason || 'Customer aborted session'}`].filter(Boolean).join(' | ');
    order.updated_at = now;

    this.orders.set(order.id, order);

    this.orderStatusHistory.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      from_status: prevStatus,
      to_status: 'CANCELLED',
      changed_by: 'KIOSK',
      changed_by_name: 'Self-Ordering Customer',
      reason: reason || 'Customer cancelled on kiosk',
      created_at: now
    });

    this.createAuditLog({
      user_id: 'KIOSK',
      user_email: 'kiosk@tagpuan.system',
      role: 'CASHIER',
      branch_id: order.branch_id,
      action: 'ORDER_CANCELLED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        reason: reason || 'Customer cancelled on kiosk',
        source: 'SELF_ORDERING'
      }
    });

    this.saveSnapshot();
    return order;
  }

  // ==========================================
  // PHASE 6: KITCHEN DISPLAY SYSTEM (KDS)
  // ==========================================

  /**
   * Retrieves active orders for kitchen display with strict RLS enforcement.
   * Kitchen users only see orders for their assigned branch.
   */
  public getKitchenOrders(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters?: {
      branch_id?: string;
      kitchen_status?: string;
      search?: string;
    }
  ): Order[] {
    let targetBranchId: string | null = actorBranchId;

    if (actorRole === 'OWNER') {
      if (filters?.branch_id && filters.branch_id !== 'ALL') {
        targetBranchId = filters.branch_id;
      } else {
        targetBranchId = null; // Owner can view all branches
      }
    } else {
      // Non-owners (KITCHEN, CASHIER, MANAGER) are strictly bound to their assigned branch
      if (!actorBranchId) {
        throw new Error('Unauthorized: Kitchen terminal must have an assigned branch.');
      }
      if (filters?.branch_id && filters.branch_id !== 'ALL' && filters.branch_id !== actorBranchId) {
        throw new Error('Forbidden: Kitchen staff cannot access other branch orders.');
      }
      targetBranchId = actorBranchId;
    }

    const allOrders = Array.from(this.orders.values());
    
    // Filter to paid/authorized orders or active mobile table orders with kitchen status (NEW, PREPARING, READY)
    let filtered = allOrders.filter(order => {
      // Must be paid/authorized OR have active kitchen status from mobile/kiosk table order
      const hasActiveKitchenStatus = order.kitchen_status === 'NEW' || order.kitchen_status === 'PREPARING' || order.kitchen_status === 'READY';
      if (order.status !== 'PAID' && order.status !== 'COMPLETED' && !hasActiveKitchenStatus) {
        return false;
      }

      // Branch match
      if (targetBranchId && order.branch_id !== targetBranchId) {
        return false;
      }

      // Must have active kitchen status (not already completed/dismissed unless explicitly filtered)
      const kStatus = order.kitchen_status || (order.status === 'PAID' ? 'NEW' : null);
      if (!kStatus) return false;

      if (filters?.kitchen_status && filters.kitchen_status !== 'ALL') {
        if (filters.kitchen_status === 'DELAYED') {
          const now = Date.now();
          const received = new Date(order.kitchen_received_at || order.created_at).getTime();
          const elapsedMins = (now - received) / 60000;
          if (elapsedMins < 15 || kStatus === 'DELIVERED' || kStatus === 'COMPLETED') {
            return false;
          }
        } else if (kStatus !== filters.kitchen_status) {
          return false;
        }
      } else {
        // By default on the live board, only show active orders (NEW, PREPARING, and READY)
        if (!['NEW', 'PREPARING', 'READY'].includes(kStatus)) {
          return false;
        }
      }

      // Search filter (Order # or Item names)
      if (filters?.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchesNumber = order.order_number.toLowerCase().includes(query);
        const matchesItem = order.items.some(i => i.product_name.toLowerCase().includes(query));
        if (!matchesNumber && !matchesItem) return false;
      }

      return true;
    });

    // Sort by kitchen_received_at ASC (Oldest first so kitchen prepares oldest orders first)
    filtered.sort((a, b) => {
      const timeA = new Date(a.kitchen_received_at || a.created_at).getTime();
      const timeB = new Date(b.kitchen_received_at || b.created_at).getTime();
      return timeA - timeB;
    });

    // Populate branch names and latest product images for active kitchen prep recognition
    return filtered.map(order => {
      const branch = this.branches.get(order.branch_id);
      const itemsWithImages = (order.items || []).map(item => {
        const prod = this.products.get(item.product_id);
        return {
          ...item,
          product_image: prod?.product_image || item.product_image || null
        };
      });
      return {
        ...order,
        branch_name: branch ? branch.name : order.branch_name || 'Assigned Branch',
        kitchen_status: order.kitchen_status || 'NEW',
        kitchen_received_at: order.kitchen_received_at || order.created_at,
        items: itemsWithImages
      };
    });
  }

  /**
   * Transition order from NEW -> PREPARING
   */
  public startKitchenOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    orderId: string
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');

    if (actorRole !== 'OWNER' && actorBranchId && order.branch_id !== actorBranchId) {
      throw new Error('Forbidden: Cannot start order for a different branch.');
    }

    if (order.status === 'CANCELLED' || order.status === 'VOIDED') {
      throw new Error('Cannot prepare a cancelled or voided order.');
    }

    const now = new Date().toISOString();
    const prevStatus = order.kitchen_status || 'NEW';
    const actorProfile = this.profiles.get(actorId);
    const actorName = actorProfile ? actorProfile.full_name : actorEmail;

    order.kitchen_status = 'PREPARING';
    order.started_at = order.started_at || now;
    order.started_by = actorId;
    order.started_by_name = actorName;
    order.updated_at = now;

    this.orders.set(order.id, order);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: order.branch_id,
      action: 'KITCHEN_STARTED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        previous_kitchen_status: prevStatus,
        new_kitchen_status: 'PREPARING',
        started_at: now,
        started_by: actorName
      }
    });

    this.saveSnapshot();
    return order;
  }

  /**
   * Transition order from PREPARING (or NEW) -> READY
   */
  public markKitchenOrderReady(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    orderId: string
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');

    if (actorRole !== 'OWNER' && actorBranchId && order.branch_id !== actorBranchId) {
      throw new Error('Forbidden: Cannot update order for a different branch.');
    }

    const now = new Date().toISOString();
    const prevStatus = order.kitchen_status || 'PREPARING';
    const actorProfile = this.profiles.get(actorId);
    const actorName = actorProfile ? actorProfile.full_name : actorEmail;

    order.kitchen_status = 'READY';
    order.ready_at = now;
    order.completed_by = actorId;
    order.completed_by_name = actorName;
    order.updated_at = now;

    this.orders.set(order.id, order);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: order.branch_id,
      action: 'KITCHEN_READY',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        previous_kitchen_status: prevStatus,
        new_kitchen_status: 'READY',
        ready_at: now,
        ready_by: actorName
      }
    });

    this.saveSnapshot();
    return order;
  }

  /**
   * Transition order to DELIVERED (Customer handoff / removed from active kitchen queue)
   */
  public deliverKitchenOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    orderId: string
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');

    if (actorRole !== 'OWNER' && actorBranchId && order.branch_id !== actorBranchId) {
      throw new Error('Forbidden: Cannot deliver order for a different branch.');
    }

    const now = new Date().toISOString();
    const prevStatus = order.kitchen_status || 'READY';
    const actorProfile = this.profiles.get(actorId);
    const actorName = actorProfile ? actorProfile.full_name : actorEmail;

    order.kitchen_status = 'DELIVERED';
    order.delivered_at = now;
    order.delivered_by = actorId;
    order.delivered_by_name = actorName;
    order.completed_at = now;
    order.completed_by = actorId;
    order.completed_by_name = actorName;
    order.status = 'COMPLETED';
    order.updated_at = now;

    this.orders.set(order.id, order);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: order.branch_id,
      action: 'KITCHEN_DELIVERED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        previous_kitchen_status: prevStatus,
        new_kitchen_status: 'DELIVERED',
        delivered_at: now,
        delivered_by: actorName
      }
    });

    this.saveSnapshot();
    return order;
  }

  /**
   * Mark order as COMPLETED / DELIVERED
   */
  public completeKitchenOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    orderId: string
  ): Order {
    return this.deliverKitchenOrder(actorRole, actorId, actorEmail, actorBranchId, orderId);
  }

  /**
   * Recall order back to NEW or PREPARING if clicked in error
   */
  public recallKitchenOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    orderId: string,
    targetStatus: 'NEW' | 'PREPARING'
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found.');

    if (actorRole !== 'OWNER' && actorBranchId && order.branch_id !== actorBranchId) {
      throw new Error('Forbidden: Cannot recall order for a different branch.');
    }

    const now = new Date().toISOString();
    const prevStatus = order.kitchen_status;

    order.kitchen_status = targetStatus;
    if (targetStatus === 'NEW') {
      order.started_at = null;
      order.started_by = null;
      order.started_by_name = null;
      order.ready_at = null;
    } else if (targetStatus === 'PREPARING') {
      order.ready_at = null;
      order.completed_at = null;
    }
    order.updated_at = now;

    this.orders.set(order.id, order);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: order.branch_id,
      action: targetStatus === 'NEW' ? 'KITCHEN_ORDER_RECEIVED' : 'KITCHEN_STARTED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: {
        order_number: order.order_number,
        previous_kitchen_status: prevStatus,
        new_kitchen_status: targetStatus,
        recalled_by: actorEmail,
        recalled_at: now
      }
    });

    this.saveSnapshot();
    return order;
  }

  /**
   * Returns kitchen history logs for reporting & average prep time analysis
   */
  public getKitchenHistory(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters?: {
      branch_id?: string;
      limit?: number;
    }
  ): KitchenOrderHistoryItem[] {
    let targetBranchId: string | null = actorBranchId;

    if (actorRole === 'OWNER') {
      if (filters?.branch_id && filters.branch_id !== 'ALL') {
        targetBranchId = filters.branch_id;
      } else {
        targetBranchId = null;
      }
    } else {
      if (!actorBranchId) return [];
      targetBranchId = actorBranchId;
    }

    const allOrders = Array.from(this.orders.values());
    const matched = allOrders.filter(o => {
      if (targetBranchId && o.branch_id !== targetBranchId) return false;
      return o.kitchen_received_at || o.kitchen_status;
    });

    // Sort newest first
    matched.sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.updated_at || b.created_at).getTime();
      return timeB - timeA;
    });

    const limit = filters?.limit || 100;
    const sliced = matched.slice(0, limit);

    return sliced.map(o => {
      const branch = this.branches.get(o.branch_id);
      const receivedMs = new Date(o.kitchen_received_at || o.created_at).getTime();
      const startedMs = o.started_at ? new Date(o.started_at).getTime() : null;
      const readyMs = o.ready_at ? new Date(o.ready_at).getTime() : null;
      const completedMs = o.completed_at ? new Date(o.completed_at).getTime() : null;

      let prepDuration: number | null = null;
      if (readyMs && startedMs) {
        prepDuration = Math.max(0, Math.round((readyMs - startedMs) / 1000));
      } else if (readyMs) {
        prepDuration = Math.max(0, Math.round((readyMs - receivedMs) / 1000));
      }

      let totalDuration: number | null = null;
      if (completedMs) {
        totalDuration = Math.max(0, Math.round((completedMs - receivedMs) / 1000));
      } else if (readyMs) {
        totalDuration = Math.max(0, Math.round((readyMs - receivedMs) / 1000));
      }

      const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ');

      return {
        order_id: o.id,
        order_number: o.order_number,
        branch_id: o.branch_id,
        branch_name: branch ? branch.name : o.branch_name || 'Assigned Branch',
        source: o.source,
        dining_option: o.notes?.includes('Take Out') || o.notes?.includes('TAKE_OUT') ? 'Take Out' : 'Dine In',
        items_summary: itemsSummary,
        item_count: o.items.reduce((acc, i) => acc + i.quantity, 0),
        kitchen_received_at: o.kitchen_received_at || o.created_at,
        started_at: o.started_at || null,
        ready_at: o.ready_at || null,
        completed_at: o.completed_at || null,
        started_by_name: o.started_by_name || null,
        completed_by_name: o.completed_by_name || null,
        preparation_duration_seconds: prepDuration,
        total_duration_seconds: totalDuration,
        status: o.kitchen_status || 'NEW'
      };
    });
  }

  /**
   * Aggregates live kitchen statistics
   */
  public getKitchenStats(
    actorRole: UserRole,
    actorBranchId: string | null,
    branchId?: string
  ): KitchenStats {
    const orders = this.getKitchenOrders(actorRole, actorBranchId, { branch_id: branchId });
    const now = Date.now();

    let newCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let criticalCount = 0;

    orders.forEach(o => {
      const status = o.kitchen_status || 'NEW';
      if (status === 'NEW') newCount++;
      else if (status === 'PREPARING') preparingCount++;
      else if (status === 'READY') readyCount++;

      // Check critical timer: 15+ minutes in NEW or PREPARING
      if (status === 'NEW' || status === 'PREPARING') {
        const received = new Date(o.kitchen_received_at || o.created_at).getTime();
        const elapsedMinutes = (now - received) / 60000;
        if (elapsedMinutes >= 15) {
          criticalCount++;
        }
      }
    });

    // Calculate average prep time from recent ready/completed orders
    const history = this.getKitchenHistory(actorRole, actorBranchId, { branch_id: branchId, limit: 30 });
    const durations = history
      .map(h => h.total_duration_seconds)
      .filter((d): d is number => typeof d === 'number' && d > 0);

    const avgMinutes = durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length / 60) * 10) / 10
      : 8.5; // Default standard 8.5 minutes

    return {
      total_active: orders.length,
      new_count: newCount,
      preparing_count: preparingCount,
      ready_count: readyCount,
      critical_count: criticalCount,
      average_prep_time_minutes: avgMinutes
    };
  }

  /**
   * Seed demo kitchen orders if no active orders exist for Narra Branch (for immediate testing)
   */
  public seedDemoKitchenOrdersIfEmpty(): void {
    const narraBranch = Array.from(this.branches.values()).find(b => b.name.includes('Narra')) || Array.from(this.branches.values())[0];
    if (!narraBranch) return;

    const existingNarra = Array.from(this.orders.values()).filter(
      o => o.branch_id === narraBranch.id && ['NEW', 'PREPARING'].includes(o.kitchen_status || '')
    );

    if (existingNarra.length === 0) {
      const now = Date.now();
      const burgerProduct = Array.from(this.products.values()).find(p => p.product_name.includes('Burger')) || Array.from(this.products.values())[0];
      const siomaiProduct = Array.from(this.products.values()).find(p => p.product_name.includes('Siomai')) || Array.from(this.products.values())[1];
      const friesProduct = Array.from(this.products.values()).find(p => p.product_name.includes('Fries')) || Array.from(this.products.values())[2];

      if (!burgerProduct) return;

      // 1. Order 1: 4 mins ago (NORMAL / HAPPY MOOD)
      const order1Id = crypto.randomUUID();
      const time1 = new Date(now - 4 * 60 * 1000).toISOString();
      const order1: Order = {
        id: order1Id,
        order_number: `TAG-${Math.floor(100000 + Math.random() * 900000)}`,
        branch_id: narraBranch.id,
        branch_name: narraBranch.name,
        cashier_id: 'emp-cashier-narra',
        cashier_name: 'Narra Cashier',
        source: 'SELF_ORDERING',
        status: 'PAID',
        items: [
          {
            id: crypto.randomUUID(),
            order_id: order1Id,
            product_id: burgerProduct.id,
            product_code: burgerProduct.product_code,
            product_name: burgerProduct.product_name,
            quantity: 2,
            unit_price: burgerProduct.selling_price,
            subtotal: burgerProduct.selling_price * 2,
            notes: 'Dine In • Buy 1 Take 1: Burger 1 (Spicy), Burger 2 (No Ketchup)',
            modifiers: [],
            created_at: time1
          }
        ],
        subtotal: burgerProduct.selling_price * 2,
        discount_amount: 0,
        total: burgerProduct.selling_price * 2,
        notes: 'Dine In • Self-Ordering Kiosk Customer',
        kitchen_status: 'NEW',
        kitchen_received_at: time1,
        created_at: time1,
        updated_at: time1
      };
      this.orders.set(order1.id, order1);

      // 2. Order 2: 11 mins ago (WARNING MOOD 10-15m)
      if (siomaiProduct) {
        const order2Id = crypto.randomUUID();
        const time2 = new Date(now - 11 * 60 * 1000).toISOString();
        const order2: Order = {
          id: order2Id,
          order_number: `TAG-${Math.floor(100000 + Math.random() * 900000)}`,
          branch_id: narraBranch.id,
          branch_name: narraBranch.name,
          cashier_id: 'emp-cashier-narra',
          cashier_name: 'Narra Cashier',
          source: 'POS',
          status: 'PAID',
          items: [
            {
              id: crypto.randomUUID(),
              order_id: order2Id,
              product_id: siomaiProduct.id,
              product_code: siomaiProduct.product_code,
              product_name: siomaiProduct.product_name,
              quantity: 1,
              unit_price: siomaiProduct.selling_price,
              subtotal: siomaiProduct.selling_price,
              notes: 'Mix & Match: 3 Selections (Patty, Egg, Siomai) • Extra Chili Garlic',
              modifiers: [],
              created_at: time2
            }
          ],
          subtotal: siomaiProduct.selling_price,
          discount_amount: 0,
          total: siomaiProduct.selling_price,
          notes: 'Take Out • POS Counter',
          kitchen_status: 'PREPARING',
          kitchen_received_at: time2,
          started_at: new Date(now - 9 * 60 * 1000).toISOString(),
          started_by_name: 'Narra Chef',
          created_at: time2,
          updated_at: time2
        };
        this.orders.set(order2.id, order2);
      }

      // 3. Order 3: 16 mins ago (CRITICAL / ANGRY MOOD 15m+)
      if (friesProduct) {
        const order3Id = crypto.randomUUID();
        const time3 = new Date(now - 16.5 * 60 * 1000).toISOString();
        const order3: Order = {
          id: order3Id,
          order_number: `TAG-${Math.floor(100000 + Math.random() * 900000)}`,
          branch_id: narraBranch.id,
          branch_name: narraBranch.name,
          cashier_id: 'emp-cashier-narra',
          cashier_name: 'Narra Cashier',
          source: 'SELF_ORDERING',
          status: 'PAID',
          items: [
            {
              id: crypto.randomUUID(),
              order_id: order3Id,
              product_id: friesProduct.id,
              product_code: friesProduct.product_code,
              product_name: friesProduct.product_name,
              quantity: 1,
              unit_price: friesProduct.selling_price,
              subtotal: friesProduct.selling_price,
              notes: 'Size: Jumbo • Flavor: Sour Cream • Salt Only',
              modifiers: [],
              created_at: time3
            }
          ],
          subtotal: friesProduct.selling_price,
          discount_amount: 0,
          total: friesProduct.selling_price,
          notes: 'Dine In • Table 4',
          kitchen_status: 'NEW',
          kitchen_received_at: time3,
          created_at: time3,
          updated_at: time3
        };
        this.orders.set(order3.id, order3);
      }

      this.saveSnapshot();
    }
  }

  // ==========================================
  // PHASE 7: SEEDING & FOUNDATIONS
  // ==========================================
  private seedPhase7Data(): void {
    const now = new Date().toISOString();

    // 1. Seed initial suppliers
    if (this.suppliers.size === 0) {
      INITIAL_SUPPLIERS.forEach(s => {
        const id = crypto.randomUUID();
        const supplier: Supplier = {
          ...s,
          id,
          created_at: now,
          updated_at: now
        };
        this.suppliers.set(id, supplier);
      });
    }

    // 2. Seed initial Central Commissary Stock
    if (this.warehouseStock.size === 0) {
      this.ingredients.forEach(ing => {
        const ratio = INITIAL_COMMISSARY_STOCK_RATIOS[ing.item_code] || 2500;
        this.warehouseStock.set(ing.id, ratio);
      });
    }

    // 3. Seed sample Warehouseman staff account if not present
    const warehouseEmail = 'warehouseman@tagpuan.ph';
    const existingWarehouseman = this.getProfileByEmail(warehouseEmail);
    if (!existingWarehouseman) {
      const userId = crypto.randomUUID();
      const authUserId = crypto.randomUUID();
      const salt = this.generateSalt();
      const passwordHash = this.hashPassword('TagpuanStaff2026!', salt);

      const profile: Profile = {
        id: userId,
        auth_user_id: authUserId,
        full_name: 'Danilo Castro',
        email: warehouseEmail,
        role: 'WAREHOUSEMAN',
        branch_id: null,
        branch_name: CENTRAL_WAREHOUSE_NAME,
        is_active: true,
        created_at: now,
        updated_at: now
      };

      const credential: UserCredential = {
        id: userId,
        auth_user_id: authUserId,
        email: warehouseEmail,
        password_hash: passwordHash,
        salt,
        reset_token: null,
        reset_token_expires: null
      };

      this.profiles.set(userId, profile);
      this.credentials.set(userId, credential);

      const emp: Employee = {
        id: crypto.randomUUID(),
        user_id: userId,
        employee_code: 'EMP-007',
        full_name: 'Danilo Castro',
        email: warehouseEmail,
        role: 'WAREHOUSEMAN',
        branch_id: null,
        branch_name: CENTRAL_WAREHOUSE_NAME,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      };
      this.employees.set(emp.id, emp);
    }

    // 4. Seed sample initial Purchase Order (PO-000001) if empty
    if (this.purchaseOrders.size === 0 && this.suppliers.size > 0 && this.ingredients.size > 0) {
      const supplier = Array.from(this.suppliers.values())[0];
      const pattyIng = Array.from(this.ingredients.values()).find(i => i.item_code === 'ING-PATTY') || Array.from(this.ingredients.values())[0];
      const bunIng = Array.from(this.ingredients.values()).find(i => i.item_code === 'ING-BUN') || Array.from(this.ingredients.values())[1];

      const poId = crypto.randomUUID();
      const poNumber = `PO-${String(this.purchaseOrderSequence++).padStart(6, '0')}`;
      const items: PurchaseOrderItem[] = [
        {
          id: crypto.randomUUID(),
          po_id: poId,
          ingredient_id: pattyIng.id,
          ingredient_name: pattyIng.item_name,
          item_code: pattyIng.item_code,
          unit: pattyIng.unit,
          quantity: 2000,
          unit_cost: pattyIng.cost_price,
          total_cost: 2000 * pattyIng.cost_price,
          received_quantity: 2000
        },
        {
          id: crypto.randomUUID(),
          po_id: poId,
          ingredient_id: bunIng.id,
          ingredient_name: bunIng.item_name,
          item_code: bunIng.item_code,
          unit: bunIng.unit,
          quantity: 2000,
          unit_cost: bunIng.cost_price,
          total_cost: 2000 * bunIng.cost_price,
          received_quantity: 2000
        }
      ];

      const subtotal = items.reduce((sum, item) => sum + item.total_cost, 0);

      const samplePO: PurchaseOrder = {
        id: poId,
        po_number: poNumber,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        order_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        status: 'RECEIVED',
        items,
        subtotal,
        total_cost: subtotal,
        notes: 'Initial Commissary Bulk Stock intake from San Miguel Foods',
        created_by: 'Tagpuan Admin Owner',
        created_by_name: 'Tagpuan Admin Owner',
        approved_by: 'Tagpuan Admin Owner',
        approved_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        received_by: 'Danilo Castro (Warehouseman)',
        received_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString()
      };
      this.purchaseOrders.set(poId, samplePO);
    }

    // 5. Seed sample Request Order (REQ-000001) for Narra branch if empty
    if (this.requestOrders.size === 0 && this.branches.size > 0 && this.ingredients.size > 0) {
      const narraBranch = Array.from(this.branches.values()).find(b => b.name === 'Narra') || Array.from(this.branches.values())[0];
      const pattyIng = Array.from(this.ingredients.values()).find(i => i.item_code === 'ING-PATTY') || Array.from(this.ingredients.values())[0];
      const bunIng = Array.from(this.ingredients.values()).find(i => i.item_code === 'ING-BUN') || Array.from(this.ingredients.values())[1];

      const reqId = crypto.randomUUID();
      const reqNumber = `REQ-${String(this.requestOrderSequence++).padStart(6, '0')}`;

      const reqItems: RequestOrderItem[] = [
        {
          id: crypto.randomUUID(),
          request_id: reqId,
          ingredient_id: pattyIng.id,
          ingredient_name: pattyIng.item_name,
          item_code: pattyIng.item_code,
          unit: pattyIng.unit,
          requested_quantity: 60,
          approved_quantity: 60,
          prepared_quantity: 60,
          delivered_quantity: 60,
          received_quantity: 0,
          remaining_quantity: 60,
          status: 'PREPARED',
          notes: 'High demand weekend stock'
        },
        {
          id: crypto.randomUUID(),
          request_id: reqId,
          ingredient_id: bunIng.id,
          ingredient_name: bunIng.item_name,
          item_code: bunIng.item_code,
          unit: bunIng.unit,
          requested_quantity: 60,
          approved_quantity: 60,
          prepared_quantity: 60,
          delivered_quantity: 60,
          received_quantity: 0,
          remaining_quantity: 60,
          status: 'PREPARED',
          notes: 'Standard replenishment'
        }
      ];

      const sampleReq: RequestOrder = {
        id: reqId,
        request_number: reqNumber,
        branch_id: narraBranch.id,
        branch_name: narraBranch.name,
        requester_id: 'sample-mgr-narra',
        requester_name: 'Maria Santos (Manager)',
        requester_role: 'MANAGER',
        request_date: new Date(Date.now() - 4 * 3600000).toISOString(),
        priority: 'HIGH',
        status: 'OUT_FOR_DELIVERY',
        items: reqItems,
        notes: 'Low inventory detected after Friday lunch peak.',
        delivery_notes: 'Deliver before 4:00 PM',
        is_ai_generated: false,
        reviewed_by: 'Tagpuan Admin Owner',
        reviewed_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        approved_by: 'Tagpuan Admin Owner',
        approved_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        prepared_by: 'Danilo Castro',
        prepared_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 3600000).toISOString()
      };
      this.requestOrders.set(reqId, sampleReq);

      // Seed corresponding sample delivery (DEL-000001)
      const delId = crypto.randomUUID();
      const delNumber = `DEL-${String(this.deliverySequence++).padStart(6, '0')}`;
      const delItems: DeliveryItem[] = reqItems.map(item => ({
        id: crypto.randomUUID(),
        delivery_id: delId,
        request_item_id: item.id,
        ingredient_id: item.ingredient_id,
        ingredient_name: item.ingredient_name,
        item_code: item.item_code,
        unit: item.unit,
        requested_quantity: item.requested_quantity,
        approved_quantity: item.approved_quantity,
        prepared_quantity: item.prepared_quantity,
        delivered_quantity: item.delivered_quantity,
        received_quantity: 0,
        short_quantity: 0,
        rejected_quantity: 0,
        rejection_reason: null
      }));

      const sampleDelivery: Delivery = {
        id: delId,
        delivery_number: delNumber,
        request_id: reqId,
        request_number: reqNumber,
        source_warehouse_name: CENTRAL_WAREHOUSE_NAME,
        destination_branch_id: narraBranch.id,
        destination_branch_name: narraBranch.name,
        status: 'OUT_FOR_DELIVERY',
        items: delItems,
        prepared_by: 'Danilo Castro',
        prepared_by_name: 'Danilo Castro (Warehouseman)',
        prepared_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        driver_name: 'Ramon Valenzuela',
        vehicle_info: 'Tagpuan Reefer Van #3 (NBD-4592)',
        dispatched_by: 'Danilo Castro',
        dispatched_by_name: 'Danilo Castro',
        dispatched_at: new Date(Date.now() - 45 * 60000).toISOString(),
        estimated_arrival: '20-30 mins (En Route)',
        received_by: null,
        received_by_name: null,
        received_at: null,
        proof_image_url: null,
        receiving_notes: null,
        rejection_reason: null,
        status_history: [
          {
            id: crypto.randomUUID(),
            delivery_id: delId,
            from_status: null,
            to_status: 'PREPARING',
            changed_by: 'Danilo Castro',
            changed_by_name: 'Danilo Castro',
            notes: 'Prepared 60 Patties & 60 Buns from Commissary freezer',
            timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            delivery_id: delId,
            from_status: 'PREPARING',
            to_status: 'READY_FOR_PICKUP',
            changed_by: 'Danilo Castro',
            changed_by_name: 'Danilo Castro',
            notes: 'Packed in insulated chiller bins',
            timestamp: new Date(Date.now() - 90 * 60000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            delivery_id: delId,
            from_status: 'READY_FOR_PICKUP',
            to_status: 'OUT_FOR_DELIVERY',
            changed_by: 'Danilo Castro',
            changed_by_name: 'Danilo Castro',
            notes: 'Loaded into Reefer Van #3 with driver Ramon Valenzuela',
            timestamp: new Date(Date.now() - 45 * 60000).toISOString()
          }
        ],
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 45 * 60000).toISOString()
      };
      this.deliveries.set(delId, sampleDelivery);
    }

    this.saveSnapshot();
  }

  // ==========================================
  // PHASE 7: SUPPLIERS & PURCHASING METHODS
  // ==========================================
  public getSuppliers(): Supplier[] {
    return Array.from(this.suppliers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  public createSupplier(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      supplier_code?: string;
      name: string;
      contact_person?: string;
      contact_number?: string;
      email?: string;
      address?: string;
    }
  ): Supplier {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can add suppliers.');
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Supplier name is required.');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const code = data.supplier_code || `SUP-${String(this.suppliers.size + 1).padStart(3, '0')}`;

    const supplier: Supplier = {
      id,
      supplier_code: code,
      name: data.name.trim(),
      contact_person: data.contact_person?.trim(),
      contact_number: data.contact_number?.trim(),
      email: data.email?.trim(),
      address: data.address?.trim(),
      is_active: true,
      created_at: now,
      updated_at: now
    };

    this.suppliers.set(id, supplier);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'SUPPLIER',
      entity_id: id,
      metadata: { supplier_name: supplier.name, supplier_code: supplier.supplier_code }
    });

    this.saveSnapshot();
    return supplier;
  }

  public getPurchaseOrders(
    actorRole: UserRole,
    search?: string,
    status?: PurchaseOrderStatus
  ): PurchaseOrder[] {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN') {
      throw new Error('Unauthorized: Only an OWNER or WAREHOUSEMAN can access purchase orders.');
    }

    let list = Array.from(this.purchaseOrders.values());

    if (status) {
      list = list.filter(po => po.status === status);
    }

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        po =>
          po.po_number.toLowerCase().includes(q) ||
          po.supplier_name.toLowerCase().includes(q) ||
          (po.notes && po.notes.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getPurchaseOrderById(id: string): PurchaseOrder | null {
    return this.purchaseOrders.get(id) || null;
  }

  public createPurchaseOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: CreatePurchaseOrderInput
  ): PurchaseOrder {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can create Purchase Orders.');
    }

    const supplier = this.suppliers.get(data.supplier_id);
    if (!supplier) throw new Error('Supplier not found.');

    if (!data.items || data.items.length === 0) {
      throw new Error('At least one item is required for a purchase order.');
    }

    const now = new Date().toISOString();
    const poId = crypto.randomUUID();
    const poNumber = `PO-${String(this.purchaseOrderSequence++).padStart(6, '0')}`;

    const items: PurchaseOrderItem[] = data.items.map(item => {
      const ing = this.ingredients.get(item.ingredient_id);
      if (!ing) throw new Error(`Ingredient ${item.ingredient_id} not found.`);
      const qty = Number(item.quantity);
      const unitCost = Number(item.unit_cost ?? ing.cost_price);
      if (qty <= 0) throw new Error(`Quantity for ${ing.item_name} must be positive.`);

      return {
        id: crypto.randomUUID(),
        po_id: poId,
        ingredient_id: ing.id,
        ingredient_name: ing.item_name,
        item_code: ing.item_code,
        unit: ing.unit,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: Math.round(qty * unitCost * 100) / 100,
        received_quantity: 0
      };
    });

    const totalCost = items.reduce((sum, it) => sum + it.total_cost, 0);

    const po: PurchaseOrder = {
      id: poId,
      po_number: poNumber,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      order_date: now.split('T')[0],
      expected_delivery_date: data.expected_delivery_date || null,
      status: 'APPROVED',
      items,
      subtotal: totalCost,
      total_cost: totalCost,
      notes: data.notes || null,
      created_by: actorId,
      created_by_name: actorEmail,
      approved_by: actorId,
      approved_at: now,
      received_by: null,
      received_at: null,
      created_at: now,
      updated_at: now
    };

    this.purchaseOrders.set(poId, po);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'PURCHASE_ORDER_CREATED',
      entity_type: 'PURCHASE_ORDER',
      entity_id: poId,
      metadata: {
        po_number: poNumber,
        supplier_name: supplier.name,
        total_cost: totalCost,
        item_count: items.length
      }
    });

    this.createNotification({
      recipient_user_id: actorId,
      title: `Purchase Order Created: ${poNumber}`,
      message: `PO #${poNumber} for ${supplier.name} (₱${totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}) has been approved and issued.`,
      type: 'SUCCESS'
    });

    this.saveSnapshot();
    return po;
  }

  public approvePurchaseOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string
  ): PurchaseOrder {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can approve Purchase Orders.');
    }

    const po = this.purchaseOrders.get(id);
    if (!po) throw new Error('Purchase Order not found.');

    const now = new Date().toISOString();
    po.status = 'APPROVED';
    po.approved_by = actorId;
    po.approved_at = now;
    po.updated_at = now;

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'PURCHASE_ORDER_APPROVED',
      entity_type: 'PURCHASE_ORDER',
      entity_id: id,
      metadata: { po_number: po.po_number, supplier_name: po.supplier_name }
    });

    this.saveSnapshot();
    return po;
  }

  public receivePurchaseOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    itemsToReceive: { item_id: string; received_quantity: number }[]
  ): PurchaseOrder {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only an OWNER, WAREHOUSEMAN, or MANAGER can receive Purchase Orders.');
    }

    const po = this.purchaseOrders.get(id);
    if (!po) throw new Error('Purchase Order not found.');

    const now = new Date().toISOString();

    itemsToReceive.forEach(rec => {
      const poItem = po.items.find(i => i.id === rec.item_id);
      if (!poItem) return;

      const qty = Number(rec.received_quantity);
      if (isNaN(qty) || qty <= 0) return;

      poItem.received_quantity = Math.min(poItem.quantity, (poItem.received_quantity || 0) + qty);

      // Increase Commissary Warehouse Stock
      const currWarehouseStock = this.warehouseStock.get(poItem.ingredient_id) || 0;
      const newWarehouseStock = Math.round((currWarehouseStock + qty) * 100) / 100;
      this.warehouseStock.set(poItem.ingredient_id, newWarehouseStock);

      // Record immutable Inventory Transaction
      const tx: InventoryTransaction = {
        id: crypto.randomUUID(),
        branch_id: CENTRAL_WAREHOUSE_ID,
        branch_name: CENTRAL_WAREHOUSE_NAME,
        ingredient_id: poItem.ingredient_id,
        ingredient_name: poItem.ingredient_name,
        quantity: qty,
        transaction_type: 'PURCHASE_RECEIPT',
        previous_stock: currWarehouseStock,
        new_stock: newWarehouseStock,
        reason: `PO #${po.po_number} Receipt from ${po.supplier_name}`,
        user_id: actorId,
        user_email: actorEmail,
        created_at: now
      };
      this.inventoryTransactions.set(tx.id, tx);
    });

    // Check if fully or partially received
    const allFullyReceived = po.items.every(i => (i.received_quantity || 0) >= i.quantity);
    po.status = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    po.received_by = actorEmail;
    po.received_at = now;
    po.updated_at = now;

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'PURCHASE_RECEIPT',
      entity_type: 'PURCHASE_ORDER',
      entity_id: po.id,
      metadata: {
        po_number: po.po_number,
        supplier_name: po.supplier_name,
        status: po.status,
        received_by: actorEmail
      }
    });

    // Notify Owner
    this.createNotification({
      recipient_user_id: actorId,
      title: `PO Received: ${po.po_number}`,
      message: `Purchase order #${po.po_number} from ${po.supplier_name} received into Central Commissary Stock.`,
      type: 'SUCCESS'
    });

    this.saveSnapshot();
    return po;
  }

  // ==========================================
  // PHASE 7: BRANCH REQUEST ORDER METHODS
  // ==========================================
  public getRequestOrders(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters?: {
      branch_id?: string;
      status?: RequestOrderStatus;
      search?: string;
    }
  ): RequestOrder[] {
    let list = Array.from(this.requestOrders.values());

    // Strict RLS & Branch Isolation
    if (actorRole === 'MANAGER' || actorRole === 'CASHIER') {
      if (!actorBranchId) return [];
      list = list.filter(r => r.branch_id === actorBranchId);
    } else if (actorRole === 'WAREHOUSEMAN') {
      // Warehouseman sees all submitted/approved/in-progress/completed requests
      const warehouseVisibleStatuses: RequestOrderStatus[] = [
        'SUBMITTED',
        'FOR_REVIEW',
        'APPROVED',
        'FOR_PREPARATION',
        'READY_FOR_DELIVERY',
        'OUT_FOR_DELIVERY',
        'IN_TRANSIT',
        'PARTIALLY_DELIVERED',
        'DELIVERED'
      ];
      list = list.filter(r => warehouseVisibleStatuses.includes(r.status));
    } else if (actorRole === 'OWNER') {
      if (filters?.branch_id) {
        list = list.filter(r => r.branch_id === filters.branch_id);
      }
    }

    if (filters?.status) {
      list = list.filter(r => r.status === filters.status);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        r =>
          r.request_number.toLowerCase().includes(q) ||
          (r.branch_name && r.branch_name.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getRequestOrderById(
    actorRole: UserRole,
    actorBranchId: string | null,
    id: string
  ): RequestOrder | null {
    const req = this.requestOrders.get(id);
    if (!req) return null;

    // Strict RLS
    if ((actorRole === 'MANAGER' || actorRole === 'CASHIER') && req.branch_id !== actorBranchId) {
      throw new Error('Unauthorized: You cannot access request orders from other branches.');
    }

    return req;
  }

  public createRequestOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    data: CreateRequestOrderInput
  ): RequestOrder {
    let targetBranchId = data.branch_id;

    // Strict RLS: Managers and Cashiers can ONLY request for their assigned branch
    if (actorRole === 'MANAGER' || actorRole === 'CASHIER') {
      if (!actorBranchId) {
        throw new Error('Your user account is not assigned to any branch.');
      }
      targetBranchId = actorBranchId;
    } else if (actorRole === 'OWNER' || actorRole === 'WAREHOUSEMAN') {
      if (!targetBranchId) {
        throw new Error('Target destination branch is required.');
      }
    }

    const branch = this.branches.get(targetBranchId!);
    if (!branch) throw new Error('Branch not found.');

    if (!data.items || data.items.length === 0) {
      throw new Error('Request must include at least one item.');
    }

    const now = new Date().toISOString();
    const reqId = crypto.randomUUID();
    const reqNumber = `REQ-${String(this.requestOrderSequence++).padStart(6, '0')}`;

    const items: RequestOrderItem[] = data.items.map(it => {
      const ing = this.ingredients.get(it.ingredient_id);
      if (!ing) throw new Error(`Ingredient ${it.ingredient_id} not found.`);
      const qty = Number(it.requested_quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Quantity for ${ing.item_name} must be a positive number.`);
      }

      return {
        id: crypto.randomUUID(),
        request_id: reqId,
        ingredient_id: ing.id,
        ingredient_name: ing.item_name,
        item_code: ing.item_code,
        unit: ing.unit,
        requested_quantity: qty,
        approved_quantity: qty, // Default to requested, owner can edit
        prepared_quantity: 0,
        delivered_quantity: 0,
        received_quantity: 0,
        remaining_quantity: qty,
        status: 'PENDING',
        notes: it.notes || null
      };
    });

    const isOwner = actorRole === 'OWNER';
    const reqStatus: RequestOrderStatus = isOwner ? 'APPROVED' : 'SUBMITTED';

    const req: RequestOrder = {
      id: reqId,
      request_number: reqNumber,
      branch_id: branch.id,
      branch_name: branch.name,
      requester_id: actorId,
      requester_name: actorEmail,
      requester_role: data.is_ai_generated ? 'AI_AGENT' : (actorRole as RequesterSource),
      request_date: now,
      priority: data.priority || 'NORMAL',
      status: reqStatus,
      items,
      notes: data.notes || null,
      delivery_notes: data.delivery_notes || null,
      is_ai_generated: !!data.is_ai_generated,
      reviewed_by: isOwner ? actorEmail : null,
      reviewed_at: isOwner ? now : null,
      approved_by: isOwner ? actorEmail : null,
      approved_at: isOwner ? now : null,
      rejection_reason: null,
      prepared_by: null,
      prepared_at: null,
      created_at: now,
      updated_at: now
    };

    this.requestOrders.set(reqId, req);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'REQUEST_CREATED',
      entity_type: 'REQUEST_ORDER',
      entity_id: reqId,
      metadata: {
        request_number: reqNumber,
        branch_name: branch.name,
        item_count: items.length,
        status: reqStatus,
        priority: req.priority
      }
    });

    // Notify Owner
    this.profiles.forEach(p => {
      if (p.role === 'OWNER' || (isOwner && p.role === 'WAREHOUSEMAN')) {
        this.createNotification({
          recipient_user_id: p.id,
          title: `New Stock Request: ${branch.name} (${reqNumber})`,
          message: `${branch.name} requested replenishment for ${items.length} items (${req.priority} Priority).`,
          type: 'INFO'
        });
      }
    });

    this.saveSnapshot();
    return req;
  }

  public editRequestOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    id: string,
    data: CreateRequestOrderInput
  ): RequestOrder {
    const req = this.requestOrders.get(id);
    if (!req) throw new Error('Request Order not found.');

    if (actorRole === 'MANAGER' || actorRole === 'CASHIER') {
      if (req.branch_id !== actorBranchId) {
        throw new Error('Unauthorized: You can only edit requests for your own branch.');
      }
      if (!['DRAFT', 'SUBMITTED', 'FOR_REVIEW'].includes(req.status)) {
        throw new Error('Cannot edit a request that has already been approved or is being processed.');
      }
    }

    const now = new Date().toISOString();

    if (data.items && data.items.length > 0) {
      req.items = data.items.map(it => {
        const ing = this.ingredients.get(it.ingredient_id);
        if (!ing) throw new Error(`Ingredient ${it.ingredient_id} not found.`);
        const qty = Number(it.requested_quantity);
        return {
          id: crypto.randomUUID(),
          request_id: req.id,
          ingredient_id: ing.id,
          ingredient_name: ing.item_name,
          item_code: ing.item_code,
          unit: ing.unit,
          requested_quantity: qty,
          approved_quantity: qty,
          prepared_quantity: 0,
          delivered_quantity: 0,
          received_quantity: 0,
          remaining_quantity: qty,
          status: 'PENDING',
          notes: it.notes || null
        };
      });
    }

    if (data.priority) req.priority = data.priority;
    if (data.notes !== undefined) req.notes = data.notes;
    if (data.delivery_notes !== undefined) req.delivery_notes = data.delivery_notes;
    req.updated_at = now;

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: req.branch_id,
      action: 'REQUEST_EDITED',
      entity_type: 'REQUEST_ORDER',
      entity_id: req.id,
      metadata: { request_number: req.request_number, branch_name: req.branch_name }
    });

    this.saveSnapshot();
    return req;
  }

  public reviewAndApproveRequestOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    action: 'APPROVE' | 'REJECT' | 'EDIT',
    editData?: OwnerEditRequestOrderInput
  ): RequestOrder {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN') {
      throw new Error('Unauthorized: Only an OWNER or WAREHOUSEMAN can approve, edit, or reject request orders.');
    }

    const req = this.requestOrders.get(id);
    if (!req) throw new Error('Request Order not found.');

    const now = new Date().toISOString();
    req.reviewed_by = actorEmail;
    req.reviewed_at = now;

    if (action === 'REJECT') {
      req.status = 'REJECTED';
      req.rejection_reason = editData?.override_reason || 'Rejected by Owner';
      req.updated_at = now;

      this.createAuditLog({
        user_id: actorId,
        user_email: actorEmail,
        role: actorRole,
        branch_id: req.branch_id,
        action: 'REQUEST_REJECTED',
        entity_type: 'REQUEST_ORDER',
        entity_id: req.id,
        metadata: {
          request_number: req.request_number,
          reason: req.rejection_reason
        }
      });
    } else if (action === 'APPROVE' || action === 'EDIT') {
      req.status = 'APPROVED';
      req.approved_by = actorEmail;
      req.approved_at = now;
      req.updated_at = now;

      // Handle item edits if provided
      if (editData?.items && editData.items.length > 0) {
        editData.items.forEach(editItem => {
          const target = req.items.find(i => i.ingredient_id === editItem.ingredient_id);
          if (target) {
            const approvedQty = Number(editItem.approved_quantity);
            if (!isNaN(approvedQty) && approvedQty >= 0) {
              target.approved_quantity = approvedQty;
              target.remaining_quantity = approvedQty;
            }
          }
        });
      }

      if (editData?.priority) req.priority = editData.priority;
      if (editData?.delivery_notes) req.delivery_notes = editData.delivery_notes;

      const auditAction = action === 'EDIT' ? 'OWNER_OVERRIDE' : 'REQUEST_APPROVED';
      this.createAuditLog({
        user_id: actorId,
        user_email: actorEmail,
        role: actorRole,
        branch_id: req.branch_id,
        action: auditAction,
        entity_type: 'REQUEST_ORDER',
        entity_id: req.id,
        metadata: {
          request_number: req.request_number,
          branch_name: req.branch_name,
          override_reason: editData?.override_reason || null
        }
      });

      // Notify Warehouseman & Branch staff
      this.profiles.forEach(p => {
        if (p.role === 'WAREHOUSEMAN' || (p.branch_id === req.branch_id && p.role === 'MANAGER')) {
          this.createNotification({
            recipient_user_id: p.id,
            title: `Request Order Approved: ${req.request_number}`,
            message: `Request for ${req.branch_name} has been approved by Owner. Ready for warehouse preparation.`,
            type: 'SUCCESS'
          });
        }
      });
    }

    this.saveSnapshot();
    return req;
  }

  // ==========================================
  // PHASE 7: AI AGENT LOW-STOCK DETECTION
  // ==========================================
  public getAIStockRecommendations(
    actorRole: UserRole,
    actorBranchId: string | null,
    targetBranchId?: string
  ): AIStockRecommendation[] {
    let branchesToScan: Branch[] = [];

    if (actorRole === 'MANAGER' || actorRole === 'CASHIER') {
      if (actorBranchId) {
        const b = this.branches.get(actorBranchId);
        if (b) branchesToScan.push(b);
      }
    } else {
      if (targetBranchId) {
        const b = this.branches.get(targetBranchId);
        if (b) branchesToScan.push(b);
      } else {
        branchesToScan = Array.from(this.branches.values());
      }
    }

    const recommendations: AIStockRecommendation[] = [];

    // Find active requests to prevent duplicates
    const activeStatuses: RequestOrderStatus[] = [
      'SUBMITTED',
      'FOR_REVIEW',
      'APPROVED',
      'FOR_PREPARATION',
      'READY_FOR_DELIVERY',
      'OUT_FOR_DELIVERY',
      'PARTIALLY_DELIVERED'
    ];

    const activeRequests = Array.from(this.requestOrders.values()).filter(r =>
      activeStatuses.includes(r.status)
    );

    branchesToScan.forEach(branch => {
      this.ingredients.forEach(ingredient => {
        const key = `${branch.id}_${ingredient.id}`;
        const inv = this.branchInventory.get(key);
        const currentStock = inv ? inv.current_stock : 0;
        const reorderLevel = inv ? inv.reorder_level : (ingredient.reorder_level || 15);
        const maxStock = inv ? inv.maximum_stock : (ingredient.maximum_stock || 100);

        if (currentStock <= reorderLevel) {
          // Check if there is an active pending request for this ingredient
          const matchingActive = activeRequests.filter(
            r => r.branch_id === branch.id && r.items.some(i => i.ingredient_id === ingredient.id && i.remaining_quantity > 0)
          );

          const hasPending = matchingActive.length > 0;
          const pendingNums = matchingActive.map(r => r.request_number);

          // Calculate intelligent replenishment suggestion
          const deficit = Math.max(0, maxStock - currentStock);
          const suggestedQty = Math.max(reorderLevel * 2, deficit || 50);

          recommendations.push({
            id: `ai-rec-${branch.id}-${ingredient.id}`,
            branch_id: branch.id,
            branch_name: branch.name,
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.item_name,
            item_code: ingredient.item_code,
            current_stock: currentStock,
            reorder_level: reorderLevel,
            unit: ingredient.unit,
            suggested_quantity: suggestedQty,
            has_pending_request: hasPending,
            pending_request_numbers: pendingNums,
            title: `AI Restock Order: Request replenishment of ${ingredient.item_name} from Central Commissary Warehouse.`,
            recommendation_text: `AI Restock Order: Request replenishment of ${ingredient.item_name} from Central Commissary Warehouse.`,
            is_critical: this.isCriticalInventoryItem(ingredient.item_name, ingredient.item_code),
            reason: currentStock === 0
              ? `⚠️ AI STOCK ALERT: ${ingredient.item_name} is DEPLETED (0 left) at ${branch.name}. Kitchen prep is stalled.`
              : `⚠️ AI STOCK ALERT: ${ingredient.item_name} is LOW (${currentStock} left) at ${branch.name}. Reorder threshold breached.`,
            created_at: new Date().toISOString()
          });
        }
      });
    });

    return recommendations;
  }

  public approveAndDispatchAIRestock(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      branch_id: string;
      ingredient_id: string;
      quantity?: number;
      driver_name?: string;
      vehicle_info?: string;
    }
  ): { requestOrder: RequestOrder; delivery: Delivery } {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only an OWNER or MANAGER can approve restock requests.');
    }

    const branch = this.branches.get(data.branch_id);
    if (!branch) throw new Error('Branch not found.');

    const ing = this.ingredients.get(data.ingredient_id);
    if (!ing) throw new Error('Ingredient not found.');

    const now = new Date().toISOString();
    const key = `${branch.id}_${ing.id}`;
    const inv = this.branchInventory.get(key);
    const curr = inv ? inv.current_stock : 0;
    const reorder = inv ? inv.reorder_level : (ing.reorder_level || 15);
    const max = inv ? inv.maximum_stock : (ing.maximum_stock || 100);
    const qty = data.quantity || Math.max(reorder * 2, max - curr || 50);

    // 1. Create or retrieve active RequestOrder
    const reqId = crypto.randomUUID();
    const reqNumber = `REQ-${String(this.requestOrderSequence++).padStart(6, '0')}`;
    const reqItemId = crypto.randomUUID();

    const reqItem: RequestOrderItem = {
      id: reqItemId,
      request_id: reqId,
      ingredient_id: ing.id,
      ingredient_name: ing.item_name,
      item_code: ing.item_code,
      unit: ing.unit,
      requested_quantity: qty,
      approved_quantity: qty,
      prepared_quantity: qty,
      delivered_quantity: qty,
      received_quantity: 0,
      remaining_quantity: qty,
      status: 'PREPARED',
      notes: 'AI Autonomous Restock Recommendation'
    };

    const req: RequestOrder = {
      id: reqId,
      request_number: reqNumber,
      branch_id: branch.id,
      branch_name: branch.name,
      requester_id: actorId,
      requester_name: actorEmail,
      requester_role: 'AI_AGENT',
      request_date: now,
      status: 'READY_FOR_DELIVERY',
      priority: curr <= 0 ? 'URGENT' : 'HIGH',
      is_ai_generated: true,
      items: [reqItem],
      notes: `AI Restock Order: Request replenishment of ${ing.item_name} from Central Commissary Warehouse. Approved by ${actorEmail}.`,
      delivery_notes: `Direct Autonomous Dispatch: Route to ${branch.name}`,
      reviewed_by: actorEmail,
      reviewed_by_name: actorEmail,
      reviewed_at: now,
      prepared_by: 'Central Commissary Warehouse',
      prepared_at: now,
      created_at: now,
      updated_at: now
    };
    this.requestOrders.set(req.id, req);

    // 2. Ensure Commissary warehouse stock allocation
    const availableWarehouseStock = this.warehouseStock.get(ing.id) || 1000;
    const newWarehouseStock = Math.max(0, availableWarehouseStock - qty);
    this.warehouseStock.set(ing.id, newWarehouseStock);

    // 3. Immediately Create Delivery in Delivery Dispatch Pipeline
    const delId = crypto.randomUUID();
    const delNumber = `DEL-${String(this.deliverySequence++).padStart(6, '0')}`;
    const driver = data.driver_name || 'Tagpuan Logistics Dispatch Courier';
    const vehicle = data.vehicle_info || 'Reefer Van #04 (Tagpuan Commissary Fleet)';

    const deliveryItem: DeliveryItem = {
      id: crypto.randomUUID(),
      delivery_id: delId,
      request_item_id: reqItemId,
      ingredient_id: ing.id,
      ingredient_name: ing.item_name,
      item_code: ing.item_code,
      unit: ing.unit,
      requested_quantity: qty,
      approved_quantity: qty,
      prepared_quantity: qty,
      delivered_quantity: qty,
      received_quantity: 0,
      short_quantity: 0,
      rejected_quantity: 0,
      rejection_reason: null
    };

    const delivery: Delivery = {
      id: delId,
      delivery_number: delNumber,
      request_id: req.id,
      request_number: req.request_number,
      source_warehouse_name: CENTRAL_WAREHOUSE_NAME,
      destination_branch_id: branch.id,
      destination_branch_name: branch.name,
      status: 'OUT_FOR_DELIVERY',
      items: [deliveryItem],
      prepared_by: actorId,
      prepared_by_name: actorEmail,
      prepared_at: now,
      driver_name: driver,
      vehicle_info: vehicle,
      dispatched_by: actorId,
      dispatched_by_name: actorEmail,
      dispatched_at: now,
      estimated_arrival: new Date(Date.now() + 45 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      received_by: null,
      received_by_name: null,
      received_at: null,
      proof_image_url: null,
      receiving_notes: null,
      rejection_reason: null,
      status_history: [
        {
          id: crypto.randomUUID(),
          delivery_id: delId,
          from_status: null,
          to_status: 'READY_FOR_PICKUP',
          changed_by: actorId,
          changed_by_name: actorEmail,
          notes: `Automated AI replenishment approved: ${qty} ${ing.unit} of ${ing.item_name} packed from Central Commissary.`,
          timestamp: now
        },
        {
          id: crypto.randomUUID(),
          delivery_id: delId,
          from_status: 'READY_FOR_PICKUP',
          to_status: 'OUT_FOR_DELIVERY',
          changed_by: actorId,
          changed_by_name: actorEmail,
          notes: `Dispatched to ${branch.name} via ${vehicle} (${driver}).`,
          timestamp: now
        }
      ],
      created_at: now,
      updated_at: now
    };
    this.deliveries.set(delId, delivery);

    // 4. Record Audit Log
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'DELIVERY_DISPATCHED',
      entity_type: 'DELIVERY',
      entity_id: delId,
      metadata: {
        delivery_number: delNumber,
        request_number: reqNumber,
        branch_name: branch.name,
        ingredient_name: ing.item_name,
        quantity: qty
      }
    });

    // 5. Notify Branch Manager & Owner
    const targetProfiles = Array.from(this.profiles.values()).filter(
      p => p.role === 'OWNER' || (p.role === 'MANAGER' && p.branch_id === branch.id)
    );
    targetProfiles.forEach(p => {
      this.createNotification({
        recipient_user_id: p.id,
        title: `🚀 Delivery Dispatched: ${ing.item_name}`,
        message: `Delivery #${delNumber} containing ${qty} ${ing.unit} of ${ing.item_name} is routed to ${branch.name} via Central Commissary Dispatch.`,
        type: 'SUCCESS'
      });
    });

    this.saveSnapshot();
    return { requestOrder: req, delivery };
  }

  public triggerAIRestockRequest(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: {
      branch_id: string;
      ingredient_id: string;
      quantity?: number;
    }
  ): RequestOrder {
    const branch = this.branches.get(data.branch_id);
    if (!branch) throw new Error('Branch not found.');

    const ing = this.ingredients.get(data.ingredient_id);
    if (!ing) throw new Error('Ingredient not found.');

    // Check duplicate pending requests
    const activeStatuses: RequestOrderStatus[] = [
      'SUBMITTED',
      'FOR_REVIEW',
      'APPROVED',
      'FOR_PREPARATION',
      'READY_FOR_DELIVERY',
      'OUT_FOR_DELIVERY',
      'PARTIALLY_DELIVERED'
    ];

    const activeRequests = Array.from(this.requestOrders.values()).filter(
      r =>
        r.branch_id === branch.id &&
        activeStatuses.includes(r.status) &&
        r.items.some(i => i.ingredient_id === ing.id && i.remaining_quantity > 0)
    );

    if (activeRequests.length > 0) {
      const activeNum = activeRequests[0].request_number;
      throw new Error(
        `AI Guard: An active replenishment request (${activeNum}) already exists for ${ing.item_name} at ${branch.name}.`
      );
    }

    const key = `${branch.id}_${ing.id}`;
    const inv = this.branchInventory.get(key);
    const curr = inv ? inv.current_stock : 0;
    const reorder = inv ? inv.reorder_level : (ing.reorder_level || 15);
    const max = inv ? inv.maximum_stock : (ing.maximum_stock || 100);

    const qty = data.quantity || Math.max(reorder * 2, max - curr || 50);

    const req = this.createRequestOrder(actorRole, actorId, actorEmail, branch.id, {
      branch_id: branch.id,
      priority: curr === 0 ? 'URGENT' : 'HIGH',
      is_ai_generated: true,
      notes: `Autonomous AI Stock Replenishment: Current ${curr} ${ing.unit} <= Threshold ${reorder} ${ing.unit}.`,
      delivery_notes: 'Automated low stock trigger',
      items: [
        {
          ingredient_id: ing.id,
          requested_quantity: qty,
          notes: 'AI Restock Recommendation'
        }
      ]
    });

    return req;
  }

  // ==========================================
  // PHASE 7: WAREHOUSE FULFILLMENT & DELIVERY
  // ==========================================
  public getWarehouseStock(actorRole: UserRole): {
    ingredient_id: string;
    ingredient_name: string;
    item_code: string;
    unit: string;
    cost_price: number;
    current_stock: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  }[] {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only an OWNER, WAREHOUSEMAN, or MANAGER can access warehouse stock levels.');
    }

    return Array.from(this.ingredients.values()).map(ing => {
      const stock = this.warehouseStock.get(ing.id) || 0;
      const status = stock > 200 ? 'IN_STOCK' : stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK';
      return {
        ingredient_id: ing.id,
        ingredient_name: ing.item_name,
        item_code: ing.item_code,
        unit: ing.unit,
        cost_price: ing.cost_price,
        current_stock: stock,
        status
      };
    });
  }

  public quickRestockWarehouse(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: { ingredient_id: string; quantity: number; reason?: string }
  ): { ingredient: Ingredient; current_stock: number; transaction: InventoryTransaction } {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only an OWNER, WAREHOUSEMAN, or MANAGER can restock Commissary Warehouse.');
    }

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number.');
    }

    const ingredient = this.ingredients.get(data.ingredient_id);
    if (!ingredient) {
      throw new Error('Ingredient not found.');
    }

    const prevStock = this.warehouseStock.get(ingredient.id) || 0;
    const newStock = Math.round((prevStock + qty) * 100) / 100;
    this.warehouseStock.set(ingredient.id, newStock);

    const now = new Date().toISOString();
    const tx: InventoryTransaction = {
      id: crypto.randomUUID(),
      branch_id: CENTRAL_WAREHOUSE_ID,
      branch_name: CENTRAL_WAREHOUSE_NAME,
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.item_name,
      quantity: qty,
      transaction_type: 'PURCHASE_RECEIPT',
      previous_stock: prevStock,
      new_stock: newStock,
      reason: data.reason || 'Master Owner Direct Restock to Commissary',
      user_id: actorId,
      user_email: actorEmail,
      created_at: now
    };
    this.inventoryTransactions.set(tx.id, tx);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: null,
      action: 'INVENTORY_STOCK_IN',
      entity_type: 'STOCK_MOVEMENT',
      entity_id: tx.id,
      metadata: {
        ingredient_name: ingredient.item_name,
        previous_stock: prevStock,
        quantity_added: qty,
        new_stock: newStock,
        unit: ingredient.unit,
        reason: tx.reason
      }
    });

    this.saveSnapshot();

    return {
      ingredient,
      current_stock: newStock,
      transaction: tx
    };
  }

  public directFulfillRequestOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    requestId: string
  ): { request: RequestOrder; message: string } {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER' && actorRole !== 'WAREHOUSEMAN') {
      throw new Error('Unauthorized to fulfill stock requests.');
    }

    const req = this.requestOrders.get(requestId);
    if (!req) throw new Error('Request Order not found.');

    const now = new Date().toISOString();
    const branch = this.branches.get(req.branch_id);
    const branchName = branch?.name || req.branch_name || 'Branch';

    // For each requested item, directly intake into branch inventory
    req.items.forEach(item => {
      const qty = item.requested_quantity;
      item.approved_quantity = qty;
      item.prepared_quantity = qty;
      item.delivered_quantity = qty;
      item.received_quantity = qty;
      item.status = 'DELIVERED';

      // Increase branch inventory
      const key = `${req.branch_id}_${item.ingredient_id}`;
      let inv = this.branchInventory.get(key);
      const ing = this.ingredients.get(item.ingredient_id);

      if (!inv && ing) {
        inv = {
          id: key,
          branch_id: req.branch_id,
          branch_name: branchName,
          ingredient_id: ing.id,
          ingredient_name: ing.item_name,
          item_code: ing.item_code,
          category: ing.category,
          unit: ing.unit,
          cost_price: ing.cost_price,
          current_stock: 0,
          reorder_level: ing.reorder_level,
          maximum_stock: ing.maximum_stock,
          status: 'OUT_OF_STOCK',
          is_active: true,
          created_at: now,
          updated_at: now
        };
      }

      if (inv) {
        const prevStock = inv.current_stock;
        const newStock = Math.round((prevStock + qty) * 100) / 100;
        inv.current_stock = newStock;
        inv.status = newStock > inv.reorder_level ? 'IN_STOCK' : (newStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
        inv.updated_at = now;
        this.branchInventory.set(key, inv);

        // Record branch inventory transaction
        const tx: InventoryTransaction = {
          id: crypto.randomUUID(),
          branch_id: req.branch_id,
          branch_name: branchName,
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          quantity: qty,
          transaction_type: 'STOCK_IN',
          previous_stock: prevStock,
          new_stock: newStock,
          reason: `Direct Stock Intake from Request #${req.request_number}`,
          user_id: actorId,
          user_email: actorEmail,
          created_at: now
        };
        this.inventoryTransactions.set(tx.id, tx);
      }
    });

    req.status = 'DELIVERED';
    req.approved_by = actorEmail;
    req.approved_at = now;
    req.prepared_by = actorEmail;
    req.prepared_at = now;
    req.updated_at = now;

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: req.branch_id,
      action: 'REQUEST_APPROVED',
      entity_type: 'REQUEST_ORDER',
      entity_id: req.id,
      metadata: {
        request_number: req.request_number,
        branch_name: branchName,
        items_count: req.items.length
      }
    });

    this.saveSnapshot();

    return {
      request: req,
      message: `Request #${req.request_number} items received directly into ${branchName} inventory!`
    };
  }

  // STEP 2: WAREHOUSE & OWNER DISPATCH TO OUT_FOR_DELIVERY / IN_TRANSIT
  public dispatchRequestOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    requestId: string,
    data?: {
      driver_name?: string;
      vehicle_info?: string;
      tracking_number?: string;
      estimated_arrival?: string;
      notes?: string;
    }
  ): { request: RequestOrder; message: string } {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN') {
      throw new Error('Unauthorized: Only an OWNER or WAREHOUSEMAN can dispatch request orders.');
    }

    const req = this.requestOrders.get(requestId);
    if (!req) throw new Error('Request Order not found.');

    const now = new Date().toISOString();
    const branch = this.branches.get(req.branch_id);
    const branchName = branch?.name || req.branch_name || 'Branch';

    // Step 2 Transition to OUT_FOR_DELIVERY
    req.status = 'OUT_FOR_DELIVERY';
    req.reviewed_by = req.reviewed_by || actorEmail;
    req.reviewed_at = req.reviewed_at || now;
    req.approved_by = req.approved_by || actorEmail;
    req.approved_at = req.approved_at || now;
    req.prepared_by = actorEmail;
    req.prepared_at = now;
    req.dispatched_by = actorEmail;
    req.dispatched_at = now;
    req.driver_name = data?.driver_name || 'Commissary Delivery Team';
    req.vehicle_info = data?.vehicle_info || 'Reefer Van #01';
    req.tracking_number = data?.tracking_number || `TRK-${req.request_number}`;
    req.estimated_arrival = data?.estimated_arrival || 'En route / Within 2 hours';
    if (data?.notes) req.delivery_notes = data.notes;
    req.updated_at = now;

    // Update item preparation states
    req.items.forEach(item => {
      const qty = item.approved_quantity > 0 ? item.approved_quantity : item.requested_quantity;
      item.approved_quantity = qty;
      item.prepared_quantity = qty;
      item.delivered_quantity = qty;
      item.status = 'PREPARED';
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: req.branch_id,
      action: 'DELIVERY_DISPATCHED',
      entity_type: 'REQUEST_ORDER',
      entity_id: req.id,
      metadata: {
        request_number: req.request_number,
        branch_name: branchName,
        driver_name: req.driver_name,
        vehicle_info: req.vehicle_info,
        tracking_number: req.tracking_number,
        items_count: req.items.length
      }
    });

    // Notify Branch Managers that stocks are en route
    this.profiles.forEach(p => {
      if (p.branch_id === req.branch_id && (p.role === 'MANAGER' || p.role === 'CASHIER')) {
        this.createNotification({
          recipient_user_id: p.id,
          title: `Delivery En Route: ${req.request_number}`,
          message: `Stocks for ${branchName} are now OUT FOR DELIVERY / IN TRANSIT with ${req.driver_name}. ETA: ${req.estimated_arrival}. Confirm upon physical arrival.`,
          type: 'INFO'
        });
      }
    });

    this.saveSnapshot();

    return {
      request: req,
      message: `Request #${req.request_number} is now OUT FOR DELIVERY / IN TRANSIT to ${branchName}.`
    };
  }

  // STEP 3: BRANCH RECEIVING & AUTO-STOCK UPDATE
  public confirmReceiveRequestOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    requestId: string,
    data?: {
      receiving_notes?: string;
    }
  ): { request: RequestOrder; message: string } {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only a Branch Manager or Master Owner can confirm delivery receipt.');
    }

    const req = this.requestOrders.get(requestId);
    if (!req) throw new Error('Request Order not found.');

    // Strict Branch Isolation: Manager can only confirm receiving for their own branch
    if (actorRole === 'MANAGER' && actorBranchId !== req.branch_id) {
      throw new Error('Unauthorized: You can only confirm delivery receipt for your assigned branch.');
    }

    // Must be in OUT_FOR_DELIVERY, IN_TRANSIT, READY_FOR_DELIVERY, or APPROVED
    const receivableStatuses: RequestOrderStatus[] = ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'READY_FOR_DELIVERY', 'APPROVED', 'FOR_PREPARATION'];
    if (!receivableStatuses.includes(req.status)) {
      throw new Error(`Cannot receive request in status "${req.status}". It must be dispatched by the Warehouse first.`);
    }

    const now = new Date().toISOString();
    const branch = this.branches.get(req.branch_id);
    const branchName = branch?.name || req.branch_name || 'Branch';

    // Step 3: For each item, confirm receipt and increment branch local inventory
    req.items.forEach(item => {
      const qty = item.approved_quantity > 0 ? item.approved_quantity : item.requested_quantity;
      item.received_quantity = qty;
      item.remaining_quantity = 0;
      item.status = 'DELIVERED';

      const key = `${req.branch_id}_${item.ingredient_id}`;
      let inv = this.branchInventory.get(key);
      const ing = this.ingredients.get(item.ingredient_id);

      if (!inv && ing) {
        inv = {
          id: key,
          branch_id: req.branch_id,
          branch_name: branchName,
          ingredient_id: ing.id,
          ingredient_name: ing.item_name,
          item_code: ing.item_code,
          category: ing.category,
          unit: ing.unit,
          cost_price: ing.cost_price,
          current_stock: 0,
          reorder_level: ing.reorder_level,
          maximum_stock: ing.maximum_stock,
          status: 'OUT_OF_STOCK',
          is_active: true,
          created_at: now,
          updated_at: now
        };
      }

      if (inv) {
        const prevStock = inv.current_stock;
        const newStock = Math.round((prevStock + qty) * 100) / 100;
        inv.current_stock = newStock;
        inv.status = newStock > inv.reorder_level ? 'IN_STOCK' : (newStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
        inv.updated_at = now;
        this.branchInventory.set(key, inv);

        // Record immutable branch inventory transaction
        const tx: InventoryTransaction = {
          id: crypto.randomUUID(),
          branch_id: req.branch_id,
          branch_name: branchName,
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          quantity: qty,
          transaction_type: 'STOCK_IN',
          previous_stock: prevStock,
          new_stock: newStock,
          reason: `Delivery confirmed for Request #${req.request_number} by ${actorEmail}`,
          user_id: actorId,
          user_email: actorEmail,
          created_at: now
        };
        this.inventoryTransactions.set(tx.id, tx);
      }
    });

    req.status = 'DELIVERED';
    req.received_at = now;
    req.received_by = actorEmail;
    req.receiving_notes = data?.receiving_notes || 'Confirmed physically received by Branch Manager';
    req.updated_at = now;

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: req.branch_id,
      action: 'DELIVERY_RECEIVED',
      entity_type: 'REQUEST_ORDER',
      entity_id: req.id,
      metadata: {
        request_number: req.request_number,
        branch_name: branchName,
        items_count: req.items.length,
        receiving_notes: req.receiving_notes
      }
    });

    // Notify Warehouseman & Master Owner
    this.profiles.forEach(p => {
      if (p.role === 'OWNER' || p.role === 'WAREHOUSEMAN') {
        this.createNotification({
          recipient_user_id: p.id,
          title: `Delivery Confirmed: ${req.request_number}`,
          message: `${branchName} confirmed delivery receipt of Request #${req.request_number}. Branch active stock updated.`,
          type: 'SUCCESS'
        });
      }
    });

    this.saveSnapshot();

    return {
      request: req,
      message: `Delivery confirmed! Received items automatically added to ${branchName} active inventory.`
    };
  }

  public prepareRequestOrder(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: PrepareDeliveryInput
  ): { delivery: Delivery; request: RequestOrder } {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN') {
      throw new Error('Unauthorized: Only an OWNER or WAREHOUSEMAN can prepare request orders.');
    }

    const req = this.requestOrders.get(data.request_id);
    if (!req) throw new Error('Request Order not found.');

    if (!['APPROVED', 'FOR_PREPARATION', 'PARTIALLY_DELIVERED'].includes(req.status)) {
      throw new Error(`Cannot prepare request in ${req.status} status. It must be APPROVED first.`);
    }

    const now = new Date().toISOString();
    const delId = crypto.randomUUID();
    const delNumber = `DEL-${String(this.deliverySequence++).padStart(6, '0')}`;

    // Verify and deduct stock from commissary inventory
    const deliveryItems: DeliveryItem[] = data.items.map(itemInput => {
      const reqItem = req.items.find(i => i.id === itemInput.request_item_id);
      if (!reqItem) throw new Error(`Request item ${itemInput.request_item_id} not found.`);

      const prepQty = Number(itemInput.prepared_quantity);
      if (isNaN(prepQty) || prepQty <= 0) {
        throw new Error(`Prepared quantity for ${reqItem.ingredient_name} must be greater than 0.`);
      }

      const availableWarehouseStock = this.warehouseStock.get(reqItem.ingredient_id) || 0;
      if (prepQty > availableWarehouseStock) {
        throw new Error(
          `Insufficient commissary stock for ${reqItem.ingredient_name}. Available: ${availableWarehouseStock} ${reqItem.unit}, Requested to prepare: ${prepQty} ${reqItem.unit}.`
        );
      }

      // Deduct from Warehouse Commissary Stock (held for delivery)
      const newStock = Math.round((availableWarehouseStock - prepQty) * 100) / 100;
      this.warehouseStock.set(reqItem.ingredient_id, newStock);

      // Update Request Item prepared quantity
      reqItem.prepared_quantity = (reqItem.prepared_quantity || 0) + prepQty;
      reqItem.delivered_quantity = reqItem.prepared_quantity;
      reqItem.status = 'PREPARED';

      const shortQty = Math.max(0, reqItem.approved_quantity - reqItem.prepared_quantity);

      return {
        id: crypto.randomUUID(),
        delivery_id: delId,
        request_item_id: reqItem.id,
        ingredient_id: reqItem.ingredient_id,
        ingredient_name: reqItem.ingredient_name,
        item_code: reqItem.item_code,
        unit: reqItem.unit,
        requested_quantity: reqItem.requested_quantity,
        approved_quantity: reqItem.approved_quantity,
        prepared_quantity: prepQty,
        delivered_quantity: prepQty,
        received_quantity: 0,
        short_quantity: shortQty,
        rejected_quantity: 0,
        rejection_reason: null
      };
    });

    req.prepared_by = actorEmail;
    req.prepared_at = now;
    req.status = 'READY_FOR_DELIVERY';
    req.updated_at = now;

    const delivery: Delivery = {
      id: delId,
      delivery_number: delNumber,
      request_id: req.id,
      request_number: req.request_number,
      source_warehouse_name: CENTRAL_WAREHOUSE_NAME,
      destination_branch_id: req.branch_id,
      destination_branch_name: req.branch_name || 'Branch',
      status: 'READY_FOR_PICKUP',
      items: deliveryItems,
      prepared_by: actorId,
      prepared_by_name: actorEmail,
      prepared_at: now,
      driver_name: data.driver_name || null,
      vehicle_info: data.vehicle_info || null,
      dispatched_by: null,
      dispatched_by_name: null,
      dispatched_at: null,
      estimated_arrival: data.estimated_arrival || null,
      received_by: null,
      received_by_name: null,
      received_at: null,
      proof_image_url: null,
      receiving_notes: null,
      rejection_reason: null,
      status_history: [
        {
          id: crypto.randomUUID(),
          delivery_id: delId,
          from_status: null,
          to_status: 'READY_FOR_PICKUP',
          changed_by: actorId,
          changed_by_name: actorEmail,
          notes: `Prepared ${deliveryItems.length} items for dispatch to ${req.branch_name}`,
          timestamp: now
        }
      ],
      created_at: now,
      updated_at: now
    };

    this.deliveries.set(delId, delivery);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: req.branch_id,
      action: 'DELIVERY_CREATED',
      entity_type: 'DELIVERY',
      entity_id: delId,
      metadata: {
        delivery_number: delNumber,
        request_number: req.request_number,
        branch_name: req.branch_name,
        item_count: deliveryItems.length
      }
    });

    // Notify Branch Manager & Owner
    this.profiles.forEach(p => {
      if (p.branch_id === req.branch_id || p.role === 'OWNER') {
        this.createNotification({
          recipient_user_id: p.id,
          title: `Delivery Ready: ${delNumber}`,
          message: `Delivery #${delNumber} for ${req.branch_name} has been prepared and packed.`,
          type: 'INFO'
        });
      }
    });

    this.saveSnapshot();
    return { delivery, request: req };
  }

  public getDeliveries(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters?: {
      branch_id?: string;
      status?: DeliveryStatus;
    }
  ): Delivery[] {
    let list = Array.from(this.deliveries.values());

    if (actorRole === 'MANAGER' || actorRole === 'CASHIER') {
      if (!actorBranchId) return [];
      list = list.filter(d => d.destination_branch_id === actorBranchId);
    } else if (actorRole === 'OWNER' && filters?.branch_id) {
      list = list.filter(d => d.destination_branch_id === filters.branch_id);
    }

    if (filters?.status) {
      list = list.filter(d => d.status === filters.status);
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getDeliveryById(
    actorRole: UserRole,
    actorBranchId: string | null,
    id: string
  ): Delivery | null {
    const delivery = this.deliveries.get(id);
    if (!delivery) return null;

    if ((actorRole === 'MANAGER' || actorRole === 'CASHIER') && delivery.destination_branch_id !== actorBranchId) {
      throw new Error('Unauthorized: You cannot view deliveries destined for other branches.');
    }

    return delivery;
  }

  public dispatchDelivery(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: DispatchDeliveryInput
  ): Delivery {
    if (actorRole !== 'OWNER' && actorRole !== 'WAREHOUSEMAN') {
      throw new Error('Unauthorized: Only an OWNER or WAREHOUSEMAN can dispatch deliveries.');
    }

    const del = this.deliveries.get(data.delivery_id);
    if (!del) throw new Error('Delivery not found.');

    const now = new Date().toISOString();
    del.status = 'OUT_FOR_DELIVERY';
    del.dispatched_by = actorId;
    del.dispatched_by_name = actorEmail;
    del.dispatched_at = now;
    if (data.driver_name) del.driver_name = data.driver_name;
    if (data.vehicle_info) del.vehicle_info = data.vehicle_info;
    if (data.estimated_arrival) del.estimated_arrival = data.estimated_arrival;
    del.updated_at = now;

    del.status_history.push({
      id: crypto.randomUUID(),
      delivery_id: del.id,
      from_status: 'READY_FOR_PICKUP',
      to_status: 'OUT_FOR_DELIVERY',
      changed_by: actorId,
      changed_by_name: actorEmail,
      notes: `Dispatched with driver: ${del.driver_name || 'Assigned Courier'} • Vehicle: ${del.vehicle_info || 'Reefer Van'} • ETA: ${del.estimated_arrival || 'En route'}`,
      timestamp: now
    });

    // Update corresponding Request Order status
    const req = this.requestOrders.get(del.request_id);
    if (req) {
      req.status = 'OUT_FOR_DELIVERY';
      req.updated_at = now;
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: del.destination_branch_id,
      action: 'DELIVERY_DISPATCHED',
      entity_type: 'DELIVERY',
      entity_id: del.id,
      metadata: {
        delivery_number: del.delivery_number,
        driver_name: del.driver_name,
        vehicle_info: del.vehicle_info,
        destination_branch: del.destination_branch_name
      }
    });

    // Notify Branch Manager
    this.profiles.forEach(p => {
      if (p.branch_id === del.destination_branch_id || p.role === 'OWNER') {
        this.createNotification({
          recipient_user_id: p.id,
          title: `Delivery En Route: ${del.delivery_number}`,
          message: `Delivery #${del.delivery_number} has departed Commissary. Driver: ${del.driver_name || 'Driver'}. ETA: ${del.estimated_arrival || 'Soon'}.`,
          type: 'INFO'
        });
      }
    });

    this.saveSnapshot();
    return del;
  }

  // ==========================================
  // PHASE 7: BRANCH RECEIVING & ZERO LEAKAGE INVENTORY SYNC
  // ==========================================
  public receiveDelivery(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    data: ReceiveDeliveryInput
  ): { delivery: Delivery; request: RequestOrder; transactions: InventoryTransaction[] } {
    const del = this.deliveries.get(data.delivery_id);
    if (!del) throw new Error('Delivery not found.');

    // Strict RLS: Staff must belong to destination branch (or be OWNER)
    if (actorRole !== 'OWNER' && actorBranchId !== del.destination_branch_id) {
      throw new Error('Unauthorized: You can only receive deliveries for your assigned branch.');
    }

    if (!['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'PENDING'].includes(del.status)) {
      throw new Error(`Cannot receive delivery in ${del.status} state.`);
    }

    const branch = this.branches.get(del.destination_branch_id);
    if (!branch) throw new Error('Destination branch not found.');

    const req = this.requestOrders.get(del.request_id);
    if (!req) throw new Error('Associated Request Order not found.');

    const now = new Date().toISOString();
    const createdTransactions: InventoryTransaction[] = [];

    // Process each received delivery item
    data.items.forEach(inputItem => {
      const delItem = del.items.find(i => i.id === inputItem.delivery_item_id);
      if (!delItem) return;

      const receivedQty = Number(inputItem.received_quantity);
      const rejectedQty = Number(inputItem.rejected_quantity || 0);

      if (isNaN(receivedQty) || receivedQty < 0) {
        throw new Error(`Received quantity for ${delItem.ingredient_name} cannot be negative.`);
      }

      delItem.received_quantity = receivedQty;
      delItem.rejected_quantity = rejectedQty;
      delItem.short_quantity = Math.max(0, delItem.delivered_quantity - receivedQty - rejectedQty);
      if (rejectedQty > 0) {
        delItem.rejection_reason = inputItem.rejection_reason || 'Quality rejection';
      }

      const ing = this.ingredients.get(delItem.ingredient_id);
      if (!ing) return;

      // 1. Immutable TRANSFER_OUT from Central Warehouse (Commissary)
      const prevCommissary = this.warehouseStock.get(ing.id) || 0;
      const txOut: InventoryTransaction = {
        id: crypto.randomUUID(),
        branch_id: CENTRAL_WAREHOUSE_ID,
        branch_name: CENTRAL_WAREHOUSE_NAME,
        ingredient_id: ing.id,
        ingredient_name: ing.item_name,
        quantity: receivedQty,
        transaction_type: 'TRANSFER_OUT',
        previous_stock: prevCommissary + delItem.delivered_quantity,
        new_stock: prevCommissary,
        reason: `Transfer to ${branch.name} (Delivery #${del.delivery_number})`,
        user_id: actorId,
        user_email: actorEmail,
        created_at: now
      };
      this.inventoryTransactions.set(txOut.id, txOut);
      createdTransactions.push(txOut);

      // 2. Immutable TRANSFER_IN to Branch Inventory (ONLY VALID RECEIVED STOCK)
      const branchKey = `${branch.id}_${ing.id}`;
      let branchInv = this.branchInventory.get(branchKey);

      if (!branchInv) {
        branchInv = {
          id: branchKey,
          branch_id: branch.id,
          branch_name: branch.name,
          ingredient_id: ing.id,
          ingredient_name: ing.item_name,
          item_code: ing.item_code,
          category: ing.category,
          unit: ing.unit,
          cost_price: ing.cost_price,
          current_stock: 0,
          reorder_level: ing.reorder_level,
          maximum_stock: ing.maximum_stock,
          status: 'OUT_OF_STOCK',
          is_active: true,
          created_at: now,
          updated_at: now
        };
      }

      const prevBranchStock = branchInv.current_stock;
      const newBranchStock = Math.round((prevBranchStock + receivedQty) * 100) / 100;
      branchInv.current_stock = newBranchStock;
      branchInv.status = newBranchStock > branchInv.reorder_level ? 'IN_STOCK' : newBranchStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK';
      branchInv.updated_at = now;
      this.branchInventory.set(branchKey, branchInv);

      const txIn: InventoryTransaction = {
        id: crypto.randomUUID(),
        branch_id: branch.id,
        branch_name: branch.name,
        ingredient_id: ing.id,
        ingredient_name: ing.item_name,
        quantity: receivedQty,
        transaction_type: 'TRANSFER_IN',
        previous_stock: prevBranchStock,
        new_stock: newBranchStock,
        reason: `Received from Commissary (Delivery #${del.delivery_number})`,
        user_id: actorId,
        user_email: actorEmail,
        created_at: now
      };
      this.inventoryTransactions.set(txIn.id, txIn);
      createdTransactions.push(txIn);

      // 3. If Damaged / Rejected items exist, record separate REJECT transaction (does NOT enter usable inventory)
      if (rejectedQty > 0) {
        const txReject: InventoryTransaction = {
          id: crypto.randomUUID(),
          branch_id: branch.id,
          branch_name: branch.name,
          ingredient_id: ing.id,
          ingredient_name: ing.item_name,
          quantity: rejectedQty,
          transaction_type: 'REJECT',
          previous_stock: newBranchStock,
          new_stock: newBranchStock,
          reason: `Delivery Rejection: ${delItem.rejection_reason}`,
          user_id: actorId,
          user_email: actorEmail,
          created_at: now
        };
        this.inventoryTransactions.set(txReject.id, txReject);
        createdTransactions.push(txReject);

        this.createAuditLog({
          user_id: actorId,
          user_email: actorEmail,
          role: actorRole,
          branch_id: branch.id,
          action: 'ITEM_REJECTED',
          entity_type: 'DELIVERY',
          entity_id: del.id,
          metadata: {
            delivery_number: del.delivery_number,
            ingredient_name: ing.item_name,
            rejected_quantity: rejectedQty,
            unit: ing.unit,
            reason: delItem.rejection_reason
          }
        });
      }

      // Update Request Item tracking
      const reqItem = req.items.find(i => i.id === delItem.request_item_id);
      if (reqItem) {
        reqItem.received_quantity = (reqItem.received_quantity || 0) + receivedQty;
        reqItem.remaining_quantity = Math.max(0, reqItem.approved_quantity - reqItem.received_quantity);
        reqItem.status = reqItem.remaining_quantity === 0 ? 'DELIVERED' : 'PENDING';
      }
    });

    // Check if entire Request Order is fully satisfied
    const isFullySatisfied = req.items.every(i => (i.remaining_quantity || 0) === 0);
    const hasAnyShortage = del.items.some(i => (i.short_quantity || 0) > 0 || (i.rejected_quantity || 0) > 0);

    del.status = (isFullySatisfied && !hasAnyShortage) ? 'DELIVERED' : 'PARTIALLY_DELIVERED';
    del.received_by = actorId;
    del.received_by_name = actorEmail;
    del.received_at = now;
    if (data.receiving_notes) del.receiving_notes = data.receiving_notes;
    if (data.proof_image_url) del.proof_image_url = data.proof_image_url;
    del.updated_at = now;

    req.status = isFullySatisfied ? 'DELIVERED' : 'PARTIALLY_DELIVERED';
    req.updated_at = now;

    del.status_history.push({
      id: crypto.randomUUID(),
      delivery_id: del.id,
      from_status: 'OUT_FOR_DELIVERY',
      to_status: del.status,
      changed_by: actorId,
      changed_by_name: actorEmail,
      notes: `Received at ${branch.name}. Status: ${del.status}. Notes: ${data.receiving_notes || 'All items inspected.'}`,
      timestamp: now
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: isFullySatisfied ? 'DELIVERY_RECEIVED' : 'DELIVERY_PARTIAL',
      entity_type: 'DELIVERY',
      entity_id: del.id,
      metadata: {
        delivery_number: del.delivery_number,
        request_number: req.request_number,
        branch_name: branch.name,
        status: del.status,
        is_fully_satisfied: isFullySatisfied
      }
    });

    // Notify Warehouseman and Owner
    this.profiles.forEach(p => {
      if (p.role === 'OWNER' || p.role === 'WAREHOUSEMAN') {
        this.createNotification({
          recipient_user_id: p.id,
          title: `Delivery Completed: ${del.delivery_number}`,
          message: `${branch.name} confirmed receipt of Delivery #${del.delivery_number} (${del.status}).`,
          type: isFullySatisfied ? 'SUCCESS' : 'WARNING'
        });
      }
    });

    this.saveSnapshot();
    return { delivery: del, request: req, transactions: createdTransactions };
  }

  // =========================================================================
  // PHASE 8: SALES SUMMARY, CASHIER REMITTANCE, CASH COUNT, EXPENSES & RECON
  // =========================================================================

  public calculateDenominationTotal(d?: CashDenominationCount | null): number {
    if (!d) return 0;
    return (
      (Number(d.d1000) || 0) * 1000 +
      (Number(d.d500) || 0) * 500 +
      (Number(d.d200) || 0) * 200 +
      (Number(d.d100) || 0) * 100 +
      (Number(d.d50) || 0) * 50 +
      (Number(d.d20) || 0) * 20 +
      (Number(d.d10) || 0) * 10 +
      (Number(d.d5) || 0) * 5 +
      (Number(d.d1) || 0) * 1
    );
  }

  public getDateFilterRange(preset?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (preset === 'TODAY') {
      // already today
    } else if (preset === 'LAST_7_DAYS') {
      start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'MONTHLY') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'YEARLY') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (preset === 'CUSTOM' && startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
      }
    }
    return { start, end };
  }

  // --- Shifts & Cash Count ---

  public openCashierShift(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    branchId: string,
    openingCash: number,
    notes?: string
  ): CashierShift {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER' && actorRole !== 'CASHIER') {
      throw new Error('Unauthorized: Only Cashiers, Managers, or Owners can open cashier shifts.');
    }

    const effectiveBranchId = actorRole === 'OWNER' ? branchId : (actorBranchId || branchId);
    const branch = this.branches.get(effectiveBranchId);
    if (!branch) {
      throw new Error('Branch not found.');
    }

    // Check if user already has an active OPEN shift
    for (const s of this.cashierShifts.values()) {
      if (s.cashier_id === actorId && s.status === 'OPEN') {
        throw new Error('You already have an active OPEN cashier shift. Please close your current shift first.');
      }
    }

    const profile = this.profiles.get(actorId);
    const cashierName = profile ? (profile.full_name || actorEmail) : actorEmail;
    const now = new Date().toISOString();
    const shiftSeq = this.cashierShiftSequence++;
    const shiftNumber = `SFT-${new Date().getFullYear()}-${String(shiftSeq).padStart(4, '0')}`;

    const shift: CashierShift = {
      id: crypto.randomUUID(),
      shift_number: shiftNumber,
      branch_id: branch.id,
      branch_name: branch.name,
      cashier_id: actorId,
      cashier_name: cashierName,
      opened_at: now,
      closed_at: null,
      status: 'OPEN',
      opening_cash: Number(openingCash) || 0,
      cash_sales: 0,
      cash_refunds: 0,
      cash_expenses: 0,
      cash_withdrawals: 0,
      expected_cash: Number(openingCash) || 0,
      actual_cash: null,
      variance: null,
      variance_status: null,
      variance_reason: null,
      denominations: null,
      total_sales: 0,
      total_orders: 0,
      notes: notes || null,
      created_at: now,
      updated_at: now
    };

    this.cashierShifts.set(shift.id, shift);

    // Also sync with legacy cashierSessions for POS compatibility
    const legacySession: CashierSession = {
      id: shift.id,
      branch_id: shift.branch_id,
      branch_name: shift.branch_name,
      cashier_id: shift.cashier_id,
      cashier_name: shift.cashier_name,
      opened_at: shift.opened_at,
      closed_at: null,
      opening_cash: shift.opening_cash,
      closing_cash: null,
      expected_cash: shift.expected_cash,
      actual_cash: null,
      cash_sales: 0,
      other_sales: 0,
      total_sales: 0,
      total_orders: 0,
      status: 'OPEN',
      notes: shift.notes || undefined,
      created_at: shift.created_at
    };
    this.cashierSessions.set(legacySession.id, legacySession);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'SHIFT_OPENED',
      entity_type: 'SHIFT',
      entity_id: shift.id,
      metadata: {
        shift_number: shift.shift_number,
        opening_cash: shift.opening_cash,
        branch_name: branch.name
      }
    });

    this.saveSnapshot();
    return shift;
  }

  public closeCashierShift(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    input: CloseShiftInput
  ): CashierShift {
    const shift = this.cashierShifts.get(input.shift_id);
    if (!shift) {
      throw new Error('Shift not found.');
    }

    if (shift.status !== 'OPEN') {
      throw new Error('Shift is already closed.');
    }

    // Role check: Cashier can only close own shift; Manager/Owner can close branch shifts
    if (actorRole === 'CASHIER' && shift.cashier_id !== actorId) {
      throw new Error('Unauthorized: You can only close your own cashier shift.');
    }

    const now = new Date().toISOString();
    const actualCash = this.calculateDenominationTotal(input.denominations);

    // Aggregate real orders during this shift (between opened_at and now for this branch and cashier)
    const shiftStartTime = new Date(shift.opened_at).getTime();
    const shiftEndTime = new Date(now).getTime();

    let cashSales = 0;
    let nonCashSales = 0;
    let totalSales = 0;
    let totalOrders = 0;
    let cashRefunds = 0;

    for (const order of this.orders.values()) {
      if (
        order.branch_id === shift.branch_id &&
        order.cashier_id === shift.cashier_id &&
        (order.status === 'PAID' || order.status === 'COMPLETED')
      ) {
        const orderTime = new Date(order.created_at).getTime();
        if (orderTime >= shiftStartTime && orderTime <= shiftEndTime) {
          totalOrders++;
          totalSales += order.total_amount;

          // Check payments
          const orderPayments = Array.from(this.payments.values()).filter(p => p.order_id === order.id && p.status === 'COMPLETED');
          if (orderPayments.length > 0) {
            orderPayments.forEach(p => {
              if (p.payment_method === 'CASH') {
                cashSales += p.amount;
              } else {
                nonCashSales += p.amount;
              }
            });
          } else {
            // Fallback to order payment method
            if (order.payment_method === 'CASH') {
              cashSales += order.total_amount;
            } else {
              nonCashSales += order.total_amount;
            }
          }
        }
      }
    }

    // Aggregate cash expenses for this branch/shift
    let cashExpenses = 0;
    for (const exp of this.expenses.values()) {
      if (
        exp.branch_id === shift.branch_id &&
        exp.payment_method === 'CASH' &&
        exp.status === 'APPROVED'
      ) {
        const expTime = new Date(exp.date).getTime();
        if (exp.shift_id === shift.id || (expTime >= shiftStartTime && expTime <= shiftEndTime)) {
          cashExpenses += exp.amount;
        }
      }
    }

    // Expected Cash = Opening Cash + Cash Sales - Cash Refunds - Cash Expenses
    const expectedCash = shift.opening_cash + cashSales - cashRefunds - cashExpenses;
    const variance = actualCash - expectedCash;
    const varianceStatus: VarianceStatus = variance === 0 ? 'BALANCED' : variance > 0 ? 'OVER' : 'SHORT';

    shift.closed_at = now;
    shift.status = 'CLOSED';
    shift.cash_sales = cashSales;
    shift.cash_refunds = cashRefunds;
    shift.cash_expenses = cashExpenses;
    shift.expected_cash = expectedCash;
    shift.actual_cash = actualCash;
    shift.variance = variance;
    shift.variance_status = varianceStatus;
    shift.variance_reason = input.variance_reason || null;
    shift.denominations = input.denominations;
    shift.total_sales = totalSales;
    shift.total_orders = totalOrders;
    if (input.notes) shift.notes = input.notes;
    shift.updated_at = now;

    // Sync legacy cashierSession
    const legacySession = this.cashierSessions.get(shift.id);
    if (legacySession) {
      legacySession.closed_at = now;
      legacySession.status = 'CLOSED';
      legacySession.closing_cash = actualCash;
      legacySession.actual_cash = actualCash;
      legacySession.expected_cash = expectedCash;
      legacySession.cash_sales = cashSales;
      legacySession.other_sales = nonCashSales;
      legacySession.total_sales = totalSales;
      legacySession.total_orders = totalOrders;
    }

    // Audit Log: Shift Closed & Cash Counted
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: shift.branch_id,
      action: 'SHIFT_CLOSED',
      entity_type: 'SHIFT',
      entity_id: shift.id,
      metadata: {
        shift_number: shift.shift_number,
        expected_cash: expectedCash,
        actual_cash: actualCash,
        variance: variance,
        variance_status: varianceStatus,
        variance_reason: input.variance_reason
      }
    });

    // Notify Owner if variance detected
    if (varianceStatus !== 'BALANCED') {
      const formattedVariance = variance > 0 ? `+₱${variance.toFixed(2)} OVER` : `-₱${Math.abs(variance).toFixed(2)} SHORT`;
      this.profiles.forEach(p => {
        if (p.role === 'OWNER' || (p.role === 'MANAGER' && p.branch_id === shift.branch_id)) {
          this.createNotification({
            recipient_user_id: p.id,
            title: `Cash Variance: ${shift.branch_name} (${varianceStatus})`,
            message: `Cashier ${shift.cashier_name} closed shift #${shift.shift_number} with variance of ${formattedVariance}. Reason: ${input.variance_reason || 'No reason specified'}.`,
            type: 'WARNING'
          });
        }
      });
    }

    // Auto-create & synchronize submitted CashRemittance for this closed cashier shift
    let existingRem: CashRemittance | undefined;
    for (const r of this.remittances.values()) {
      if (r.shift_id === shift.id) {
        existingRem = r;
        break;
      }
    }

    let remittanceToNotify: CashRemittance;
    if (!existingRem) {
      const remSeq = this.remittanceSequence++;
      const remNumber = `RMT-${new Date().getFullYear()}-${String(remSeq).padStart(4, '0')}`;
      const remittedAmount = actualCash;
      const cashVariance = variance;
      const grossSales = totalSales;

      const newRem: CashRemittance = {
        id: `rem-${shift.id}`,
        remittance_number: remNumber,
        shift_id: shift.id,
        branch_id: shift.branch_id,
        branch_name: shift.branch_name,
        cashier_id: shift.cashier_id,
        cashier_name: shift.cashier_name,
        date: (shift.opened_at || now).split('T')[0],
        expected_cash: expectedCash,
        actual_cash: actualCash,
        remitted_amount: remittedAmount,
        cash_variance: cashVariance,
        remittance_variance: 0,
        gross_sales: grossSales,
        variance_flag: Math.abs(cashVariance) < 0.01 ? 'TALLY' : cashVariance < 0 ? 'SHORTAGE' : 'OVERAGE',
        ai_reconciliation_notes: `Cashier shift closed with ₱${remittedAmount.toFixed(2)} cash counted. Ready for Manager review & vault verification.`,
        denomination_breakdown: input.denominations || null,
        proof_image_url: null,
        proof_type: 'Physical Cash Handover to Manager',
        notes: input.notes || input.variance_reason || 'Submitted on cashier shift close.',
        status: 'SUBMITTED',
        submitted_at: now,
        manager_id: null,
        manager_name: null,
        manager_verified_at: null,
        manager_verified_amount: null,
        manager_deductions_amount: null,
        manager_deductions_notes: null,
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        rejection_reason: null,
        correction_notes: null,
        created_at: now,
        updated_at: now
      };
      this.remittances.set(newRem.id, newRem);
      remittanceToNotify = newRem;
    } else {
      remittanceToNotify = existingRem;
    }

    // n8n Webhook: sales.daily_summary
    dispatchN8NWebhook('sales.daily_summary', {
      branch_id: shift.branch_id,
      branch_name: shift.branch_name,
      total_sales: totalSales,
      cash_breakdown: {
        opening_cash: shift.opening_cash,
        expected_cash: expectedCash,
        actual_cash: actualCash,
        cash_sales: cashSales,
        non_cash_sales: nonCashSales,
        cash_expenses: cashExpenses,
        denominations: input.denominations
      },
      variance: {
        amount: variance,
        flag: variance === 0 ? 'BALANCED' : variance > 0 ? 'OVERAGE' : 'SHORTAGE',
        status: varianceStatus,
        reason: input.variance_reason
      },
      order_metrics: {
        total_orders: totalOrders,
        completed_orders: totalOrders,
        average_order_value: totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) / 100 : 0
      },
      metadata: {
        shift_number: shift.shift_number,
        cashier_name: shift.cashier_name
      }
    }).catch(err => console.warn('[n8n Webhook Warning]', err));

    // n8n Webhook: remittance.submitted
    dispatchN8NWebhook('remittance.submitted', {
      branch_id: shift.branch_id,
      branch_name: shift.branch_name,
      total_sales: totalSales,
      cash_breakdown: {
        expected_cash: expectedCash,
        actual_cash: actualCash,
        remitted_amount: remittanceToNotify.remitted_amount,
        denominations: remittanceToNotify.denomination_breakdown
      },
      variance: {
        amount: remittanceToNotify.cash_variance,
        flag: remittanceToNotify.variance_flag as any,
        reason: remittanceToNotify.notes
      },
      order_metrics: {
        total_orders: totalOrders
      },
      metadata: {
        remittance_number: remittanceToNotify.remittance_number,
        cashier_name: shift.cashier_name,
        shift_number: shift.shift_number
      }
    }).catch(err => console.warn('[n8n Webhook Warning]', err));

    this.saveSnapshot();
    return shift;
  }

  public getCashierShifts(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      cashier_id?: string;
      date?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    }
  ): CashierShift[] {
    let result = Array.from(this.cashierShifts.values());

    // Role filtering (Manager restricted to branch; Cashier restricted to own shifts)
    if (actorRole === 'MANAGER') {
      result = result.filter(s => s.branch_id === actorBranchId);
    } else if (actorRole === 'CASHIER') {
      result = result.filter(s => s.cashier_id === actorBranchId || s.branch_id === actorBranchId);
    } else if (actorRole === 'OWNER' && filters.branch_id) {
      result = result.filter(s => s.branch_id === filters.branch_id);
    }

    if (filters.cashier_id) {
      result = result.filter(s => s.cashier_id === filters.cashier_id);
    }

    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }

    if (filters.date) {
      result = result.filter(s => s.opened_at.startsWith(filters.date!));
    }

    if (filters.start_date) {
      const start = new Date(filters.start_date).getTime();
      result = result.filter(s => new Date(s.opened_at).getTime() >= start);
    }

    if (filters.end_date) {
      const end = new Date(filters.end_date).setHours(23, 59, 59, 999);
      result = result.filter(s => new Date(s.opened_at).getTime() <= end);
    }

    return result.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  }

  public getCashierShiftById(
    actorRole: UserRole,
    actorBranchId: string | null,
    shiftId: string
  ): CashierShift {
    const shift = this.cashierShifts.get(shiftId);
    if (!shift) {
      throw new Error('Shift not found.');
    }

    if (actorRole === 'MANAGER' && shift.branch_id !== actorBranchId) {
      throw new Error('Unauthorized: Cannot access shifts from other branches.');
    }

    return shift;
  }

  // --- Remittances ---

  public createRemittance(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    input: CreateRemittanceInput
  ): CashRemittance {
    const shift = this.cashierShifts.get(input.shift_id);
    if (!shift) {
      throw new Error('Shift not found.');
    }

    // Check if active submitted remittance already exists for this shift
    for (const r of this.remittances.values()) {
      if (r.shift_id === shift.id && (r.status === 'SUBMITTED' || r.status === 'APPROVED' || r.status === 'RECONCILED')) {
        throw new Error(`A remittance has already been submitted for Shift #${shift.shift_number} (${r.remittance_number}).`);
      }
    }

    const now = new Date().toISOString();
    const remSeq = this.remittanceSequence++;
    const remNumber = `RMT-${new Date().getFullYear()}-${String(remSeq).padStart(4, '0')}`;
    const remittedAmount = Number(input.remitted_amount) || 0;
    const actualCash = shift.actual_cash !== null ? shift.actual_cash : shift.expected_cash;
    const cashVariance = shift.variance || 0;
    const remittanceVariance = Math.round((remittedAmount - actualCash) * 100) / 100;
    const grossSales = Math.round(((shift.total_cash_sales || 0) + (shift.total_non_cash_sales || 0)) * 100) / 100;

    let varianceFlag: 'TALLY' | 'SHORTAGE' | 'OVERAGE' = 'TALLY';
    if (remittanceVariance < -0.01) {
      varianceFlag = 'SHORTAGE';
    } else if (remittanceVariance > 0.01) {
      varianceFlag = 'OVERAGE';
    }

    let aiReconNotes = '';
    if (varianceFlag === 'TALLY') {
      aiReconNotes = `System AI Reconciliation: 100% Cash Drawer Tally. Physical cash remitted (₱${remittedAmount.toFixed(2)}) perfectly balances with POS register closing cash (₱${actualCash.toFixed(2)}).`;
    } else if (varianceFlag === 'SHORTAGE') {
      aiReconNotes = `System AI Warning: Cash Shortage of ₱${Math.abs(remittanceVariance).toFixed(2)}. Physical remittance is lower than recorded POS shift transactions. Verify unentered store expenses or change discrepancy.`;
    } else {
      aiReconNotes = `System AI Audit: Cash Overage of +₱${remittanceVariance.toFixed(2)}. Remitted physical cash exceeds recorded POS cash sales. Verify customer tips or float excess.`;
    }

    const remittance: CashRemittance = {
      id: crypto.randomUUID(),
      remittance_number: remNumber,
      shift_id: shift.id,
      branch_id: shift.branch_id,
      branch_name: shift.branch_name,
      cashier_id: shift.cashier_id,
      cashier_name: shift.cashier_name,
      date: shift.opened_at.split('T')[0],
      expected_cash: shift.expected_cash,
      actual_cash: actualCash,
      remitted_amount: remittedAmount,
      cash_variance: cashVariance,
      remittance_variance: remittanceVariance,
      gross_sales: grossSales,
      variance_flag: varianceFlag,
      ai_reconciliation_notes: aiReconNotes,
      denomination_breakdown: input.denomination_breakdown || null,
      proof_image_url: input.proof_image_url || null,
      proof_type: input.proof_type || 'Photo / Receipt',
      notes: input.notes || null,
      status: 'SUBMITTED',
      submitted_at: now,
      manager_id: null,
      manager_name: null,
      manager_verified_at: null,
      manager_verified_amount: null,
      manager_deductions_amount: null,
      manager_deductions_notes: null,
      reviewed_by: null,
      reviewed_by_name: null,
      reviewed_at: null,
      rejection_reason: null,
      correction_notes: null,
      created_at: now,
      updated_at: now
    };

    this.remittances.set(remittance.id, remittance);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: shift.branch_id,
      action: 'REMITTANCE_SUBMITTED',
      entity_type: 'REMITTANCE',
      entity_id: remittance.id,
      metadata: {
        remittance_number: remittance.remittance_number,
        shift_number: shift.shift_number,
        remitted_amount: remittedAmount,
        gross_sales: grossSales,
        variance_flag: varianceFlag,
        has_proof: !!remittance.proof_image_url
      }
    });

    // Notify Owner and Manager
    this.profiles.forEach(p => {
      if (p.role === 'OWNER' || (p.role === 'MANAGER' && p.branch_id === shift.branch_id)) {
        this.createNotification({
          recipient_user_id: p.id,
          title: `Remittance Ticket: ${remNumber}`,
          message: `${shift.branch_name} cashier ${shift.cashier_name} submitted ₱${remittedAmount.toFixed(2)} cash remittance [${varianceFlag}].`,
          type: varianceFlag === 'SHORTAGE' ? 'WARNING' : 'INFO'
        });
      }
    });

    // n8n Webhook: remittance.submitted
    dispatchN8NWebhook('remittance.submitted', {
      branch_id: shift.branch_id,
      branch_name: shift.branch_name,
      total_sales: grossSales,
      cash_breakdown: {
        expected_cash: shift.expected_cash,
        actual_cash: actualCash,
        remitted_amount: remittedAmount,
        denominations: input.denomination_breakdown
      },
      variance: {
        amount: remittanceVariance,
        flag: varianceFlag
      },
      order_metrics: {
        total_orders: shift.total_orders || 0
      },
      metadata: {
        remittance_number: remNumber,
        cashier_name: shift.cashier_name,
        shift_number: shift.shift_number,
        proof_type: input.proof_type
      }
    }).catch(err => console.warn('[n8n Webhook Warning]', err));

    this.saveSnapshot();
    return remittance;
  }

  public reviewRemittance(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    remittanceId: string,
    action: 'APPROVE' | 'VERIFY' | 'REJECT' | 'FOR_REVIEW' | 'RECONCILE',
    rejection_reason?: string,
    correction_notes?: string,
    extraOptions?: {
      manager_verified_amount?: number;
      manager_deductions_amount?: number;
      manager_deductions_notes?: string;
    }
  ): CashRemittance {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only Owners or Managers can review remittances.');
    }

    const rem = this.remittances.get(remittanceId);
    if (!rem) {
      throw new Error('Remittance record not found.');
    }

    const now = new Date().toISOString();
    const profile = this.profiles.get(actorId);
    const reviewerName = profile ? `${profile.first_name} ${profile.last_name}` : actorEmail;

    if (action === 'VERIFY') {
      rem.status = 'VERIFIED';
      rem.manager_id = actorId;
      rem.manager_name = reviewerName;
      rem.manager_verified_at = now;
      rem.manager_verified_amount = extraOptions?.manager_verified_amount !== undefined ? Number(extraOptions.manager_verified_amount) : rem.remitted_amount;
      rem.manager_deductions_amount = extraOptions?.manager_deductions_amount !== undefined ? Number(extraOptions.manager_deductions_amount) : 0;
      rem.manager_deductions_notes = extraOptions?.manager_deductions_notes || null;
      rem.reviewed_by = actorId;
      rem.reviewed_by_name = reviewerName;
      rem.reviewed_at = now;
      if (rem.manager_deductions_amount > 0) {
        rem.ai_reconciliation_notes = `${rem.ai_reconciliation_notes || ''} | Manager Verified: ₱${rem.manager_deductions_amount.toFixed(2)} cash deduction (${rem.manager_deductions_notes || 'Authorized branch expense'}). Net remittance safe count: ₱${(rem.manager_verified_amount - rem.manager_deductions_amount).toFixed(2)}.`;

        // Record approved branch expense for financial accounting consistency
        const expenseId = `exp-rem-${rem.id}`;
        if (!this.expenses.has(expenseId)) {
          const expSeq = this.expenseSequence++;
          const expenseNumber = `EXP-${new Date().getFullYear()}-${String(expSeq).padStart(4, '0')}`;
          const expenseRecord: BranchExpense = {
            id: expenseId,
            expense_number: expenseNumber,
            branch_id: rem.branch_id,
            branch_name: rem.branch_name,
            shift_id: rem.shift_id,
            category: 'SUPPLIES',
            amount: rem.manager_deductions_amount,
            payment_method: 'CASH',
            description: rem.manager_deductions_notes || `Manager Approved Cash Deduction (${rem.remittance_number})`,
            receipt_image_url: rem.proof_image_url,
            status: 'APPROVED',
            date: rem.date,
            created_by: actorId,
            created_by_name: reviewerName,
            created_by_role: actorRole,
            approved_by: actorId,
            approved_by_name: reviewerName,
            approved_at: now,
            rejection_reason: null,
            created_at: now,
            updated_at: now
          };
          this.expenses.set(expenseRecord.id, expenseRecord);
        }
      }
    } else if (action === 'APPROVE') {
      rem.status = 'APPROVED';
      rem.reviewed_by = actorId;
      rem.reviewed_by_name = reviewerName;
      rem.reviewed_at = now;
      rem.rejection_reason = null;
    } else if (action === 'REJECT') {
      rem.status = 'REJECTED';
      rem.reviewed_by = actorId;
      rem.reviewed_by_name = reviewerName;
      rem.reviewed_at = now;
      rem.rejection_reason = rejection_reason || 'Remittance proof or amount rejected.';
    } else if (action === 'FOR_REVIEW') {
      rem.status = 'FOR_REVIEW';
      rem.correction_notes = correction_notes || 'Requires cashier adjustment or clearer proof.';
    } else if (action === 'RECONCILE') {
      rem.status = 'RECONCILED';
      rem.reviewed_by = actorId;
      rem.reviewed_by_name = reviewerName;
      rem.reviewed_at = now;
    }
    rem.updated_at = now;

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: rem.branch_id,
      action: action === 'VERIFY' ? 'REMITTANCE_VERIFIED_BY_MANAGER' : action === 'APPROVE' ? 'REMITTANCE_APPROVED' : action === 'REJECT' ? 'REMITTANCE_REJECTED' : 'REMITTANCE_UPDATED',
      entity_type: 'REMITTANCE',
      entity_id: rem.id,
      metadata: {
        remittance_number: rem.remittance_number,
        action: action,
        manager_name: reviewerName,
        manager_deductions: extraOptions?.manager_deductions_amount,
        reason: rejection_reason || correction_notes
      }
    });

    // Notify cashier
    this.createNotification({
      recipient_user_id: rem.cashier_id,
      title: `Remittance ${rem.remittance_number}: ${rem.status}`,
      message: action === 'APPROVE'
        ? `Your remittance of ₱${rem.remitted_amount.toFixed(2)} has been APPROVED by ${reviewerName}.`
        : `Your remittance status is ${rem.status}. ${rejection_reason || correction_notes || ''}`,
      type: action === 'APPROVE' ? 'SUCCESS' : 'WARNING'
    });

    // n8n Webhook: remittance.submitted (updated status)
    dispatchN8NWebhook('remittance.submitted', {
      branch_id: rem.branch_id,
      branch_name: rem.branch_name,
      total_sales: rem.gross_sales,
      cash_breakdown: {
        expected_cash: rem.expected_cash,
        actual_cash: rem.actual_cash,
        remitted_amount: rem.manager_verified_amount ?? rem.remitted_amount,
        cash_expenses: rem.manager_deductions_amount ?? 0,
        denominations: rem.denomination_breakdown
      },
      variance: {
        amount: rem.remittance_variance,
        flag: rem.variance_flag as any
      },
      metadata: {
        action,
        remittance_number: rem.remittance_number,
        reviewer_name: reviewerName,
        manager_deductions: rem.manager_deductions_amount,
        status: rem.status
      }
    }).catch(err => console.warn('[n8n Webhook Warning]', err));

    this.saveSnapshot();
    return rem;
  }

  public getRemittances(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      cashier_id?: string;
      date?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    }
  ): CashRemittance[] {
    // 1. Auto-synchronize: ensure every closed cashier shift has a corresponding remittance record
    for (const shift of this.cashierShifts.values()) {
      if (shift.status === 'CLOSED') {
        let exists = false;
        for (const r of this.remittances.values()) {
          if (r.shift_id === shift.id) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          const remSeq = this.remittanceSequence++;
          const remNumber = `RMT-${new Date().getFullYear()}-${String(remSeq).padStart(4, '0')}`;
          const remittedAmount = shift.actual_cash !== null ? shift.actual_cash : shift.expected_cash;
          const cashVariance = shift.variance || 0;
          const grossSales = Math.round((shift.total_sales || 0) * 100) / 100;
          const autoRem: CashRemittance = {
            id: `rem-${shift.id}`,
            remittance_number: remNumber,
            shift_id: shift.id,
            branch_id: shift.branch_id,
            branch_name: shift.branch_name,
            cashier_id: shift.cashier_id,
            cashier_name: shift.cashier_name,
            date: (shift.opened_at || new Date().toISOString()).split('T')[0],
            expected_cash: shift.expected_cash,
            actual_cash: remittedAmount,
            remitted_amount: remittedAmount,
            cash_variance: cashVariance,
            remittance_variance: 0,
            gross_sales: grossSales,
            variance_flag: Math.abs(cashVariance) < 0.01 ? 'TALLY' : cashVariance < 0 ? 'SHORTAGE' : 'OVERAGE',
            ai_reconciliation_notes: `Cashier shift closed with ₱${remittedAmount.toFixed(2)} cash counted. Ready for Manager review & vault verification.`,
            denomination_breakdown: shift.denominations || null,
            proof_image_url: null,
            proof_type: 'Physical Cash Handover to Manager',
            notes: shift.notes || 'Submitted on cashier shift close.',
            status: 'SUBMITTED',
            submitted_at: shift.closed_at || shift.updated_at || new Date().toISOString(),
            manager_id: null,
            manager_name: null,
            manager_verified_at: null,
            manager_verified_amount: null,
            manager_deductions_amount: null,
            manager_deductions_notes: null,
            reviewed_by: null,
            reviewed_by_name: null,
            reviewed_at: null,
            rejection_reason: null,
            correction_notes: null,
            created_at: shift.closed_at || shift.created_at || new Date().toISOString(),
            updated_at: shift.updated_at || new Date().toISOString()
          };
          this.remittances.set(autoRem.id, autoRem);
        }
      }
    }

    let result = Array.from(this.remittances.values());

    console.log(`[DB:getRemittances] Total raw remittances in memory: ${result.length}. Filtering for role: ${actorRole}, actorBranchId: ${actorBranchId}, filters:`, filters);

    // Role-based branch isolation and filtering:
    if (actorRole === 'MANAGER') {
      // Branch Manager: automatically default to manager's assigned branchId
      const managerBranch = actorBranchId || (filters.branch_id && filters.branch_id !== 'ALL' ? filters.branch_id : null);
      if (managerBranch) {
        result = result.filter(r => r.branch_id === managerBranch);
      }
    } else if (actorRole === 'CASHIER') {
      const cashierBranch = actorBranchId;
      if (cashierBranch) {
        result = result.filter(r => r.cashier_id === cashierBranch || r.branch_id === cashierBranch);
      }
    } else if (actorRole === 'OWNER') {
      // Master Owner: Return aggregated data for ALL branches if branchId is not specified or set to "ALL", or filtered by the selected branch.
      if (filters.branch_id && filters.branch_id !== 'ALL') {
        result = result.filter(r => r.branch_id === filters.branch_id);
      }
    } else {
      if (filters.branch_id && filters.branch_id !== 'ALL') {
        result = result.filter(r => r.branch_id === filters.branch_id);
      }
    }

    if (filters.cashier_id) {
      result = result.filter(r => r.cashier_id === filters.cashier_id);
    }
    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }
    if (filters.date) {
      result = result.filter(r => r.date === filters.date);
    }
    if (filters.start_date) {
      result = result.filter(r => r.date >= filters.start_date!);
    }
    if (filters.end_date) {
      result = result.filter(r => r.date <= filters.end_date!);
    }

    // Defensive enrichment: ensure denomination_breakdown, gross_sales, and variance_flag are never null/undefined
    result = result.map(rem => {
      const copy = { ...rem };
      if (!copy.denomination_breakdown && copy.shift_id) {
        const shift = this.cashierShifts.get(copy.shift_id);
        if (shift && shift.denominations) {
          copy.denomination_breakdown = shift.denominations;
        }
      }
      if ((copy.gross_sales === undefined || copy.gross_sales === null || copy.gross_sales === 0) && copy.shift_id) {
        const shift = this.cashierShifts.get(copy.shift_id);
        if (shift) {
          copy.gross_sales = shift.total_sales || copy.expected_cash;
        }
      }
      if (!copy.variance_flag) {
        const v = copy.cash_variance !== undefined ? copy.cash_variance : ((copy.remitted_amount || 0) - (copy.expected_cash || 0));
        copy.variance_flag = Math.abs(v) < 0.01 ? 'TALLY' : v < 0 ? 'SHORTAGE' : 'OVERAGE';
      }
      return copy;
    });

    console.log(`[DB:getRemittances] Returning ${result.length} filtered & enriched remittances`);
    return result.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
  }

  // --- Branch Expenses ---

  public createExpense(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: CreateExpenseInput
  ): BranchExpense {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only Managers and Owners can record branch expenses.');
    }

    const effectiveBranchId = actorRole === 'OWNER' ? input.branch_id : (actorBranchId || input.branch_id);
    const branch = this.branches.get(effectiveBranchId);
    if (!branch) {
      throw new Error('Branch not found.');
    }

    const profile = this.profiles.get(actorId);
    const creatorName = profile ? (profile.full_name || actorEmail) : actorEmail;
    const now = new Date().toISOString();
    const expSeq = this.expenseSequence++;
    const expNumber = `EXP-${new Date().getFullYear()}-${String(expSeq).padStart(4, '0')}`;

    const expense: BranchExpense = {
      id: crypto.randomUUID(),
      expense_number: expNumber,
      branch_id: branch.id,
      branch_name: branch.name,
      shift_id: input.shift_id || null,
      date: input.date || now.split('T')[0],
      category: input.category,
      description: input.description,
      amount: Number(input.amount) || 0,
      payment_method: input.payment_method || 'CASH',
      proof_image_url: input.proof_image_url || null,
      status: actorRole === 'OWNER' ? 'APPROVED' : 'APPROVED', // auto-approved for manager as standard store petty cash, can be audited
      created_by: actorId,
      created_by_name: creatorName,
      created_by_role: actorRole,
      approved_by: actorRole === 'OWNER' ? actorId : null,
      approved_by_name: actorRole === 'OWNER' ? creatorName : null,
      approved_at: actorRole === 'OWNER' ? now : null,
      rejection_reason: null,
      created_at: now,
      updated_at: now
    };

    this.expenses.set(expense.id, expense);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'EXPENSE_RECORDED',
      entity_type: 'EXPENSE',
      entity_id: expense.id,
      metadata: {
        expense_number: expense.expense_number,
        category: expense.category,
        amount: expense.amount,
        payment_method: expense.payment_method,
        branch_name: branch.name
      }
    });

    this.saveSnapshot();
    return expense;
  }

  public reviewExpense(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    expenseId: string,
    action: 'APPROVE' | 'REJECT',
    rejection_reason?: string
  ): BranchExpense {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only Owners can approve or reject expenses.');
    }

    const exp = this.expenses.get(expenseId);
    if (!exp) {
      throw new Error('Expense not found.');
    }

    const now = new Date().toISOString();
    const profile = this.profiles.get(actorId);
    const reviewerName = profile ? `${profile.first_name} ${profile.last_name}` : actorEmail;

    if (action === 'APPROVE') {
      exp.status = 'APPROVED';
      exp.approved_by = actorId;
      exp.approved_by_name = reviewerName;
      exp.approved_at = now;
      exp.rejection_reason = null;
    } else {
      exp.status = 'REJECTED';
      exp.approved_by = actorId;
      exp.approved_by_name = reviewerName;
      exp.approved_at = now;
      exp.rejection_reason = rejection_reason || 'Expense rejected by Owner.';
    }
    exp.updated_at = now;

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: exp.branch_id,
      action: action === 'APPROVE' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
      entity_type: 'EXPENSE',
      entity_id: exp.id,
      metadata: {
        expense_number: exp.expense_number,
        action,
        reason: rejection_reason
      }
    });

    this.saveSnapshot();
    return exp;
  }

  public getExpenses(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      category?: string;
      status?: string;
      payment_method?: string;
      start_date?: string;
      end_date?: string;
    }
  ): BranchExpense[] {
    let result = Array.from(this.expenses.values());

    if (actorRole === 'MANAGER' || actorRole === 'CASHIER') {
      result = result.filter(e => e.branch_id === actorBranchId);
    } else if (actorRole === 'OWNER' && filters.branch_id) {
      result = result.filter(e => e.branch_id === filters.branch_id);
    }

    if (filters.category) {
      result = result.filter(e => e.category === filters.category);
    }
    if (filters.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters.payment_method) {
      result = result.filter(e => e.payment_method === filters.payment_method);
    }
    if (filters.start_date) {
      result = result.filter(e => e.date >= filters.start_date!);
    }
    if (filters.end_date) {
      result = result.filter(e => e.date <= filters.end_date!);
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // --- Sales Summary & Financial Metrics ---

  public getSalesSummary(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      cashier_id?: string;
      date_preset?: string;
      start_date?: string;
      end_date?: string;
      payment_method?: string;
      source?: string;
    }
  ): SalesSummaryMetrics {
    const { start, end } = this.getDateFilterRange(filters.date_preset, filters.start_date, filters.end_date);
    const startTime = start.getTime();
    const endTime = end.getTime();

    // For Branch Manager: Automatically default to the manager's assigned branchId
    // For Master Owner: Return aggregated data for ALL branches if branchId is not specified or set to "ALL", or filtered by the selected branch
    const effectiveBranchId = (actorRole === 'MANAGER' || actorRole === 'CASHIER')
      ? (actorBranchId || null)
      : (filters.branch_id && filters.branch_id !== 'ALL' ? filters.branch_id : null);

    console.log(`[DB:getSalesSummary] Calculating for role ${actorRole}, actorBranchId: ${actorBranchId}, effectiveBranchId: ${effectiveBranchId || 'ALL'}`);

    let grossSales = 0;
    let discounts = 0;
    let refunds = 0;
    let voids = 0;
    let voidCount = 0;
    let orderCount = 0;
    let posOrderCount = 0;
    let posSales = 0;
    let kioskOrderCount = 0;
    let kioskSales = 0;

    let cashSales = 0;
    let gcashSales = 0;
    let mayaSales = 0;
    let qrphSales = 0;
    let bankSales = 0;
    let otherSales = 0;

    let cashCount = 0;
    let gcashCount = 0;
    let mayaCount = 0;
    let qrphCount = 0;
    let bankCount = 0;
    let otherCount = 0;

    let totalCogs = 0;

    // Filter relevant orders
    for (const order of this.orders.values()) {
      if (effectiveBranchId && order.branch_id !== effectiveBranchId) continue;
      if (filters.cashier_id && order.cashier_id !== filters.cashier_id) continue;
      if (filters.source && order.source !== filters.source) continue;

      const orderTime = new Date(order.created_at).getTime();
      if (orderTime < startTime || orderTime > endTime) continue;

      // Check voided
      if (order.status === 'CANCELLED') {
        voids += order.total_amount;
        voidCount++;
        continue;
      }

      if (order.status === 'PAID' || order.status === 'COMPLETED') {
        orderCount++;
        grossSales += (order.subtotal || order.total_amount);
        discounts += (order.discount_amount || 0);

        if (order.source === 'KIOSK') {
          kioskOrderCount++;
          kioskSales += order.total_amount;
        } else {
          posOrderCount++;
          posSales += order.total_amount;
        }

        // Calculate COGS from recipe costs
        const items = Array.from(this.orderItems.values()).filter(oi => oi.order_id === order.id);
        for (const item of items) {
          const recipe = this.recipes.get(item.product_id);
          if (recipe && recipe.items) {
            for (const rItem of recipe.items) {
              const ing = this.ingredients.get(rItem.ingredient_id);
              if (ing) {
                totalCogs += (rItem.quantity_consumed * ing.cost_price * item.quantity);
              }
            }
          }
        }

        // Payment breakdown
        const orderPayments = Array.from(this.payments.values()).filter(p => p.order_id === order.id && p.status === 'COMPLETED');
        if (orderPayments.length > 0) {
          orderPayments.forEach(p => {
            if (p.payment_method === 'CASH') {
              cashSales += p.amount;
              cashCount++;
            } else if (p.payment_method === 'GCASH') {
              gcashSales += p.amount;
              gcashCount++;
            } else if (p.payment_method === 'MAYA') {
              mayaSales += p.amount;
              mayaCount++;
            } else if (p.payment_method === 'QRPH') {
              qrphSales += p.amount;
              qrphCount++;
            } else if (p.payment_method === 'BANK_TRANSFER') {
              bankSales += p.amount;
              bankCount++;
            } else {
              otherSales += p.amount;
              otherCount++;
            }
          });
        } else {
          // Fallback based on order payment_method
          const amt = order.total_amount;
          if (order.payment_method === 'CASH') {
            cashSales += amt;
            cashCount++;
          } else if (order.payment_method === 'GCASH') {
            gcashSales += amt;
            gcashCount++;
          } else if (order.payment_method === 'MAYA') {
            mayaSales += amt;
            mayaCount++;
          } else if (order.payment_method === 'QRPH') {
            qrphSales += amt;
            qrphCount++;
          } else if (order.payment_method === 'BANK_TRANSFER') {
            bankSales += amt;
            bankCount++;
          } else {
            otherSales += amt;
            otherCount++;
          }
        }
      }
    }

    // Net sales calculation: Gross - Discounts - Refunds - Voids
    const netSales = Math.max(0, grossSales - discounts - refunds);
    const grossProfit = Math.max(0, netSales - totalCogs);

    // Expenses in this period
    let totalExpenses = 0;
    let cashExpenses = 0;
    let nonCashExpenses = 0;

    for (const exp of this.expenses.values()) {
      if (effectiveBranchId && exp.branch_id !== effectiveBranchId) continue;
      if (exp.status !== 'APPROVED') continue;

      const expTime = new Date(exp.date).getTime();
      if (expTime < startTime || expTime > endTime) continue;

      totalExpenses += exp.amount;
      if (exp.payment_method === 'CASH') {
        cashExpenses += exp.amount;
      } else {
        nonCashExpenses += exp.amount;
      }
    }

    // Shifts in this period to aggregate Expected vs Actual Cash
    let totalExpectedCash = 0;
    let totalActualCash = 0;

    for (const shift of this.cashierShifts.values()) {
      if (effectiveBranchId && shift.branch_id !== effectiveBranchId) continue;
      if (filters.cashier_id && shift.cashier_id !== filters.cashier_id) continue;

      const shiftTime = new Date(shift.opened_at).getTime();
      if (shiftTime >= startTime && shiftTime <= endTime) {
        totalExpectedCash += shift.expected_cash;
        if (shift.actual_cash !== null) {
          totalActualCash += shift.actual_cash;
        } else {
          totalActualCash += shift.expected_cash;
        }
      }
    }

    // If no shifts in range, fallback expected cash from cash sales - cash expenses
    if (totalExpectedCash === 0) {
      totalExpectedCash = cashSales - cashExpenses;
      totalActualCash = cashSales - cashExpenses;
    }

    const cashVariance = totalActualCash - totalExpectedCash;
    const totalPaymentSum = cashSales + gcashSales + mayaSales + qrphSales + bankSales + otherSales;

    const paymentBreakdown: PaymentBreakdownItem[] = [
      {
        method: 'CASH',
        name: 'Cash',
        count: cashCount,
        amount: cashSales,
        percentage: totalPaymentSum > 0 ? (cashSales / totalPaymentSum) * 100 : 0
      },
      {
        method: 'GCASH',
        name: 'GCash',
        count: gcashCount,
        amount: gcashSales,
        percentage: totalPaymentSum > 0 ? (gcashSales / totalPaymentSum) * 100 : 0
      },
      {
        method: 'MAYA',
        name: 'Maya',
        count: mayaCount,
        amount: mayaSales,
        percentage: totalPaymentSum > 0 ? (mayaSales / totalPaymentSum) * 100 : 0
      },
      {
        method: 'QRPH',
        name: 'QRPH',
        count: qrphCount,
        amount: qrphSales,
        percentage: totalPaymentSum > 0 ? (qrphSales / totalPaymentSum) * 100 : 0
      },
      {
        method: 'BANK_TRANSFER',
        name: 'Bank Transfer',
        count: bankCount,
        amount: bankSales,
        percentage: totalPaymentSum > 0 ? (bankSales / totalPaymentSum) * 100 : 0
      },
      {
        method: 'OTHER',
        name: 'Other',
        count: otherCount,
        amount: otherSales,
        percentage: totalPaymentSum > 0 ? (otherSales / totalPaymentSum) * 100 : 0
      }
    ];

    // Tally Loyalty Redemptions Claimed (Free meals redeemed with zero cash impact)
    let loyaltyRedemptionsClaimedCount = 0;
    let loyaltyRedemptionsClaimedPoints = 0;
    let loyaltyRedemptionsEquivalentValue = 0;
    const loyaltyRedemptionsItems: any[] = [];

    for (const r of this.loyaltyRedemptions.values()) {
      if (effectiveBranchId && r.branch_id !== effectiveBranchId) continue;
      const rTime = new Date(r.redeemed_at).getTime();
      if (rTime >= startTime && rTime <= endTime) {
        loyaltyRedemptionsClaimedCount += 1;
        loyaltyRedemptionsClaimedPoints += (r.points_spent || 200);
        loyaltyRedemptionsEquivalentValue += (r.retail_value || 150);
        loyaltyRedemptionsItems.push({
          id: r.id,
          customer_name: r.customer_name,
          product_name: r.product_name,
          points_spent: r.points_spent || 200,
          cashier_name: r.cashier_name,
          branch_name: r.branch_name,
          redeemed_at: r.redeemed_at,
          reward_ticket_number: r.reward_ticket_number || undefined
        });
      }
    }

    return {
      total_sales: netSales,
      gross_sales: grossSales,
      discounts,
      refunds,
      voids,
      void_count: voidCount,
      net_sales: netSales,
      expenses: totalExpenses,
      cash_expenses: cashExpenses,
      non_cash_expenses: nonCashExpenses,
      expected_cash: totalExpectedCash,
      actual_cash: totalActualCash,
      cash_variance: cashVariance,
      cogs: totalCogs,
      gross_profit: grossProfit,
      order_count: orderCount,
      pos_order_count: posOrderCount,
      pos_sales: posSales,
      kiosk_order_count: kioskOrderCount,
      kiosk_sales: kioskSales,
      payment_breakdown: paymentBreakdown,
      cash_sales: cashSales,
      gcash_sales: gcashSales,
      maya_sales: mayaSales,
      qrph_sales: qrphSales,
      bank_transfer_sales: bankSales,
      other_payments: otherSales,
      e_wallet_sales: gcashSales + mayaSales + qrphSales,
      loyalty_redemptions_claimed_count: loyaltyRedemptionsClaimedCount,
      loyalty_redemptions_claimed_points: loyaltyRedemptionsClaimedPoints,
      loyalty_redemptions_equivalent_value: loyaltyRedemptionsEquivalentValue,
      loyalty_redemptions_items: loyaltyRedemptionsItems
    };
  }

  public getDailySalesReports(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      date_preset?: string;
      start_date?: string;
      end_date?: string;
    }
  ): DailySalesReport[] {
    const { start, end } = this.getDateFilterRange(filters.date_preset, filters.start_date, filters.end_date);
    const startTime = start.getTime();
    const endTime = end.getTime();

    // For Branch Manager: Automatically default to the manager's assigned branchId
    // For Master Owner: Return aggregated data for ALL branches if branchId is not specified or set to "ALL", or filtered by the selected branch
    const effectiveBranchId = (actorRole === 'MANAGER' || actorRole === 'CASHIER')
      ? (actorBranchId || null)
      : (filters.branch_id && filters.branch_id !== 'ALL' ? filters.branch_id : null);

    console.log(`[DB:getDailySalesReports] Aggregating daily sales reports for role ${actorRole}, actorBranchId: ${actorBranchId}, effectiveBranchId: ${effectiveBranchId || 'ALL'}`);

    // Group key: `${date}_${branch_id}`
    const map = new Map<string, DailySalesReport>();

    for (const order of this.orders.values()) {
      if (effectiveBranchId && order.branch_id !== effectiveBranchId) continue;
      const orderTime = new Date(order.created_at).getTime();
      if (orderTime < startTime || orderTime > endTime) continue;

      const dateStr = order.created_at.split('T')[0];
      const key = `${dateStr}_${order.branch_id}`;

      if (!map.has(key)) {
        map.set(key, {
          date: dateStr,
          branch_id: order.branch_id,
          branch_name: order.branch_name || 'Branch',
          gross_sales: 0,
          discounts: 0,
          refunds: 0,
          voids: 0,
          net_sales: 0,
          cogs: 0,
          gross_profit: 0,
          cash_sales: 0,
          gcash_sales: 0,
          maya_sales: 0,
          qrph_sales: 0,
          bank_sales: 0,
          other_sales: 0,
          expenses: 0,
          cash_expenses: 0,
          expected_cash: 0,
          actual_cash: 0,
          variance: 0,
          order_count: 0
        });
      }

      const rec = map.get(key)!;

      if (order.status === 'CANCELLED') {
        rec.voids += order.total_amount;
        continue;
      }

      if (order.status === 'PAID' || order.status === 'COMPLETED') {
        rec.order_count++;
        rec.gross_sales += (order.subtotal || order.total_amount);
        rec.discounts += (order.discount_amount || 0);

        // COGS
        const items = Array.from(this.orderItems.values()).filter(oi => oi.order_id === order.id);
        for (const item of items) {
          const recipe = this.recipes.get(item.product_id);
          if (recipe && recipe.items) {
            for (const rItem of recipe.items) {
              const ing = this.ingredients.get(rItem.ingredient_id);
              if (ing) {
                rec.cogs += (rItem.quantity_consumed * ing.cost_price * item.quantity);
              }
            }
          }
        }

        // Payments
        const orderPayments = Array.from(this.payments.values()).filter(p => p.order_id === order.id && p.status === 'COMPLETED');
        if (orderPayments.length > 0) {
          orderPayments.forEach(p => {
            if (p.payment_method === 'CASH') rec.cash_sales += p.amount;
            else if (p.payment_method === 'GCASH') rec.gcash_sales += p.amount;
            else if (p.payment_method === 'MAYA') rec.maya_sales += p.amount;
            else if (p.payment_method === 'QRPH') rec.qrph_sales += p.amount;
            else if (p.payment_method === 'BANK_TRANSFER') rec.bank_sales += p.amount;
            else rec.other_sales += p.amount;
          });
        } else {
          if (order.payment_method === 'CASH') rec.cash_sales += order.total_amount;
          else if (order.payment_method === 'GCASH') rec.gcash_sales += order.total_amount;
          else if (order.payment_method === 'MAYA') rec.maya_sales += order.total_amount;
          else if (order.payment_method === 'QRPH') rec.qrph_sales += order.total_amount;
          else if (order.payment_method === 'BANK_TRANSFER') rec.bank_sales += order.total_amount;
          else rec.other_sales += order.total_amount;
        }
      }
    }

    // Also ensure shifts within time range create/populate daily sales entries even if order count is 0
    for (const shift of this.cashierShifts.values()) {
      if (effectiveBranchId && shift.branch_id !== effectiveBranchId) continue;
      const shiftDate = (shift.opened_at || shift.created_at || '').split('T')[0];
      if (!shiftDate) continue;
      const shiftTime = new Date(shift.opened_at || shift.created_at).getTime();
      if (shiftTime < startTime || shiftTime > endTime) continue;

      const key = `${shiftDate}_${shift.branch_id}`;
      if (!map.has(key)) {
        map.set(key, {
          date: shiftDate,
          branch_id: shift.branch_id,
          branch_name: shift.branch_name || 'Branch',
          gross_sales: shift.total_sales || 0,
          discounts: 0,
          refunds: shift.cash_refunds || 0,
          voids: 0,
          net_sales: shift.total_sales || 0,
          cogs: 0,
          gross_profit: shift.total_sales || 0,
          cash_sales: shift.cash_sales || 0,
          gcash_sales: 0,
          maya_sales: 0,
          qrph_sales: 0,
          bank_sales: 0,
          other_sales: 0,
          expenses: shift.cash_expenses || 0,
          cash_expenses: shift.cash_expenses || 0,
          expected_cash: shift.expected_cash || 0,
          actual_cash: shift.actual_cash !== null ? shift.actual_cash : shift.expected_cash,
          variance: shift.variance || 0,
          order_count: shift.total_orders || 0
        });
      }
    }

    // Attach expenses & shifts to daily groups
    map.forEach((rec, key) => {
      rec.net_sales = Math.max(0, rec.gross_sales - rec.discounts - rec.refunds);
      rec.gross_profit = Math.max(0, rec.net_sales - rec.cogs);

      // Expenses
      for (const exp of this.expenses.values()) {
        if (exp.branch_id === rec.branch_id && exp.date === rec.date && exp.status === 'APPROVED') {
          rec.expenses += exp.amount;
          if (exp.payment_method === 'CASH') {
            rec.cash_expenses += exp.amount;
          }
        }
      }

      // Shifts
      let shiftExp = 0;
      let shiftAct = 0;
      for (const s of this.cashierShifts.values()) {
        if (s.branch_id === rec.branch_id && (s.opened_at?.startsWith(rec.date) || s.created_at?.startsWith(rec.date))) {
          shiftExp += s.expected_cash;
          shiftAct += (s.actual_cash !== null ? s.actual_cash : s.expected_cash);
        }
      }

      if (shiftExp > 0) {
        rec.expected_cash = shiftExp;
        rec.actual_cash = shiftAct;
      } else {
        rec.expected_cash = rec.cash_sales - rec.cash_expenses;
        rec.actual_cash = rec.cash_sales - rec.cash_expenses;
      }
      rec.variance = rec.actual_cash - rec.expected_cash;
    });

    const reportList = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    console.log(`[DB:getDailySalesReports] Generated ${reportList.length} daily sales reports for role ${actorRole}, effectiveBranchId: ${effectiveBranchId}`);
    return reportList;
  }

  public getCashierSalesSummary(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      date_preset?: string;
      start_date?: string;
      end_date?: string;
    }
  ): CashierSalesSummary[] {
    const { start, end } = this.getDateFilterRange(filters.date_preset, filters.start_date, filters.end_date);
    const startTime = start.getTime();
    const endTime = end.getTime();
    const effectiveBranchId = (actorRole === 'MANAGER' || actorRole === 'CASHIER') ? actorBranchId : filters.branch_id;

    // Group key: `cashier_id`
    const map = new Map<string, CashierSalesSummary>();

    for (const order of this.orders.values()) {
      if (effectiveBranchId && order.branch_id !== effectiveBranchId) continue;
      const orderTime = new Date(order.created_at).getTime();
      if (orderTime < startTime || orderTime > endTime) continue;
      if (!order.cashier_id) continue;

      if (!map.has(order.cashier_id)) {
        map.set(order.cashier_id, {
          cashier_id: order.cashier_id,
          cashier_name: order.cashier_name || 'Cashier',
          branch_id: order.branch_id,
          branch_name: order.branch_name || 'Branch',
          shift_count: 0,
          order_count: 0,
          gross_sales: 0,
          discounts: 0,
          voids: 0,
          net_sales: 0,
          cash_sales: 0,
          e_wallet_sales: 0,
          expected_cash: 0,
          actual_cash: 0,
          variance: 0,
          variance_status: 'BALANCED'
        });
      }

      const rec = map.get(order.cashier_id)!;

      if (order.status === 'CANCELLED') {
        rec.voids += order.total_amount;
        continue;
      }

      if (order.status === 'PAID' || order.status === 'COMPLETED') {
        rec.order_count++;
        rec.gross_sales += (order.subtotal || order.total_amount);
        rec.discounts += (order.discount_amount || 0);

        const orderPayments = Array.from(this.payments.values()).filter(p => p.order_id === order.id && p.status === 'COMPLETED');
        if (orderPayments.length > 0) {
          orderPayments.forEach(p => {
            if (p.payment_method === 'CASH') {
              rec.cash_sales += p.amount;
            } else if (p.payment_method === 'GCASH' || p.payment_method === 'MAYA' || p.payment_method === 'QRPH') {
              rec.e_wallet_sales += p.amount;
            }
          });
        } else {
          if (order.payment_method === 'CASH') {
            rec.cash_sales += order.total_amount;
          } else if (order.payment_method === 'GCASH' || order.payment_method === 'MAYA' || order.payment_method === 'QRPH') {
            rec.e_wallet_sales += order.total_amount;
          }
        }
      }
    }

    // Attach shift aggregates
    for (const shift of this.cashierShifts.values()) {
      if (effectiveBranchId && shift.branch_id !== effectiveBranchId) continue;
      const shiftTime = new Date(shift.opened_at).getTime();
      if (shiftTime >= startTime && shiftTime <= endTime) {
        if (!map.has(shift.cashier_id)) {
          map.set(shift.cashier_id, {
            cashier_id: shift.cashier_id,
            cashier_name: shift.cashier_name,
            branch_id: shift.branch_id,
            branch_name: shift.branch_name,
            shift_count: 0,
            order_count: 0,
            gross_sales: 0,
            discounts: 0,
            voids: 0,
            net_sales: 0,
            cash_sales: 0,
            e_wallet_sales: 0,
            expected_cash: 0,
            actual_cash: 0,
            variance: 0,
            variance_status: 'BALANCED'
          });
        }
        const rec = map.get(shift.cashier_id)!;
        rec.shift_count++;
        rec.expected_cash += shift.expected_cash;
        rec.actual_cash += (shift.actual_cash !== null ? shift.actual_cash : shift.expected_cash);
      }
    }

    map.forEach(rec => {
      rec.net_sales = Math.max(0, rec.gross_sales - rec.discounts);
      rec.variance = rec.actual_cash - rec.expected_cash;
      rec.variance_status = rec.variance === 0 ? 'BALANCED' : rec.variance > 0 ? 'OVER' : 'SHORT';
    });

    return Array.from(map.values()).sort((a, b) => b.net_sales - a.net_sales);
  }

  public getFinancialReconciliation(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      date_preset?: string;
      start_date?: string;
      end_date?: string;
    }
  ): FinancialReconciliationRecord[] {
    const dailyReports = this.getDailySalesReports(actorRole, actorBranchId, filters);

    return dailyReports.map(rep => {
      const recId = `REC-${rep.date}-${rep.branch_id}`;
      const existing = this.reconciliations.get(recId);

      // Find total remitted amount for this date & branch
      let remittedAmount = 0;
      for (const r of this.remittances.values()) {
        if (r.branch_id === rep.branch_id && r.date === rep.date && (r.status === 'APPROVED' || r.status === 'SUBMITTED' || r.status === 'RECONCILED')) {
          remittedAmount += r.remitted_amount;
        }
      }

      const totalPayments = rep.cash_sales + rep.gcash_sales + rep.maya_sales + rep.qrph_sales + rep.bank_sales + rep.other_sales;
      const salesVsPaymentsVariance = rep.net_sales - totalPayments;
      const cashVariance = rep.actual_cash - rep.expected_cash;
      const status: VarianceStatus = cashVariance === 0 ? 'BALANCED' : cashVariance > 0 ? 'OVER' : 'SHORT';

      return {
        id: recId,
        date: rep.date,
        branch_id: rep.branch_id,
        branch_name: rep.branch_name,
        net_sales: rep.net_sales,
        payment_total: totalPayments,
        expected_cash: rep.expected_cash,
        actual_cash: rep.actual_cash,
        remitted_amount: remittedAmount,
        approved_expenses: rep.expenses,
        cash_expenses: rep.cash_expenses,
        sales_vs_payments_variance: salesVsPaymentsVariance,
        cash_variance: cashVariance,
        status: status,
        is_reconciled: existing ? existing.is_reconciled : (status === 'BALANCED' && remittedAmount >= rep.actual_cash),
        reconciled_by: existing?.reconciled_by || null,
        reconciled_at: existing?.reconciled_at || null,
        notes: existing?.notes || null
      };
    });
  }

  public reconcileFinancialRecord(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    input: { branch_id: string; date: string; notes?: string }
  ): FinancialReconciliationRecord {
    if (actorRole !== 'OWNER' && actorRole !== 'MANAGER') {
      throw new Error('Unauthorized: Only Owners and Managers can reconcile financial records.');
    }

    const recId = `REC-${input.date}-${input.branch_id}`;
    const branch = this.branches.get(input.branch_id);
    const branchName = branch ? branch.name : 'Branch';
    const now = new Date().toISOString();

    const record: FinancialReconciliationRecord = {
      id: recId,
      date: input.date,
      branch_id: input.branch_id,
      branch_name: branchName,
      net_sales: 0,
      payment_total: 0,
      expected_cash: 0,
      actual_cash: 0,
      remitted_amount: 0,
      approved_expenses: 0,
      cash_expenses: 0,
      sales_vs_payments_variance: 0,
      cash_variance: 0,
      status: 'BALANCED',
      is_reconciled: true,
      reconciled_by: actorEmail,
      reconciled_at: now,
      notes: input.notes || 'Reconciled and approved.'
    };

    this.reconciliations.set(recId, record);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: input.branch_id,
      action: 'RECONCILIATION_COMPLETED',
      entity_type: 'RECONCILIATION',
      entity_id: recId,
      metadata: {
        date: input.date,
        branch_name: branchName,
        notes: input.notes
      }
    });

    this.saveSnapshot();
    return record;
  }

  public adjustFinancialRecord(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    input: FinancialAdjustmentInput
  ): any {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only the Business Owner can make financial record adjustments.');
    }

    if (!input.reason || input.reason.trim().length < 5) {
      throw new Error('A detailed reason is required for financial adjustments.');
    }

    const now = new Date().toISOString();

    if (input.entity_type === 'SHIFT') {
      const shift = this.cashierShifts.get(input.entity_id);
      if (!shift) throw new Error('Shift record not found.');

      const oldValue = (shift as any)[input.field];
      (shift as any)[input.field] = input.new_value;
      shift.updated_at = now;

      // Recalculate variance if actual_cash or expected_cash modified
      if (input.field === 'actual_cash' || input.field === 'expected_cash') {
        const actual = shift.actual_cash !== null ? shift.actual_cash : 0;
        shift.variance = actual - shift.expected_cash;
        shift.variance_status = shift.variance === 0 ? 'BALANCED' : shift.variance > 0 ? 'OVER' : 'SHORT';
      }

      this.createAuditLog({
        user_id: actorId,
        user_email: actorEmail,
        role: actorRole,
        branch_id: shift.branch_id,
        action: 'OWNER_FINANCIAL_ADJUSTMENT',
        entity_type: 'SHIFT',
        entity_id: shift.id,
        metadata: {
          field: input.field,
          old_value: oldValue,
          new_value: input.new_value,
          reason: input.reason,
          timestamp: now
        }
      });

      this.saveSnapshot();
      return shift;
    }

    if (input.entity_type === 'EXPENSE') {
      const exp = this.expenses.get(input.entity_id);
      if (!exp) throw new Error('Expense record not found.');

      const oldValue = (exp as any)[input.field];
      (exp as any)[input.field] = input.new_value;
      exp.updated_at = now;

      this.createAuditLog({
        user_id: actorId,
        user_email: actorEmail,
        role: actorRole,
        branch_id: exp.branch_id,
        action: 'OWNER_FINANCIAL_ADJUSTMENT',
        entity_type: 'EXPENSE',
        entity_id: exp.id,
        metadata: {
          field: input.field,
          old_value: oldValue,
          new_value: input.new_value,
          reason: input.reason,
          timestamp: now
        }
      });

      this.saveSnapshot();
      return exp;
    }

    if (input.entity_type === 'REMITTANCE') {
      const rem = this.remittances.get(input.entity_id);
      if (!rem) throw new Error('Remittance record not found.');

      const oldValue = (rem as any)[input.field];
      (rem as any)[input.field] = input.new_value;
      rem.updated_at = now;

      this.createAuditLog({
        user_id: actorId,
        user_email: actorEmail,
        role: actorRole,
        branch_id: rem.branch_id,
        action: 'OWNER_FINANCIAL_ADJUSTMENT',
        entity_type: 'REMITTANCE',
        entity_id: rem.id,
        metadata: {
          field: input.field,
          old_value: oldValue,
          new_value: input.new_value,
          reason: input.reason,
          timestamp: now
        }
      });

      this.saveSnapshot();
      return rem;
    }

    throw new Error('Unsupported entity type for financial adjustment.');
  }

  // =========================================================================
  // DUAL-LEVEL DAILY SALES & INGREDIENT USAGE BREAKDOWN
  // =========================================================================

  /**
   * 1. DAILY PRODUCT SALES SUMMARY (FINISHED GOODS)
   * Aggregates sold menu items by product, category, quantity sold, and gross sales.
   */
  public getDailyProductSales(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      date_preset?: string;
      date?: string;
      start_date?: string;
      end_date?: string;
    }
  ): DailyProductSalesSummary {
    const preset = filters.date_preset || (filters.date ? 'CUSTOM' : 'TODAY');
    const { start, end } = this.getDateFilterRange(preset, filters.start_date || filters.date, filters.end_date || filters.date);
    const startTime = start.getTime();
    const endTime = end.getTime();

    const effectiveBranchId = (actorRole === 'MANAGER' || actorRole === 'CASHIER')
      ? actorBranchId
      : (filters.branch_id && filters.branch_id !== 'ALL' ? filters.branch_id : null);

    const branchObj = effectiveBranchId ? this.branches.get(effectiveBranchId) : null;
    const branchLabel = branchObj ? branchObj.name : 'All 17 Branches (Consolidated)';

    const productMap = new Map<string, {
      product_id: string;
      product_name: string;
      product_code: string;
      category: string;
      quantity_sold: number;
      gross_sales: number;
      order_count: number;
      unit_price: number;
      order_ids: Set<string>;
    }>();

    for (const order of this.orders.values()) {
      if (effectiveBranchId && order.branch_id !== effectiveBranchId) continue;
      const orderTime = new Date(order.created_at).getTime();
      if (orderTime < startTime || orderTime > endTime) continue;

      if (order.status !== 'PAID' && order.status !== 'COMPLETED') continue;

      const items = Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : Array.from(this.orderItems.values()).filter(oi => oi.order_id === order.id);

      for (const item of items) {
        const prod = this.products.get(item.product_id);
        const prodId = item.product_id || (prod ? prod.id : item.product_name);
        const prodName = item.product_name || (prod ? prod.product_name : 'Unknown Item');
        const prodCode = item.product_code || (prod ? prod.product_code : 'PRD');
        const category = item.category || (prod ? prod.category : 'General');
        const unitPrice = item.unit_price || (prod ? prod.selling_price : 0);
        const qty = Number(item.quantity) || 1;
        const subtotal = Number(item.subtotal) || (unitPrice * qty);

        if (!productMap.has(prodId)) {
          productMap.set(prodId, {
            product_id: prodId,
            product_name: prodName,
            product_code: prodCode,
            category: category,
            quantity_sold: 0,
            gross_sales: 0,
            order_count: 0,
            unit_price: unitPrice,
            order_ids: new Set()
          });
        }

        const entry = productMap.get(prodId)!;
        entry.quantity_sold += qty;
        entry.gross_sales += subtotal;
        entry.order_ids.add(order.id);
      }
    }

    const items: DailyProductSaleItem[] = Array.from(productMap.values()).map(e => ({
      product_id: e.product_id,
      product_name: e.product_name,
      product_code: e.product_code,
      category: e.category,
      quantity_sold: e.quantity_sold,
      gross_sales: Math.round(e.gross_sales * 100) / 100,
      order_count: e.order_ids.size,
      unit_price: e.unit_price
    })).sort((a, b) => b.gross_sales - a.gross_sales);

    const totalQuantity = items.reduce((sum, i) => sum + i.quantity_sold, 0);
    const totalGrossSales = Math.round(items.reduce((sum, i) => sum + i.gross_sales, 0) * 100) / 100;
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const dateLabel = startStr === endStr ? startStr : `${startStr} to ${endStr}`;

    return {
      items,
      total_quantity: totalQuantity,
      total_gross_sales: totalGrossSales,
      date_label: dateLabel,
      branch_label: branchLabel
    };
  }

  /**
   * 2. RAW INGREDIENT USAGE AUDIT (COMMISSARY CONSUMPTION)
   * Tracks total raw materials consumed today from recipes & provides cross-audit verification.
   */
  public getDailyIngredientUsageAudit(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters: {
      branch_id?: string;
      date?: string;
      date_preset?: string;
    }
  ): DailyIngredientUsageAuditReport {
    const preset = filters.date_preset || (filters.date ? 'CUSTOM' : 'TODAY');
    const { start, end } = this.getDateFilterRange(preset, filters.date, filters.date);
    const startTime = start.getTime();
    const endTime = end.getTime();
    const auditDate = start.toISOString().split('T')[0];

    // Determine target branch
    let targetBranchId: string | null = null;
    if (actorRole === 'MANAGER' || actorRole === 'CASHIER') {
      targetBranchId = actorBranchId;
      if (!targetBranchId) throw new Error('User has no assigned branch.');
    } else {
      if (filters.branch_id && filters.branch_id !== 'ALL') {
        targetBranchId = filters.branch_id;
      } else {
        // Master Owner can view a specific branch or defaults to Narra/first branch
        const narra = Array.from(this.branches.values()).find(b => b.name.toLowerCase().includes('narra')) || Array.from(this.branches.values())[0];
        targetBranchId = narra ? narra.id : null;
      }
    }

    const branch = targetBranchId ? this.branches.get(targetBranchId) : null;
    const branchName = branch ? branch.name : 'Branch Inventory';

    // Collect paid & completed orders for this branch and date
    const branchOrders = Array.from(this.orders.values()).filter(o => {
      if (targetBranchId && o.branch_id !== targetBranchId) return false;
      const orderTime = new Date(o.created_at).getTime();
      if (orderTime < startTime || orderTime > endTime) return false;
      return o.status === 'PAID' || o.status === 'COMPLETED';
    });

    // Tally raw ingredient consumption from recipes
    const consumptionMap = new Map<string, number>();
    let totalItemsSold = 0;

    let burgersSold = 0;
    let siomaiOrdersSold = 0;
    let hotdogsSold = 0;
    let riceMealsSold = 0;

    for (const order of branchOrders) {
      const items = Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : Array.from(this.orderItems.values()).filter(oi => oi.order_id === order.id);

      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        totalItemsSold += qty;

        const prodNameLower = (item.product_name || '').toLowerCase();
        if (prodNameLower.includes('burger')) {
          burgersSold += qty;
        } else if (prodNameLower.includes('siomai')) {
          siomaiOrdersSold += qty;
        } else if (prodNameLower.includes('hotdog')) {
          hotdogsSold += qty;
        }
        if (prodNameLower.includes('rice') || prodNameLower.includes('meal') || prodNameLower.includes('silog')) {
          riceMealsSold += qty;
        }

        // Find recipe for this product
        const recipe = this.recipes.get(item.product_id) || Array.from(this.recipes.values()).find(
          r => r.product_id === item.product_id || r.product_name.toLowerCase() === prodNameLower
        );

        if (recipe && recipe.items && recipe.items.length > 0) {
          for (const rItem of recipe.items) {
            const ingId = rItem.ingredient_id;
            const consumed = (Number(rItem.quantity_consumed) || 1) * qty;
            consumptionMap.set(ingId, (consumptionMap.get(ingId) || 0) + consumed);
          }
        } else {
          // Direct fallback mapping to ingredients if product has no explicit recipe object
          for (const ing of this.ingredients.values()) {
            const ingNameLower = ing.item_name.toLowerCase();
            if (prodNameLower.includes('burger') && (ingNameLower === 'patties' || ingNameLower === 'patty bread')) {
              consumptionMap.set(ing.id, (consumptionMap.get(ing.id) || 0) + qty);
            } else if (prodNameLower.includes('siomai') && ingNameLower === 'siomai') {
              consumptionMap.set(ing.id, (consumptionMap.get(ing.id) || 0) + (qty * 4));
            } else if (prodNameLower.includes('hotdog') && (ingNameLower === 'hotdog' || ingNameLower === 'hotdog bread')) {
              consumptionMap.set(ing.id, (consumptionMap.get(ing.id) || 0) + qty);
            }
          }
        }
      }
    }

    // Also factor in recorded RECIPE_DEDUCTION inventory transactions for this branch and date
    for (const tx of this.inventoryTransactions.values()) {
      if (targetBranchId && tx.branch_id !== targetBranchId) continue;
      if (tx.transaction_type !== 'RECIPE_DEDUCTION') continue;
      const txTime = new Date(tx.created_at).getTime();
      if (txTime < startTime || txTime > endTime) continue;

      const current = consumptionMap.get(tx.ingredient_id) || 0;
      // Take the higher of computed vs recorded deduction to prevent undercounting
      const recordedQty = Math.abs(tx.quantity);
      if (recordedQty > current) {
        consumptionMap.set(tx.ingredient_id, recordedQty);
      }
    }

    // Compile ingredient usage items
    const ingredientItems: IngredientUsageAuditItem[] = [];
    for (const ing of this.ingredients.values()) {
      const consumed = Math.round((consumptionMap.get(ing.id) || 0) * 100) / 100;
      const invKey = targetBranchId ? `${targetBranchId}_${ing.id}` : '';
      const branchInv = targetBranchId ? this.branchInventory.get(invKey) : null;
      
      const currentStock = branchInv ? branchInv.current_stock : 0;
      const reorderLevel = branchInv ? branchInv.reorder_level : ing.reorder_level;

      let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (currentStock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (currentStock <= reorderLevel) {
        status = 'LOW_STOCK';
      }

      // Include all ingredients that were consumed today, or all meat/bread/pantry essentials
      ingredientItems.push({
        ingredient_id: ing.id,
        item_code: ing.item_code,
        ingredient_name: ing.item_name,
        category: ing.category,
        unit: ing.unit,
        total_consumed_today: consumed,
        current_ending_stock: currentStock,
        reorder_level: reorderLevel,
        status
      });
    }

    // Sort ingredients: consumed first, then alphabetically
    ingredientItems.sort((a, b) => {
      if (b.total_consumed_today !== a.total_consumed_today) {
        return b.total_consumed_today - a.total_consumed_today;
      }
      return a.ingredient_name.localeCompare(b.ingredient_name);
    });

    // Helper to find consumption of specific ingredients
    const getConsumedQty = (nameSnippet: string): number => {
      const ing = ingredientItems.find(i => i.ingredient_name.toLowerCase().includes(nameSnippet.toLowerCase()));
      return ing ? ing.total_consumed_today : 0;
    };

    const pattiesConsumed = getConsumedQty('patties');
    const bunsConsumed = getConsumedQty('patty bread');
    const siomaiConsumed = getConsumedQty('siomai');
    const hotdogsConsumed = getConsumedQty('hotdog');
    const hotdogBunsConsumed = getConsumedQty('hotdog bread');
    const riceConsumed = getConsumedQty('rice');

    // Build automated cross-audit rules
    const crossAuditChecks: CrossAuditRuleCheck[] = [
      {
        title: 'Burger & Bun Assembly Reconciliation',
        finished_goods_label: 'Burgers Sold',
        finished_goods_count: burgersSold,
        expected_deduction: `${burgersSold} pcs Patties & ${burgersSold} pcs Buns`,
        actual_deduction: `${pattiesConsumed} pcs Patties & ${bunsConsumed} pcs Buns`,
        matched: pattiesConsumed >= burgersSold && bunsConsumed >= burgersSold,
        notes: `Cross-Audit: ${burgersSold} Burgers Sold = ${pattiesConsumed} Patties & ${bunsConsumed} Buns deducted.`
      },
      {
        title: 'Siomai Dimsum Ratio Reconciliation',
        finished_goods_label: 'Siomai Orders Sold',
        finished_goods_count: siomaiOrdersSold,
        expected_deduction: `${siomaiOrdersSold * 4} pcs Siomai (4 pcs/order)`,
        actual_deduction: `${siomaiConsumed} pcs Siomai deducted`,
        matched: siomaiConsumed >= (siomaiOrdersSold * 4),
        notes: `Cross-Audit: ${siomaiOrdersSold} Siomai Orders Sold = ${siomaiConsumed} Siomai pieces deducted.`
      },
      {
        title: 'Hotdog Sandwich Pair Reconciliation',
        finished_goods_label: 'Hotdog Sandwiches Sold',
        finished_goods_count: hotdogsSold,
        expected_deduction: `${hotdogsSold} pcs Hotdogs & ${hotdogsSold} pcs Buns`,
        actual_deduction: `${hotdogsConsumed} pcs Hotdogs & ${hotdogBunsConsumed} pcs Buns`,
        matched: hotdogsConsumed >= hotdogsSold && hotdogBunsConsumed >= hotdogsSold,
        notes: `Cross-Audit: ${hotdogsSold} Hotdogs Sold = ${hotdogsConsumed} Hotdogs & ${hotdogBunsConsumed} Buns deducted.`
      }
    ];

    return {
      branch_id: targetBranchId || 'all',
      branch_name: branchName,
      audit_date: auditDate,
      generated_at: new Date().toISOString(),
      total_orders_today: branchOrders.length,
      total_items_sold: totalItemsSold,
      ingredients: ingredientItems,
      cross_audit_checks: crossAuditChecks
    };
  }


  // --- Seed Phase 8 Data ---

  private seedPhase8Data(): void {
    const narra = Array.from(this.branches.values()).find(b => b.name.toLowerCase().includes('narra')) || Array.from(this.branches.values())[0];
    const acacia = Array.from(this.branches.values()).find(b => b.name.toLowerCase().includes('acacia'));
    const pulido = Array.from(this.branches.values()).find(b => b.name.toLowerCase().includes('pulido'));
    const ownerProfile = Array.from(this.profiles.values()).find(p => p.role === 'OWNER');
    const cashierProfile = Array.from(this.profiles.values()).find(p => p.role === 'CASHIER');

    const ownerId = ownerProfile ? ownerProfile.id : 'owner-default-1';
    const ownerName = ownerProfile ? ownerProfile.full_name : 'Tagpuan Owner';
    const cashierId = cashierProfile ? cashierProfile.id : 'cashier-default-1';
    const cashierName = cashierProfile ? cashierProfile.full_name : 'Juan dela Cruz';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Seed Expenses if empty
    if (this.expenses.size === 0) {
      INITIAL_EXPENSES_SEEDS.forEach((seed, idx) => {
        const branch = Array.from(this.branches.values()).find(b => b.name.toLowerCase() === seed.branch_name.toLowerCase()) || narra;
        if (branch) {
          const expSeq = this.expenseSequence++;
          const exp: BranchExpense = {
            id: `seed-exp-${idx + 1}`,
            expense_number: `EXP-${now.getFullYear()}-${String(expSeq).padStart(4, '0')}`,
            branch_id: branch.id,
            branch_name: branch.name,
            shift_id: null,
            date: seed.date,
            category: seed.category,
            description: seed.description,
            amount: seed.amount,
            payment_method: seed.payment_method,
            proof_image_url: seed.proof_image_url,
            status: seed.status,
            created_by: ownerId,
            created_by_name: ownerName,
            created_by_role: 'OWNER',
            approved_by: ownerId,
            approved_by_name: ownerName,
            approved_at: new Date().toISOString(),
            rejection_reason: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          this.expenses.set(exp.id, exp);
        }
      });
    }

    // Seed Realistic Completed Orders across Payment Types if few orders
    const narraOrdersToday = Array.from(this.orders.values()).filter(o => o.branch_id === narra?.id && o.created_at.startsWith(todayStr));
    if (narraOrdersToday.length < 3 && narra) {
      const burger = Array.from(this.products.values()).find(p => (p.product_name || '').toLowerCase().includes('burger')) || Array.from(this.products.values())[0];
      const fries = Array.from(this.products.values()).find(p => (p.product_name || '').toLowerCase().includes('fries')) || Array.from(this.products.values())[1];
      const siomai = Array.from(this.products.values()).find(p => (p.product_name || '').toLowerCase().includes('siomai')) || Array.from(this.products.values())[2];
      const hotdog = Array.from(this.products.values()).find(p => (p.product_name || '').toLowerCase().includes('hotdog')) || Array.from(this.products.values())[0];

      // Exact recipe batches: 45 Burgers, 20 Siomai (80 pcs), 15 Hotdogs
      const sampleTransactions = [
        { method: 'CASH' as PaymentMethod, amount: 1275, time: `${todayStr}T10:15:00.000Z`, branch: narra, prod: burger, qty: 15 },
        { method: 'CASH' as PaymentMethod, amount: 1275, time: `${todayStr}T11:45:00.000Z`, branch: narra, prod: burger, qty: 15 },
        { method: 'GCASH' as PaymentMethod, amount: 1275, time: `${todayStr}T12:05:00.000Z`, branch: narra, prod: burger, qty: 15 },
        { method: 'CASH' as PaymentMethod, amount: 850, time: `${todayStr}T12:30:00.000Z`, branch: narra, prod: siomai, qty: 10 },
        { method: 'MAYA' as PaymentMethod, amount: 850, time: `${todayStr}T13:20:00.000Z`, branch: narra, prod: siomai, qty: 10 },
        { method: 'QRPH' as PaymentMethod, amount: 1050, time: `${todayStr}T13:45:00.000Z`, branch: narra, prod: hotdog, qty: 15 },
        { method: 'BANK_TRANSFER' as PaymentMethod, amount: 1100, time: `${todayStr}T14:10:00.000Z`, branch: narra, prod: fries, qty: 10 },
        { method: 'CASH' as PaymentMethod, amount: 1500, time: `${todayStr}T14:30:00.000Z`, branch: narra, prod: burger, qty: 10 },
        // Acacia branch sample transactions
        { method: 'CASH' as PaymentMethod, amount: 5000, time: `${todayStr}T11:00:00.000Z`, branch: acacia || narra, prod: burger, qty: 15 },
        { method: 'GCASH' as PaymentMethod, amount: 4000, time: `${todayStr}T12:15:00.000Z`, branch: acacia || narra, prod: siomai, qty: 12 },
        { method: 'MAYA' as PaymentMethod, amount: 1500, time: `${todayStr}T13:10:00.000Z`, branch: acacia || narra, prod: hotdog, qty: 10 }
      ];

      sampleTransactions.forEach((tx, idx) => {
        const orderId = `seed-order-p8-${idx + 1}-${Date.now()}`;
        const orderNum = `TAG-${String(this.orderNumberSequence++).padStart(4, '0')}`;
        const targetProd = tx.prod || burger;
        const item: OrderItem = {
          id: crypto.randomUUID(),
          order_id: orderId,
          product_id: targetProd.id,
          product_name: targetProd.product_name,
          unit_price: targetProd.selling_price || 85,
          quantity: tx.qty,
          subtotal: tx.amount,
          total_price: tx.amount,
          notes: 'Standard Tagpuan Recipe'
        };

        const order: Order = {
          id: orderId,
          order_number: orderNum,
          branch_id: tx.branch.id,
          branch_name: tx.branch.name,
          cashier_id: cashierId,
          cashier_name: cashierName,
          order_type: 'DINE_IN',
          source: idx % 3 === 0 ? 'KIOSK' : 'POS',
          status: 'COMPLETED',
          subtotal: tx.amount,
          discount_type: 'NONE',
          discount_amount: 0,
          tax_amount: 0,
          total: tx.amount,
          total_amount: tx.amount,
          payment_method: tx.method,
          payment_status: 'PAID',
          kitchen_status: 'COMPLETED',
          kitchen_received_at: tx.time,
          ready_at: tx.time,
          completed_at: tx.time,
          created_at: tx.time,
          updated_at: tx.time,
          items: [item]
        };
        this.orders.set(order.id, order);
        this.orderItems.set(item.id, item);

        // Seed Payment record
        const payment: Payment = {
          id: crypto.randomUUID(),
          order_id: order.id,
          branch_id: tx.branch.id,
          payment_method: tx.method,
          amount: tx.amount,
          amount_tendered: tx.method === 'CASH' ? tx.amount + 100 : tx.amount,
          change_amount: tx.method === 'CASH' ? 100 : 0,
          reference_number: tx.method !== 'CASH' ? `REF-${Date.now()}-${idx}` : undefined,
          status: 'COMPLETED',
          created_at: tx.time
        };
        this.payments.set(payment.id, payment);

        // Deduct inventory atomically with RECIPE_DEDUCTION transactions
        try {
          this.deductRecipeInventoryForOrder(order, cashierId, cashierName, 'CASHIER');
        } catch (e) {
          // Ignore deduction failure on initial seed
        }
      });
    }

    // Seed Shifts & Remittances if empty
    if (this.cashierShifts.size === 0 && narra) {
      // 1. Narra Closed Shift with Shortage (-₱200) matching prompt specification
      const shift1Seq = this.cashierShiftSequence++;
      const shift1: CashierShift = {
        id: 'seed-shift-narra-1',
        shift_number: `SFT-${now.getFullYear()}-${String(shift1Seq).padStart(4, '0')}`,
        branch_id: narra.id,
        branch_name: narra.name,
        cashier_id: cashierId,
        cashier_name: cashierName,
        opened_at: `${todayStr}T09:00:00.000Z`,
        closed_at: `${todayStr}T17:00:00.000Z`,
        status: 'CLOSED',
        opening_cash: 1000,
        cash_sales: 10000,
        cash_refunds: 0,
        cash_expenses: 500,
        cash_withdrawals: 0,
        expected_cash: 10500, // 1000 + 10000 - 500
        actual_cash: 10300,   // Denomination sum
        variance: -200,
        variance_status: 'SHORT',
        variance_reason: 'Discrepancy in customer change during peak lunch rush hour.',
        denominations: {
          d1000: 7, // 7000
          d500: 4,  // 2000
          d200: 3,  // 600
          d100: 5,  // 500
          d50: 2,   // 100
          d20: 3,   // 60
          d10: 2,   // 20
          d5: 2,    // 10
          d1: 10    // 10 -> Total = 10,300
        },
        total_sales: 20000,
        total_orders: 8,
        notes: 'Shift completed with busy afternoon turnover.',
        created_at: `${todayStr}T09:00:00.000Z`,
        updated_at: `${todayStr}T17:00:00.000Z`
      };
      this.cashierShifts.set(shift1.id, shift1);

      // Remittance for Shift 1
      const rem1Seq = this.remittanceSequence++;
      const rem1: CashRemittance = {
        id: 'seed-rem-narra-1',
        remittance_number: `RMT-${now.getFullYear()}-${String(rem1Seq).padStart(4, '0')}`,
        shift_id: shift1.id,
        branch_id: narra.id,
        branch_name: narra.name,
        cashier_id: cashierId,
        cashier_name: cashierName,
        date: todayStr,
        expected_cash: 10500,
        actual_cash: 10300,
        remitted_amount: 10300,
        cash_variance: -200,
        remittance_variance: 0,
        gross_sales: shift1.total_sales,
        variance_flag: 'SHORTAGE',
        denomination_breakdown: shift1.denominations,
        ai_reconciliation_notes: 'Cashier counted ₱10,300 with ₱200 shortage recorded during lunch shift. Awaiting manager vault verification.',
        proof_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        proof_type: 'Physical Cash Handover to Manager',
        notes: 'Full actual counted cash ₱10,300 deposited into branch drop safe.',
        status: 'SUBMITTED',
        submitted_at: `${todayStr}T17:15:00.000Z`,
        manager_id: null,
        manager_name: null,
        manager_verified_at: null,
        manager_verified_amount: null,
        manager_deductions_amount: null,
        manager_deductions_notes: null,
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        rejection_reason: null,
        correction_notes: null,
        created_at: `${todayStr}T17:15:00.000Z`,
        updated_at: `${todayStr}T17:15:00.000Z`
      };
      this.remittances.set(rem1.id, rem1);

      // 2. Acacia Balanced Shift & Approved Remittance
      if (acacia) {
        const shift2Seq = this.cashierShiftSequence++;
        const shift2: CashierShift = {
          id: 'seed-shift-acacia-1',
          shift_number: `SFT-${now.getFullYear()}-${String(shift2Seq).padStart(4, '0')}`,
          branch_id: acacia.id,
          branch_name: acacia.name,
          cashier_id: cashierId,
          cashier_name: cashierName,
          opened_at: `${yesterdayStr}T09:00:00.000Z`,
          closed_at: `${yesterdayStr}T17:00:00.000Z`,
          status: 'CLOSED',
          opening_cash: 1000,
          cash_sales: 5000,
          cash_refunds: 0,
          cash_expenses: 500,
          cash_withdrawals: 0,
          expected_cash: 5500,
          actual_cash: 5500,
          variance: 0,
          variance_status: 'BALANCED',
          variance_reason: null,
          denominations: {
            d1000: 4, // 4000
            d500: 2,  // 1000
            d200: 2,  // 400
            d100: 1,  // 100
            d50: 0,
            d20: 0,
            d10: 0,
            d5: 0,
            d1: 0     // Total = 5,500
          },
          total_sales: 10500,
          total_orders: 3,
          notes: 'Balanced cash register drawer.',
          created_at: `${yesterdayStr}T09:00:00.000Z`,
          updated_at: `${yesterdayStr}T17:00:00.000Z`
        };
        this.cashierShifts.set(shift2.id, shift2);

        const rem2Seq = this.remittanceSequence++;
        const rem2: CashRemittance = {
          id: 'seed-rem-acacia-1',
          remittance_number: `RMT-${now.getFullYear()}-${String(rem2Seq).padStart(4, '0')}`,
          shift_id: shift2.id,
          branch_id: acacia.id,
          branch_name: acacia.name,
          cashier_id: cashierId,
          cashier_name: cashierName,
          date: yesterdayStr,
          expected_cash: 5500,
          actual_cash: 5500,
          remitted_amount: 5500,
          cash_variance: 0,
          remittance_variance: 0,
          gross_sales: shift2.total_sales,
          variance_flag: 'TALLY',
          denomination_breakdown: shift2.denominations,
          ai_reconciliation_notes: 'Cashier counted ₱5,500 in physical cash with 0 variance. Balanced.',
          proof_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
          proof_type: 'Bank Cash Deposit Slip',
          notes: 'Cash verified and banked in BDO Acacia branch account.',
          status: 'APPROVED',
          submitted_at: `${yesterdayStr}T17:10:00.000Z`,
          manager_id: null,
          manager_name: null,
          manager_verified_at: null,
          manager_verified_amount: 5500,
          manager_deductions_amount: 0,
          manager_deductions_notes: null,
          reviewed_by: ownerId,
          reviewed_by_name: ownerName,
          reviewed_at: `${yesterdayStr}T18:00:00.000Z`,
          rejection_reason: null,
          correction_notes: null,
          created_at: `${yesterdayStr}T17:10:00.000Z`,
          updated_at: `${yesterdayStr}T18:00:00.000Z`
        };
        this.remittances.set(rem2.id, rem2);
      }
    }
  }

  // ============================================================================
  // PHASE 10: LOYALTY PROGRAM, CUSTOMER POINTS & REWARDS ENGINE
  // ============================================================================

  private seedPhase10LoyaltyData(): void {
    if (this.loyaltyCustomers.size > 0) return;

    const branchesList = Array.from(this.branches.values());
    const narra = branchesList.find(b => b.name.toLowerCase().includes('narra')) || branchesList[0];
    const acacia = branchesList.find(b => b.name.toLowerCase().includes('acacia')) || branchesList[1] || branchesList[0];
    const pulido = branchesList.find(b => b.name.toLowerCase().includes('pulido')) || branchesList[2] || branchesList[0];
    const kaong = branchesList.find(b => b.name.toLowerCase().includes('kaong')) || branchesList[3] || branchesList[0];

    const branchMap = [narra, acacia, narra, pulido, kaong, narra];

    INITIAL_LOYALTY_CUSTOMERS.forEach((seed, idx) => {
      const assignedBranch = branchMap[idx % branchMap.length] || narra;
      const customer: LoyaltyCustomer = {
        ...seed,
        registered_branch_id: assignedBranch.id,
        registered_branch_name: assignedBranch.name
      };
      this.loyaltyCustomers.set(customer.id, customer);
    });

    const now = new Date();
    const owner = Array.from(this.profiles.values()).find(p => p.role === 'OWNER');
    const ownerId = owner ? owner.id : 'SYSTEM';
    const ownerName = owner ? owner.full_name : 'Owner';

    // Seed transaction for Maria Santos (cust-1: 240 points)
    const tx1: LoyaltyTransaction = {
      id: 'tx-seed-1',
      customer_id: 'cust-1',
      customer_name: 'Maria Santos',
      transaction_type: 'EARN',
      points: 200,
      order_id: null,
      order_number: 'TAG-0010',
      branch_id: narra.id,
      branch_name: narra.name,
      reward_product_id: null,
      reward_product_name: null,
      reason: 'Points earned from completed dine-in order #TAG-0010 (₱10,000.00)',
      processed_by: ownerId,
      processed_by_name: ownerName,
      created_at: new Date(now.getTime() - 7 * 86400000).toISOString()
    };
    this.loyaltyTransactions.set(tx1.id, tx1);

    const tx2: LoyaltyTransaction = {
      id: 'tx-seed-2',
      customer_id: 'cust-1',
      customer_name: 'Maria Santos',
      transaction_type: 'EARN',
      points: 40,
      order_id: null,
      order_number: 'TAG-0015',
      branch_id: narra.id,
      branch_name: narra.name,
      reward_product_id: null,
      reward_product_name: null,
      reason: 'Points earned from takeout order #TAG-0015 (₱2,000.00)',
      processed_by: ownerId,
      processed_by_name: ownerName,
      created_at: new Date(now.getTime() - 2 * 86400000).toISOString()
    };
    this.loyaltyTransactions.set(tx2.id, tx2);

    // Seed past redemption for Angelica Reyes (cust-3: 410 earned - 200 redeemed = 210 current)
    const sampleProduct = Array.from(this.products.values())[0];
    const red1: LoyaltyRedemption = {
      id: 'red-seed-1',
      customer_id: 'cust-3',
      customer_name: 'Angelica Reyes',
      points_spent: 200,
      product_id: sampleProduct ? sampleProduct.id : 'prod-1',
      product_name: sampleProduct ? sampleProduct.product_name : 'Tagpuan Classic Burger',
      order_id: null,
      order_number: 'TAG-0008',
      branch_id: narra.id,
      branch_name: narra.name,
      cashier_id: ownerId,
      cashier_name: ownerName,
      redeemed_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
      status: 'COMPLETED'
    };
    this.loyaltyRedemptions.set(red1.id, red1);

    const tx3: LoyaltyTransaction = {
      id: 'tx-seed-3',
      customer_id: 'cust-3',
      customer_name: 'Angelica Reyes',
      transaction_type: 'REDEEM',
      points: -200,
      order_id: null,
      order_number: 'TAG-0008',
      branch_id: narra.id,
      branch_name: narra.name,
      reward_product_id: red1.product_id,
      reward_product_name: red1.product_name,
      reason: `Redeemed 200 loyalty points for free ${red1.product_name}`,
      processed_by: ownerId,
      processed_by_name: ownerName,
      created_at: red1.redeemed_at
    };
    this.loyaltyTransactions.set(tx3.id, tx3);

    // Seed Saved Tickets for quick testing
    const savedTicketSeq = this.savedTicketSequence++;
    const tkt1: SavedTicket = {
      id: 'seed-tkt-1',
      ticket_number: `TKT-${String(savedTicketSeq).padStart(4, '0')}`,
      branch_id: narra.id,
      branch_name: narra.name,
      cashier_id: ownerId,
      cashier_name: ownerName,
      customer_id: 'cust-1',
      customer_name: 'Maria Santos',
      customer_phone: '0917-555-1021',
      items: [
        {
          product_id: sampleProduct ? sampleProduct.id : 'prod-1',
          product_name: sampleProduct ? sampleProduct.product_name : 'Tagpuan Classic Burger',
          quantity: 2,
          unit_price: 99,
          subtotal: 198,
          notes: 'Extra burger sauce'
        }
      ],
      subtotal: 198,
      notes: 'Table 4 - Lunch Meeting (Customer requested to hold ticket)',
      created_at: new Date(now.getTime() - 20 * 60000).toISOString()
    };
    this.savedTickets.set(tkt1.id, tkt1);
  }

  public getOrCreateLoyaltyCustomer(
    name: string,
    phone?: string | null,
    email?: string | null,
    branchId?: string
  ): LoyaltyCustomer {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Customer name cannot be empty.');
    }

    const cleanPhone = phone ? phone.trim() : null;

    // Search by phone first if provided
    if (cleanPhone) {
      for (const cust of this.loyaltyCustomers.values()) {
        if (cust.phone_number && cust.phone_number.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')) {
          if (!cust.email && email) cust.email = email.trim();
          cust.updated_at = new Date().toISOString();
          this.loyaltyCustomers.set(cust.id, cust);
          return cust;
        }
      }
    }

    // Search by exact or case-insensitive name
    for (const cust of this.loyaltyCustomers.values()) {
      if (cust.customer_name.toLowerCase() === trimmedName.toLowerCase()) {
        if (cleanPhone && !cust.phone_number) cust.phone_number = cleanPhone;
        if (email && !cust.email) cust.email = email.trim();
        cust.updated_at = new Date().toISOString();
        this.loyaltyCustomers.set(cust.id, cust);
        return cust;
      }
    }

    // Create new customer
    const branch = (branchId ? this.branches.get(branchId) : null) || Array.from(this.branches.values())[0];
    const now = new Date().toISOString();
    const newCustomer: LoyaltyCustomer = {
      id: crypto.randomUUID(),
      customer_name: trimmedName,
      phone_number: cleanPhone,
      email: email ? email.trim() : null,
      current_points: 0,
      total_points_earned: 0,
      total_points_redeemed: 0,
      registered_branch_id: branch ? branch.id : '',
      registered_branch_name: branch ? branch.name : 'Main',
      notes: 'Registered via Tagpuan POS ticket assignment',
      created_at: now,
      updated_at: now
    };

    this.loyaltyCustomers.set(newCustomer.id, newCustomer);
    this.saveSnapshot();
    return newCustomer;
  }

  public getLoyaltyCustomers(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters?: { search?: string; branch_id?: string }
  ): LoyaltyCustomer[] {
    let list = Array.from(this.loyaltyCustomers.values());

    // Strict RLS: Owner sees all; Manager & Cashier see customers registered in their branch
    if (actorRole !== 'OWNER') {
      if (!actorBranchId) {
        throw new Error('Forbidden: User has no assigned branch.');
      }
      list = list.filter(c => c.registered_branch_id === actorBranchId);
    } else {
      if (filters?.branch_id && filters.branch_id !== 'ALL') {
        list = list.filter(c => c.registered_branch_id === filters.branch_id);
      }
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(c =>
        c.customer_name.toLowerCase().includes(q) ||
        (c.phone_number || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.current_points - a.current_points);
  }

  public getLoyaltyCustomerById(
    actorRole: UserRole,
    actorBranchId: string | null,
    customerId: string
  ): LoyaltyCustomer {
    const customer = this.loyaltyCustomers.get(customerId);
    if (!customer) throw new Error('Loyalty customer not found.');

    if (actorRole !== 'OWNER' && customer.registered_branch_id !== actorBranchId) {
      throw new Error('Forbidden: Customer does not belong to your assigned branch.');
    }

    return customer;
  }

  public createLoyaltyCustomer(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: CreateLoyaltyCustomerInput
  ): LoyaltyCustomer {
    if (!input.customer_name || input.customer_name.trim().length === 0) {
      throw new Error('Customer name is required.');
    }

    let targetBranchId = input.branch_id;
    if (actorRole !== 'OWNER') {
      if (!actorBranchId) throw new Error('Forbidden: No assigned branch.');
      targetBranchId = actorBranchId;
    } else {
      if (!targetBranchId || targetBranchId === 'ALL') {
        targetBranchId = Array.from(this.branches.values())[0]?.id;
      }
    }

    const branch = this.branches.get(targetBranchId!);
    if (!branch) throw new Error('Target branch not found.');

    const now = new Date().toISOString();
    const customer: LoyaltyCustomer = {
      id: crypto.randomUUID(),
      customer_name: input.customer_name.trim(),
      phone_number: input.phone_number ? input.phone_number.trim() : null,
      email: input.email ? input.email.trim() : null,
      current_points: 0,
      total_points_earned: 0,
      total_points_redeemed: 0,
      registered_branch_id: branch.id,
      registered_branch_name: branch.name,
      notes: input.notes ? input.notes.trim() : null,
      created_at: now,
      updated_at: now
    };

    this.loyaltyCustomers.set(customer.id, customer);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'LOYALTY_CUSTOMER_CREATED',
      entity_type: 'CUSTOMER',
      entity_id: customer.id,
      metadata: {
        customer_name: customer.customer_name,
        branch_name: branch.name,
        phone: customer.phone_number
      }
    });

    this.saveSnapshot();
    return customer;
  }

  public adjustLoyaltyPoints(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: AdjustLoyaltyPointsInput
  ): LoyaltyTransaction {
    // Phase 15 Section 4: Only OWNER is allowed to manually adjust loyalty points
    if (actorRole !== 'OWNER') {
      throw new Error('Forbidden: Only OWNER can perform manual loyalty point adjustments.');
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error('Adjustment reason is mandatory.');
    }

    const customer = this.loyaltyCustomers.get(input.customer_id);
    if (!customer) throw new Error('Loyalty customer not found.');

    const branch = this.branches.get(customer.registered_branch_id) || Array.from(this.branches.values())[0];
    const actor = this.profiles.get(actorId);
    const actorName = actor ? actor.full_name : actorEmail;
    const now = new Date().toISOString();

    const previousPoints = customer.current_points;
    const newPoints = Math.max(0, previousPoints + input.points);
    const actualDelta = newPoints - previousPoints;

    customer.current_points = newPoints;
    if (actualDelta > 0) {
      customer.total_points_earned += actualDelta;
    } else if (actualDelta < 0) {
      customer.total_points_redeemed += Math.abs(actualDelta);
    }
    customer.updated_at = now;
    this.loyaltyCustomers.set(customer.id, customer);

    const tx: LoyaltyTransaction = {
      id: crypto.randomUUID(),
      customer_id: customer.id,
      customer_name: customer.customer_name,
      transaction_type: 'ADJUSTMENT',
      points: actualDelta,
      order_id: null,
      order_number: null,
      branch_id: branch.id,
      branch_name: branch.name,
      reason: `Manual Adjustment: ${input.reason.trim()}`,
      processed_by: actorId,
      processed_by_name: actorName,
      created_at: now
    };
    this.loyaltyTransactions.set(tx.id, tx);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'LOYALTY_POINTS_ADJUSTED',
      entity_type: 'CUSTOMER',
      entity_id: customer.id,
      metadata: {
        customer_name: customer.customer_name,
        delta: actualDelta,
        previous_points: previousPoints,
        new_balance: newPoints,
        reason: input.reason.trim()
      }
    });

    this.saveSnapshot();
    return tx;
  }

  public redeemLoyaltyReward(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: RedeemLoyaltyRewardInput
  ): { redemption: LoyaltyRedemption; remaining_points: number; reward_ticket_number: string } {
    const customer = this.loyaltyCustomers.get(input.customer_id);
    if (!customer) throw new Error('Loyalty customer not found.');

    if (actorRole !== 'OWNER' && actorBranchId && input.branch_id !== actorBranchId) {
      throw new Error('Forbidden: You can only redeem rewards for your assigned branch.');
    }

    const branch = this.branches.get(input.branch_id);
    if (!branch) throw new Error('Branch not found.');

    let product = input.product_id ? this.products.get(input.product_id) : undefined;
    if (!product) {
      product = Array.from(this.products.values()).find(p => p.is_active) || Array.from(this.products.values())[0];
    }
    if (!product) throw new Error('Reward product not found in catalog.');

    // 200 points required per free item
    const POINTS_REQUIRED = 200;
    if (customer.current_points < POINTS_REQUIRED) {
      throw new Error(`Insufficient loyalty points. Customer has ${customer.current_points} pts, but ${POINTS_REQUIRED} pts are required.`);
    }

    const now = new Date().toISOString();
    const actor = this.profiles.get(actorId);
    const actorName = actor ? actor.full_name : actorEmail;
    const rewardTicketNumber = `REW-${Date.now().toString().slice(-6)}`;
    const retailPrice = product.selling_price || 150;

    customer.current_points -= POINTS_REQUIRED;
    customer.total_points_redeemed += POINTS_REQUIRED;
    customer.updated_at = now;
    this.loyaltyCustomers.set(customer.id, customer);

    const redemptionId = crypto.randomUUID();
    const redemption: LoyaltyRedemption = {
      id: redemptionId,
      customer_id: customer.id,
      customer_name: customer.customer_name,
      points_spent: POINTS_REQUIRED,
      product_id: product.id,
      product_name: product.product_name,
      order_id: input.order_id || null,
      order_number: input.order_id ? this.orders.get(input.order_id)?.order_number || null : null,
      reward_ticket_number: rewardTicketNumber,
      retail_value: retailPrice,
      branch_id: branch.id,
      branch_name: branch.name,
      cashier_id: actorId,
      cashier_name: actorName,
      redeemed_at: now,
      status: 'COMPLETED'
    };
    this.loyaltyRedemptions.set(redemption.id, redemption);

    // Deduct recipe ingredients from branch inventory for zero cash discrepancy
    const recipe = this.recipes.get(product.id);
    if (recipe && recipe.items) {
      for (const item of recipe.items) {
        for (const [invId, inv] of this.branchInventory.entries()) {
          if (inv.branch_id === branch.id && inv.ingredient_id === item.ingredient_id) {
            inv.current_stock = Math.max(0, inv.current_stock - item.quantity);
            inv.updated_at = now;
            this.branchInventory.set(invId, inv);
            this.inventoryTransactions.set(crypto.randomUUID(), {
              id: crypto.randomUUID(),
              ingredient_id: item.ingredient_id,
              branch_id: branch.id,
              transaction_type: 'USAGE',
              quantity: -item.quantity,
              cost: 0,
              reference_id: redemptionId,
              notes: `Loyalty Free Reward Ticket ${rewardTicketNumber}: ${product.product_name}`,
              performed_by: actorId,
              created_at: now
            });
            break;
          }
        }
      }
    }

    const tx: LoyaltyTransaction = {
      id: crypto.randomUUID(),
      customer_id: customer.id,
      customer_name: customer.customer_name,
      transaction_type: 'REDEEM',
      points: -POINTS_REQUIRED,
      order_id: input.order_id || null,
      order_number: redemption.order_number,
      branch_id: branch.id,
      branch_name: branch.name,
      reward_product_id: product.id,
      reward_product_name: product.product_name,
      reason: `Claimed 1 free ${product.product_name} (${POINTS_REQUIRED} pts) - Ticket: ${rewardTicketNumber}`,
      processed_by: actorId,
      processed_by_name: actorName,
      created_at: now
    };
    this.loyaltyTransactions.set(tx.id, tx);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branch.id,
      action: 'LOYALTY_REWARD_REDEEMED',
      entity_type: 'CUSTOMER',
      entity_id: customer.id,
      metadata: {
        customer_name: customer.customer_name,
        reward_product: product.product_name,
        reward_ticket_number: rewardTicketNumber,
        retail_value: retailPrice,
        cashier_name: actorName,
        branch_name: branch.name,
        points_spent: POINTS_REQUIRED,
        remaining_points: customer.current_points
      }
    });

    this.saveSnapshot();
    return {
      redemption,
      remaining_points: customer.current_points,
      reward_ticket_number: rewardTicketNumber
    };
  }

  public redeemLoyaltyRewardDirect(input: {
    customer_id: string;
    branch_id?: string;
    order_id?: string;
    product_id?: string;
    processed_by_name?: string;
  }): { redemption: LoyaltyRedemption; remaining_points: number; reward_ticket_number: string } {
    const customer = this.loyaltyCustomers.get(input.customer_id);
    if (!customer) throw new Error('Loyalty customer not found.');

    const POINTS_REQUIRED = 200;
    if (customer.current_points < POINTS_REQUIRED) {
      throw new Error(`Insufficient loyalty points. Customer has ${customer.current_points} pts, but ${POINTS_REQUIRED} pts are required.`);
    }

    const branch = (input.branch_id ? this.branches.get(input.branch_id) : null) ||
      this.branches.get(customer.registered_branch_id) ||
      Array.from(this.branches.values())[0];

    const product = (input.product_id ? this.products.get(input.product_id) : null) ||
      Array.from(this.products.values())[0] || { id: 'reward-free-meal', product_name: 'Tagpuan Free Reward Meal', selling_price: 150 };

    const now = new Date().toISOString();
    const rewardTicketNumber = `REW-${Date.now().toString().slice(-6)}`;
    const retailPrice = (product as any).selling_price || 150;

    customer.current_points -= POINTS_REQUIRED;
    customer.total_points_redeemed += POINTS_REQUIRED;
    customer.updated_at = now;
    this.loyaltyCustomers.set(customer.id, customer);

    const redemptionId = crypto.randomUUID();
    const redemption: LoyaltyRedemption = {
      id: redemptionId,
      customer_id: customer.id,
      customer_name: customer.customer_name,
      points_spent: POINTS_REQUIRED,
      product_id: product.id,
      product_name: product.product_name,
      order_id: input.order_id || null,
      order_number: input.order_id ? this.orders.get(input.order_id)?.order_number || null : null,
      reward_ticket_number: rewardTicketNumber,
      retail_value: retailPrice,
      branch_id: branch.id,
      branch_name: branch.name,
      cashier_id: 'KIOSK',
      cashier_name: input.processed_by_name || 'Self-Ordering Kiosk',
      redeemed_at: now,
      status: 'COMPLETED'
    };
    this.loyaltyRedemptions.set(redemption.id, redemption);

    // Deduct recipe ingredients
    const recipe = this.recipes.get(product.id);
    if (recipe && recipe.items) {
      for (const item of recipe.items) {
        for (const [invId, inv] of this.branchInventory.entries()) {
          if (inv.branch_id === branch.id && inv.ingredient_id === item.ingredient_id) {
            inv.current_stock = Math.max(0, inv.current_stock - item.quantity);
            inv.updated_at = now;
            this.branchInventory.set(invId, inv);
            this.inventoryTransactions.set(crypto.randomUUID(), {
              id: crypto.randomUUID(),
              ingredient_id: item.ingredient_id,
              branch_id: branch.id,
              transaction_type: 'USAGE',
              quantity: -item.quantity,
              cost: 0,
              reference_id: redemptionId,
              notes: `Loyalty Free Reward Ticket ${rewardTicketNumber}: ${product.product_name}`,
              performed_by: 'KIOSK',
              created_at: now
            });
            break;
          }
        }
      }
    }

    const tx: LoyaltyTransaction = {
      id: crypto.randomUUID(),
      customer_id: customer.id,
      customer_name: customer.customer_name,
      transaction_type: 'REDEEM',
      points: -POINTS_REQUIRED,
      order_id: input.order_id || null,
      order_number: redemption.order_number,
      branch_id: branch.id,
      branch_name: branch.name,
      reward_product_id: product.id,
      reward_product_name: product.product_name,
      reason: `Claimed 1 free ${product.product_name} (${POINTS_REQUIRED} pts) - Ticket: ${rewardTicketNumber}`,
      processed_by: 'KIOSK',
      processed_by_name: input.processed_by_name || 'Self-Ordering Kiosk',
      created_at: now
    };
    this.loyaltyTransactions.set(tx.id, tx);

    this.saveSnapshot();
    return {
      redemption,
      remaining_points: customer.current_points,
      reward_ticket_number: rewardTicketNumber
    };
  }

  public getLoyaltyTransactions(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters?: { branch_id?: string; customer_id?: string; type?: string; date?: string }
  ): LoyaltyTransaction[] {
    let list = Array.from(this.loyaltyTransactions.values());

    if (actorRole !== 'OWNER') {
      if (!actorBranchId) throw new Error('Forbidden: User has no assigned branch.');
      list = list.filter(tx => tx.branch_id === actorBranchId);
    } else {
      if (filters?.branch_id && filters.branch_id !== 'ALL') {
        list = list.filter(tx => tx.branch_id === filters.branch_id);
      }
    }

    if (filters?.customer_id && filters.customer_id !== 'ALL') {
      list = list.filter(tx => tx.customer_id === filters.customer_id);
    }

    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter(tx => tx.transaction_type === filters.type);
    }

    if (filters?.date) {
      list = list.filter(tx => tx.created_at.startsWith(filters.date!));
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getLoyaltyRedemptions(
    actorRole: UserRole,
    actorBranchId: string | null,
    filters?: { branch_id?: string; customer_id?: string }
  ): LoyaltyRedemption[] {
    let list = Array.from(this.loyaltyRedemptions.values());

    if (actorRole !== 'OWNER') {
      if (!actorBranchId) throw new Error('Forbidden: User has no assigned branch.');
      list = list.filter(r => r.branch_id === actorBranchId);
    } else {
      if (filters?.branch_id && filters.branch_id !== 'ALL') {
        list = list.filter(r => r.branch_id === filters.branch_id);
      }
    }

    if (filters?.customer_id && filters.customer_id !== 'ALL') {
      list = list.filter(r => r.customer_id === filters.customer_id);
    }

    return list.sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime());
  }

  public getLoyaltySummary(
    actorRole: UserRole,
    actorBranchId: string | null,
    branchFilter?: string
  ): LoyaltySummary {
    const customers = this.getLoyaltyCustomers(actorRole, actorBranchId, { branch_id: branchFilter });
    const transactions = this.getLoyaltyTransactions(actorRole, actorBranchId, { branch_id: branchFilter });
    const redemptions = this.getLoyaltyRedemptions(actorRole, actorBranchId, { branch_id: branchFilter });

    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;

    transactions.forEach(tx => {
      if (tx.transaction_type === 'EARN') {
        totalPointsEarned += tx.points;
      } else if (tx.transaction_type === 'REDEEM') {
        totalPointsRedeemed += Math.abs(tx.points);
      } else if (tx.transaction_type === 'REVERSAL') {
        totalPointsEarned = Math.max(0, totalPointsEarned + tx.points); // tx.points is negative
      } else if (tx.transaction_type === 'ADJUSTMENT') {
        if (tx.points > 0) totalPointsEarned += tx.points;
        else totalPointsRedeemed += Math.abs(tx.points);
      }
    });

    const activePointsBalance = customers.reduce((sum, c) => sum + c.current_points, 0);

    // Branch breakdown
    const branchMap = new Map<string, {
      branch_id: string;
      branch_name: string;
      customer_count: number;
      points_earned: number;
      points_redeemed: number;
      rewards_claimed: number;
    }>();

    for (const b of this.branches.values()) {
      if (actorRole !== 'OWNER' && b.id !== actorBranchId) continue;
      if (branchFilter && branchFilter !== 'ALL' && b.id !== branchFilter) continue;

      branchMap.set(b.id, {
        branch_id: b.id,
        branch_name: b.name,
        customer_count: 0,
        points_earned: 0,
        points_redeemed: 0,
        rewards_claimed: 0
      });
    }

    customers.forEach(c => {
      const bData = branchMap.get(c.registered_branch_id);
      if (bData) bData.customer_count += 1;
    });

    transactions.forEach(tx => {
      const bData = branchMap.get(tx.branch_id);
      if (bData) {
        if (tx.transaction_type === 'EARN') bData.points_earned += tx.points;
        else if (tx.transaction_type === 'REDEEM') bData.points_redeemed += Math.abs(tx.points);
      }
    });

    redemptions.forEach(r => {
      const bData = branchMap.get(r.branch_id);
      if (bData && r.status === 'COMPLETED') {
        bData.rewards_claimed += 1;
      }
    });

    return {
      total_customers: customers.length,
      total_points_earned: totalPointsEarned,
      total_points_redeemed: totalPointsRedeemed,
      total_rewards_claimed: redemptions.filter(r => r.status === 'COMPLETED').length,
      active_points_balance: activePointsBalance,
      branch_breakdown: Array.from(branchMap.values()).sort((a, b) => b.customer_count - a.customer_count)
    };
  }

  // --- SAVED TICKETS ---
  public saveTicket(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    actorBranchId: string | null,
    input: {
      branch_id: string;
      customer_name: string;
      customer_phone?: string;
      customer_id?: string;
      items: any[];
      subtotal: number;
      discount_type?: string;
      discount_amount?: number;
      notes?: string;
    }
  ): SavedTicket {
    if (!input.customer_name || input.customer_name.trim().length === 0) {
      throw new Error('Customer name is required to hold or save a ticket.');
    }

    if (actorRole !== 'OWNER' && input.branch_id !== actorBranchId) {
      throw new Error('Forbidden: You can only save tickets for your assigned branch.');
    }

    const branch = this.branches.get(input.branch_id);
    if (!branch) throw new Error('Branch not found.');

    const cashier = this.profiles.get(actorId);
    const cashierName = cashier ? cashier.full_name : actorEmail;
    const now = new Date().toISOString();

    const seq = this.savedTicketSequence++;
    const ticket: SavedTicket = {
      id: crypto.randomUUID(),
      ticket_number: `TKT-${String(seq).padStart(4, '0')}`,
      branch_id: branch.id,
      branch_name: branch.name,
      cashier_id: actorId,
      cashier_name: cashierName,
      customer_id: input.customer_id || null,
      customer_name: input.customer_name.trim(),
      customer_phone: input.customer_phone ? input.customer_phone.trim() : null,
      items: input.items || [],
      subtotal: input.subtotal || 0,
      discount_type: input.discount_type,
      discount_amount: input.discount_amount,
      notes: input.notes,
      created_at: now
    };

    this.savedTickets.set(ticket.id, ticket);
    this.saveSnapshot();
    return ticket;
  }

  public getSavedTickets(
    actorRole: UserRole,
    actorBranchId: string | null,
    branchId?: string
  ): SavedTicket[] {
    let list = Array.from(this.savedTickets.values());

    if (actorRole !== 'OWNER') {
      if (!actorBranchId) throw new Error('Forbidden: User has no assigned branch.');
      list = list.filter(t => t.branch_id === actorBranchId);
    } else {
      if (branchId && branchId !== 'ALL') {
        list = list.filter(t => t.branch_id === branchId);
      }
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public deleteSavedTicket(
    actorRole: UserRole,
    actorBranchId: string | null,
    ticketId: string
  ): boolean {
    const ticket = this.savedTickets.get(ticketId);
    if (!ticket) return false;

    if (actorRole !== 'OWNER' && ticket.branch_id !== actorBranchId) {
      throw new Error('Forbidden: You can only delete saved tickets from your branch.');
    }

    const deleted = this.savedTickets.delete(ticketId);
    if (deleted) this.saveSnapshot();
    return deleted;
  }

  // ==========================================
  // PHASE 13: OWNER MASTER CONTROL CENTER
  // ==========================================

  // 1. Branch Administration
  public createBranch(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: { name: string; address?: string; phone?: string; manager_name?: string; is_active?: boolean }
  ): Branch {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can create new branches.');
    }
    const cleanName = (data.name || '').trim();
    if (!cleanName) {
      throw new Error('Branch name is required.');
    }

    const existing = Array.from(this.branches.values()).find(
      b => b.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      throw new Error(`A branch named "${cleanName}" already exists.`);
    }

    const now = new Date().toISOString();
    const branchId = crypto.randomUUID();
    const branch: Branch = {
      id: branchId,
      name: cleanName,
      address: data.address?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      manager_name: data.manager_name?.trim() || undefined,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now
    };

    this.branches.set(branchId, branch);

    // Initialize branch inventory for all existing catalog ingredients
    this.ingredients.forEach(ing => {
      const invKey = `${branchId}_${ing.id}`;
      const inv: BranchInventory = {
        id: invKey,
        branch_id: branchId,
        branch_name: branch.name,
        ingredient_id: ing.id,
        ingredient_name: ing.item_name,
        item_code: ing.item_code,
        category: ing.category,
        unit: ing.unit,
        cost_price: ing.cost_price,
        current_stock: ing.reorder_level * 2,
        reorder_level: ing.reorder_level,
        maximum_stock: ing.maximum_stock,
        status: 'IN_STOCK',
        is_active: ing.is_active,
        created_at: now,
        updated_at: now
      };
      this.branchInventory.set(invKey, inv);
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: branchId,
      branch_name: branch.name,
      action: 'BRANCH_CREATED',
      entity_type: 'BRANCH',
      entity_id: branchId,
      metadata: { branch_name: branch.name, address: branch.address, phone: branch.phone }
    });

    this.saveSnapshot();
    return branch;
  }

  public toggleBranchStatus(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    id: string,
    isActive: boolean
  ): Branch {
    return this.updateBranch(actorRole, actorId, actorEmail, id, { is_active: isActive });
  }

  // 2. User & Role Administration
  public updateUserProfile(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    userId: string,
    data: {
      full_name?: string;
      role?: UserRole;
      branch_id?: string | null;
      is_active?: boolean;
    }
  ): Profile {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can modify user accounts.');
    }
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('User account not found.');
    }

    // Safety: Prevent deactivating the last active OWNER
    if (profile.role === 'OWNER' && data.is_active === false) {
      const activeOwners = Array.from(this.profiles.values()).filter(p => p.role === 'OWNER' && p.is_active);
      if (activeOwners.length <= 1) {
        throw new Error('Cannot deactivate the sole active Owner account.');
      }
    }

    const now = new Date().toISOString();
    const oldRole = profile.role;
    const oldBranchId = profile.branch_id;

    if (data.full_name && data.full_name.trim().length > 0) {
      profile.full_name = data.full_name.trim();
    }

    if (data.role && VALID_ROLES.includes(data.role)) {
      profile.role = data.role;
      if (data.role === 'OWNER') {
        profile.branch_id = null;
        profile.branch_name = 'All Branches (Global Access)';
      }
    }

    if (data.branch_id !== undefined && profile.role !== 'OWNER') {
      if (data.branch_id && !this.branches.has(data.branch_id)) {
        throw new Error('Assigned branch does not exist.');
      }
      profile.branch_id = data.branch_id;
      const b = data.branch_id ? this.branches.get(data.branch_id) : null;
      profile.branch_name = b ? b.name : 'Unassigned';
    }

    if (data.is_active !== undefined) {
      profile.is_active = data.is_active;
    }
    profile.updated_at = now;
    this.profiles.set(userId, profile);

    // Sync corresponding employee record if it exists
    const emp = this.getEmployeeByUserId(userId);
    if (emp) {
      emp.full_name = profile.full_name;
      emp.role = profile.role;
      emp.branch_id = profile.branch_id;
      emp.branch_name = profile.branch_name;
      emp.status = profile.is_active ? 'ACTIVE' : 'INACTIVE';
      emp.updated_at = now;
      this.employees.set(emp.id, emp);
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: profile.branch_id,
      action: 'USER_UPDATED_BY_OWNER',
      entity_type: 'USER',
      entity_id: userId,
      metadata: {
        email: profile.email,
        full_name: profile.full_name,
        old_role: oldRole,
        new_role: profile.role,
        old_branch: oldBranchId,
        new_branch: profile.branch_id,
        is_active: profile.is_active
      }
    });

    this.saveSnapshot();
    return this.getProfileById(userId)!;
  }

  public resetUserPasswordByOwner(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    targetUserId: string,
    newPassword: string
  ): { success: boolean; message: string } {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can reset user passwords directly.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const profile = this.profiles.get(targetUserId);
    if (!profile) {
      throw new Error('User not found.');
    }

    const credential = this.credentials.get(targetUserId);
    if (!credential) {
      throw new Error('User credentials record not found.');
    }

    const salt = this.generateSalt();
    credential.salt = salt;
    credential.password_hash = this.hashPassword(newPassword, salt);
    credential.reset_token = null;
    credential.reset_token_expires = null;
    this.credentials.set(targetUserId, credential);

    // Invalidate existing sessions for this user so they re-authenticate with the new password
    this.sessions.forEach((sess, token) => {
      if (sess.userId === targetUserId && sess.userId !== actorId) {
        this.sessions.delete(token);
      }
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: profile.branch_id,
      action: 'USER_PASSWORD_RESET_BY_OWNER',
      entity_type: 'USER',
      entity_id: targetUserId,
      metadata: {
        target_email: profile.email,
        target_name: profile.full_name
      }
    });

    this.createNotification({
      recipient_user_id: targetUserId,
      title: 'Password Updated by Owner',
      message: 'Your Tagpuan account password was reset by the System Administrator.',
      type: 'INFO'
    });

    this.saveSnapshot();
    return {
      success: true,
      message: `Password successfully updated for ${profile.full_name} (${profile.email}).`
    };
  }

  // 3. Inventory & Recipe Administration
  public updateIngredientThreshold(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    ingredientId: string,
    reorderLevel: number,
    maximumStock?: number
  ): Ingredient {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can configure inventory thresholds.');
    }
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) {
      throw new Error('Ingredient not found.');
    }

    const prevThreshold = ingredient.reorder_level;
    const cleanThreshold = Math.max(0, Number(reorderLevel));
    ingredient.reorder_level = cleanThreshold;
    if (maximumStock !== undefined) {
      ingredient.maximum_stock = Math.max(cleanThreshold, Number(maximumStock));
    }
    ingredient.updated_at = new Date().toISOString();
    this.ingredients.set(ingredientId, ingredient);

    // Propagate new threshold to all branch inventory rows and recalculate status
    const now = new Date().toISOString();
    this.branchInventory.forEach((inv, key) => {
      if (inv.ingredient_id === ingredientId) {
        inv.reorder_level = cleanThreshold;
        if (maximumStock !== undefined) inv.maximum_stock = ingredient.maximum_stock;
        inv.status = inv.current_stock > inv.reorder_level ? 'IN_STOCK' : (inv.current_stock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
        inv.updated_at = now;
        this.branchInventory.set(key, inv);
      }
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: null,
      action: 'INVENTORY_THRESHOLD_UPDATED',
      entity_type: 'INGREDIENT',
      entity_id: ingredientId,
      metadata: {
        ingredient_name: ingredient.item_name,
        item_code: ingredient.item_code,
        prev_threshold: prevThreshold,
        new_threshold: cleanThreshold
      }
    });

    this.saveSnapshot();
    return ingredient;
  }

  // 4. Payment & QR Administration
  public updatePaymentConfigurationWithAudit(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    configId: string,
    data: Partial<PaymentConfiguration>
  ): PaymentConfiguration {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can modify payment settings.');
    }
    const config = this.paymentConfigs.get(configId);
    if (!config) {
      throw new Error('Payment configuration not found.');
    }

    const prevMethod = config.payment_method;
    const prevActive = config.is_active;
    const now = new Date().toISOString();

    const updated: PaymentConfiguration = {
      ...config,
      ...data,
      updated_at: now
    };

    this.paymentConfigs.set(configId, updated);

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: config.branch_id,
      action: 'PAYMENT_CONFIG_UPDATED',
      entity_type: 'PAYMENT_CONFIG',
      entity_id: configId,
      metadata: {
        payment_method: updated.payment_method,
        is_active: updated.is_active,
        account_name: updated.account_name,
        account_number: updated.account_number,
        qr_image_set: !!updated.qr_image_url
      }
    });

    this.saveSnapshot();
    return updated;
  }

  public togglePaymentConfigurationWithAudit(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    configId: string,
    isActive: boolean
  ): PaymentConfiguration {
    return this.updatePaymentConfigurationWithAudit(actorRole, actorId, actorEmail, configId, { is_active: isActive });
  }

  // 5. AI Agent Settings
  public getAISettings(): AIAgentSettings {
    return { ...this.aiSettings };
  }

  public updateAISettings(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: Partial<AIAgentSettings>
  ): AIAgentSettings {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can configure AI Agent settings.');
    }

    const prev = { ...this.aiSettings };
    this.aiSettings = {
      ...this.aiSettings,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: actorEmail
    };

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: null,
      action: 'AI_SETTINGS_UPDATED',
      entity_type: 'AI_CONFIG',
      entity_id: 'AI_AGENT_SETTINGS',
      metadata: {
        previous: prev,
        updated: this.aiSettings
      }
    });

    this.saveSnapshot();
    return { ...this.aiSettings };
  }

  // 6. System Settings
  public getSystemSettings(): SystemSettings {
    return { ...this.systemSettings };
  }

  public updateSystemSettings(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    data: Partial<SystemSettings>
  ): SystemSettings {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only an OWNER can modify system settings.');
    }

    const prev = { ...this.systemSettings };
    this.systemSettings = {
      ...this.systemSettings,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: actorEmail
    };

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: 'OWNER',
      branch_id: null,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entity_type: 'SYSTEM_CONFIG',
      entity_id: 'SYSTEM_SETTINGS',
      metadata: {
        business_name: this.systemSettings.business_name,
        tagline: this.systemSettings.tagline,
        currency: this.systemSettings.currency
      }
    });

    this.saveSnapshot();
    return { ...this.systemSettings };
  }

  // 7. Master Control Overview
  public getMasterControlOverview(actorRole: UserRole): MasterControlOverview {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Master Control Center overview is restricted to the OWNER.');
    }

    const branchList = Array.from(this.branches.values());
    const userList = Array.from(this.profiles.values());
    const productList = Array.from(this.products.values());
    const ingredientList = Array.from(this.ingredients.values());

    const activeBranches = branchList.filter(b => b.is_active).length;
    const activeUsers = userList.filter(u => u.is_active).length;
    const activeProducts = productList.filter(p => p.is_active).length;
    const inventoryThresholdCount = ingredientList.filter(i => i.reorder_level > 0).length;

    return {
      active_branches: activeBranches,
      total_branches: branchList.length,
      active_users: activeUsers,
      total_users: userList.length,
      active_menu_items: activeProducts,
      total_menu_items: productList.length,
      inventory_threshold_count: inventoryThresholdCount,
      total_inventory_items: ingredientList.length,
      ai_monitoring_status: this.aiSettings.ai_monitoring_enabled ? 'ACTIVE' : 'PAUSED',
      ai_active_alerts_count: 0, // Will be enriched or calculated by router
      system_settings: { ...this.systemSettings },
      ai_settings: { ...this.aiSettings }
    };
  }

  // 8. Production Readiness & System Initialization / Factory Reset
  public cleanTestDataForProduction(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string
  ): { success: boolean; message: string; stats: any } {
    const isMasterOwnerEmail = actorEmail && (
      actorEmail.toLowerCase() === 'janzenmarkglori@gmail.com' ||
      actorEmail.toLowerCase() === 'owner@tagpuan.ph' ||
      actorEmail.toLowerCase() === 'maryjasmineadlaon121199@gmail.com'
    );
    if (actorRole !== 'OWNER' && !isMasterOwnerEmail) {
      throw new Error('Unauthorized: Only Master Owner can initialize the system for live production.');
    }

    const previousStats = {
      clearedOrders: this.orders.size,
      clearedPayments: this.payments.size,
      clearedShifts: this.cashierShifts.size,
      clearedRemittances: this.remittances.size,
      clearedExpenses: this.expenses.size,
      clearedAttendance: this.attendance.size,
      clearedAuditLogs: this.auditLogs.length,
      clearedTransactions: this.inventoryTransactions.size
    };

    // 1. Wipe all test/sample transactions
    this.orders.clear();
    this.orderItems.clear();
    this.orderItemModifiers.clear();
    this.payments.clear();
    this.orderStatusHistory = [];
    this.salesTransactions.clear();
    this.cashierSessions.clear();
    this.cashierShifts.clear();
    this.remittances.clear();
    this.expenses.clear();
    this.reconciliations.clear();
    this.attendance.clear();
    this.inventoryTransactions.clear();
    this.lowStockEvents.clear();
    this.loyaltyTransactions.clear();
    this.loyaltyRedemptions.clear();
    this.savedTickets.clear();
    this.notifications = [];
    this.auditLogs = [];

    // Reset sequences to clean starting numbers
    this.orderNumberSequence = 1;
    this.cashierShiftSequence = 1;
    this.remittanceSequence = 1;
    this.expenseSequence = 1;
    this.savedTicketSequence = 1;

    // 2. Set production clean state flag
    this.isProductionClean = true;

    // 3. Ensure clean, healthy initial stock for all 17 branches across all ingredients
    // Keep raw ingredients catalogue (Patties, Buns, Hotdogs, Siomai, Rice, Cooking oil, etc.)
    const allBranches = Array.from(this.branches.values());
    const allIngredients = Array.from(this.ingredients.values());
    const now = new Date().toISOString();

    for (const branch of allBranches) {
      for (const ing of allIngredients) {
        const key = `${branch.id}_${ing.id}`;
        let inv = this.branchInventory.get(key);
        // Find matching seed metadata if available for healthy starting stock
        const seedMeta = INITIAL_INGREDIENTS_DATA.find(s => s.item_code === ing.item_code || s.item_name.toLowerCase() === ing.item_name.toLowerCase());
        const startingStock = seedMeta ? seedMeta.initial_stock : (ing.reorder_level * 3);

        if (!inv) {
          inv = {
            id: key,
            branch_id: branch.id,
            branch_name: branch.name,
            ingredient_id: ing.id,
            ingredient_name: ing.item_name,
            item_code: ing.item_code,
            category: ing.category,
            unit: ing.unit,
            cost_price: ing.cost_price,
            current_stock: startingStock,
            reorder_level: ing.reorder_level,
            maximum_stock: ing.maximum_stock,
            status: 'IN_STOCK',
            is_active: true,
            created_at: now,
            updated_at: now
          };
        } else {
          inv.current_stock = startingStock;
          inv.status = 'IN_STOCK';
          inv.updated_at = now;
        }
        this.branchInventory.set(key, inv);
      }
    }

    // 4. Log initial production audit trail
    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      action: 'SYSTEM_INITIALIZATION_PRODUCTION_RESET',
      entity_type: 'SYSTEM',
      entity_id: 'SYSTEM_FACTORY_RESET',
      metadata: {
        timestamp: now,
        actor: actorEmail,
        branches_preserved: allBranches.length,
        products_preserved: this.products.size,
        ingredients_preserved: allIngredients.length,
        users_preserved: this.profiles.size,
        sales_counter_starting: 0,
        ...previousStats
      }
    });

    this.saveSnapshot();

    console.log(`[DB:cleanTestDataForProduction] System reset to clean production state by ${actorEmail}.`);

    return {
      success: true,
      message: 'System successfully initialized for live production deployment. All starting sales metrics set to ₱0.00.',
      stats: {
        branches: allBranches.length,
        products: this.products.size,
        ingredients: allIngredients.length,
        users: this.profiles.size,
        orders: 0,
        sales: 0,
        ...previousStats
      }
    };
  }

  // Phase 14 Helper Accessors
  public getPayments(actorRole?: UserRole, actorBranchId?: string | null): Payment[] {
    let list = Array.from(this.payments.values());
    if (actorRole === 'MANAGER' || actorRole === 'CASHIER' || actorRole === 'CREW') {
      if (actorBranchId) {
        list = list.filter(p => p.branch_id === actorBranchId);
      }
    }
    return list;
  }

  public getOrderItems(): OrderItem[] {
    return Array.from(this.orderItems.values());
  }

  public getRawOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  public getRawSavedTickets(): SavedTicket[] {
    return Array.from(this.savedTickets.values());
  }

  public addImportAudit(record: ImportAuditRecord): void {
    this.importAuditLogs.set(record.id, record);
    this.saveSnapshot();
  }

  public getImportAudits(actorRole?: UserRole, actorBranchId?: string | null): ImportAuditRecord[] {
    let list = Array.from(this.importAuditLogs.values());
    if (actorRole === 'MANAGER' && actorBranchId) {
      list = list.filter(l => !l.branch_id || l.branch_id === actorBranchId);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addExportLog(record: ExportLogRecord): void {
    this.exportLogs.unshift(record);
    if (this.exportLogs.length > 200) {
      this.exportLogs = this.exportLogs.slice(0, 200);
    }
    this.saveSnapshot();
  }

  public getExportLogs(actorRole?: UserRole, actorBranchId?: string | null): ExportLogRecord[] {
    let list = [...this.exportLogs];
    if (actorRole === 'MANAGER' && actorBranchId) {
      list = list.filter(l => l.branch_id === actorBranchId);
    }
    return list;
  }

  // MASTER OWNER KIOSK ACCESS VAULT: 17 Branches PIN Directory
  public getBranchKioskPinDirectory(actorRole: UserRole): any[] {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Kiosk PIN Directory is exclusively restricted to the MASTER OWNER.');
    }

    const branches = Array.from(this.branches.values()).sort((a, b) => a.name.localeCompare(b.name));
    const managers = Array.from(this.profiles.values()).filter(p => p.role === 'MANAGER');

    return branches.map(b => {
      // Find manager(s) assigned to this branch
      const branchManager = managers.find(m => m.branch_id === b.id && m.is_active) || managers.find(m => m.branch_id === b.id);
      
      const pin = b.kiosk_pin || branchManager?.kiosk_pin || '1234'; // Default to 1234 if not configured
      const isConfigured = !(b as any).kiosk_pin_deleted && (!!b.kiosk_pin || !!branchManager?.kiosk_pin);
      const isDeactivated = Boolean((b as any).kiosk_pin_deleted);

      return {
        branch_id: b.id,
        branch_name: b.name,
        branch_code: b.code || `TAG-${b.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase()}`,
        terminal_id: (b as any).kiosk_terminal_id || `TERM-${b.id.substring(0, 8).toUpperCase()}`,
        terminal_name: (b as any).kiosk_terminal_name || `${b.name} Kiosk #1`,
        address: b.address || 'Cavite Outlet',
        phone: b.phone || '0917-000-0000',
        manager_id: branchManager?.id || null,
        manager_name: branchManager?.full_name || b.manager_name || 'Unassigned Manager',
        manager_email: branchManager?.email || null,
        kiosk_pin: isDeactivated ? 'DEACTIVATED' : pin,
        is_pin_configured: isConfigured,
        is_active: b.is_active && !isDeactivated,
        updated_at: (b as any).kiosk_pin_updated_at || branchManager?.updated_at || b.updated_at
      };
    });
  }

  public createBranchKioskPin(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    branchId: string,
    kioskPin: string,
    terminalName?: string
  ): { branch_id: string; kiosk_pin: string; terminal_name: string; message: string } {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only the Master Owner can add Kiosk Access PINs.');
    }

    const cleanPin = String(kioskPin || '').trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error('Kiosk PIN must be a 4 to 6-digit numeric sequence.');
    }

    const branch = this.branches.get(branchId);
    if (!branch) throw new Error('Branch not found.');

    const now = new Date().toISOString();
    const cleanTerminalName = (terminalName || '').trim() || `${branch.name} Kiosk #1`;

    branch.kiosk_pin = cleanPin;
    (branch as any).kiosk_terminal_name = cleanTerminalName;
    (branch as any).kiosk_terminal_id = `TERM-${branch.id.substring(0, 8).toUpperCase()}`;
    (branch as any).kiosk_pin_deleted = false;
    (branch as any).kiosk_pin_updated_at = now;
    branch.updated_at = now;
    this.branches.set(branch.id, branch);

    // Sync with branch manager
    let manager = Array.from(this.profiles.values()).find(p => p.role === 'MANAGER' && p.branch_id === branchId);
    if (manager) {
      manager.kiosk_pin = cleanPin;
      manager.is_pin_configured = true;
      manager.updated_at = now;
      this.profiles.set(manager.id, manager);
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branchId,
      action: 'UPDATE_KIOSK_PIN',
      entity_type: 'USER',
      entity_id: branchId,
      metadata: {
        branch_name: branch.name,
        terminal_name: cleanTerminalName,
        action_type: 'CREATE_TERMINAL_PIN',
        updated_by: actorEmail,
        timestamp: now
      }
    });

    this.saveSnapshot();

    return {
      branch_id: branch.id,
      kiosk_pin: cleanPin,
      terminal_name: cleanTerminalName,
      message: `Kiosk Terminal "${cleanTerminalName}" PIN created for ${branch.name}.`
    };
  }

  public resetBranchKioskPin(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    branchId: string,
    newPin: string,
    targetUserId?: string,
    terminalName?: string
  ): { branch_id: string; new_pin: string; manager_name: string; message: string } {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only the Master Owner can view or reset Kiosk Access PINs.');
    }

    const cleanPin = String(newPin || '').trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error('Kiosk PIN must be a 4 to 6-digit numeric code.');
    }

    const branch = this.branches.get(branchId);
    if (!branch) throw new Error('Branch not found.');

    const now = new Date().toISOString();
    branch.kiosk_pin = cleanPin;
    (branch as any).kiosk_pin_deleted = false;
    (branch as any).kiosk_pin_updated_at = now;
    if (terminalName) {
      (branch as any).kiosk_terminal_name = terminalName.trim();
    }
    this.branches.set(branch.id, branch);

    let manager = targetUserId ? this.profiles.get(targetUserId) : undefined;

    if (!manager) {
      // Find existing manager for this branch
      manager = Array.from(this.profiles.values()).find(p => p.role === 'MANAGER' && p.branch_id === branchId);
    }

    if (!manager) {
      // If no manager profile exists for this branch, create a designated Branch Manager profile
      const newManagerId = crypto.randomUUID();
      const branchSlug = branch.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const newEmail = `manager.${branchSlug}@tagpuan.ph`;

      manager = {
        id: newManagerId,
        auth_user_id: crypto.randomUUID(),
        full_name: `${branch.name} Store Manager`,
        email: newEmail,
        role: 'MANAGER',
        branch_id: branch.id,
        branch_name: branch.name,
        kiosk_pin: cleanPin,
        is_pin_configured: true,
        is_active: true,
        created_at: now,
        updated_at: now
      };

      this.profiles.set(newManagerId, manager);
    } else {
      manager.kiosk_pin = cleanPin;
      manager.is_pin_configured = true;
      manager.updated_at = now;
      this.profiles.set(manager.id, manager);
    }

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branchId,
      action: 'UPDATE_KIOSK_PIN',
      entity_type: 'USER',
      entity_id: branchId,
      metadata: {
        branch_name: branch.name,
        manager_name: manager.full_name,
        manager_email: manager.email,
        updated_by: actorEmail,
        timestamp: now
      }
    });

    this.saveSnapshot();

    return {
      branch_id: branch.id,
      new_pin: cleanPin,
      manager_name: manager.full_name,
      message: `Kiosk Access PIN for ${branch.name} successfully updated to ${cleanPin}.`
    };
  }

  public deleteBranchKioskPin(
    actorRole: UserRole,
    actorId: string,
    actorEmail: string,
    branchId: string
  ): { branch_id: string; branch_name: string; message: string } {
    if (actorRole !== 'OWNER') {
      throw new Error('Unauthorized: Only the Master Owner can remove Kiosk Terminal PINs.');
    }

    const branch = this.branches.get(branchId);
    if (!branch) throw new Error('Branch not found.');

    const now = new Date().toISOString();
    (branch as any).kiosk_pin_deleted = true;
    (branch as any).kiosk_pin_updated_at = now;
    branch.kiosk_pin = undefined;
    this.branches.set(branch.id, branch);

    // Also clear manager kiosk pin
    const managers = Array.from(this.profiles.values()).filter(p => p.role === 'MANAGER' && p.branch_id === branchId);
    managers.forEach(m => {
      m.kiosk_pin = null;
      m.is_pin_configured = false;
      m.updated_at = now;
      this.profiles.set(m.id, m);
    });

    this.createAuditLog({
      user_id: actorId,
      user_email: actorEmail,
      role: actorRole,
      branch_id: branchId,
      action: 'UPDATE_KIOSK_PIN',
      entity_type: 'USER',
      entity_id: branchId,
      metadata: {
        branch_name: branch.name,
        action_type: 'DELETE_TERMINAL_PIN',
        updated_by: actorEmail,
        timestamp: now
      }
    });

    this.saveSnapshot();

    return {
      branch_id: branch.id,
      branch_name: branch.name,
      message: `Kiosk terminal PIN credentials for ${branch.name} successfully deleted.`
    };
  }
}

export const db = new TagpuanDatabase();


