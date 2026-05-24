import { createClient } from '@/lib/supabase/server';
import type { Agent, Grade } from '@/lib/types';
import { GRADE_ORDER } from '@/lib/types';

/**
 * Récupère l'agent courant connecté.
 */
export async function getCurrentAgent(): Promise<Agent | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .single();

  return agent;
}

/**
 * Vérifie qu'un agent a une permission donnée.
 */
export function agentHasPermission(agent: Agent | null, permission: string, defaultPerms: Record<Grade, string[]>): boolean {
  if (!agent) return false;
  if (agent.is_admin) return true;

  const custom = agent.custom_permissions || { granted: [], revoked: [] };
  if (custom.revoked.includes(permission)) return false;
  if (custom.granted.includes(permission)) return true;

  return defaultPerms[agent.grade]?.includes(permission) ?? false;
}

/**
 * Vérifie qu'un agent a au moins un certain grade.
 */
export function hasMinimumGrade(agent: Agent | null, minGrade: Grade): boolean {
  if (!agent) return false;
  if (agent.is_admin) return true;
  return GRADE_ORDER[agent.grade] >= GRADE_ORDER[minGrade];
}

/**
 * Charge la matrice de permissions par grade.
 */
export async function loadRolePermissions(): Promise<Record<Grade, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase.from('role_permissions').select('grade, permission_key');

  const result: Record<Grade, string[]> = {
    sheriff: [],
    leader: [],
    co_leader: [],
    operator: [],
    operator_second: [],
    usm: [],
    usm_test: [],
  };

  for (const row of data || []) {
    if (result[row.grade as Grade]) {
      result[row.grade as Grade].push(row.permission_key);
    }
  }
  return result;
}

/**
 * Log une action dans audit_logs.
 */
export async function logAction(action: string, targetType?: string, targetId?: string, metadata?: Record<string, any>) {
  const supabase = await createClient();
  const agent = await getCurrentAgent();

  await supabase.from('audit_logs').insert({
    actor_id: agent?.id || null,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata || {},
  });
}
