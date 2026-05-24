import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect } from 'next/navigation';
import type { Agent, DisciplinaryType } from '@/lib/types';
import { DisciplinaryView } from '@/components/modules/DisciplinaryView';
import { agentHasPermission, loadRolePermissions } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function DisciplinaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!agent) redirect('/login');

  const { data: records } = await supabase
    .from('disciplinary_records')
    .select(`
      *,
      target:agents!disciplinary_records_target_agent_id_fkey(id, pseudo_rp, matricule, grade, discord_avatar_url),
      requester:agents!disciplinary_records_requested_by_fkey(id, pseudo_rp, matricule, grade)
    `)
    .order('created_at', { ascending: false });

  // Compteurs par type
  const counts: Record<DisciplinaryType, number> = {
    reminder: 0, warning: 0, blame: 0, sanction: 0, exclusion: 0,
  };
  for (const r of records || []) {
    if (r.status === 'applied') {
      counts[r.type as DisciplinaryType] = (counts[r.type as DisciplinaryType] || 0) + 1;
    }
  }

  const rolePerms = await loadRolePermissions();
  const canRequest = agentHasPermission(agent, 'request_sanction', rolePerms);
  const canApply = agentHasPermission(agent, 'apply_sanction', rolePerms);

  const { data: allAgents } = await supabase
    .from('agents')
    .select('id, pseudo_rp, matricule, grade')
    .eq('is_active', true)
    .order('pseudo_rp');

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Discipline' }, { label: 'Dossier disciplinaire' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <DisciplinaryView
          records={records || []}
          counts={counts}
          currentAgent={agent}
          canRequest={canRequest}
          canApply={canApply}
          allAgents={allAgents || []}
        />
      </div>
    </>
  );
}
