-- InternMatch AI — Supabase Storage Bucket Provisioning & Security Reference
-- Target Engine: Supabase Cloud / Self-Hosted Supabase Storage
-- Bucket: avatars (Private)
-- Purpose: Candidate profile avatar image storage (JPEG, PNG, WebP <= 5 MB)

-- 1. Create the private 'avatars' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    false,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Architectural Note:
-- All avatar upload, deletion, and signed URL generation operations are mediated
-- by the trusted FastAPI backend using verified JWT identity and server-side service credentials.
-- Mobile clients interact exclusively with POST /api/v1/profile/avatar and DELETE /api/v1/profile/avatar.
