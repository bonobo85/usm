-- ============================================================
-- PORTAIL USM — SCHÉMA DE BASE DE DONNÉES
-- À exécuter dans Supabase SQL Editor (SQL > New query)
-- ============================================================
-- ⚠️ Pour repartir de zéro, exécuter d'abord :
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_grade as enum (
  'sheriff', 'leader', 'co_leader',
  'operator', 'operator_second', 'usm', 'usm_test'
);

create type disciplinary_type as enum (
  'reminder', 'warning', 'blame', 'sanction', 'exclusion'
);

create type disciplinary_status as enum (
  'pending', 'applied', 'rejected', 'contested'
);

create type application_status as enum (
  'pending', 'in_review', 'accepted', 'rejected'
);

create type announcement_type as enum ('public', 'internal');

create type ticket_status as enum ('open', 'in_progress', 'closed');

create type ticket_category as enum ('technical', 'hr', 'sanction', 'other');

-- ============================================================
-- TABLE: agents
-- ============================================================
create table public.agents (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  discord_username text,
  discord_avatar_url text,

  matricule text unique,
  matricule_status text default 'pending' check (matricule_status in ('pending', 'validated', 'rejected')),
  pseudo_rp text,
  photo_url text,
  bio text,
  date_recruitment date,
  specialties text[] default '{}',

  grade user_grade default 'usm_test',
  is_formateur boolean default false,
  is_admin boolean default false,
  -- Si true, le grade est géré manuellement et ne sera PAS écrasé par le resync Discord
  grade_locked boolean default false,

  custom_permissions jsonb default '{"granted": [], "revoked": []}'::jsonb,

  is_active boolean default true,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_agents_discord_id on public.agents(discord_id);
create index idx_agents_grade on public.agents(grade);
create index idx_agents_matricule on public.agents(matricule);

-- ============================================================
-- TABLE: permissions (catalogue)
-- ============================================================
create table public.permissions (
  key text primary key,
  label text not null,
  description text,
  category text
);

insert into public.permissions (key, label, description, category) values
  ('create_announcement', 'Publier annonce publique', 'Publier une annonce visible par tous les USM', 'communication'),
  ('create_internal_post', 'Publier communiqué interne', 'Publier un communiqué interne', 'communication'),
  ('request_sanction', 'Demander une sanction', 'Soumettre une demande de sanction', 'discipline'),
  ('apply_sanction', 'Appliquer une sanction', 'Valider et appliquer une sanction', 'discipline'),
  ('validate_training', 'Valider une formation', 'Valider une formation pour un agent', 'training'),
  ('create_training', 'Créer une formation', 'Ajouter une nouvelle formation au catalogue', 'training'),
  ('validate_application', 'Valider une candidature', 'Accepter ou refuser une candidature', 'recruitment'),
  ('view_archives', 'Accéder aux archives', 'Consulter les archives', 'admin'),
  ('issue_certificate', 'Délivrer une attestation', 'Émettre une attestation officielle', 'documents'),
  ('manage_users', 'Gérer les utilisateurs', 'Désactiver / supprimer des comptes', 'admin'),
  ('manage_permissions', 'Gérer les permissions', 'Modifier la matrice de permissions', 'admin'),
  ('view_logs', 'Voir les logs système', 'Accès aux audit logs', 'admin');

-- ============================================================
-- TABLE: role_permissions
-- ============================================================
create table public.role_permissions (
  grade user_grade not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (grade, permission_key)
);

insert into public.role_permissions (grade, permission_key) values
  ('sheriff', 'create_announcement'), ('sheriff', 'create_internal_post'),
  ('sheriff', 'request_sanction'), ('sheriff', 'apply_sanction'),
  ('sheriff', 'validate_training'),
  ('sheriff', 'create_training'), ('sheriff', 'validate_application'),
  ('sheriff', 'view_archives'), ('sheriff', 'issue_certificate'),

  ('leader', 'create_announcement'), ('leader', 'create_internal_post'),
  ('leader', 'request_sanction'), ('leader', 'apply_sanction'),
  ('leader', 'validate_training'),
  ('leader', 'create_training'), ('leader', 'validate_application'),
  ('leader', 'view_archives'), ('leader', 'issue_certificate'),

  ('co_leader', 'create_announcement'), ('co_leader', 'create_internal_post'),
  ('co_leader', 'request_sanction'), ('co_leader', 'apply_sanction'),
  ('co_leader', 'validate_training'),
  ('co_leader', 'create_training'),
  ('co_leader', 'validate_application'), ('co_leader', 'view_archives'),
  ('co_leader', 'issue_certificate'),

  ('operator', 'create_internal_post'), ('operator', 'request_sanction'),
  ('operator', 'validate_training'),

  ('operator_second', 'create_internal_post'), ('operator_second', 'request_sanction'),

  ('usm', 'request_sanction'),
  ('usm_test', 'request_sanction');

-- ============================================================
-- AUTRES TABLES
-- ============================================================

create table public.announcements (
  id uuid primary key default uuid_generate_v4(),
  type announcement_type not null,
  title text not null,
  content text not null,
  author_id uuid references public.agents(id) on delete set null,
  discord_reposted boolean default false,
  is_pinned boolean default false,
  published_at timestamptz default now(),
  created_at timestamptz default now()
);
create index idx_announcements_type on public.announcements(type);
create index idx_announcements_published on public.announcements(published_at desc);

create table public.applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  discord_id text,
  discord_username text,
  form_data jsonb not null,
  status application_status default 'pending',
  reviewed_by uuid references public.agents(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz default now()
);
create index idx_applications_status on public.applications(status);

create table public.disciplinary_records (
  id uuid primary key default uuid_generate_v4(),
  target_agent_id uuid references public.agents(id) on delete cascade not null,
  type disciplinary_type not null,
  reason text not null,
  evidence_urls text[] default '{}',
  requested_by uuid references public.agents(id) on delete set null,
  applied_by uuid references public.agents(id) on delete set null,
  status disciplinary_status default 'pending',
  application_notes text,
  created_at timestamptz default now(),
  applied_at timestamptz
);
create index idx_disc_target on public.disciplinary_records(target_agent_id);
create index idx_disc_status on public.disciplinary_records(status);

create table public.trainings (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  badge_icon text default '★',
  badge_image_url text,
  required_validator_grade user_grade default 'operator',
  required_grade user_grade default 'usm_test',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.agent_trainings (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references public.agents(id) on delete cascade not null,
  training_id uuid references public.trainings(id) on delete cascade not null,
  validated_by uuid references public.agents(id) on delete set null,
  validated_at timestamptz default now(),
  notes text,
  unique (agent_id, training_id)
);
create index idx_agent_trainings_agent on public.agent_trainings(agent_id);

create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  opened_by uuid references public.agents(id) on delete cascade not null,
  category ticket_category not null,
  subject text not null,
  status ticket_status default 'open',
  assigned_to uuid references public.agents(id) on delete set null,
  related_record_id uuid,
  created_at timestamptz default now(),
  closed_at timestamptz
);
create index idx_tickets_status on public.tickets(status);
create index idx_tickets_opener on public.tickets(opened_by);

create table public.ticket_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  author_id uuid references public.agents(id) on delete set null,
  content text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index idx_ticket_messages_ticket on public.ticket_messages(ticket_id, created_at);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  content text,
  link_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.agents(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);
create index idx_audit_logs_actor on public.audit_logs(actor_id, created_at desc);
create index idx_audit_logs_action on public.audit_logs(action, created_at desc);

-- ============================================================
-- TABLE: application_form_questions (questions du formulaire dynamique)
-- ============================================================
create type question_status as enum ('pending', 'approved', 'rejected', 'archived');
create type question_type as enum ('text', 'textarea', 'number', 'select');

create table public.application_form_questions (
  id uuid primary key default uuid_generate_v4(),
  field_key text not null unique,
  label text not null,
  description text,
  type question_type not null default 'text',
  options jsonb default '[]'::jsonb,
  required boolean default true,
  position int not null default 0,
  status question_status not null default 'pending',
  proposed_by uuid references public.agents(id) on delete set null,
  approved_by uuid references public.agents(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_form_questions_status on public.application_form_questions(status, position);
-- Le trigger updated_at est créé plus bas, après définition de handle_updated_at

-- ============================================================
-- TABLE: certificates (attestations délivrées)
-- ============================================================
create type certificate_type as enum ('recruitment', 'formation', 'badge_removal', 'dismissal');

create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  ref_number text unique,                          -- ex: USM-CERT-2026-0001
  type certificate_type not null,
  is_crash boolean default false,                  -- variante CRASH (bandeau bleu)
  agent_id uuid references public.agents(id) on delete cascade not null,  -- agent concerné
  issued_by uuid references public.agents(id) on delete set null,         -- signataire (Co-leader+)
  -- Snapshot des données au moment de la délivrance (pour rester figé même si le profil change)
  data jsonb not null default '{}'::jsonb,
  /* data contient selon le type :
     - signer_name, signer_grade, signer_location, signer_email, signer_post
     - agent_name, agent_grade
     - evaluator_name (formateur)
     - probation_duration (recrutement)
     - training_name (formation)
     - badge_name, removal_reason (retrait)
     - departure_type, departure_reason (démission/licenciement)
     - city, custom_text
  */
  issued_at timestamptz default now(),
  created_at timestamptz default now()
);
create index idx_certificates_agent on public.certificates(agent_id, issued_at desc);
create index idx_certificates_type on public.certificates(type, issued_at desc);

-- Génération auto du numéro de référence : USM-CERT-{année}-{séquence}
create sequence if not exists public.certificate_seq;

create or replace function public.set_certificate_ref()
returns trigger as $$
begin
  if new.ref_number is null then
    new.ref_number := 'USM-CERT-' || to_char(now(), 'YYYY') || '-' ||
                      lpad(nextval('public.certificate_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger certificates_set_ref before insert on public.certificates
  for each row execute function public.set_certificate_ref();

-- ============================================================
-- FONCTIONS UTILITAIRES (SECURITY DEFINER pour éviter récursion RLS)
-- ============================================================

-- is_admin : check si l'utilisateur est admin (BYPASS RLS)
create or replace function public.is_admin(p_user_id uuid)
returns boolean as $$
declare v_admin boolean;
begin
  select is_admin into v_admin from public.agents where id = p_user_id;
  return coalesce(v_admin, false);
end;
$$ language plpgsql security definer stable;

-- is_formateur : check si l'utilisateur est formateur (BYPASS RLS)
create or replace function public.is_formateur(p_user_id uuid)
returns boolean as $$
declare v_formateur boolean;
begin
  select is_formateur into v_formateur from public.agents where id = p_user_id;
  return coalesce(v_formateur, false);
end;
$$ language plpgsql security definer stable;

-- has_min_grade : check si l'utilisateur a au moins ce grade (BYPASS RLS)
create or replace function public.has_min_grade(p_user_id uuid, p_min_grade user_grade)
returns boolean as $$
declare
  v_grade user_grade;
  v_is_admin boolean;
  v_grade_order int;
  v_min_order int;
begin
  select grade, is_admin into v_grade, v_is_admin from public.agents where id = p_user_id;

  if coalesce(v_is_admin, false) then return true; end if;
  if v_grade is null then return false; end if;

  v_grade_order := case v_grade
    when 'sheriff' then 7 when 'leader' then 6 when 'co_leader' then 5
    when 'operator' then 4 when 'operator_second' then 3
    when 'usm' then 2 when 'usm_test' then 1
  end;

  v_min_order := case p_min_grade
    when 'sheriff' then 7 when 'leader' then 6 when 'co_leader' then 5
    when 'operator' then 4 when 'operator_second' then 3
    when 'usm' then 2 when 'usm_test' then 1
  end;

  return v_grade_order >= v_min_order;
end;
$$ language plpgsql security definer stable;

-- has_permission : vérifie qu'un agent a une permission donnée
create or replace function public.has_permission(p_agent_id uuid, p_permission text)
returns boolean as $$
declare
  v_grade user_grade;
  v_is_admin boolean;
  v_custom_perms jsonb;
  v_has_default boolean;
begin
  select grade, is_admin, custom_permissions
  into v_grade, v_is_admin, v_custom_perms
  from public.agents
  where id = p_agent_id;

  if coalesce(v_is_admin, false) then return true; end if;
  if v_custom_perms->'revoked' ? p_permission then return false; end if;
  if v_custom_perms->'granted' ? p_permission then return true; end if;

  select exists(
    select 1 from public.role_permissions
    where grade = v_grade and permission_key = p_permission
  ) into v_has_default;

  return coalesce(v_has_default, false);
end;
$$ language plpgsql security definer stable;

-- Trigger updated_at automatique
create or replace function public.handle_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger agents_updated_at before update on public.agents
  for each row execute function public.handle_updated_at();

create trigger application_form_questions_updated_at before update on public.application_form_questions
  for each row execute function public.handle_updated_at();

-- ⚠️ SÉCURITÉ : empêche un user de modifier ses champs sensibles via la policy "update_self"
-- (grade, is_admin, is_formateur, matricule_status, custom_permissions, discord_id)
-- Seuls les admins (qui passent par la policy "admin_all" qui bypass cette protection) peuvent modifier ces champs.
create or replace function public.prevent_self_privilege_escalation()
returns trigger as $$
begin
  -- Si le user qui fait l'UPDATE est l'agent lui-même ET qu'il n'est pas admin
  -- (on check is_admin sur l'OLD row pour éviter qu'il s'auto-promote)
  if auth.uid() = old.id and not coalesce(public.is_admin(auth.uid()), false) then
    -- Force les champs sensibles à rester inchangés
    new.grade := old.grade;
    new.is_admin := old.is_admin;
    new.is_formateur := old.is_formateur;
    new.matricule_status := old.matricule_status;
    new.custom_permissions := old.custom_permissions;
    new.discord_id := old.discord_id;
    new.grade_locked := old.grade_locked;
    new.date_recruitment := old.date_recruitment;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger agents_prevent_escalation
  before update on public.agents
  for each row execute function public.prevent_self_privilege_escalation();

-- ============================================================
-- TRIGGERS : création agent + casier auto + date_recruitment
-- ============================================================

-- Auto-fill date_recruitment à la création
create or replace function public.set_recruitment_date()
returns trigger as $$
begin
  if new.date_recruitment is null then new.date_recruitment := current_date; end if;
  return new;
end;
$$ language plpgsql;

create trigger agents_set_recruitment_date
  before insert on public.agents
  for each row execute function public.set_recruitment_date();

-- Trigger d'inscription Discord : crée automatiquement l'agent
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.agents (
    id, discord_id, discord_username, discord_avatar_url, last_login, is_active
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'provider_id',
      new.raw_user_meta_data->>'sub',
      new.raw_user_meta_data->>'discord_id'
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      new.email
    ),
    new.raw_user_meta_data->>'avatar_url',
    now(),
    true
  )
  on conflict (id) do update set
    discord_username = coalesce(excluded.discord_username, public.agents.discord_username),
    discord_avatar_url = coalesce(excluded.discord_avatar_url, public.agents.discord_avatar_url),
    last_login = now();
  return new;
exception when others then
  raise warning 'handle_new_user error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGERS DE NOTIFICATIONS + AUDIT LOGS AUTOMATIQUES
-- ============================================================

-- Helper : crée une notification pour un user
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_content text default null,
  p_link_url text default null
) returns void as $$
begin
  insert into public.notifications (user_id, type, title, content, link_url)
  values (p_user_id, p_type, p_title, p_content, p_link_url);
end;
$$ language plpgsql security definer;

-- Helper : log une action dans audit_logs
create or replace function public.audit_log(
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (v_actor_id, p_action, p_target_type, p_target_id, p_metadata);
end;
$$ language plpgsql security definer;

-- === Sanctions : notif au target quand status change ===
create or replace function public.notify_on_disciplinary_change()
returns trigger as $$
declare
  v_actor_name text;
begin
  -- Nouvelle sanction demandée
  if tg_op = 'INSERT' then
    select coalesce(pseudo_rp, discord_username, 'Quelqu''un') into v_actor_name
    from public.agents where id = new.requested_by;

    perform public.create_notification(
      new.target_agent_id,
      'disciplinary_request',
      'Sanction demandée contre toi',
      v_actor_name || ' a demandé une sanction (' || new.type::text || '). En attente de validation.',
      '/disciplinary'
    );

    perform public.audit_log(
      'disciplinary_request',
      'disciplinary',
      new.id::text,
      jsonb_build_object('type', new.type, 'target', new.target_agent_id)
    );

  -- Status change (applied / rejected)
  elsif tg_op = 'UPDATE' and old.status != new.status then
    if new.status = 'applied' then
      perform public.create_notification(
        new.target_agent_id,
        'disciplinary_applied',
        'Sanction appliquée',
        'Une sanction (' || new.type::text || ') a été appliquée. Motif : ' || left(coalesce(new.reason, ''), 100),
        '/disciplinary'
      );
      perform public.audit_log('disciplinary_apply', 'disciplinary', new.id::text);
    elsif new.status = 'rejected' then
      perform public.create_notification(
        new.target_agent_id,
        'disciplinary_rejected',
        'Demande de sanction rejetée',
        'La demande de sanction te concernant a été rejetée.',
        '/disciplinary'
      );
      perform public.audit_log('disciplinary_reject', 'disciplinary', new.id::text);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger disciplinary_notify
  after insert or update on public.disciplinary_records
  for each row execute function public.notify_on_disciplinary_change();

-- === Candidatures : notif au candidat quand decided ===
create or replace function public.notify_on_application_change()
returns trigger as $$
begin
  if tg_op = 'UPDATE' and old.status != new.status and new.user_id is not null then
    if new.status = 'accepted' then
      perform public.create_notification(
        new.user_id,
        'application_accepted',
        'Candidature acceptée !',
        'Bienvenue dans les USM. Tu peux désormais accéder au portail.',
        '/dashboard'
      );
      perform public.audit_log('application_accept', 'application', new.id::text);
    elsif new.status = 'rejected' then
      perform public.create_notification(
        new.user_id,
        'application_rejected',
        'Candidature refusée',
        coalesce('Motif : ' || left(new.review_notes, 150), 'Pas de raison fournie.'),
        null
      );
      perform public.audit_log('application_reject', 'application', new.id::text);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger application_notify
  after update on public.applications
  for each row execute function public.notify_on_application_change();

-- === Badges : notif quand un agent reçoit un badge ===
create or replace function public.notify_on_training_validated()
returns trigger as $$
declare
  v_training_name text;
  v_validator_name text;
begin
  select name into v_training_name from public.trainings where id = new.training_id;
  select coalesce(pseudo_rp, discord_username, 'Un formateur') into v_validator_name
  from public.agents where id = new.validated_by;

  perform public.create_notification(
    new.agent_id,
    'badge_validated',
    'Nouveau badge obtenu',
    v_validator_name || ' t''a validé la formation : ' || coalesce(v_training_name, 'Inconnue'),
    '/trainings'
  );
  perform public.audit_log(
    'training_validate',
    'agent_training',
    new.id::text,
    jsonb_build_object('agent', new.agent_id, 'training', new.training_id)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger training_notify
  after insert on public.agent_trainings
  for each row execute function public.notify_on_training_validated();

-- === Attestations : notif à l'agent + audit log ===
create or replace function public.notify_on_certificate()
returns trigger as $$
declare
  v_type_label text;
begin
  v_type_label := case new.type
    when 'recruitment' then 'recrutement'
    when 'formation' then 'formation'
    when 'badge_removal' then 'retrait de badge'
    when 'dismissal' then 'fin de service'
    else new.type::text
  end;

  perform public.create_notification(
    new.agent_id,
    'certificate',
    'Nouvelle attestation délivrée',
    'Une attestation de ' || v_type_label || ' a été ajoutée à ton dossier (' || coalesce(new.ref_number, '—') || ').',
    '/roster/' || new.agent_id::text
  );

  perform public.audit_log(
    'certificate_issue',
    'certificate',
    new.id::text,
    jsonb_build_object('type', new.type, 'agent', new.agent_id, 'ref', new.ref_number)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger certificates_notify
  after insert on public.certificates
  for each row execute function public.notify_on_certificate();

-- === Tickets : notif quand assigné ou réponse ===
create or replace function public.notify_on_ticket_change()
returns trigger as $$
declare
  v_opener_name text;
begin
  if tg_op = 'UPDATE' then
    -- Nouvelle assignation
    if new.assigned_to is not null and (old.assigned_to is null or old.assigned_to != new.assigned_to)
       and new.assigned_to != coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.create_notification(
        new.assigned_to,
        'ticket_assigned',
        'Ticket assigné',
        'Tu as été assigné(e) au ticket : ' || left(new.subject, 80),
        '/tickets/' || new.id::text
      );
    end if;

    -- Clôture
    if new.status = 'closed' and old.status != 'closed' and new.opened_by != coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.create_notification(
        new.opened_by,
        'ticket_closed',
        'Ton ticket a été clôturé',
        left(new.subject, 80),
        '/tickets/' || new.id::text
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger tickets_notify
  after update on public.tickets
  for each row execute function public.notify_on_ticket_change();

-- === Ticket messages : notif aux autres parties du ticket ===
create or replace function public.notify_on_ticket_message()
returns trigger as $$
declare
  v_ticket public.tickets%rowtype;
  v_author_name text;
begin
  select * into v_ticket from public.tickets where id = new.ticket_id;
  if not found then return new; end if;

  select coalesce(pseudo_rp, discord_username, 'Quelqu''un') into v_author_name
  from public.agents where id = new.author_id;

  -- Notif à l'opener (si pas lui qui répond)
  if v_ticket.opened_by != new.author_id then
    perform public.create_notification(
      v_ticket.opened_by,
      'ticket_reply',
      'Nouvelle réponse sur ton ticket',
      v_author_name || ' : ' || left(new.content, 80),
      '/tickets/' || v_ticket.id::text
    );
  end if;

  -- Notif à l'assigné (si pas lui qui répond et différent de l'opener)
  if v_ticket.assigned_to is not null
     and v_ticket.assigned_to != new.author_id
     and v_ticket.assigned_to != v_ticket.opened_by then
    perform public.create_notification(
      v_ticket.assigned_to,
      'ticket_reply',
      'Nouvelle réponse sur un ticket',
      v_author_name || ' : ' || left(new.content, 80),
      '/tickets/' || v_ticket.id::text
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger ticket_messages_notify
  after insert on public.ticket_messages
  for each row execute function public.notify_on_ticket_message();

-- === Annonces : notif à tous les USM actifs quand publication ===
create or replace function public.notify_on_announcement()
returns trigger as $$
declare
  v_author_name text;
begin
  select coalesce(pseudo_rp, discord_username, 'Quelqu''un') into v_author_name
  from public.agents where id = new.author_id;

  -- Notif à tous les agents actifs sauf l'auteur
  insert into public.notifications (user_id, type, title, content, link_url)
  select
    a.id,
    'announcement',
    case when new.type = 'public' then 'Nouvelle annonce' else 'Communiqué interne' end,
    v_author_name || ' : ' || left(new.title, 80),
    '/announcements'
  from public.agents a
  where a.is_active = true and a.id != new.author_id;

  perform public.audit_log(
    'announcement_create',
    'announcement',
    new.id::text,
    jsonb_build_object('type', new.type, 'title', new.title)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger announcements_notify
  after insert on public.announcements
  for each row execute function public.notify_on_announcement();

-- === Audit log : promotions / changements de grade ===
create or replace function public.audit_agent_changes()
returns trigger as $$
begin
  if tg_op = 'UPDATE' and old.grade != new.grade then
    perform public.audit_log(
      'grade_change',
      'agent',
      new.id::text,
      jsonb_build_object('from', old.grade, 'to', new.grade)
    );
    -- Notif à l'agent concerné
    perform public.create_notification(
      new.id,
      'grade_change',
      'Ton grade a été modifié',
      'Nouveau grade : ' || new.grade::text,
      '/roster/' || new.id::text
    );
  end if;
  if tg_op = 'UPDATE' and old.is_admin != new.is_admin then
    perform public.audit_log(
      'admin_toggle',
      'agent',
      new.id::text,
      jsonb_build_object('is_admin', new.is_admin)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger agents_audit
  after update on public.agents
  for each row execute function public.audit_agent_changes();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.agents enable row level security;
alter table public.announcements enable row level security;
alter table public.applications enable row level security;
alter table public.disciplinary_records enable row level security;
alter table public.trainings enable row level security;
alter table public.agent_trainings enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.application_form_questions enable row level security;
alter table public.certificates enable row level security;

-- ===== POLICIES: agents =====
create policy "agents_select_all" on public.agents for select
  using (auth.uid() is not null);

create policy "agents_update_self" on public.agents for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "agents_admin_all" on public.agents for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ===== POLICIES: announcements =====
create policy "announcements_select" on public.announcements for select
  using (auth.uid() is not null);

create policy "announcements_insert" on public.announcements for insert
  with check (
    (type = 'public' and public.has_permission(auth.uid(), 'create_announcement'))
    or (type = 'internal' and public.has_permission(auth.uid(), 'create_internal_post'))
  );

create policy "announcements_update_owner" on public.announcements for update
  using (author_id = auth.uid() or public.is_admin(auth.uid()));

create policy "announcements_delete" on public.announcements for delete
  using (author_id = auth.uid() or public.is_admin(auth.uid()));

-- ===== POLICIES: applications =====
create policy "applications_select_validators" on public.applications for select
  using (public.has_permission(auth.uid(), 'validate_application'));

create policy "applications_select_self" on public.applications for select
  using (user_id = auth.uid());

create policy "applications_insert" on public.applications for insert
  with check (auth.uid() is not null);

create policy "applications_update_validators" on public.applications for update
  using (public.has_permission(auth.uid(), 'validate_application'));

-- ===== POLICIES: disciplinary_records =====
create policy "disc_select_all" on public.disciplinary_records for select
  using (auth.uid() is not null);

create policy "disc_insert" on public.disciplinary_records for insert
  with check (public.has_permission(auth.uid(), 'request_sanction'));

create policy "disc_update" on public.disciplinary_records for update
  using (public.has_permission(auth.uid(), 'apply_sanction'));

create policy "disc_delete_admin" on public.disciplinary_records for delete
  using (public.is_admin(auth.uid()));

-- ===== POLICIES: trainings =====
create policy "trainings_select" on public.trainings for select using (auth.uid() is not null);

create policy "trainings_insert" on public.trainings for insert
  with check (public.has_permission(auth.uid(), 'create_training'));

create policy "trainings_update" on public.trainings for update
  using (public.has_permission(auth.uid(), 'create_training'));

create policy "trainings_delete" on public.trainings for delete
  using (public.has_permission(auth.uid(), 'create_training'));

-- ===== POLICIES: agent_trainings (formateurs autorisés en plus) =====
create policy "agent_trainings_select" on public.agent_trainings for select
  using (auth.uid() is not null);

create policy "agent_trainings_insert" on public.agent_trainings for insert
  with check (
    public.has_permission(auth.uid(), 'validate_training')
    or public.is_formateur(auth.uid())
  );

create policy "agent_trainings_delete" on public.agent_trainings for delete
  using (
    public.has_permission(auth.uid(), 'validate_training')
    or public.is_formateur(auth.uid())
  );

-- ===== POLICIES: tickets (utilise has_min_grade pour éviter récursion) =====
create policy "tickets_select_own" on public.tickets for select
  using (opened_by = auth.uid() or assigned_to = auth.uid());

create policy "tickets_select_coleader" on public.tickets for select
  using (public.has_min_grade(auth.uid(), 'co_leader'));

create policy "tickets_insert" on public.tickets for insert
  with check (opened_by = auth.uid());

create policy "tickets_update" on public.tickets for update
  using (
    opened_by = auth.uid()
    or assigned_to = auth.uid()
    or public.has_min_grade(auth.uid(), 'co_leader')
  );

-- ===== POLICIES: ticket_messages =====
create policy "ticket_messages_select" on public.ticket_messages for select
  using (
    ticket_id in (
      select id from public.tickets
      where opened_by = auth.uid()
        or assigned_to = auth.uid()
        or public.has_min_grade(auth.uid(), 'co_leader')
    )
  );

create policy "ticket_messages_insert" on public.ticket_messages for insert
  with check (author_id = auth.uid());

-- ===== POLICIES: notifications =====
create policy "notifications_select" on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update" on public.notifications for update
  using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications for insert
  with check (true);

-- ===== POLICIES: audit_logs =====
create policy "audit_logs_select" on public.audit_logs for select
  using (public.has_min_grade(auth.uid(), 'co_leader'));

create policy "audit_logs_insert" on public.audit_logs for insert
  with check (auth.uid() is not null);

-- ===== POLICIES: permissions / role_permissions =====
create policy "permissions_select" on public.permissions for select
  using (auth.uid() is not null);

create policy "role_permissions_select" on public.role_permissions for select
  using (auth.uid() is not null);

create policy "role_permissions_admin" on public.role_permissions for all
  using (public.is_admin(auth.uid()));

-- ===== POLICIES: application_form_questions =====
-- Tout user authentifié peut lire les questions APPROUVÉES (pour le formulaire /apply)
create policy "form_questions_select_approved" on public.application_form_questions for select
  using (status = 'approved' and auth.uid() is not null);

-- Co-leader+ voit toutes les questions (pour gérer)
create policy "form_questions_select_coleader" on public.application_form_questions for select
  using (public.has_min_grade(auth.uid(), 'co_leader'));

-- Formateurs proposent (status = pending par défaut)
create policy "form_questions_insert_formateur" on public.application_form_questions for insert
  with check (public.is_formateur(auth.uid()) or public.has_min_grade(auth.uid(), 'co_leader'));

-- Co-leader+ approuve / refuse / modifie
create policy "form_questions_update_coleader" on public.application_form_questions for update
  using (public.has_min_grade(auth.uid(), 'co_leader'));

-- Co-leader+ supprime
create policy "form_questions_delete_coleader" on public.application_form_questions for delete
  using (public.has_min_grade(auth.uid(), 'co_leader'));

-- ===== POLICIES: certificates =====
-- L'agent voit ses propres attestations
create policy "certificates_select_own" on public.certificates for select
  using (agent_id = auth.uid());

-- Operator+ voit toutes les attestations (pour la consultation roster/archives)
create policy "certificates_select_staff" on public.certificates for select
  using (public.has_min_grade(auth.uid(), 'operator'));

-- Co-leader+ délivre des attestations
create policy "certificates_insert_coleader" on public.certificates for insert
  with check (public.has_min_grade(auth.uid(), 'co_leader'));

-- Co-leader+ modifie (corriger une erreur)
create policy "certificates_update_coleader" on public.certificates for update
  using (public.has_min_grade(auth.uid(), 'co_leader'));

-- Co-leader+ supprime
create policy "certificates_delete_coleader" on public.certificates for delete
  using (public.has_min_grade(auth.uid(), 'co_leader'));

-- ============================================================
-- STORAGE : Bucket "avatars" pour les photos de profil
-- ============================================================
-- ⚠️ À exécuter UNE SEULE FOIS (le bucket peut déjà exister)
-- Note : si tu exécutes ce script hors Supabase (test local), commenter ce bloc storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 Mo max
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Policies storage (Supabase fournit les rôles anon/authenticated automatiquement)
do $$
begin
  -- Tout le monde peut voir les avatars (bucket public)
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'avatars_select_public') then
    execute $sql$
      create policy "avatars_select_public" on storage.objects for select
        to anon, authenticated
        using (bucket_id = 'avatars')
    $sql$;
  end if;

  -- Un utilisateur peut uploader uniquement dans son propre dossier (path commence par user.id)
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'avatars_insert_own') then
    execute $sql$
      create policy "avatars_insert_own" on storage.objects for insert
        to authenticated
        with check (
          bucket_id = 'avatars'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $sql$;
  end if;

  -- Mise à jour de son propre avatar
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'avatars_update_own') then
    execute $sql$
      create policy "avatars_update_own" on storage.objects for update
        to authenticated
        using (
          bucket_id = 'avatars'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $sql$;
  end if;

  -- Suppression de son propre avatar
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'avatars_delete_own') then
    execute $sql$
      create policy "avatars_delete_own" on storage.objects for delete
        to authenticated
        using (
          bucket_id = 'avatars'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $sql$;
  end if;
exception when undefined_object then
  raise notice 'Roles anon/authenticated not found (running outside Supabase). Storage policies skipped.';
end $$;

-- ============================================================
-- STORAGE : Bucket "badges" pour les images des formations
-- ============================================================
-- Tout le monde peut VOIR les images de badges (lecture publique).
-- Seuls les agents avec la perm `create_training` peuvent UPLOAD/UPDATE/DELETE.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'badges',
  'badges',
  true,
  1048576, -- 1 Mo max
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'badges_select_public') then
    execute $sql$
      create policy "badges_select_public" on storage.objects for select
        to anon, authenticated
        using (bucket_id = 'badges')
    $sql$;
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'badges_insert_perm') then
    execute $sql$
      create policy "badges_insert_perm" on storage.objects for insert
        to authenticated
        with check (
          bucket_id = 'badges'
          and public.has_permission(auth.uid(), 'create_training')
        )
    $sql$;
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'badges_update_perm') then
    execute $sql$
      create policy "badges_update_perm" on storage.objects for update
        to authenticated
        using (
          bucket_id = 'badges'
          and public.has_permission(auth.uid(), 'create_training')
        )
    $sql$;
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'badges_delete_perm') then
    execute $sql$
      create policy "badges_delete_perm" on storage.objects for delete
        to authenticated
        using (
          bucket_id = 'badges'
          and public.has_permission(auth.uid(), 'create_training')
        )
    $sql$;
  end if;
exception when undefined_object then
  raise notice 'Roles anon/authenticated not found. Badges storage policies skipped.';
end $$;

-- ============================================================
-- DONNÉES INITIALES : formations
-- ============================================================

insert into public.trainings (name, description, badge_icon, required_validator_grade) values
  ('Formation initiale', 'Formation obligatoire à l''entrée. Couvre les bases : protocoles, RP, conduite.', '★', 'operator'),
  ('Tir tactique', 'Maîtrise du tir en situation d''intervention rapide.', '⚔', 'operator'),
  ('Intervention rapide', 'Tactiques d''entrée et sécurisation de zone.', '⚡', 'operator'),
  ('Conduite tactique', 'Pilotage en course-poursuite, conduite défensive.', '🚗', 'operator'),
  ('Protection témoin', 'Programme WITSEC. Escorte de personnalités.', '🛡', 'co_leader'),
  ('Négociation', 'Gestion de crise, prise d''otage.', '⚖', 'co_leader'),
  ('Investigation', 'Méthodes d''enquête, surveillance, interrogatoire.', '🔍', 'co_leader'),
  ('Commandement', 'Direction d''opération multi-équipes.', '⊠', 'leader');

-- ============================================================
-- DONNÉES INITIALES : questions du formulaire de recrutement (approved par défaut)
-- ============================================================
insert into public.application_form_questions (field_key, label, description, type, required, position, status) values
  ('real_age', 'Ton âge réel', 'Pour vérifier la majorité OOC', 'number', true, 1, 'approved'),
  ('rp_character', 'Nom de ton personnage RP', 'Prénom Nom RP', 'text', true, 2, 'approved'),
  ('rp_experience', 'Expérience RP', 'Depuis quand fais-tu du RP, sur quels serveurs ?', 'textarea', true, 3, 'approved'),
  ('availability', 'Disponibilités', 'Jours/heures où tu joues habituellement', 'text', true, 4, 'approved'),
  ('motivation', 'Pourquoi rejoindre les USM ?', 'Ce qui t''attire, ce que tu apportes', 'textarea', true, 5, 'approved');
