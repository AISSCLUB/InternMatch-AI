-- InternMatch AI — Gate 2.38F-C1 Add Avatar Storage Path Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Migration: 005_add_avatar_storage_path.sql

ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT;

-- Manual rollback:
-- ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS avatar_storage_path;
