// TAGPUAN ERP - Domain Types & Interfaces

export type UserRole = 
  | 'OWNER'
  | 'MANAGER'
  | 'CASHIER'
  | 'CREW'
  | 'WAREHOUSEMAN'
  | 'KITCHEN';

export interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  landmark?: string;
  phone?: string;
  manager_name?: string;
  opening_time?: string;
  closing_time?: string;
  kiosk_pin?: string;
  operating_status?: 'OPEN' | 'MAINTENANCE' | 'CLOSED';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: UserRole;
  branch_id: string | null;
  branch_name?: string | null;
  kiosk_pin?: string | null;
  is_pin_configured?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Phase 2: Employee Entity (Strictly connected to User / Auth)
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  user_id: string; // Foreign key linking to authenticated profile
  employee_code: string; // e.g. EMP-101
  full_name: string;
  email: string;
  role: UserRole;
  branch_id: string | null;
  branch_name?: string | null;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

// Phase 2: Attendance Entity
export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_role?: UserRole;
  role?: UserRole;
  user_id: string;
  branch_id: string;
  branch_name?: string;
  date: string; // YYYY-MM-DD
  clock_in: string; // ISO 8601 authoritative server timestamp
  clock_out: string | null; // ISO 8601 authoritative server timestamp or null
  total_minutes: number;
  total_hours_formatted?: string;
  payable_hours?: number;
  gross_hours?: number;
  deducted_break_hours?: number;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

// Phase 2: Payroll Rules (Owner configurable)
export interface PayrollRule {
  id: string;
  deduct_break_hour: boolean;
  minimum_hours_for_break_deduction: number;
  // Configured rates for 5h, 6h, 7h, 8h, 9h, 10h, 11h, 12h
  // Known seeded exact rates: 5=200, 6=250, 7=300
  // 8..12 are not guessed, must be editable by Owner
  rates: {
    5: number | null;
    6: number | null;
    7: number | null;
    8: number | null;
    9: number | null;
    10: number | null;
    11: number | null;
    12: number | null;
  };
  updated_by: string;
  updated_at: string;
}

// Phase 2: Payroll Period
export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_closed: boolean;
  created_at: string;
}

// Phase 2: Payroll Itemization Breakdown
export interface PayrollItem {
  attendance_id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  gross_hours: number;
  deducted_break_hours: number;
  payable_hours: number;
  rate_applied: number;
  amount: number;
}

// Phase 2: Payroll Record
export type PayrollStatus = 'DRAFT' | 'FOR_REVIEW' | 'APPROVED' | 'PAID';

export interface PayrollRecord {
  id: string;
  period_id: string;
  period_name?: string;
  employee_id: string;
  employee_name: string;
  employee_role: UserRole;
  branch_id: string;
  branch_name: string;
  attendance_ids: string[];
  total_shifts: number;
  gross_hours: number;
  deducted_break_hours?: number;
  payable_hours: number;
  gross_payable_amount: number;
  adjustments: number; // Positive (bonus) or negative (deduction)
  adjustment_note?: string;
  final_amount: number;
  status: PayrollStatus;
  generated_by_user_id: string;
  generated_by_email: string;
  prepared_by_name?: string;
  approved_by_name?: string;
  approved_by_user_id?: string | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  breakdown_items: PayrollItem[];
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
}

