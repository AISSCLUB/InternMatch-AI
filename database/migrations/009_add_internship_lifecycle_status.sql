-- Migration 009: Add is_active column to internship_listings table for opportunity lifecycle management

ALTER TABLE public.internship_listings
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_internship_listings_is_active
ON public.internship_listings(is_active);
