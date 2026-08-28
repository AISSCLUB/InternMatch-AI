ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS interview_scheduled_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS interview_mode TEXT NULL,
ADD COLUMN IF NOT EXISTS interview_location TEXT NULL,
ADD COLUMN IF NOT EXISTS interview_message TEXT NULL;

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS ck_applications_interview_mode;

ALTER TABLE public.applications
ADD CONSTRAINT ck_applications_interview_mode
CHECK (
    interview_mode IS NULL
    OR interview_mode IN ('online', 'onsite')
);