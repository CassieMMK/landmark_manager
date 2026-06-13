-- ============================================
-- Migration: Add is_favorite + UPDATE permission
-- Run this in Supabase SQL Editor
-- ============================================

-- Add is_favorite column (default false = auto-saved history)
ALTER TABLE saved_routes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE saved_trips  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Grant UPDATE permission (needed to toggle is_favorite)
GRANT UPDATE ON saved_routes TO authenticated;
GRANT UPDATE ON saved_trips TO authenticated;

-- Add UPDATE RLS policies
CREATE POLICY "Users can update own saved routes"
  ON saved_routes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved trips"
  ON saved_trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
