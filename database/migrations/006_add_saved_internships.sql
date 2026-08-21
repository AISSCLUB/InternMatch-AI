-- InternMatch AI - Gate 2.38F-C4A Add Saved Internships Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Migration: 006_add_saved_internships.sql

-- 1. Create Table: saved_internships (Candidate Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_internships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    internship_id UUID NOT NULL REFERENCES public.internship_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saved_internships_student_internship UNIQUE(student_id, internship_id)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_saved_internships_student_created
ON public.saved_internships(student_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_saved_internships_internship_id
ON public.saved_internships(internship_id);

-- 3. Row Level Security (RLS) Policy
-- Ownership resolved via student_profiles.user_id = auth.uid()
ALTER TABLE public.saved_internships ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_internships_owner_policy ON public.saved_internships
    FOR ALL TO authenticated
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- 4. Explicit PostgreSQL Privileges
REVOKE ALL ON public.saved_internships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_internships TO authenticated;
GRANT ALL ON public.saved_internships TO service_role;

-- Manual rollback:
-- DROP TABLE IF EXISTS public.saved_internships;
