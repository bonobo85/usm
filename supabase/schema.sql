-- ============================================================
-- USM Portal — Supabase schema
-- Run this in the Supabase SQL editor (one shot)
-- ============================================================

-- ─── EXTENSIONS ───
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ─── TABLES ───

-- Rangs (référentiel)
create table if not exists ranks (
  level int primary key,
  nom text not null,
  couleur text not null
);

insert into ranks (level, nom, couleur) values
  (1, 'BCSO', '#4A5670'),
  (2, 'USM', '#6B7B9C'),
  (3, 'USM Confirmé', '#1B3E7C'),
  (4, 'Formateur', '#2E5AA8'),
  (5, 'Opérateur Second', '#8B6A42'),
  (6, 'Opérateur', '#A67C4E'),
  (7, 'Co-Leader', '#D43A4F'),
  (8, 'Leader', '#B32134'),
  (9, 'Shériff', '#C9994F')
on conflict (level) do nothing;

-- Users
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  discord_id text unique not null,
  username text not null,
  email text,
  avatar_url text,
  rank_level int not null default 1 references ranks(level),
  statut text not null default 'hors_ligne' check (statut in ('disponible','occupe','absent','hors_ligne')),
  is_active boolean not null default true,
  surnom text,
  date_naissance date,
  lieu_naissance text,
  telephone text,
  photo_profil_url text,
  carte_identite_url text,
  permis_url text,
  derniere_connexion timestamptz default now(),
  -- Données issues de Discord OAuth (servers + roles)
  discord_guilds jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists users_discord_id_idx on users(discord_id);
create index if not exists users_rank_idx on users(rank_level);

-- Badges
create table if not exists badges (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  nom text not null,
  couleur text not null,
  description text,
  ordre_affichage int not null,
  icone text
);

insert into badges (code, nom, couleur, ordre_affichage, description) values
  ('CRASH','CRASH','#B32134',1,'Unité CRASH'),
  ('FORMATEUR','Formateur','#2E5AA8',2,'Formateur certifié'),
  ('INSTRUCTEUR','Instructeur','#1B3E7C',3,'Instructeur'),
  ('NEGOCIATEUR','Négociateur','#A67C4E',4,'Négociateur'),
  ('BMO','BMO','#8B6A42',5,'Brigade Motorisée'),
  ('DRONE','Drone','#4A5670',6,'Opérateur Drone'),
  ('GAV','GAV','#6B7B9C',7,'Garde à Vue'),
  ('BRACELET','Bracelet','#D43A4F',8,'Bracelet électronique'),
  ('FEDERAL','Fédéral','#C9994F',9,'Mandat fédéral')
on conflict (code) do nothing;

create table if not exists user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  attribue_par uuid references users(id),
  attribue_le timestamptz default now(),
  is_active boolean default true,
  raison text,
  revoque_par uuid references users(id),
  revoque_le timestamptz,
  raison_revocation text
);

create table if not exists user_permissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  permission text not null check (permission in ('dev','admin_panel','super_admin')),
  granted_by uuid references users(id),
  granted_at timestamptz default now(),
  unique(user_id, permission)
);

create table if not exists rank_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  ancien_rang int,
  nouveau_rang int,
  modifie_par uuid references users(id),
  raison text not null,
  modifie_le timestamptz default now()
);

-- Entraînement
create table if not exists training_sessions (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  description text,
  plan text,
  date_session timestamptz not null,
  lieu text,
  rank_min int default 1,
  capacite_max int default 10,
  inscriptions_ouvertes boolean default true,
  badge_cible_id uuid references badges(id),
  createur_id uuid references users(id),
  statut text default 'planifie' check (statut in ('planifie','en_cours','termine','annule')),
  created_at timestamptz default now()
);

