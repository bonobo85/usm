import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { RecruitmentView } from '@/components/modules/RecruitmentView';
import { agentHasPermission, loadRolePermissions } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function RecruitmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!agent) redirect('/login');

  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  const rolePerms = await loadRolePermissions();
  const canValidate = agentHasPermission(agent, 'validate_application', rolePerms);

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Unité' }, { label: 'Recrutement' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <RecruitmentView
          applications={applications || []}
          currentAgent={agent}
          canValidate={canValidate}
        />
      </div>
    </>
  );
}
