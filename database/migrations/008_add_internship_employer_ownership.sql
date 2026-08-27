-- InternMatch AI - Gate EMP-MVP1 Add Employer Ownership to Internship Listings
-- Target Engine: Supabase PostgreSQL 15+
-- Migration: 008_add_internship_employer_ownership.sql

-- 1. Add employer_user_id column to public.internship_listings
ALTER TABLE public.internship_listings
ADD COLUMN IF NOT EXISTS employer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Performance Index for employer listings lookup
CREATE INDEX IF NOT EXISTS idx_internship_listings_employer_user_id
ON public.internship_listings(employer_user_id)
WHERE employer_user_id IS NOT NULL;
