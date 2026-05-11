-- ============================================================
-- CinemaWritings — Supabase Database Setup & RLS Policies
-- ============================================================
-- Run this SQL in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- This script:
--   1. Ensures the 'scripts' table exists with correct schema.
--   2. Enables Row Level Security (RLS).
--   3. Sets up strict user-isolation policies.
--   4. Configures necessary API permissions.
-- ============================================================

-- ─── 1. Schema Initialization ──────────────────────────────────────────────
-- This script will create the table if it's missing, or just skip if it's there.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'scripts') THEN
        CREATE TABLE public.scripts (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            title text NOT NULL DEFAULT 'Untitled Script',
            content text DEFAULT '',
            paper_color text DEFAULT '',
            font_family text DEFAULT 'Courier Prime',
            text_color text DEFAULT '',
            author text DEFAULT '',
            contact text DEFAULT '',
            logline text DEFAULT '',
            synopsis text DEFAULT '',
            written_by_prefix text DEFAULT 'written by',
            tags jsonb DEFAULT '[]'::jsonb,
            history jsonb DEFAULT '[]'::jsonb,
            versions jsonb DEFAULT '[]'::jsonb,
            updated_at timestamptz DEFAULT now(),
            created_at timestamptz DEFAULT now(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
        );
    END IF;
END $$;

-- ─── 2. Permissions ────────────────────────────────────────────────────────
-- Grant basic access to the API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.scripts TO anon, authenticated;

-- ─── 3. Row Level Security ─────────────────────────────────────────────────
-- Enable RLS (safe to run multiple times)
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to avoid conflicts or leftovers
DROP POLICY IF EXISTS "Allow all access for now" ON public.scripts;
DROP POLICY IF EXISTS "Users can view their own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can insert their own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can update their own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can delete their own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users see own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users insert own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users update own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users delete own scripts" ON public.scripts;

-- Create secure user-isolation policies
CREATE POLICY "Users can view their own scripts" 
  ON public.scripts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scripts" 
  ON public.scripts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scripts" 
  ON public.scripts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scripts" 
  ON public.scripts FOR DELETE 
  USING (auth.uid() = user_id);

-- ─── 4. Post-Setup ────────────────────────────────────────────────────────
-- Add personal_info column if it doesn't exist (safe to run multiple times)
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS personal_info jsonb DEFAULT '{}'::jsonb;
-- Add copyright column if it doesn't exist
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS copyright text DEFAULT '';

-- Force PostgREST to refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Re-ensure permissions are open for the API to process requests
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.scripts TO anon, authenticated;

-- ─── 5. Storage Bucket Security (Templates) ────────────────────────────────
-- Uncomment and run these if/when you add file upload functionality

-- Only authenticated users can upload files
-- CREATE POLICY "Authenticated users can upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- Users can only access files in their own folder (folder = user UUID)
-- CREATE POLICY "Users access own files"
--   ON storage.objects FOR SELECT
--   USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Users can only update their own files
-- CREATE POLICY "Users update own files"
--   ON storage.objects FOR UPDATE
--   USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Users can only delete their own files
-- CREATE POLICY "Users delete own files"
--   ON storage.objects FOR DELETE
--   USING (auth.uid()::text = (storage.foldername(name))[1]);

-- ─── 6. Verification ────────────────────────────────────────────────────────
-- After running, verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 
-- Verify policies exist:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
