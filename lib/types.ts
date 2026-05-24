export type Grade =
  | 'sheriff'
  | 'leader'
  | 'co_leader'
  | 'operator'
  | 'operator_second'
  | 'usm'
  | 'usm_test';

export type DisciplinaryType = 'reminder' | 'warning' | 'blame' | 'sanction' | 'exclusion';
export type DisciplinaryStatus = 'pending' | 'applied' | 'rejected' | 'contested';
export type ApplicationStatus = 'pending' | 'in_review' | 'accepted' | 'rejected';
export type AnnouncementType = 'public' | 'internal';
export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketCategory = 'technical' | 'hr' | 'sanction' | 'other';

export interface Agent {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
  matricule: string | null;
  matricule_status: 'pending' | 'validated' | 'rejected';
  pseudo_rp: string | null;
  photo_url: string | null;
  bio: string | null;
  date_recruitment: string | null;
  specialties: string[];
  grade: Grade;
  is_formateur: boolean;
  is_admin: boolean;
  grade_locked?: boolean;
  custom_permissions: { granted: string[]; revoked: string[] };
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  content: string;
  author_id: string | null;
  discord_reposted: boolean;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
  author?: Pick<Agent, 'pseudo_rp' | 'matricule' | 'grade' | 'discord_avatar_url'>;
}

export interface DisciplinaryRecord {
  id: string;
  target_agent_id: string;
  type: DisciplinaryType;
  reason: string;
  evidence_urls: string[];
  requested_by: string | null;
  applied_by: string | null;
  status: DisciplinaryStatus;
  application_notes: string | null;
  created_at: string;
  applied_at: string | null;
  target?: Pick<Agent, 'pseudo_rp' | 'matricule' | 'grade'>;
  requester?: Pick<Agent, 'pseudo_rp' | 'matricule' | 'grade'>;
}

export interface Training {
  id: string;
  name: string;
  description: string | null;
  badge_icon: string;
  badge_image_url: string | null;
  required_validator_grade: Grade;
  required_grade: Grade;
  is_active: boolean;
  created_at: string;
}

export interface AgentTraining {
  id: string;
  agent_id: string;
  training_id: string;
  validated_by: string | null;
  validated_at: string;
  notes: string | null;
  training?: Training;
}

export interface Application {
  id: string;
  user_id: string;
  discord_id: string | null;
  discord_username: string | null;
  form_data: Record<string, any>;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Permission {
  key: string;
  label: string;
  description: string | null;
  category: string | null;
}

export const GRADE_LABELS: Record<Grade, string> = {
  sheriff: 'Shérif',
  leader: 'Leader USM',
  co_leader: 'Co-leader USM',
  operator: 'Opérateur USM',
  operator_second: 'Opérateur Second USM',
  usm: 'USM',
  usm_test: 'USM en test',
};

export const GRADE_ORDER: Record<Grade, number> = {
  sheriff: 7,
  leader: 6,
  co_leader: 5,
  operator: 4,
  operator_second: 3,
  usm: 2,
  usm_test: 1,
};

export const DISCIPLINARY_LABELS: Record<DisciplinaryType, string> = {
  reminder: 'Rappel',
  warning: 'Avertissement',
  blame: 'Blâme',
  sanction: 'Sanction',
  exclusion: 'Exclusion',
};
