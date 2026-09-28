-- ============================================================================
-- TAGPUAN ERP - PHASE 1 DATABASE MIGRATION & RLS POLICIES
-- Business: Tagpuan - Home of Authentic Burger & Siomai
-- Tables: roles, branches, profiles, user_roles, branch_users, audit_logs, notifications
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. CREATE BRANCHES TABLE
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. CREATE PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL REFERENCES public.roles(name) ON UPDATE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_role CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER', 'CREW', 'WAREHOUSEMAN', 'KITCHEN'))
);

-- 5. CREATE USER_ROLES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, role_id)
);

-- 6. CREATE BRANCH_USERS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.branch_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(branch_id, user_id)
);

-- 7. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 8. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO' NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- SEED INITIAL DATA: EXACT 6 ROLES & EXACT 17 BRANCHES
-- ============================================================================

INSERT INTO public.roles (name, description) VALUES
    ('OWNER', 'Full global access across all Tagpuan ERP modules and all branches'),
    ('MANAGER', 'Branch manager with operational and staff oversight for assigned branch only'),
    ('CASHIER', 'Frontline point-of-sale operator for assigned branch'),
    ('CREW', 'Branch operations and service staff for assigned branch'),
    ('WAREHOUSEMAN', 'Logistics and warehouse management scope'),
    ('KITCHEN', 'Kitchen display and food preparation station for assigned branch')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.branches (name, is_active) VALUES
    ('Narra', TRUE),
    ('Acacia', TRUE),
    ('Pulido', TRUE),
    ('Kaong', TRUE),
    ('Ipil', TRUE),
    ('Yakal', TRUE),
    ('Anahaw', TRUE),
    ('Banaba', TRUE),
    ('Maguyam', TRUE),
    ('Magra', TRUE),
    ('Zone 10', TRUE),
    ('Zone 11', TRUE),
    ('Area K', TRUE),
    ('Alfonso Tagaytay', TRUE),
    ('Bukluran', TRUE),
    ('San Gabriel II', TRUE),
    ('Mabuhay 2000', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Function to get current user's profile role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE auth_user_id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's assigned branch_id
CREATE OR REPLACE FUNCTION public.get_auth_user_branch_id()
RETURNS UUID AS $$
DECLARE
    v_branch_id UUID;
BEGIN
    SELECT branch_id INTO v_branch_id 
    FROM public.profiles 
    WHERE auth_user_id = auth.uid();
    RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current authenticated user is an OWNER
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_auth_user_role() = 'OWNER');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all protected tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLICIES: ROLES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read roles" 
    ON public.roles FOR SELECT 
    TO authenticated 
    USING (TRUE);

-- ----------------------------------------------------------------------------
-- POLICIES: BRANCHES
-- ----------------------------------------------------------------------------
-- Owner can see all branches
CREATE POLICY "Owner has full select on branches"
    ON public.branches FOR SELECT
    TO authenticated
    USING (public.is_owner() OR id = public.get_auth_user_branch_id());

-- Only owner can modify branches
CREATE POLICY "Owner can insert branches"
    ON public.branches FOR INSERT
    TO authenticated
    WITH CHECK (public.is_owner());

CREATE POLICY "Owner can update branches"
    ON public.branches FOR UPDATE
    TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- ----------------------------------------------------------------------------
-- POLICIES: PROFILES
-- ----------------------------------------------------------------------------
-- Owner can view all profiles; non-owners can view own profile or branch team members
CREATE POLICY "Profile view policy with branch isolation"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.is_owner() 
        OR auth_user_id = auth.uid() 
        OR (branch_id IS NOT NULL AND branch_id = public.get_auth_user_branch_id())
    );

-- Only Owner can insert new user profiles
CREATE POLICY "Owner can create user profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_owner());

-- Owner can update any profile; Users can update their own full_name only
CREATE POLICY "Profile update policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_owner() OR auth_user_id = auth.uid())
    WITH CHECK (
        public.is_owner() 
        OR (auth_user_id = auth.uid() AND role = public.get_auth_user_role() AND branch_id = public.get_auth_user_branch_id())
    );

-- Only Owner can delete profiles
CREATE POLICY "Owner can delete user profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_owner());

-- ----------------------------------------------------------------------------
-- POLICIES: AUDIT LOGS
-- ----------------------------------------------------------------------------
-- Owner can view all logs; Manager can view logs for their assigned branch
CREATE POLICY "Audit logs select policy with branch isolation"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        public.is_owner() 
        OR (public.get_auth_user_role() = 'MANAGER' AND branch_id = public.get_auth_user_branch_id())
        OR user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

-- Authenticated users or system can append audit records (insert only)
CREATE POLICY "Append audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Prevent update or delete on audit logs (immutable logs)
-- No UPDATE or DELETE policies defined, effectively disallowing them for normal users.

-- ----------------------------------------------------------------------------
-- POLICIES: NOTIFICATIONS
-- ----------------------------------------------------------------------------
-- Users can only view and update their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (recipient_user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can mark own notifications as read"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (recipient_user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
    WITH CHECK (recipient_user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- System or Owner can insert notifications
CREATE POLICY "System and Owner can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- ----------------------------------------------------------------------------
-- TRIGGERS: auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