create table if not exists training_registrations (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references training_sessions(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  inscrit_le timestamptz default now(),
  annule boolean default false,
  unique(session_id, user_id)
);

create table if not exists training_attendance (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references training_sessions(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  statut text check (statut in ('present','absent','retard','excuse')),
  badge_obtenu boolean default false,
  commentaire text,
  pointe_par uuid references users(id),
  pointe_le timestamptz default now(),
  unique(session_id, user_id)
);

-- Rapports
create table if not exists report_templates (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  nom text not null,
  description text,
  sections jsonb not null default '[]'::jsonb,
  is_active boolean default true
);

insert into report_templates (code, nom, description, sections) values
  ('gav','Garde à vue','Procès-verbal de garde à vue', '[{"titre":"Identité","champs":[{"nom":"nom","label":"Nom","type":"text","required":true},{"nom":"motif","label":"Motif","type":"textarea","required":true},{"nom":"date_arrestation","label":"Date d''arrestation","type":"datetime","required":true}]}]'::jsonb),
  ('interrogatoire','Interrogatoire','Compte-rendu d''interrogatoire','[{"titre":"Sujet","champs":[{"nom":"sujet","label":"Sujet","type":"text","required":true},{"nom":"questions","label":"Questions / réponses","type":"textarea","required":true}]}]'::jsonb),
  ('bracelet','Bracelet électronique','Pose de bracelet','[{"titre":"Bénéficiaire","champs":[{"nom":"beneficiaire","label":"Bénéficiaire","type":"text","required":true},{"nom":"motif","label":"Motif","type":"textarea","required":true},{"nom":"duree","label":"Durée (jours)","type":"number","required":true}]}]'::jsonb),
  ('federal','Mandat fédéral','Rapport mandat fédéral','[{"titre":"Mandat","champs":[{"nom":"objet","label":"Objet","type":"text","required":true},{"nom":"contexte","label":"Contexte","type":"textarea","required":true}]}]'::jsonb),
  ('custom','Personnalisé','Rapport libre','[]'::jsonb)
on conflict (code) do nothing;

create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  type text,
  template_code text references report_templates(code),
  titre text not null,
  contenu jsonb default '{}'::jsonb,
  sections jsonb default '[]'::jsonb,
  auteur_id uuid references users(id),
  statut text default 'draft' check (statut in ('draft','submitted','validated','rejected')),
  publie boolean default false,
  publie_par uuid references users(id),
  publie_le timestamptz,
  validateur_id uuid references users(id),
  commentaire_validation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Helpdesk
create table if not exists helpdesk_tickets (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('retour','sanction')),
  titre text not null,
  contenu text,
  auteur_id uuid references users(id),
  cible_user_id uuid references users(id),
  statut text default 'ouvert' check (statut in ('ouvert','en_cours','applique','rejete','resolu','ferme')),
  priorite text default 'normale' check (priorite in ('basse','normale','haute','critique')),
  traite_par uuid references users(id),
  traite_le timestamptz,
  sanction_appliquee_id uuid,
  created_at timestamptz default now()
);

create table if not exists helpdesk_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references helpdesk_tickets(id) on delete cascade,
  auteur_id uuid references users(id),
  contenu text not null,
  interne boolean default false,
  created_at timestamptz default now()
);