export interface BranchUserRecord {
  id: string;
  branch_id: string;
  user_id: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  role: UserRole;
  branch_id: string | null;
  branch_name?: string | null;
  action: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'USER_CREATED'
    | 'USER_ACTIVATED'
    | 'USER_DEACTIVATED'
    | 'USER_DELETED'
    | 'ROLE_ASSIGNED'
    | 'BRANCH_ASSIGNED'
    | 'UPDATE_KIOSK_PIN'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'BRANCH_UPDATED'
    | 'SYSTEM_INITIALIZED'
    | 'EMPLOYEE_CREATED'
    | 'EMPLOYEE_UPDATED'
    | 'EMPLOYEE_ACTIVATED'
    | 'EMPLOYEE_DEACTIVATED'
    | 'EMPLOYEE_DELETED'
    | 'CLOCK_IN'
    | 'CLOCK_OUT'
    | 'PAYROLL_RULE_UPDATED'
    | 'PAYROLL_GENERATED'
    | 'PAYROLL_STATUS_UPDATED'
    | 'PAYROLL_APPROVED'
    | 'PAYROLL_ADJUSTED'
    | 'PRODUCT_CREATED'
    | 'PRODUCT_UPDATED'
    | 'PRODUCT_ACTIVATED'
    | 'PRODUCT_DEACTIVATED'
    | 'PRODUCT_PRICE_UPDATED'
    | 'PRODUCT_IMAGE_UPLOADED'
    | 'INGREDIENT_CREATED'
    | 'INGREDIENT_UPDATED'
    | 'RECIPE_CREATED'
    | 'RECIPE_UPDATED'
    | 'INVENTORY_STOCK_IN'
    | 'INVENTORY_ADJUSTED'
    | 'INVENTORY_REJECTED'
    | 'INVENTORY_DEDUCTED'
    | 'LOW_STOCK_EVENT'
    | 'ORDER_CREATED'
    | 'PAYMENT_PROCESSED'
    | 'ORDER_VOIDED'
    | 'ORDER_CANCELLED'
    | 'CASHIER_SESSION_OPENED'
    | 'CASHIER_SESSION_CLOSED'
    | 'KITCHEN_ORDER_RECEIVED'
    | 'KITCHEN_STARTED'
    | 'KITCHEN_READY'
    | 'KITCHEN_DELIVERED'
    | 'KITCHEN_COMPLETED'
    | 'DELAYED_ALERT'
    | 'LOYALTY_POINTS_EARNED'
    | 'LOYALTY_REWARD_REDEEMED'
    | 'LOYALTY_POINTS_REVERSED'
    | 'LOYALTY_CUSTOMER_CREATED'
    | 'LOYALTY_POINTS_ADJUSTED'
    | 'PURCHASE_ORDER_CREATED'
    | 'PURCHASE_ORDER_APPROVED'
    | 'PURCHASE_RECEIPT'
    | 'REQUEST_CREATED'
    | 'REQUEST_EDITED'
    | 'REQUEST_SUBMITTED'
    | 'REQUEST_APPROVED'
    | 'REQUEST_REJECTED'
    | 'DELIVERY_CREATED'
    | 'DELIVERY_PREPARED'
    | 'DELIVERY_DISPATCHED'
    | 'DELIVERY_RECEIVED'
    | 'DELIVERY_PARTIAL'
    | 'ITEM_REJECTED'
    | 'INVENTORY_TRANSFER_OUT'
    | 'INVENTORY_TRANSFER_IN'
    | 'OWNER_OVERRIDE'
    | 'RECONCILIATION_COMPLETED'
    | 'OWNER_FINANCIAL_ADJUSTMENT'
    | 'SHIFT_OPENED'
    | 'SHIFT_CLOSED'
    | 'CASH_COUNTED'
    | 'REMITTANCE_CREATED'
    | 'REMITTANCE_SUBMITTED'
    | 'REMITTANCE_VERIFIED_BY_MANAGER'
    | 'REMITTANCE_APPROVED'
    | 'REMITTANCE_REJECTED'
    | 'REMITTANCE_UPDATED'
    | 'EXPENSE_CREATED'
    | 'EXPENSE_RECORDED'
    | 'EXPENSE_APPROVED'
    | 'EXPENSE_REJECTED'
    | 'SALE_VOIDED'
    | 'REFUND_CREATED'
    | 'SALES_ADJUSTMENT'
    | 'AI_ALERT_GENERATED'
    | 'AI_ALERT_REVIEWED'
    | 'AI_ALERT_RESOLVED'
    | 'AI_REPORT_GENERATED'
    | 'AI_DRAFT_REQUEST_CREATED'
    | 'BRANCH_CREATED'
    | 'USER_UPDATED_BY_OWNER'
    | 'USER_PASSWORD_RESET_BY_OWNER'
    | 'INVENTORY_THRESHOLD_UPDATED'
    | 'PAYMENT_CONFIG_UPDATED'
    | 'AI_SETTINGS_UPDATED'
    | 'DATA_IMPORT_COMPLETED'
    | 'DATA_EXPORTED'
    | 'SYSTEM_SETTINGS_UPDATED'
    | 'CATEGORY_CREATED'
    | 'CATEGORY_UPDATED'
    | 'PRODUCT_MARKED_AVAILABLE'
    | 'PRODUCT_MARKED_UNAVAILABLE'
    | 'PRODUCT_BRANCH_AVAILABILITY_UPDATED'
    | 'PRODUCT_ARCHIVED'
    | 'PRODUCT_DELETED'
    | 'PRODUCT_IMAGE_REMOVED'
    | 'SYSTEM_INITIALIZATION_PRODUCTION_RESET';
  entity_type: 
    | 'USER' 
    | 'BRANCH' 
    | 'AUTH' 
    | 'ROLE' 
    | 'SYSTEM' 
    | 'EMPLOYEE' 
    | 'ATTENDANCE' 
    | 'PAYROLL' 
    | 'PAYROLL_RULE'
    | 'PRODUCT'
    | 'CATEGORY'
    | 'INGREDIENT'
    | 'RECIPE'
    | 'INVENTORY'
    | 'STOCK_MOVEMENT'
    | 'ORDER'
    | 'PAYMENT'
    | 'CASHIER_SESSION'
    | 'PAYMENT_CONFIG'
    | 'MODIFIER_GROUP'
    | 'PURCHASE_ORDER'
    | 'SUPPLIER'
    | 'REQUEST_ORDER'
    | 'DELIVERY'
    | 'RECONCILIATION'
    | 'SHIFT'
    | 'REMITTANCE'
    | 'EXPENSE'
    | 'CUSTOMER'
    | 'AI_ALERT'
    | 'AI_CONFIG'
    | 'SYSTEM_CONFIG';
  entity_id: string | null;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ==========================================
// PHASE 3: PRODUCTS, INGREDIENTS & RECIPES
// ==========================================

export type ProductCategory = 
  | 'BURGERS'
  | 'DOUBLE CHEESE FRIES'
  | 'FAVORITE'
  | 'FAVOURITE'
  | 'CLASSIC'
  | 'SPECIALTY'
  | 'DRINKS'
  | 'ADD ONS'
  | 'ADD-ONS'
  | string;

export interface MenuCategory {
  id: string;
  name: string;
  code: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  product_code: string;
  product_name: string;
  name?: string;
  code?: string;
  sku?: string;
  category: ProductCategory;
  description: string;
  selling_price: number;
  price?: number;
  product_image: string | null;
  image_url?: string | null;
  image_path?: string | null;
  is_active: boolean;
  active?: boolean;
  is_available?: boolean;
  available?: boolean;
  is_out_of_stock?: boolean;
  is_sold_out?: boolean;
  out_of_stock_reason?: string;
  recipe_items?: RecipeItem[];
  display_order?: number;
  unavailable_branches?: string[];
  branch_availability?: string[];
  recipe_id?: string;
  has_recipe?: boolean;
  recipe_cost?: number;
  badge?: string | null;
  badges?: string[];
  created_at: string;
  updated_at: string;
}

export interface AIMatchAlternative {
  product_id: string;
  product_code: string;
  product_name: string;
  category: ProductCategory;
  selling_price: number;
  confidence_percentage: number;
}

export interface AIMatchImageResponse {
  identified: boolean;
  product: Product | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';
  confidence_percentage: number;
  visual_reasoning: string;
  message?: string;
  alternatives: AIMatchAlternative[];
}

export type ExtractionCode = 
  | 'B' 
  | 'P' 
  | 'E' 
  | 'C' 
  | 'Sio' 
  | 'Sha' 
  | 'SD' 
  | 'ML' 
  | 'HD' 
  | 'R'
  | string;

export interface Ingredient {
  id: string;
  item_code: string;
  item_name: string;
  name?: string;
  category: string;
  unit: string;
  cost_price: number;
  reorder_level: number;
  maximum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity_consumed: number;
  quantity?: number;
  unit: string;
  extraction_code?: ExtractionCode | null;
}

export interface Recipe {
  id: string;
  product_id: string;
  product_name?: string;
  name: string;
  description?: string;
  is_active: boolean;
  items: RecipeItem[];
  created_at: string;
  updated_at: string;
}

// ==========================================
// PHASE 3: BRANCH INVENTORY & TRANSACTIONS
// ==========================================

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface BranchInventory {
  id: string;
  branch_id: string;
  branch_name?: string;
  ingredient_id: string;
  ingredient_name?: string;
  item_code?: string;
  category?: string;
  unit: string;
  cost_price: number;
  current_stock: number;
  reorder_level: number;
  maximum_stock: number;
  status: InventoryStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InventoryTransactionType = 
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'USAGE'
  | 'ADJUSTMENT'
  | 'REJECT'
  | 'TRANSFER'
  | 'DELIVERY'
  | 'RECEIVING'
  | 'RECIPE_DEDUCTION'
  | 'PURCHASE_RECEIPT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export interface InventoryTransaction {
  id: string;
  branch_id: string;
  branch_name?: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  transaction_type: InventoryTransactionType;
  previous_stock?: number;
  new_stock?: number;
  cost?: number;
  reference_id?: string;
  notes?: string | null;
  reason?: string;
  user_id?: string;
  user_email?: string;
  performed_by?: string;
  created_at: string;
}

export interface InventoryLowStockEvent {
  id: string;
  branch_id: string;
  branch_name?: string;
  ingredient_id: string;
  ingredient_name?: string;
  current_stock: number;
  reorder_level: number;
  unit: string;
  status: 'OPEN' | 'RESOLVED';
  created_at: string;
  resolved_at?: string | null;
}

export interface DeductionItemCheck {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  single_qty: number;
  required_qty: number;
  current_stock: number;
  has_sufficient: boolean;
  extraction_code?: string | null;
}

export interface DeductionValidationResult {
  valid: boolean;
  product_id: string;
  product_name: string;
  order_quantity: number;
  branch_id: string;
  branch_name: string;
  items_needed: DeductionItemCheck[];
  insufficient_items: (DeductionItemCheck & { shortfall: number })[];
  error?: string;
  error_message?: string;
  components?: any[];
}

export interface AppNotification {
  id: string;
  recipient_user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'SYSTEM';
  read: boolean;
  created_at: string;
  action_url?: string;
}

export interface AuthSession {
  user: Profile;
  token: string;
  expires_at: number;
}

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  kiosk_pin?: string;
  is_pin_configured?: boolean;
}

