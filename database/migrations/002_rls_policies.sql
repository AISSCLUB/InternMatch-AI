-- InternMatch AI — Gate 2.2 Row Level Security (RLS) Policies Migration
-- Target Engine: Supabase PostgreSQL 15+
-- Authoritative Spec: docs/DATABASE.md & docs/SECURITY.md

-- 1. Enable Row Level Security (RLS) on all 10 Core Tables

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- 2. User-Owned Table Security Policies

-- 2.1 Student Profiles Policy: Owner full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY student_profiles_owner_policy ON public.student_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2.2 Student Skills Policy: Restricted via owning student profile
CREATE POLICY student_skills_owner_policy ON public.student_skills
    FOR ALL TO authenticated
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- 2.3 Education Entries Policy: Restricted via owning student profile
CREATE POLICY education_entries_owner_policy ON public.education_entries
    FOR ALL TO authenticated
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- 2.4 Experience Entries Policy: Restricted via owning student profile
CREATE POLICY experience_entries_owner_policy ON public.experience_entries
    FOR ALL TO authenticated
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- 2.5 Project Entries Policy: Restricted via owning student profile
CREATE POLICY project_entries_owner_policy ON public.project_entries
    FOR ALL TO authenticated
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- 2.6 Matches Policy: Student read-only access to own matches (least privilege)
CREATE POLICY matches_owner_policy ON public.matches
    FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- 2.7 Applications Policy: Student full access to own job tracker records
CREATE POLICY applications_owner_policy ON public.applications
    FOR ALL TO authenticated
    USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- 2.8 Processing Jobs Policy: User read-only access to own async processing jobs
CREATE POLICY processing_jobs_owner_policy ON public.processing_jobs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 3. Shared Reference & Catalog Table Read-Only Policies

-- 3.1 Skills Taxonomy Policy: Read-only for authenticated and anonymous users
CREATE POLICY skills_read_policy ON public.skills
    FOR SELECT TO authenticated, anon
    USING (true);

-- 3.2 Internship Listings Catalog Policy: Read-only catalog browsing
CREATE POLICY internship_listings_read_policy ON public.internship_listings
    FOR SELECT TO authenticated, anon
    USING (true);

-- 4. Explicit PostgreSQL Privileges (GRANT & REVOKE Matrix)

-- 4.1 Deny-by-Default Baseline: Revoke default public table access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- 4.2 Public Catalog Tables: Read-Only for anon & authenticated; Full for service_role
GRANT SELECT ON public.skills, public.internship_listings TO anon, authenticated;
GRANT ALL ON public.skills, public.internship_listings TO service_role;

-- 4.3 User-Owned Mutable Tables: Full CRUD for authenticated (governed by RLS); Full for service_role; 0 for anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles, public.student_skills, public.education_entries, public.experience_entries, public.project_entries, public.applications TO authenticated;
GRANT ALL ON public.student_profiles, public.student_skills, public.education_entries, public.experience_entries, public.project_entries, public.applications TO service_role;

-- 4.4 Read-Only / System User Tables: Read-Only for authenticated (governed by RLS); Full for service_role; 0 for anon
GRANT SELECT ON public.matches, public.processing_jobs TO authenticated;
GRANT ALL ON public.matches, public.processing_jobs TO service_role;

