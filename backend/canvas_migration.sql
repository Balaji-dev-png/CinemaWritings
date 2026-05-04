-- ═══════════════════════════════════════════════════════════════════════════
-- Creative Workspace — Canvas States Table
-- Run this in Supabase SQL Editor to create the canvas_states table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS canvas_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(script_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own canvas states
CREATE POLICY "Users can select their own canvas states"
  ON canvas_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own canvas states"
  ON canvas_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvas states"
  ON canvas_states FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvas states"
  ON canvas_states FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_canvas_states_script_user
  ON canvas_states(script_id, user_id);
