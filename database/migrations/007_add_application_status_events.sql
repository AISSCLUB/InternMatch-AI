-- InternMatch AI - Gate 2.38F-C4C-A Add Application Status Events Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Migration: 007_add_application_status_events.sql

-- 1. Create Table: application_status_events (Application Status History)
CREATE TABLE IF NOT EXISTS public.application_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_application_status_events_status CHECK (
        status IN ('saved', 'applied', 'interviewing', 'rejected', 'accepted')
    )
);

-- 2. Performance & Chronological Ordering Indexes
CREATE INDEX IF NOT EXISTS idx_application_status_events_app_occurred
ON public.application_status_events(application_id, occurred_at ASC, id ASC);

-- 3. Row Level Security (RLS) Policy
-- Ownership resolved via applications.student_id -> student_profiles.user_id = auth.uid()
ALTER TABLE public.application_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY application_status_events_select_policy ON public.application_status_events
    FOR SELECT TO authenticated
    USING (
        application_id IN (
            SELECT a.id
            FROM public.applications a
            JOIN public.student_profiles sp ON a.student_id = sp.id
            WHERE sp.user_id = auth.uid()
        )
    );

CREATE POLICY application_status_events_insert_policy ON public.application_status_events
    FOR INSERT TO authenticated
    WITH CHECK (
        application_id IN (
            SELECT a.id
            FROM public.applications a
            JOIN public.student_profiles sp ON a.student_id = sp.id
            WHERE sp.user_id = auth.uid()
        )
    );

-- 4. Explicit PostgreSQL Privileges
REVOKE ALL ON public.application_status_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.application_status_events TO authenticated;
GRANT ALL ON public.application_status_events TO service_role;

-- Manual rollback:
-- DROP TABLE IF EXISTS public.application_status_events;
