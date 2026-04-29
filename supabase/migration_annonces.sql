-- Migration: Add announcement delete policy for co-leader+ (rank >= 7)
-- Run this in the Supabase SQL Editor

-- Allow co-leader+ to delete announcements
CREATE POLICY "ann delete colead+" ON announcements
  FOR DELETE USING (jwt_rank() >= 7);

-- Update write policy to require co-leader+ instead of op-second+
DROP POLICY IF EXISTS "ann write" ON announcements;
CREATE POLICY "ann write colead+" ON announcements
  FOR INSERT WITH CHECK (jwt_rank() >= 7);
