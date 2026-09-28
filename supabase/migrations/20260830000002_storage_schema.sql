-- ============================================================================
-- TAGPUAN ERP - SUPABASE STORAGE FOR MENU PRODUCT IMAGES
-- Bucket: product-images (Public read, Authenticated Owner upload)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 1. Public Read Policy (Anyone can view menu product pictures for Kiosk, POS, and Customer display)
CREATE POLICY IF NOT EXISTS "Public Read Product Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 2. Owner Insert/Upload Policy
CREATE POLICY IF NOT EXISTS "Owner Insert Product Images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- 3. Owner Update Policy
CREATE POLICY IF NOT EXISTS "Owner Update Product Images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- 4. Owner Delete Policy
CREATE POLICY IF NOT EXISTS "Owner Delete Product Images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');