export interface CreateEmployeeInput {
  full_name: string;
  email: string;
  password?: string; // Optional if user already has credentials, required if new auth account
  role: UserRole;
  branch_id: string | null;
  status?: EmployeeStatus;
  kiosk_pin?: string;
  is_pin_configured?: boolean;
}

export interface UpdateEmployeeInput {
  full_name?: string;
  role?: UserRole;
  branch_id?: string | null;
  status?: EmployeeStatus;
}

export interface BranchIsolationScope {
  userRole: UserRole;
  assignedBranchId: string | null;
  canAccessAllBranches: boolean;
}

// ==========================================
// PHASE 4: POS, ORDERS, PAYMENTS & SALES
// ==========================================

export type OrderSource = 'POS' | 'SELF_ORDERING' | 'KIOSK';

export type OrderStatus = 
  | 'PENDING_PAYMENT' 
  | 'PAID' 
  | 'CANCELLED' 
  | 'VOIDED' 
  | 'COMPLETED';

export type PaymentMethod = 
  | 'CASH' 
  | 'GCASH' 
  | 'MAYA' 
  | 'QRPH' 
  | 'BANK_TRANSFER'
  | 'OTHER';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PAID' 
  | 'UNPAID'
  | 'FAILED' 
  | 'REFUNDED';

export type ModifierGroupType = 
  | 'FRIES_FLAVOR' 
  | 'BURGER_CUSTOMIZATION' 
  | 'CONDIMENTS' 
  | 'MIX_MATCH' 
  | 'SPECIALTY_MIX_MATCH' 
  | 'B1T1_CUSTOMIZATION' 
  | 'ADD_ON';

export interface ModifierOption {
  id: string;
  name: string;
  group: ModifierGroupType;
  price: number;
  ingredient_id?: string | null;
  quantity_consumed?: number | null;
  unit?: string | null;
  is_default?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: ModifierGroupType;
  min_selection: number;
  max_selection: number;
  required: boolean;
  options: ModifierOption[];
  applicable_categories: ProductCategory[];
  applicable_product_ids?: string[];
}

export interface OrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string;
  modifier_name: string;
  modifier_group: string;
  additional_price: number;
  ingredient_id?: string | null;
  quantity_consumed?: number | null;
  unit?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  branch_id?: string;
  product_id: string;
  product_code?: string;
  product_name: string;
  product_image?: string | null;
  category?: ProductCategory;
  unit_price: number;
  quantity: number;
  subtotal?: number;
  total_price?: number;
  notes?: string | null;
  modifiers?: OrderItemModifier[] | any[];
  created_at?: string;
}

export type KitchenStatus = 'NEW' | 'PREPARING' | 'READY' | 'DELIVERED' | 'COMPLETED';

export interface Order {
  id: string;
  order_number: string;
  branch_id: string;
  branch_name?: string;
  cashier_id: string;
  cashier_name?: string;
  order_type?: string;
  source: OrderSource;
  status: OrderStatus;
  items?: OrderItem[];
  subtotal: number;
  discount_type?: string | null;
  discount_amount: number;
  discount_reason?: string | null;
  discounted_by?: string | null;
  tax_amount?: number;
  total: number;
  total_amount?: number;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  notes?: string | null;
  void_reason?: string | null;
  voided_by?: string | null;
  voided_by_name?: string | null;
  voided_at?: string | null;
  payment?: Payment | null;
  // Phase 6 & Phase 11: Kitchen Display System (KDS) Authoritative State
  kitchen_status?: KitchenStatus | null;
  kitchen_received_at?: string | null;
  started_at?: string | null;
  preparing_at?: string | null;
  started_by?: string | null;
  started_by_name?: string | null;
  ready_at?: string | null;
  delivered_at?: string | null;
  delivered_by?: string | null;
  delivered_by_name?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  completed_at?: string | null;
  // Phase 10: Loyalty & Customer Ticket Integration
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  loyalty_points_earned?: number;
  loyalty_redemption_id?: string | null;
  loyalty_reward_item_id?: string | null;
  loyalty_reward_item_name?: string | null;
  is_saved_ticket?: boolean;
  saved_ticket_name?: string | null;
  table_number?: string | null;
  is_mobile_order?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  order_number?: string;
  branch_id: string;
  branch_name?: string;
  payment_method: PaymentMethod;
  amount: number;
  amount_received?: number;
  amount_tendered?: number;
  change_amount?: number;
  reference_number?: string | null;
  account_number?: string | null;
  notes?: string | null;
  payment_status?: PaymentStatus;
  status?: string;
  processed_by?: string;
  processed_by_name?: string;
  processed_at?: string;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string;
  changed_by_name?: string;
  reason?: string;
  created_at: string;
}

export interface CashierSession {
  id: string;
  cashier_id: string;
  cashier_name: string;
  branch_id: string;
  branch_name: string;
  opened_at?: string;
  start_time?: string;
  closed_at?: string | null;
  status: 'OPEN' | 'CLOSED';
  opening_cash?: number;
  beginning_cash?: number;
  closing_cash?: number | null;
  expected_cash?: number;
  actual_cash?: number | null;
  cash_sales?: number;
  cash_payments?: number;
  gcash_payments?: number;
  other_sales?: number;
  total_sales: number;
  total_orders: number;
  notes?: string | null;
  created_at?: string;
}

