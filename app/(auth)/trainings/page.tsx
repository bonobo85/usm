import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { TrainingsList } from '@/components/modules/TrainingsList';
import { agentHasPermission, loadRolePermissions } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function TrainingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!agent) redirect('/login');

  const [{ data: trainings }, { data: myBadges }] = await Promise.all([
    supabase.from('trainings').select('*').eq('is_active', true).order('created_at'),
    supabase.from('agent_trainings').select('training_id').eq('agent_id', user.id),
  ]);

  const rolePerms = await loadRolePermissions();
  const canCreate = agentHasPermission(agent, 'create_training', rolePerms);
  const canValidate = agentHasPermission(agent, 'validate_training', rolePerms) || agent.is_formateur;

  const acquiredIds = new Set((myBadges || []).map((b) => b.training_id));

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Unité' }, { label: 'Formations' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <TrainingsList
          trainings={trainings || []}
          acquiredIds={Array.from(acquiredIds)}
          currentAgent={agent}
          canCreate={canCreate}
          canValidate={canValidate}
        />
      </div>
    </>
  );
}
