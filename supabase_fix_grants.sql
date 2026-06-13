-- ============================================
-- Fix: Grant table-level permissions to roles
-- Run this in Supabase SQL Editor
-- ============================================

-- Grant permissions to authenticated users (logged-in)
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_routes TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_trips TO authenticated;

-- Grant usage on sequences (needed for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Also ensure the anon role can't touch these tables
-- (RLS already blocks it, but belt-and-suspenders)
REVOKE ALL ON favorites FROM anon;
REVOKE ALL ON saved_routes FROM anon;
REVOKE ALL ON saved_trips FROM anon;