export interface PaymentConfiguration {
  id: string;
  branch_id: string | null;
  payment_method: 'GCASH' | 'MAYA' | 'QRPH' | 'BANK_TRANSFER';
  account_name: string;
  account_number: string;
  qr_image_url: string;
  instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalesTransaction {
  id: string;
  order_id: string;
  order_number: string;
  receipt_number?: string;
  branch_id: string;
  branch_name?: string;
  cashier_id: string;
  cashier_name?: string;
  transaction_date: string;
  amount: number;
  gross_amount?: number;
  discount_amount?: number;
  net_amount?: number;
  items_count?: number;
  payment_method: PaymentMethod;
  source: OrderSource;
  status: 'COMPLETED' | 'VOIDED';
  created_at: string;
}

export interface ReceiptData {
  header: string;
  branch_name: string;
  branch_id: string;
  order_number: string;
  date: string;
  time: string;
  cashier_name: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    modifiers: string[];
  }[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  amount_received?: number;
  change?: number;
  reference_number?: string;
  // Phase 10: Loyalty on Thermal Receipt
  customer_name?: string;
  customer_phone?: string;
  loyalty_points_earned?: number;
  loyalty_current_balance?: number;
  loyalty_reward_redeemed?: string;
}

export interface CartItemModifierInput {
  modifier_id: string;
  modifier_name: string;
  modifier_group: string;
  additional_price: number;
  ingredient_id?: string | null;
  quantity_consumed?: number | null;
  unit?: string | null;
}

export interface CartItemInput {
  product_id: string;
  quantity: number;
  notes?: string;
  modifiers?: CartItemModifierInput[];
}

export interface CreateOrderInput {
  branch_id: string;
  items: CartItemInput[];
  order_type?: 'DINE_IN' | 'TAKE_OUT' | string;
  discount_type?: string;
  discount_amount?: number;
  discount_reason?: string;
  notes?: string;
  idempotency_key?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  loyalty_reward_item_id?: string;
  loyalty_reward_item_name?: string;
}

export interface ProcessPaymentInput {
  order_id: string;
  payment_method: PaymentMethod;
  amount_received?: number;
  reference_number?: string;
  idempotency_key?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface VoidOrderInput {
  order_id: string;
  reason: string;
}

// ==========================================
// PHASE 5: SELF-ORDERING / CUSTOMER KIOSK
// ==========================================

export type DiningOption = 'DINE_IN' | 'TAKE_OUT';

export interface CreateKioskOrderInput {
  branch_id: string;
  items: CartItemInput[];
  source?: OrderSource;
  dining_option?: DiningOption;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  idempotency_key?: string;
  intended_payment_method?: PaymentMethod;
  reference_number?: string;
  pay_now?: boolean;
  table_number?: string;
  is_mobile_order?: boolean;
}

export interface KioskMenuData {
  branch: {
    id: string;
    name: string;
    is_active: boolean;
  };
  categories: ProductCategory[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  paymentConfigs: PaymentConfiguration[];
  outOfStockProductIds?: string[];
}

export interface KioskCartItem {
  id: string;
  product: Product;
  quantity: number;
  modifiers: CartItemModifierInput[];
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

// ==========================================
// PHASE 6: KITCHEN DISPLAY SYSTEM (KDS)
// ==========================================

export type KitchenMood = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface KitchenOrderHistoryItem {
  order_id: string;
  order_number: string;
  branch_id: string;
  branch_name: string;
  source: OrderSource;
  dining_option?: string;
  items_summary: string;
  item_count: number;
  kitchen_received_at: string;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  started_by_name?: string | null;
  completed_by_name?: string | null;
  preparation_duration_seconds: number | null;
  total_duration_seconds: number | null;
  status: KitchenStatus;
}

export interface KitchenStats {
  total_active: number;
  new_count: number;
  preparing_count: number;
  ready_count: number;
  critical_count: number;
  average_prep_time_minutes: number;
}

// ==========================================
// PHASE 7: PURCHASING, REQUEST ORDERS, WAREHOUSE & DELIVERY
// ==========================================

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person?: string;
  contact_number?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus = 
  | 'DRAFT' 
  | 'PENDING' 
  | 'APPROVED' 
  | 'PARTIALLY_RECEIVED' 
  | 'RECEIVED' 
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  ingredient_id: string;
  ingredient_name: string;
  item_code: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  received_quantity: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string; // e.g. PO-000001
  supplier_id: string;
  supplier_name: string;
  order_date: string;
  expected_delivery_date?: string | null;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  total_cost: number;
  total_amount?: number;
  notes?: string | null;
  created_by: string;
  created_by_name?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  received_by?: string | null;
  received_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderInput {
  supplier_id: string;
  expected_delivery_date?: string;
  notes?: string;
  items: {
    ingredient_id: string;
    quantity: number;
    unit_cost: number;
  }[];
}

export type RequestOrderStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FOR_PREPARATION'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'IN_TRANSIT'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface RequestOrderItem {
  id: string;
  request_id: string;
  ingredient_id: string;
  ingredient_name: string;
  item_code: string;
  unit: string;
  requested_quantity: number;
  approved_quantity: number;
  prepared_quantity: number;
  delivered_quantity: number;
  received_quantity: number;
  remaining_quantity: number; // (approved_quantity - received_quantity)
  status?: 'PENDING' | 'PREPARED' | 'DELIVERED' | 'SHORT' | 'REJECTED';
  notes?: string | null;
}

export type RequesterSource = 'MANAGER' | 'CASHIER' | 'AI_AGENT' | 'OWNER';

export interface RequestOrder {
  id: string;
  request_number: string; // e.g. REQ-000001
  branch_id: string;
  branch_name?: string;
  requester_id: string;
  requester_name?: string;
  created_by_name?: string;
  requester_role: RequesterSource;
  request_date: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  status: RequestOrderStatus;
  items: RequestOrderItem[];
  notes?: string | null;
  delivery_notes?: string | null;
  is_ai_generated?: boolean;
  target_fulfillment_date?: string | null;
  // Tracking & Dispatch Info (Step 2 En Route)
  driver_name?: string | null;
  vehicle_info?: string | null;
  tracking_number?: string | null;
  dispatched_at?: string | null;
  dispatched_by?: string | null;
  estimated_arrival?: string | null;
  // Receiving Info (Step 3 Physical Delivery Receipt)
  received_at?: string | null;
  received_by?: string | null;
  receiving_notes?: string | null;
  // Approvals & Edits
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  // Warehouse processing
  prepared_by?: string | null;
  prepared_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispatchRequestOrderInput {
  driver_name?: string;
  vehicle_info?: string;
  tracking_number?: string;
  estimated_arrival?: string;
  notes?: string;
}

export interface BranchKioskPinDirectoryItem {
  id?: string;
  terminal_id?: string;
  terminal_name?: string;
  branch_id: string;
  branch_name: string;
  branch_code?: string;
  address?: string;
  phone?: string;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  kiosk_pin: string;
  is_pin_configured: boolean;
  is_active?: boolean;
  updated_at?: string;
}

export interface CreateRequestOrderInput {
  branch_id?: string; // Optional if manager/cashier
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  notes?: string;
  delivery_notes?: string;
  is_ai_generated?: boolean;
  items: {
    ingredient_id: string;
    requested_quantity: number;
    notes?: string;
  }[];
}

export interface OwnerEditRequestOrderInput {
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  delivery_notes?: string;
  destination_branch_id?: string;
  override_reason?: string;
  items: {
    ingredient_id: string;
    approved_quantity: number;
    notes?: string;
  }[];
}

export type DeliveryStatus = 
  | 'PENDING'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  request_item_id: string;
  ingredient_id: string;
  ingredient_name: string;
  item_code: string;
  unit: string;
  requested_quantity: number;
  approved_quantity: number;
  prepared_quantity: number;
  delivered_quantity: number;
  received_quantity: number;
  short_quantity: number;
  rejected_quantity: number;
  rejection_reason?: string | null;
}

export interface DeliveryStatusHistoryItem {
  id: string;
  delivery_id: string;
  from_status: DeliveryStatus | null;
  to_status: DeliveryStatus;
  changed_by: string;
  changed_by_name?: string;
  notes?: string;
  timestamp: string;
}

export interface Delivery {
  id: string;
  delivery_number: string; // e.g. DEL-000001
  request_id: string;
  request_number: string;
  source_warehouse_name: string; // e.g. "Tagpuan Central Warehouse / Commissary"
  origin_warehouse_name?: string;
  destination_branch_id: string;
  destination_branch_name: string;
  status: DeliveryStatus;
  items: DeliveryItem[];
  prepared_by: string;
  prepared_by_name?: string;
  prepared_at?: string | null;
  driver_name?: string | null;
  vehicle_info?: string | null;
  dispatched_by?: string | null;
  dispatched_by_name?: string | null;
  dispatched_at?: string | null;
  estimated_arrival?: string | null;
  received_by?: string | null;
  received_by_name?: string | null;
  received_at?: string | null;
  proof_image_url?: string | null;
  receiving_notes?: string | null;
  rejection_reason?: string | null;
  status_history: DeliveryStatusHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface PrepareDeliveryInput {
  request_id: string;
  driver_name?: string;
  vehicle_info?: string;
  estimated_arrival?: string;
  items: {
    request_item_id: string;
    prepared_quantity: number;
  }[];
}

export interface DispatchDeliveryInput {
  delivery_id: string;
  driver_name?: string;
  vehicle_info?: string;
  estimated_arrival?: string;
  notes?: string;
}

export interface ReceiveDeliveryItemInput {
  delivery_item_id: string;
  received_quantity: number;
  rejected_quantity?: number;
  rejection_reason?: string;
}

export interface ReceiveDeliveryInput {
  delivery_id: string;
  receiving_notes?: string;
  proof_image_url?: string;
  items: ReceiveDeliveryItemInput[];
}

export interface AIStockRecommendation {
  id: string;
  branch_id: string;
  branch_name: string;
  ingredient_id: string;
  ingredient_name: string;
  item_code: string;
  current_stock: number;
  reorder_level: number;
  unit: string;
  suggested_quantity: number;
  has_pending_request: boolean;
  pending_request_numbers?: string[];
  reason: string;
  title?: string;
  recommendation_text?: string;
  is_critical?: boolean;
  created_at: string;
}

export type PriorityLevel = 'NORMAL' | 'HIGH' | 'URGENT';

export interface WarehouseStockItem {
  ingredient_id: string;
  ingredient_name: string;
  item_code: string;
  unit: string;
  current_stock: number;
  status: 'OPTIMAL' | 'LOW_STOCK' | 'CRITICAL';
}

// ==========================================
// PHASE 8: SALES SUMMARY, CASHIER REMITTANCE,
// CASH COUNT, EXPENSES & RECONCILIATION
// ==========================================

export interface CashDenominationCount {
  d1000: number; // ₱1,000 bills
  d500: number;  // ₱500 bills
  d200: number;  // ₱200 bills
  d100: number;  // ₱100 bills
  d50: number;   // ₱50 bills
  d20: number;   // ₱20 bills/coins
  d10: number;   // ₱10 coins
  d5: number;    // ₱5 coins
  d1: number;    // ₱1 coins
}

export type VarianceStatus = 'BALANCED' | 'SHORT' | 'OVER' | 'SHORTAGE' | 'OVERAGE' | 'TALLY' | 'UNRECONCILED';

export interface CashierShift {
  id: string;
  shift_number: string;
  branch_id: string;
  branch_name: string;
  cashier_id: string;
  cashier_name: string;
  opened_at: string;
  closed_at: string | null;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
  opening_cash: number;
  cash_sales: number;
  cash_refunds: number;
  cash_expenses: number;
  cash_withdrawals?: number;
  total_cash_sales?: number;
  total_non_cash_sales?: number;
  expected_cash: number;
  actual_cash: number | null;
  variance: number | null;
  variance_status: VarianceStatus | null;
  variance_reason?: string | null;
  denominations?: CashDenominationCount | null;
  total_sales: number;
  total_orders: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type RemittanceStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'VERIFIED'
  | 'FOR_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'RECONCILED';

export interface CashRemittance {
  id: string;
  remittance_number: string;
  shift_id: string;
  branch_id: string;
  branch_name: string;
  cashier_id: string;
  cashier_name: string;
  date: string;
  expected_cash: number;
  actual_cash: number;
  remitted_amount: number;
  cash_variance: number; // actual_cash - expected_cash
  remittance_variance: number; // remitted_amount - actual_cash
  gross_sales?: number;
  variance_flag?: 'TALLY' | 'SHORTAGE' | 'OVERAGE';
  ai_reconciliation_notes?: string | null;
  denomination_breakdown?: CashDenominationCount | null;
  proof_image_url?: string | null;
  proof_type?: string | null; // e.g. 'Photo', 'Bank Deposit Slip', 'Official Receipt'
  notes?: string | null;
  status: RemittanceStatus;
  submitted_at?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_verified_at?: string | null;
  manager_verified_amount?: number | null;
  manager_deductions_amount?: number | null;
  manager_deductions_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  correction_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory = 
  | 'STORE_SUPPLIES'
  | 'EMERGENCY_INGREDIENTS'
  | 'UTILITIES_BILLS'
  | 'EQUIPMENT_MAINTENANCE'
  | 'STAFF_MEAL'
  | 'STAFF_MEALS'
  | 'DELIVERY_FUEL'
  | 'CASH_DRAWER_OUTFLOW'
  | 'MISCELLANEOUS'
  | 'DELIVERY' 
  | 'TRANSPORTATION' 
  | 'SUPPLIES' 
  | 'EMERGENCY_PURCHASE' 
  | 'UTILITIES' 
  | 'MAINTENANCE' 
  | 'OTHER';

export type ExpensePaymentMethod = 
  | 'CASH'
  | 'CASH_DRAWER'
  | 'PETTY_CASH'
  | 'GCASH'
  | 'MAYA'
  | 'GCASH_MAYA'
  | 'BANK_TRANSFER'
  | 'OTHER';

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BranchExpense {
  id: string;
  expense_number: string;
  branch_id: string;
  branch_name: string;
  shift_id?: string | null;
  date: string;
  category: ExpenseCategory;
  description: string;
  paid_to?: string | null;
  amount: number;
  payment_method: ExpensePaymentMethod;
  proof_image_url?: string | null;
  receipt_image_url?: string | null;
  status: ExpenseStatus;
  created_by: string;
  created_by_name: string;
  created_by_role: UserRole;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentBreakdownItem {
  method: PaymentMethod;
  name: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface SalesSummaryMetrics {
  total_sales: number;
  gross_sales: number;
  discounts: number;
  refunds: number;
  voids: number;
  void_count: number;
  net_sales: number; // Gross - Discounts - Refunds - Voids
  expenses: number;
  cash_expenses: number;
  non_cash_expenses: number;
  expected_cash: number;
  actual_cash: number;
  cash_variance: number;
  cogs: number;
  gross_profit: number; // Net Sales - cogs
  order_count: number;
  pos_order_count: number;
  pos_sales: number;
  kiosk_order_count: number;
  kiosk_sales: number;
  payment_breakdown: any;
  cash_sales: number;
  gcash_sales: number;
  maya_sales: number;
  qrph_sales: number;
  bank_transfer_sales: number;
  other_payments: number;
  e_wallet_sales: number; // GCash + Maya + QRPH
  loyalty_redemptions_claimed_count?: number;
  loyalty_redemptions_claimed_points?: number;
  loyalty_redemptions_equivalent_value?: number;
  profit_margin?: number;
  average_order_value?: number;
  total_expenses?: number;
  total_remittances?: number;
  loyalty_redemptions_items?: {
    id: string;
    customer_name: string;
    product_name: string;
    points_spent: number;
    cashier_name: string;
    branch_name: string;
    redeemed_at: string;
    reward_ticket_number?: string;
  }[];
}

export interface CashierSalesSummary {
  cashier_id: string;
  cashier_name: string;
  branch_id: string;
  branch_name: string;
  shift_count: number;
  order_count: number;
  gross_sales: number;
  total_sales?: number;
  discounts: number;
  voids: number;
  void_count?: number;
  net_sales: number;
  cash_sales: number;
  gcash_sales?: number;
  maya_sales?: number;
  e_wallet_sales: number;
  average_order_value?: number;
  expected_cash: number;
  actual_cash: number;
  variance: number;
  variance_status: VarianceStatus;
}

export interface DailySalesReport {
  date: string;
  branch_id: string;
  branch_name: string;
  gross_sales: number;
  discounts: number;
  refunds: number;
  voids: number;
  net_sales: number;
  cogs: number;
  gross_profit: number;
  cash_sales: number;
  gcash_sales: number;
  maya_sales: number;
  qrph_sales: number;
  bank_sales: number;
  other_sales: number;
  expenses: number;
  cash_expenses: number;
  expected_cash: number;
  actual_cash: number;
  variance: number;
  order_count: number;
}

export interface FinancialReconciliationRecord {
  id: string;
  date: string;
  branch_id: string;
  branch_name: string;
  net_sales: number;
  payment_total: number;
  payment_totals?: {
    cash?: number;
    gcash?: number;
    maya?: number;
    qrph?: number;
    bank?: number;
    other?: number;
  };
  total_expenses?: number;
  remitted_cash?: number;
  expected_cash: number;
  actual_cash: number;
  remitted_amount: number;
  approved_expenses: number;
  cash_expenses: number;
  sales_vs_payments_variance: number;
  cash_variance: number;
  variance?: number;
  status: VarianceStatus;
  reconciliation_status?: string;
  is_reconciled: boolean;
  reconciled_by?: string | null;
  reconciled_at?: string | null;
  notes?: string | null;
}

export interface CreateExpenseInput {
  branch_id: string;
  shift_id?: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: ExpensePaymentMethod;
  proof_image_url?: string;
}

export interface CloseShiftInput {
  shift_id: string;
  denominations: CashDenominationCount;
  variance_reason?: string;
  notes?: string;
}

export interface CreateRemittanceInput {
  shift_id: string;
  remitted_amount: number;
  denomination_breakdown?: CashDenominationCount;
  proof_image_url?: string;
  proof_type?: string;
  notes?: string;
}

export interface FinancialAdjustmentInput {
  entity_type: 'SHIFT' | 'REMITTANCE' | 'EXPENSE' | 'ORDER';
  entity_id: string;
  field: string;
  old_value: number | string;
  new_value: number | string;
  reason: string;
}

// ============================================================================
// PHASE 10: LOYALTY TICKETS + CUSTOMER POINTS + REWARDS
// ============================================================================

export interface LoyaltyCustomer {
  id: string;
  customer_name: string;
  name?: string;
  phone_number?: string | null;
  phone?: string | null;
  email?: string | null;
  current_points: number;
  points_balance?: number;
  total_points_earned: number;
  total_points_redeemed: number;
  registered_branch_id: string;
  registered_branch_name?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type LoyaltyTransactionType = 'EARN' | 'REDEEM' | 'REVERSAL' | 'ADJUSTMENT';

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  customer_name: string;
  transaction_type: LoyaltyTransactionType;
  points: number; // positive for EARN / positive ADJUSTMENT, negative for REDEEM / REVERSAL
  order_id?: string | null;
  order_number?: string | null;
  branch_id: string;
  branch_name: string;
  reward_product_id?: string | null;
  reward_product_name?: string | null;
  reason?: string | null;
  processed_by: string;
  processed_by_name: string;
  created_at: string;
}

export interface LoyaltyRedemption {
  id: string;
  customer_id: string;
  customer_name: string;
  points_spent: number; // 200 points per item
  product_id: string;
  product_name: string;
  order_id?: string | null;
  order_number?: string | null;
  reward_ticket_number?: string | null;
  retail_value?: number;
  branch_id: string;
  branch_name: string;
  cashier_id: string;
  cashier_name: string;
  redeemed_at: string;
  status: 'COMPLETED' | 'CANCELLED';
}

export interface SavedTicket {
  id: string;
  ticket_number: string;
  branch_id: string;
  branch_name: string;
  cashier_id: string;
  cashier_name: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    modifiers?: any[];
    notes?: string;
  }[];
  subtotal: number;
  discount_type?: string;
  discount_amount?: number;
  notes?: string;
  created_at: string;
}

export interface CreateLoyaltyCustomerInput {
  customer_name: string;
  phone_number?: string;
  email?: string;
  branch_id?: string;
  notes?: string;
}

export interface AdjustLoyaltyPointsInput {
  customer_id: string;
  points: number; // e.g. +50 or -50
  reason: string;
}

export interface RedeemLoyaltyRewardInput {
  customer_id: string;
  product_id: string;
  branch_id: string;
  order_id?: string;
}

export interface LoyaltySummary {
  total_customers: number;
  total_points_earned: number;
  total_points_redeemed: number;
  total_rewards_claimed: number;
  active_points_balance: number;
  outstanding_points_liability?: number;
  branch_breakdown: {
    branch_id: string;
    branch_name: string;
    customer_count: number;
    points_earned: number;
    points_redeemed: number;
    rewards_claimed: number;
  }[];
}

// ==========================================
// PHASE 12: AI AGENT COMMAND CENTER,
// AUTOMATED AUDIT & BUSINESS REPORTING
// ==========================================

export type AIAlertPriority = 'INFO' | 'WARNING' | 'CRITICAL';

export type AIAlertStatus = 'NEW' | 'REVIEWED' | 'RESOLVED';

export type AIAlertCategory =
  | 'TODAY_BUSINESS'
  | 'INVENTORY'
  | 'PURCHASING'
  | 'SALES'
  | 'CASHIER'
  | 'ATTENDANCE'
  | 'PAYROLL'
  | 'LOYALTY'
  | 'KITCHEN'
  | 'AUDIT'
  | 'CROSS_MODULE';

export type AIDateFilterPeriod = 'TODAY' | 'LAST_7_DAYS' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface AIAlert {
  id: string;
  priority: AIAlertPriority;
  category: AIAlertCategory;
  title: string;
  description: string;
  what_happened: string;
  why_flagged: string;
  branch_id: string;
  branch_name: string;
  date_time: string;
  status: AIAlertStatus;
  source_record_type?: string;
  source_record_id?: string;
  related_records?: { type: string; id: string; label: string }[];
  recommended_action: string;
  action_type?: 'VIEW_INVENTORY' | 'VIEW_REQUESTS' | 'CREATE_DRAFT_REQUEST' | 'VIEW_ORDER' | 'VIEW_SALE' | 'VIEW_AUDIT' | 'VIEW_KDS' | 'VIEW_RECONCILIATION' | 'VIEW_PAYROLL' | 'VIEW_LOYALTY';
  action_payload?: Record<string, any>;
  reviewed_by?: string | null;
  reviewed_by_email?: string | null;
  reviewed_at?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface AIBusinessStatus {
  sales: number;
  orders: number;
  paid_orders: number;
  unpaid_orders: number;
  voided_orders: number;
  low_stock_count: number;
  pending_requests_count: number;
  cash_variances_count: number;
  payroll_alerts_count: number;
  loyalty_alerts_count: number;
  kitchen_delays_count: number;
  critical_alerts_count: number;
  warning_alerts_count: number;
  info_alerts_count: number;
  average_order_value: number;
  payment_breakdown: {
    cash: number;
    gcash: number;
    maya: number;
    qrph: number;
    bank_transfer: number;
    other: number;
  };
  branch_performance: {
    branch_id: string;
    branch_name: string;
    sales: number;
    orders: number;
  }[];
}

export interface AIBusinessReport {
  period: AIDateFilterPeriod;
  date_range: {
    start: string;
    end: string;
  };
  branch_id: string;
  branch_name: string;
  generated_at: string;
  sales_summary: {
    total_sales: number;
    order_count: number;
    paid_count: number;
    unpaid_count: number;
    voided_count: number;
    average_order_value: number;
    gross_sales: number;
    discounts: number;
    void_amount: number;
  };
  payment_breakdown: {
    cash: number;
    gcash: number;
    maya: number;
    qrph: number;
    bank_transfer: number;
    other: number;
  };
  best_performing_items: {
    product_name: string;
    quantity: number;
    revenue: number;
  }[];
  branch_performance: {
    branch_id: string;
    branch_name: string;
    sales: number;
    orders: number;
  }[];
  inventory_alerts_summary: string[];
  purchasing_alerts_summary: string[];
  cashier_variances_summary: string[];
  attendance_issues_summary: string[];
  payroll_issues_summary: string[];
  loyalty_activity_summary: string[];
  kitchen_delays_summary: string[];
  audit_findings_summary: string[];
  executive_ai_insights: string[];
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  message: string;
  timestamp: string;
  suggested_queries?: string[];
  data_points?: Record<string, any>;
}

// ==========================================
// PHASE 13: SYSTEM ADMINISTRATION & OWNER MASTER CONTROL CENTER
// ==========================================

export interface AIAgentSettings {
  ai_monitoring_enabled: boolean;
  low_stock_alerts_enabled: boolean;
  cash_variance_alerts_enabled: boolean;
  payroll_alerts_enabled: boolean;
  kitchen_delay_alerts_enabled: boolean;
  loyalty_alerts_enabled: boolean;
  data_consistency_alerts_enabled: boolean;
  kds_delay_threshold_minutes: number;
  inventory_default_threshold: number;
  loyalty_redemption_threshold: number;
  updated_at: string;
  updated_by: string;
}

export interface SystemSettings {
  business_name: string;
  tagline: string;
  timezone: string;
  currency: string;
  currency_symbol: string;
  date_format: string;
  time_format: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  receipt_header?: string;
  receipt_footer?: string;
  system_version?: string;
  tax_enabled?: boolean;
  tax_percentage?: number;
  n8n_webhook_url?: string;
  n8n_enabled?: boolean;
  updated_at: string;
  updated_by: string;
}

export interface MasterControlOverview {
  active_branches: number;
  total_branches: number;
  active_users: number;
  total_users: number;
  active_menu_items: number;
  total_menu_items: number;
  total_products?: number;
  total_ingredients?: number;
  active_payment_methods?: number;
  inventory_threshold_count: number;
  total_inventory_items: number;
  ai_monitoring_status: 'ACTIVE' | 'PAUSED';
  ai_active_alerts_count: number;
  system_settings: SystemSettings;
  ai_settings: AIAgentSettings;
}

// ==========================================
// PHASE 14: CENTRAL REPORTS, EXPORT/IMPORT & DATA MANAGEMENT
// ==========================================

export type ReportType =
  | 'sales'
  | 'payments'
  | 'products'
  | 'branches'
  | 'inventory'
  | 'inventory-history'
  | 'purchasing'
  | 'request-orders'
  | 'deliveries'
  | 'cashier'
  | 'expenses'
  | 'reconciliation'
  | 'attendance'
  | 'payroll'
  | 'loyalty'
  | 'kds'
  | 'audit'
  | 'ai';

export type ReportDatePreset = 'TODAY' | 'LAST_7_DAYS' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface ReportColumn {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'number' | 'date' | 'datetime' | 'badge' | 'text' | 'percent';
  sortable?: boolean;
}

export interface UnifiedReportResponse {
  report_type: ReportType;
  report_name: string;
  period: ReportDatePreset;
  start_date: string;
  end_date: string;
  branch_id: string;
  branch_name: string;
  generated_at: string;
  generated_by: string;
  summary: Record<string, any>;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  metadata?: Record<string, any>;
}

export interface ReportDashboardSummary {
  period: ReportDatePreset;
  branch_id: string;
  branch_name: string;
  total_sales: number;
  orders_count: number;
  low_stock_count: number;
  pending_requests_count: number;
  cash_variances_count: number;
  payroll_alerts_count: number;
  loyalty_redemptions_count: number;
  kitchen_delays_count: number;
  audit_alerts_count: number;
}

export type MasterImportType =
  | 'PRODUCTS'
  | 'INVENTORY'
  | 'BRANCHES'
  | 'CUSTOMERS'
  | 'products'
  | 'ingredients'
  | 'branches'
  | 'customers';

export interface ImportValidationRow {
  row_number?: number;
  data?: Record<string, any>;
  status?: 'VALID' | 'INVALID' | 'DUPLICATE';
  errors?: string[];
  product_name?: string;
  category?: string;
  price?: number;
  description?: string;
  is_active?: boolean;
  item_name?: string;
  item_code?: string;
  unit?: string;
  cost_price?: number;
  reorder_level?: number;
  name?: string;
  address?: string;
  phone?: string;
  contact_number?: string;
  email?: string;
}

export interface ImportValidationResult {
  import_type?: MasterImportType;
  type?: MasterImportType;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  preview: ImportValidationRow[];
  errors?: Array<{ row: number; field?: string; message?: string; error?: string }>;
}

export interface ImportAuditRecord {
  id: string;
  file_name: string;
  import_type: MasterImportType;
  user_id?: string;
  user_email?: string;
  imported_by?: string;
  branch_id?: string | null;
  timestamp: string;
  rows_processed?: number;
  rows_imported?: number;
  rows_rejected?: number;
  total_rows?: number;
  inserted_rows?: number;
  failed_rows?: number;
  status?: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  notes?: string;
  duplicate_count?: number;
  validation_errors?: Array<{ row: number; error: string }>;
}

export interface DataIntegrityIssue {
  id: string;
  category?: string;
  check_name?: string;
  entity?: string;
  severity: 'INFO' | 'OK' | 'WARNING' | 'CRITICAL';
  title?: string;
  description: string;
  record_id?: string;
  record_type?: string;
  record_preview?: any;
  suggested_action?: string;
}

export interface DataIntegrityCheckResult {
  status: 'OK' | 'WARNING' | 'CRITICAL';
  summary?: string;
  summary_message?: string;
  timestamp?: string;
  checked_at?: string;
  checks_run?: number;
  total_checks?: number;
  passed_checks?: number;
  issues_found?: number;
  issues_count?: number;
  critical_issues?: number;
  warnings?: number;
  issues: DataIntegrityIssue[];
}

export interface ExportLogRecord {
  id: string;
  report_type: string;
  format: 'CSV' | 'XLSX' | 'PDF' | 'PRINT';
  branch_id: string;
  branch_name: string;
  period?: string;
  user_email?: string;
  exported_by?: string;
  file_name?: string;
  row_count: number;
  timestamp: string;
}

export interface DataManagementStatus {
  database_status: 'HEALTHY' | 'SYNCED' | 'ATTENTION_REQUIRED';
  last_sync?: string;
  last_sync_timestamp?: string;
  last_import: ImportAuditRecord | null;
  last_export: ExportLogRecord | null;
  master_records_count: {
    branches: number;
    products: number;
    ingredients: number;
    customers: number;
    orders: number;
    payments: number;
  };
  counts?: {
    orders: number;
    sales: number;
    payments: number;
    inventory_items: number;
    employees: number;
    branches: number;
    attendance: number;
    payroll: number;
    audit_logs: number;
  };
  recent_imports?: ImportAuditRecord[];
  recent_exports?: ExportLogRecord[];
}

// =========================================================================
// DUAL-LEVEL DAILY SALES & INGREDIENT USAGE BREAKDOWN
// =========================================================================

export interface DailyProductSaleItem {
  product_id: string;
  product_name: string;
  product_code: string;
  category: string;
  quantity_sold: number;
  gross_sales: number;
  order_count: number;
  unit_price: number;
}

export interface DailyProductSalesSummary {
  items: DailyProductSaleItem[];
  total_quantity: number;
  total_gross_sales: number;
  date_label: string;
  branch_label: string;
}

export interface IngredientUsageAuditItem {
  ingredient_id: string;
  item_code: string;
  ingredient_name: string;
  category: string;
  unit: string;
  total_consumed_today: number;
  current_ending_stock: number;
  reorder_level: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface CrossAuditRuleCheck {
  title: string;
  finished_goods_label: string;
  finished_goods_count: number;
  expected_deduction: string;
  actual_deduction: string;
  matched: boolean;
  notes: string;
}

export interface DailyIngredientUsageAuditReport {
  branch_id: string;
  branch_name: string;
  audit_date: string;
  generated_at: string;
  total_orders_today: number;
  total_items_sold: number;
  ingredients: IngredientUsageAuditItem[];
  cross_audit_checks: CrossAuditRuleCheck[];
}

