-- InternMatch AI — Gate 2.1 Initial Database Schema Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Authoritative Spec: docs/DATABASE.md

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Create Core Tables

-- 2.1 Table: student_profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    headline TEXT,
    cv_storage_path TEXT,
    preferences JSONB DEFAULT '{"work_types": [], "desired_locations": []}'::jsonb,
    summary_embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Table: skills (Master Taxonomy)
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT
);

-- 2.3 Table: student_skills (Junction Table)
CREATE TABLE IF NOT EXISTS public.student_skills (
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
    proficiency_level TEXT DEFAULT 'intermediate',
    PRIMARY KEY (student_id, skill_id)
);

-- 2.4 Table: education_entries
CREATE TABLE IF NOT EXISTS public.education_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    start_year INT,
    end_year INT
);

-- 2.5 Table: experience_entries
CREATE TABLE IF NOT EXISTS public.experience_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE
);

-- 2.6 Table: project_entries
CREATE TABLE IF NOT EXISTS public.project_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    tech_stack TEXT[],
    description TEXT
);

-- 2.7 Table: internship_listings (Controlled 30–50 Dataset)
CREATE TABLE IF NOT EXISTS public.internship_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    work_type TEXT NOT NULL CHECK (work_type IN ('remote', 'onsite', 'hybrid')),
    description TEXT NOT NULL,
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'English',
    education_requirements TEXT,
    experience_requirements TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    description_embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Table: matches (Hybrid Match Engine Results)
-- Canonical Data Note: skill_gap_analysis JSONB is the single source of truth for skill gaps.
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    internship_id UUID NOT NULL REFERENCES public.internship_listings(id) ON DELETE CASCADE,
    overall_score INT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    skill_score INT NOT NULL CHECK (skill_score BETWEEN 0 AND 100),
    vector_score INT NOT NULL CHECK (vector_score BETWEEN 0 AND 100),
    attribute_score INT NOT NULL CHECK (attribute_score BETWEEN 0 AND 100),
    why_you_match TEXT,
    skill_gap_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, internship_id)
);

-- 2.9 Table: applications (Application Tracker)
-- Historical Retention Note: internship_id uses ON DELETE SET NULL to preserve candidate application history.
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    internship_id UUID REFERENCES public.internship_listings(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'rejected', 'accepted')),
    generated_cover_letter TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, internship_id)
);

-- 2.10 Table: processing_jobs (Async RQ Job Tracking)
CREATE TABLE IF NOT EXISTS public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('cv_extraction', 'match_calculation', 'application_generation')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes & Vector Search Optimization

-- Vector Cosine Similarity Index (HNSW)
CREATE INDEX IF NOT EXISTS idx_internships_embedding_hnsw 
ON public.internship_listings 
USING hnsw (description_embedding vector_cosine_ops);

-- B-Tree Performance Indexes
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_student_score ON public.matches(student_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_applications_student_status ON public.applications(student_id, status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_status ON public.processing_jobs(user_id, status);
