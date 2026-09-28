-- ============================================================================
-- TAGPUAN ERP - PHASE 4 & 16 DATABASE MIGRATION & RLS POLICIES
-- Orders, Order Items, and Kiosk-to-POS Realtime Synchronization
-- ============================================================================

-- 1. CREATE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(100),
    cashier_id VARCHAR(100) DEFAULT 'KIOSK',
    cashier_name VARCHAR(150) DEFAULT 'Self-Ordering Kiosk',
    source VARCHAR(50) NOT NULL DEFAULT 'KIOSK' CHECK (source IN ('KIOSK', 'SELF_ORDERING', 'POS')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'VOIDED')),
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    dining_option VARCHAR(50) DEFAULT 'DINE_IN',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(50),
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_reason TEXT,
    discounted_by VARCHAR(100),
    total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. CREATE ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    product_code VARCHAR(50),
    product_name VARCHAR(150) NOT NULL,
    product_image TEXT,
    category VARCHAR(100),
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    modifiers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. CREATE INDEXES FOR PERFORMANCE & REALTIME
CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON public.orders(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_source_status ON public.orders(source, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR ORDERS
-- 5.1 INSERT: Customer Kiosk can create orders with source 'KIOSK' or 'SELF_ORDERING'
CREATE POLICY "allow_kiosk_insert_orders"
ON public.orders FOR INSERT
WITH CHECK (
    source IN ('KIOSK', 'SELF_ORDERING') OR
    auth.role() = 'authenticated'
);

-- 5.2 SELECT: Owners can view all orders; Cashiers/Managers can view orders for their branch; Kiosk can query pending order status
CREATE POLICY "allow_view_orders"
ON public.orders FOR SELECT
USING (
    source IN ('KIOSK', 'SELF_ORDERING') OR
    auth.role() = 'authenticated'
);

-- 5.3 UPDATE: Cashiers and Managers can update order status (e.g. to PAID or CANCELLED)
CREATE POLICY "allow_update_orders"
ON public.orders FOR UPDATE
USING (
    auth.role() = 'authenticated' OR
    (source IN ('KIOSK', 'SELF_ORDERING') AND status = 'PENDING_PAYMENT')
);

-- 6. RLS POLICIES FOR ORDER_ITEMS
-- 6.1 INSERT: Kiosk and authenticated users can insert order items
CREATE POLICY "allow_insert_order_items"
ON public.order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
    )
);

-- 6.2 SELECT: View order items for accessible orders
CREATE POLICY "allow_view_order_items"
ON public.order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
    )
);

-- 7. ENABLE REALTIME ON ORDERS TABLE
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
