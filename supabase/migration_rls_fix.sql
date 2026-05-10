-- =====================================================
-- USM Portal — RLS fixes migration
-- Run this in the Supabase SQL Editor
-- =====================================================

-- 1. Announcements: add DELETE + UPDATE for co-leader+
CREATE POLICY IF NOT EXISTS "ann delete colead+" ON announcements
  FOR DELETE USING (jwt_rank() >= 7);
CREATE POLICY IF NOT EXISTS "ann update colead+" ON announcements
  FOR UPDATE USING (jwt_rank() >= 7);

-- 2. Training registrations: allow re-registration (update annule back to false)
-- The unique constraint on (session_id, user_id) means we can't insert again
-- So we need UPDATE policy too
CREATE POLICY IF NOT EXISTS "training_reg update" ON training_registrations
  FOR UPDATE USING (user_id = jwt_user_id() OR jwt_rank() >= 5);
-- Also allow SELECT for all authenticated so users can see who is registered
CREATE POLICY IF NOT EXISTS "training_reg read" ON training_registrations
  FOR SELECT USING (auth.role() = 'authenticated');
-- Allow INSERT for authenticated users  
CREATE POLICY IF NOT EXISTS "training_reg insert" ON training_registrations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Profile notes table
CREATE TABLE IF NOT EXISTS profile_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  auteur_id uuid REFERENCES users(id),
  contenu text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profile_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "notes read colead+" ON profile_notes FOR SELECT USING (jwt_rank() >= 7);
CREATE POLICY IF NOT EXISTS "notes write colead+" ON profile_notes FOR INSERT WITH CHECK (jwt_rank() >= 7);
CREATE POLICY IF NOT EXISTS "notes delete colead+" ON profile_notes FOR DELETE USING (jwt_rank() >= 7);

-- 4. Enable Supabase Realtime on announcements
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- 5. user_badges: also allow reading for own user (for profile page)
-- Already exists but ensure it also allows SELECT for the profile owner
DROP POLICY IF EXISTS "user_badges read" ON user_badges;
CREATE POLICY "user_badges read" ON user_badges
  FOR SELECT USING (
    user_id = jwt_user_id()
    OR jwt_rank() >= 5
    OR auth.role() = 'authenticated'
  );

-- 6. rank_history: allow reading for all authenticated (so profile can show it)
DROP POLICY IF EXISTS "rank_history read" ON rank_history;
CREATE POLICY "rank_history read" ON rank_history
  FOR SELECT USING (
    user_id = jwt_user_id()
    OR jwt_rank() >= 6
    OR auth.role() = 'authenticated'
  );
