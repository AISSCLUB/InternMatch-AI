-- InternMatch AI — Gate 2.29 Application Applied Date Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Migration: 004_add_application_applied_date.sql

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS applied_date DATE;

-- Manual rollback:
-- ALTER TABLE public.applications DROP COLUMN IF EXISTS applied_date;
