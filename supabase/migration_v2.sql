-- =====================================================
-- USM Portal — Migration RLS et fonctionnalités v2
-- Idempotent : peut être lancée plusieurs fois sans risque
-- À exécuter dans le SQL Editor de Supabase
-- =====================================================

-- ─── 1. Profile notes table (notes internes Co-Leader+) ───
CREATE TABLE IF NOT EXISTS profile_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  auteur_id uuid REFERENCES users(id),
  contenu text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profile_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_notes' AND policyname = 'notes read colead+') THEN
    CREATE POLICY "notes read colead+" ON profile_notes FOR SELECT USING (jwt_rank() >= 7);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_notes' AND policyname = 'notes write colead+') THEN
    CREATE POLICY "notes write colead+" ON profile_notes FOR INSERT WITH CHECK (jwt_rank() >= 7);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_notes' AND policyname = 'notes delete colead+') THEN
    CREATE POLICY "notes delete colead+" ON profile_notes FOR DELETE USING (jwt_rank() >= 7);
  END IF;
END $$;

-- ─── 2. Announcements: ajouter DELETE et UPDATE policies ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'ann delete colead+') THEN
    CREATE POLICY "ann delete colead+" ON announcements FOR DELETE USING (jwt_rank() >= 7);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'ann update colead+') THEN
    CREATE POLICY "ann update colead+" ON announcements FOR UPDATE USING (jwt_rank() >= 7);
  END IF;
END $$;

-- ─── 3. Training registrations: permettre la ré-inscription ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_registrations' AND policyname = 'training_reg update self') THEN
    CREATE POLICY "training_reg update self" ON training_registrations FOR UPDATE
      USING (user_id = jwt_user_id() OR jwt_rank() >= 5);
  END IF;
END $$;

-- ─── 4. user_badges: lecture pour tous les authentifiés ───
DROP POLICY IF EXISTS "user_badges read" ON user_badges;
CREATE POLICY "user_badges read" ON user_badges FOR SELECT
  USING (auth.role() = 'authenticated' OR user_id = jwt_user_id());

-- ─── 5. rank_history: lecture pour tous ───
DROP POLICY IF EXISTS "rank_history read" ON rank_history;
CREATE POLICY "rank_history read" ON rank_history FOR SELECT
  USING (auth.role() = 'authenticated' OR user_id = jwt_user_id());

-- ─── 6. helpdesk_tickets: ouvrir l'INSERT à tous les rangs (≥1) ───
-- (la policy actuelle exige jwt_rank() >= 5, mais on veut que tout le monde puisse créer un retour)
DROP POLICY IF EXISTS "tickets write" ON helpdesk_tickets;
CREATE POLICY "tickets write" ON helpdesk_tickets FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── 7. Realtime sur announcements ───
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
  END IF;
END $$;

-- ─── 8. Trigger updated_at pour reports ───
CREATE OR REPLACE FUNCTION tg_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
