-- InternMatch AI — Gate 2.12 Processing Job Progress Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Migration: 003_add_processing_job_progress.sql

ALTER TABLE public.processing_jobs
ADD COLUMN IF NOT EXISTS progress_percent INT NOT NULL DEFAULT 0
CHECK (progress_percent BETWEEN 0 AND 100);
