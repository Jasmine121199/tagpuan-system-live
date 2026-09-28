-- ============================================================================
-- TAGPUAN: HOME OF AUTHENTIC BURGER & SIOMAI
-- COMPLETE PRODUCTION SUPABASE SQL MIGRATION SCHEMA
-- Executable in 1-Click via the Supabase Dashboard SQL Editor
-- Tables: branches, profiles, menu_items (products), ingredients, recipes,
--         recipe_items, orders, order_items, inventory_transactions,
--         branch_inventory, cash_remittances, cashier_shifts, branch_expenses,
--         attendance_records, and loyalty_customers.
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. BRANCHES TABLE (17 Registered Franchise Outlets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    address TEXT,
    landmark TEXT,
    phone VARCHAR(50),
    manager_name VARCHAR(150),
    opening_time VARCHAR(20) DEFAULT '08:00 AM',
    closing_time VARCHAR(20) DEFAULT '10:00 PM',
    operating_status VARCHAR(20) DEFAULT 'OPEN' CHECK (operating_status IN ('OPEN', 'MAINTENANCE', 'CLOSED')),
    kiosk_pin VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. PROFILES / USERS TABLE (Linked to auth.users if Supabase Auth is enabled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER', 'CREW', 'WAREHOUSEMAN', 'KITCHEN')),
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    branch_name VARCHAR(120),
    kiosk_pin VARCHAR(10),
    is_pin_configured BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role_branch ON public.profiles(role, branch_id);

-- ============================================================================
-- 4. MENU ITEMS / PRODUCTS TABLE (Tagpuan Burger, Siomai Rice, Hotdog, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT,
    selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    product_image TEXT,
    display_order INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    is_out_of_stock BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Alias view for legacy schema compatibility
CREATE OR REPLACE VIEW public.products AS SELECT * FROM public.menu_items;

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON public.menu_items(is_active, is_available);

-- ============================================================================
-- 5. RAW INGREDIENTS CATALOGUE (Patties, Buns, Hotdogs, Siomai, Rice, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    reorder_level DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
    maximum_stock DECIMAL(12, 2) NOT NULL DEFAULT 500.00,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingredients_code ON public.ingredients(item_code);

-- ============================================================================
-- 6. RECIPES & RECIPE INGREDIENT CONSUMPTION ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    product_name VARCHAR(150),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(150),
    quantity_consumed DECIMAL(12, 3) NOT NULL DEFAULT 1.000,
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    extraction_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON public.recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_ingredient ON public.recipe_items(ingredient_id);

-- ============================================================================
-- 7. BRANCH INVENTORY (Per-Branch Ingredient Stock Levels)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.branch_inventory (
    id VARCHAR(120) PRIMARY KEY, -- e.g. branchId_ingredientId
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(120),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(150),
    item_code VARCHAR(50),
    category VARCHAR(80),
    unit VARCHAR(30) DEFAULT 'pcs',
    cost_price DECIMAL(12, 2) DEFAULT 0.00,
    current_stock DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    reorder_level DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
    maximum_stock DECIMAL(12, 2) NOT NULL DEFAULT 500.00,
    status VARCHAR(30) DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(branch_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_inventory_branch ON public.branch_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_inventory_status ON public.branch_inventory(branch_id, status);

-- ============================================================================
-- 8. ORDERS TABLE (POS Counter & Customer Self-Ordering Kiosk)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(60) NOT NULL UNIQUE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(120),
    cashier_id VARCHAR(100) DEFAULT 'KIOSK',
    cashier_name VARCHAR(150) DEFAULT 'Self-Ordering Kiosk',
    source VARCHAR(50) NOT NULL DEFAULT 'KIOSK' CHECK (source IN ('KIOSK', 'SELF_ORDERING', 'POS')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'VOIDED')),
    dining_option VARCHAR(50) DEFAULT 'DINE_IN',
    table_number VARCHAR(20),
    is_mobile_order BOOLEAN DEFAULT FALSE,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(50),
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_branch_created ON public.orders(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);

-- ============================================================================
-- 9. ORDER ITEMS TABLE (Individual product lines with modifiers & recipes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(150) NOT NULL,
    product_image TEXT,
    category VARCHAR(80),
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    modifiers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- ============================================================================
-- 10. INVENTORY TRANSACTIONS TABLE (Stock In, Usage, Recipe Deductions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(120),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(150),
    quantity DECIMAL(12, 3) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    previous_stock DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    new_stock DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    reason TEXT,
    reference_id VARCHAR(100),
    user_id VARCHAR(100),
    user_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_branch_ingredient ON public.inventory_transactions(branch_id, ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_created ON public.inventory_transactions(created_at DESC);

-- ============================================================================
-- 11. CASHIER SHIFTS & CASH REMITTANCES (Denomination Audit & Vaulting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_number VARCHAR(50) UNIQUE NOT NULL,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(120),
    cashier_id VARCHAR(100) NOT NULL,
    cashier_name VARCHAR(150) NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'RECONCILED')),
    opening_cash DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cash_sales DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cash_expenses DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    actual_cash DECIMAL(12, 2),
    variance DECIMAL(12, 2),
    variance_status VARCHAR(30),
    denominations JSONB DEFAULT '{}'::jsonb,
    total_sales DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_orders INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cash_remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remittance_number VARCHAR(50) UNIQUE NOT NULL,
    shift_id UUID REFERENCES public.cashier_shifts(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(120),
    cashier_id VARCHAR(100) NOT NULL,
    cashier_name VARCHAR(150) NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    expected_cash DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    actual_cash DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    remitted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cash_variance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    remittance_variance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    variance_flag VARCHAR(20) DEFAULT 'TALLY' CHECK (variance_flag IN ('TALLY', 'SHORTAGE', 'OVERAGE')),
    denomination_breakdown JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(30) DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'VERIFIED', 'FOR_REVIEW', 'APPROVED', 'REJECTED', 'RECONCILED')),
    manager_id VARCHAR(100),
    manager_name VARCHAR(150),
    manager_verified_at TIMESTAMPTZ,
    manager_verified_amount DECIMAL(12, 2),
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_remittances_branch_date ON public.cash_remittances(branch_id, date DESC);

-- ============================================================================
-- 12. BRANCH EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.branch_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(120),
    shift_id UUID REFERENCES public.cashier_shifts(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    proof_image_url TEXT,
    created_by_user_id VARCHAR(100),
    created_by_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 13. ATTENDANCE RECORDS (Clock-In / Clock-Out)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(120),
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    total_minutes INT DEFAULT 0,
    payable_hours DECIMAL(6, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON public.attendance_records(branch_id, date);

-- ============================================================================
-- 14. LOYALTY CUSTOMERS & REWARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    current_points INT NOT NULL DEFAULT 0,
    total_points_earned INT NOT NULL DEFAULT 0,
    total_points_redeemed INT NOT NULL DEFAULT 0,
    registered_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    registered_branch_name VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone ON public.loyalty_customers(phone_number);

-- ============================================================================
-- 15. SEED INITIAL 17 BRANCHES (Official Tagpuan Franchise Outlets)
-- ============================================================================
INSERT INTO public.branches (name, code, address, manager_name) VALUES
    ('Tagpuan - Narra Branch', 'TAG-NAR', 'Blk 12 Lot 4, Narra St., GMA, Cavite', 'Roberto "Bob" Mendoza'),
    ('Tagpuan - Acacia Branch', 'TAG-ACA', 'Lot 8 Acacia Ave., GMA, Cavite', 'Maria Elena Santos'),
    ('Tagpuan - Pulido Branch', 'TAG-PUL', '145 Pulido Main Road, GMA, Cavite', 'Danilo Cruz'),
    ('Tagpuan - Kaong Branch', 'TAG-KAO', 'Km 42 Kaong Highway, Silang, Cavite', 'Rowena De Jesus'),
    ('Tagpuan - Ipil Branch', 'TAG-IPI', '23 Ipil St., Brgy. Ipil, GMA, Cavite', 'Arnel Bautista'),
    ('Tagpuan - Yakal Branch', 'TAG-YAK', '88 Yakal St., Phase 3, GMA, Cavite', 'Carmela Reyes'),
    ('Tagpuan - Anahaw Branch', 'TAG-ANA', '56 Anahaw Drive, Brgy. Anahaw, GMA, Cavite', 'Jonathan Diaz'),
    ('Tagpuan - Banaba Branch', 'TAG-BAN', '12 Banaba Road, Silang-GMA, Cavite', 'Grace Manalo'),
    ('Tagpuan - Maguyam Branch', 'TAG-MAG', 'Lot 3 Maguyam Industrial Road, Silang, Cavite', 'Vicente Ramos'),
    ('Tagpuan - Magra Branch', 'TAG-MGR', '77 Magra Commercial Strip, GMA, Cavite', 'Lourdes Hernandez'),
    ('Tagpuan - Zone 10 Branch', 'TAG-Z10', 'Zone 10 Commercial Center, GMA, Cavite', 'Ferdinand Castro'),
    ('Tagpuan - Zone 11 Branch', 'TAG-Z11', 'Zone 11 Access Road, GMA, Cavite', 'Teresa Dizon'),
    ('Tagpuan - Area K Branch', 'TAG-ARK', 'Area K Junction, GMA, Cavite', 'Eduardo Tolentino'),
    ('Tagpuan - Alfonso Tagaytay Branch', 'TAG-ALF', 'Km 68 Tagaytay-Nasugbu Highway, Cavite', 'Beatriz Villanueva'),
    ('Tagpuan - Bukluran Branch', 'TAG-BUK', 'Bukluran St., Brgy. Poblacion, GMA, Cavite', 'Rolando Perez'),
    ('Tagpuan - San Gabriel II Branch', 'TAG-SG2', 'Blk 4 Lot 9, San Gabriel II, GMA, Cavite', 'Jocelyn Garcia'),
    ('Tagpuan - Mabuhay 2000 Branch', 'TAG-M2K', 'Phase 2 Mabuhay 2000 Subd., Cavite', 'Manuel Soriano')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for authenticated ERP operations & customer kiosks
CREATE POLICY "allow_all_read_branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "allow_all_read_menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "allow_all_read_ingredients" ON public.ingredients FOR SELECT USING (true);
CREATE POLICY "allow_all_read_recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "allow_all_read_recipe_items" ON public.recipe_items FOR SELECT USING (true);
CREATE POLICY "allow_all_read_inventory" ON public.branch_inventory FOR SELECT USING (true);

-- Orders: Customer Kiosk and POS Counter read/write
CREATE POLICY "allow_all_insert_orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_select_orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "allow_all_update_orders" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "allow_all_insert_order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_select_order_items" ON public.order_items FOR SELECT USING (true);

-- Cash Remittances, Inventory Transactions, Attendance & Loyalty
CREATE POLICY "allow_all_remittances" ON public.cash_remittances FOR ALL USING (true);
CREATE POLICY "allow_all_shifts" ON public.cashier_shifts FOR ALL USING (true);
CREATE POLICY "allow_all_inv_tx" ON public.inventory_transactions FOR ALL USING (true);
CREATE POLICY "allow_all_attendance" ON public.attendance_records FOR ALL USING (true);
CREATE POLICY "allow_all_loyalty" ON public.loyalty_customers FOR ALL USING (true);
CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL USING (true);
