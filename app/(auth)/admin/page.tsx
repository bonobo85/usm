import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect } from 'next/navigation';
import type { Agent, Grade } from '@/lib/types';
import { AdminPanel } from '@/components/modules/AdminPanel';
import { hasMinimumGrade } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!agent) redirect('/login');

  // Accès Admin panel : Co-leader+ ou is_admin
  if (!hasMinimumGrade(agent, 'co_leader') && !agent.is_admin) {
    redirect('/dashboard');
  }

  const [
    { data: agents, count: agentsCount },
    { count: actionsToday },
    { data: rolePerms },
    { data: permissions },
    { data: logs },
  ] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact' }).order('grade', { ascending: false }),
    supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('role_permissions').select('*'),
    supabase.from('permissions').select('*'),
    supabase
      .from('audit_logs')
      .select('*, actor:agents!audit_logs_actor_id_fkey(id, pseudo_rp, matricule)')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Construire la matrice : { permission_key: { grade: boolean } }
  const matrix: Record<string, Record<Grade, boolean>> = {};
  const allGrades: Grade[] = ['sheriff', 'leader', 'co_leader', 'operator', 'operator_second', 'usm', 'usm_test'];
  for (const p of permissions || []) {
    matrix[p.key] = {} as Record<Grade, boolean>;
    for (const g of allGrades) {
      matrix[p.key][g] = false;
    }
  }
  for (const rp of rolePerms || []) {
    if (matrix[rp.permission_key]) {
      matrix[rp.permission_key][rp.grade as Grade] = true;
    }
  }

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Administration' }, { label: 'Panel admin' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <AdminPanel
          agents={(agents || []) as Agent[]}
          permissions={permissions || []}
          matrix={matrix}
          logs={logs || []}
          currentAgent={agent}
          stats={{
            totalAgents: agentsCount || 0,
            actionsToday: actionsToday || 0,
          }}
        />
      </div>
    </>
  );
}
