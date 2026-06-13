-- Create the landmarks table
CREATE TABLE IF NOT EXISTS landmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geohash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE landmarks ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read landmarks
CREATE POLICY "Allow public read access" ON landmarks
  FOR SELECT USING (true);

-- Create a policy that allows anyone to insert landmarks (you might want to restrict this later with Auth)
CREATE POLICY "Allow public insert access" ON landmarks
  FOR INSERT WITH CHECK (true);

-- Create a policy that allows anyone to delete landmarks
CREATE POLICY "Allow public delete access" ON landmarks
  FOR DELETE USING (true);

-- Optional: Enable PostGIS if you want to use advanced spatial queries
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE landmarks ADD COLUMN geom geometry(Point, 4326);
-- UPDATE landmarks SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