create table if not exists sanctions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  type text check (type in ('avertissement','blame','suspension')),
  raison text not null,
  duree_jours int,
  createur_id uuid references users(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Formateurs
create table if not exists recrutements (
  id uuid primary key default uuid_generate_v4(),
  candidat_nom text not null,
  candidat_discord text,
  candidat_user_id uuid references users(id),
  formateur_id uuid references users(id),
  assistants jsonb default '[]'::jsonb,
  date_rc timestamptz,
  lieu text,
  statut text default 'planifie' check (statut in ('planifie','en_cours','termine','annule')),
  notes text,
  createur_id uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists rc_resultats (
  id uuid primary key default uuid_generate_v4(),
  recrutement_id uuid references recrutements(id) on delete cascade,
  candidat_nom text,
  date_rc timestamptz,
  formateur_id uuid references users(id),
  assistants jsonb default '[]'::jsonb,
  tir_note numeric(4,2),
  conduite_note numeric(4,2),
  procedure_note numeric(4,2),
  comportement_note numeric(4,2),
  note_globale numeric(4,2),
  points_forts text,
  points_faibles text,
  observations text,
  resultat text check (resultat in ('admis','refuse','a_repasser')),
  redacteur_id uuid references users(id),
  created_at timestamptz default now()
);

create sequence if not exists attestations_seq start 1;
create table if not exists attestations (
  id uuid primary key default uuid_generate_v4(),
  numero text unique default ('ATT-' || lpad(nextval('attestations_seq')::text, 5, '0')),
  beneficiaire_id uuid references users(id),
  type text check (type in ('formation','competence','autorisation','distinction')),
  objet text,
  description text,
  valide_du date,
  valide_jusqu date,
  emetteur_id uuid references users(id),
  signature text,
  created_at timestamptz default now()
);

-- CRASH
create table if not exists investigations (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  description text,
  responsable_id uuid references users(id),
  statut text default 'ouverte' check (statut in ('ouverte','en_cours','cloturee')),
  created_at timestamptz default now()
);

-- Annonces
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  type text check (type in ('communique','promotion','info')),
  titre text not null,
  contenu text,
  auteur_id uuid references users(id),
  cible_user_id uuid references users(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Trigger : annonce auto sur changement de rang
create or replace function tg_promotion_announcement()
returns trigger language plpgsql as $$
begin
  if new.rank_level <> old.rank_level then
    insert into announcements (type, titre, contenu, cible_user_id, metadata)
    values (
      'promotion',
      'Promotion : ' || coalesce(new.surnom, new.username),
      coalesce(new.surnom, new.username) || ' passe au rang ' ||
        (select nom from ranks where level = new.rank_level),
      new.id,
      jsonb_build_object('ancien_rang', old.rank_level, 'nouveau_rang', new.rank_level)
    );
  end if;
  return new;
end$$;

drop trigger if exists trg_promotion_announcement on users;
create trigger trg_promotion_announcement
  after update of rank_level on users
  for each row execute function tg_promotion_announcement();

-- Archives
create table if not exists archives (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  username_final text,
  rank_final int,
  date_depart timestamptz default now(),
  raison text check (raison in ('demission','exclusion','inactivite','autre')),
  notes text
);

create table if not exists archive_records (
  id uuid primary key default uuid_generate_v4(),
  archive_id uuid references archives(id) on delete cascade,
  type text,
  contenu jsonb default '{}'::jsonb,
  date_evenement timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  categorie text,
  url text,
  auteur_id uuid references users(id),
  created_at timestamptz default now()
);

-- ─── STORAGE BUCKETS ───
insert into storage.buckets (id, name, public)
values
  ('avatars','avatars', true),
  ('documents-prives','documents-prives', false),
  ('rapports','rapports', false)
on conflict (id) do nothing;

-- ─── RLS ───
alter table users enable row level security;
alter table user_badges enable row level security;
alter table user_permissions enable row level security;
alter table rank_history enable row level security;
alter table training_sessions enable row level security;
alter table training_registrations enable row level security;
alter table training_attendance enable row level security;
alter table reports enable row level security;
alter table report_templates enable row level security;
alter table helpdesk_tickets enable row level security;
alter table helpdesk_messages enable row level security;
alter table sanctions enable row level security;
alter table recrutements enable row level security;
alter table rc_resultats enable row level security;
alter table attestations enable row level security;
alter table investigations enable row level security;
alter table announcements enable row level security;
alter table archives enable row level security;
alter table archive_records enable row level security;
alter table documents enable row level security;
alter table badges enable row level security;
alter table ranks enable row level security;

-- Helper fn: rang du JWT courant
create or replace function jwt_rank() returns int language sql stable as $$
  select coalesce((auth.jwt() ->> 'rank_level')::int, 0);
$$;
create or replace function jwt_user_id() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'user_id','')::uuid;
$$;

-- Lecture publique pour les référentiels
create policy "ranks read all" on ranks for select using (true);
create policy "badges read all" on badges for select using (true);
create policy "templates read all" on report_templates for select using (true);

-- Users
create policy "users read all authenticated" on users for select using (auth.role() = 'authenticated');
create policy "users update self" on users for update using (id = jwt_user_id());
create policy "users update colead+" on users for update using (jwt_rank() >= 7);

-- user_badges : lecture op-second+, écriture op-second+
create policy "user_badges read" on user_badges for select using (jwt_rank() >= 5 or user_id = jwt_user_id());
create policy "user_badges write" on user_badges for insert with check (jwt_rank() >= 5);
create policy "user_badges revoke" on user_badges for update using (jwt_rank() >= 5);

-- user_permissions : Shériff ou dev
create policy "perms read self" on user_permissions for select using (user_id = jwt_user_id() or jwt_rank() >= 9);
create policy "perms write" on user_permissions for all using (jwt_rank() >= 9);

create policy "rank_history read" on rank_history for select using (jwt_rank() >= 6 or user_id = jwt_user_id());
create policy "rank_history write" on rank_history for insert with check (true);

-- Training
create policy "training read auth" on training_sessions for select using (auth.role() = 'authenticated');
create policy "training write formateur+" on training_sessions for all using (jwt_rank() >= 4);
create policy "training_reg self" on training_registrations for all using (user_id = jwt_user_id() or jwt_rank() >= 5);
create policy "training_att read" on training_attendance for select using (auth.role() = 'authenticated');
create policy "training_att write" on training_attendance for all using (jwt_rank() >= 5);

-- Reports
create policy "reports read self/staff" on reports for select using (auteur_id = jwt_user_id() or publie = true or jwt_rank() >= 5);
create policy "reports write self" on reports for insert with check (auteur_id = jwt_user_id());
create policy "reports update self" on reports for update using (auteur_id = jwt_user_id() or jwt_rank() >= 5);

-- Helpdesk
create policy "tickets read" on helpdesk_tickets for select using (auteur_id = jwt_user_id() or cible_user_id = jwt_user_id() or jwt_rank() >= 5);
create policy "tickets write" on helpdesk_tickets for insert with check (jwt_rank() >= 5);
create policy "tickets update" on helpdesk_tickets for update using (jwt_rank() >= 7 or auteur_id = jwt_user_id());

create policy "msgs read" on helpdesk_messages for select using (
  (interne = false or jwt_rank() >= 5) and exists (
    select 1 from helpdesk_tickets t where t.id = ticket_id and (t.auteur_id = jwt_user_id() or t.cible_user_id = jwt_user_id() or jwt_rank() >= 5)
  )
);
create policy "msgs write" on helpdesk_messages for insert with check (auth.role() = 'authenticated');

create policy "sanctions read" on sanctions for select using (user_id = jwt_user_id() or jwt_rank() >= 5);
create policy "sanctions write" on sanctions for insert with check (jwt_rank() >= 7);

-- Formateurs
create policy "recrutements all" on recrutements for all using (jwt_rank() >= 4);
create policy "rc_resultats all" on rc_resultats for all using (jwt_rank() >= 4);
create policy "attestations read" on attestations for select using (auth.role() = 'authenticated');
create policy "attestations write" on attestations for insert with check (jwt_rank() >= 7);

-- CRASH
create policy "invest read" on investigations for select using (jwt_rank() >= 7);
create policy "invest write" on investigations for all using (jwt_rank() >= 7);

-- Announcements
create policy "ann read all" on announcements for select using (auth.role() = 'authenticated');
create policy "ann write" on announcements for insert with check (jwt_rank() >= 5);

-- Archives
create policy "archives read op+" on archives for select using (jwt_rank() >= 6);
create policy "archives write colead+" on archives for all using (jwt_rank() >= 7);
create policy "archive_rec read" on archive_records for select using (jwt_rank() >= 6);
create policy "archive_rec write" on archive_records for all using (jwt_rank() >= 7);
create policy "documents read" on documents for select using (auth.role() = 'authenticated');
create policy "documents write" on documents for all using (jwt_rank() >= 5);

-- ─── STORAGE POLICIES ───
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars auth write" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars owner update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "docs-prives owner read" on storage.objects for select using (bucket_id = 'documents-prives' and (auth.uid()::text = (storage.foldername(name))[1] or coalesce((auth.jwt() ->> 'rank_level')::int,0) >= 7));
create policy "docs-prives owner write" on storage.objects for insert with check (bucket_id = 'documents-prives' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "rapports auth read" on storage.objects for select using (bucket_id = 'rapports' and auth.role() = 'authenticated');
create policy "rapports auth write" on storage.objects for insert with check (bucket_id = 'rapports' and auth.role() = 'authenticated');
