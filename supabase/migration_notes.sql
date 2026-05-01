-- Migration: Internal notes on user profiles (Co-Leader+ only)
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS profile_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  auteur_id uuid REFERENCES users(id),
  contenu text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profile_notes ENABLE ROW LEVEL SECURITY;

-- Only Co-Leader+ can read and write notes
CREATE POLICY "notes read colead+" ON profile_notes
  FOR SELECT USING (jwt_rank() >= 7);

CREATE POLICY "notes write colead+" ON profile_notes
  FOR INSERT WITH CHECK (jwt_rank() >= 7);

CREATE POLICY "notes delete colead+" ON profile_notes
  FOR DELETE USING (jwt_rank() >= 7);
