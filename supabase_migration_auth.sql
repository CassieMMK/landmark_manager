-- ============================================
-- Supabase Migration: User Auth + Favorites + Saved Routes/Trips
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landmark_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, landmark_id)
);

-- 2. Saved routes table (point-to-point)
CREATE TABLE IF NOT EXISTS saved_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'driving',
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  origin_name TEXT NOT NULL DEFAULT '',
  dest_name TEXT NOT NULL DEFAULT '',
  strategy INTEGER NOT NULL DEFAULT 0,
  route_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Saved trips table (multi-stop)
CREATE TABLE IF NOT EXISTS saved_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'driving',
  waypoint_ids JSONB NOT NULL DEFAULT '[]',
  waypoint_names JSONB NOT NULL DEFAULT '[]',
  use_gps_start BOOLEAN NOT NULL DEFAULT false,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  segments_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS) — each user can only
-- see and manage their own data
-- ============================================

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Saved routes policies
CREATE POLICY "Users can view own saved routes"
  ON saved_routes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved routes"
  ON saved_routes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved routes"
  ON saved_routes FOR DELETE
  USING (auth.uid() = user_id);

-- Saved trips policies
CREATE POLICY "Users can view own saved trips"
  ON saved_trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved trips"
  ON saved_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved trips"
  ON saved_trips FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Indexes for fast lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_landmark_id ON favorites(landmark_id);
CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trips_user_id ON saved_trips(user_id);
