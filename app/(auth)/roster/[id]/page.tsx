import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect, notFound } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { ProfileView } from '@/components/modules/ProfileView';
import { agentHasPermission, loadRolePermissions } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: currentAgent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!currentAgent) redirect('/login');

  const { id } = await params;

  const { data: targetAgent } = await supabase
    .from('agents').select('*').eq('id', id).single<Agent>();

  if (!targetAgent) notFound();

  const [{ data: badges }, { data: disciplinary }, { data: certificates }, rolePerms] = await Promise.all([
    supabase
      .from('agent_trainings')
      .select('*, training:trainings(*)')
      .eq('agent_id', id)
      .order('validated_at', { ascending: false }),
    supabase
      .from('disciplinary_records')
      .select('*')
      .eq('target_agent_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('certificates')
      .select('id, ref_number, type, is_crash, issued_at, data')
      .eq('agent_id', id)
      .order('issued_at', { ascending: false }),
    loadRolePermissions(),
  ]);

  const isSelf = id === user.id;
  const canManageBadges =
    agentHasPermission(currentAgent, 'validate_training', rolePerms) || currentAgent.is_formateur;
  // Co-leader+ ou admin peut délivrer des attestations
  const canIssueCertificates =
    currentAgent.is_admin || ['sheriff', 'leader', 'co_leader'].includes(currentAgent.grade);

  return (
    <>
      <Topbar
        agent={currentAgent}
        breadcrumb={[
          { label: 'Annuaire' },
          { label: targetAgent.pseudo_rp || targetAgent.discord_username || 'Agent' },
        ]}
      />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <ProfileView
          target={targetAgent}
          currentAgent={currentAgent}
          badges={badges || []}
          disciplinary={disciplinary || []}
          certificates={certificates || []}
          isSelf={isSelf}
          canManageBadges={canManageBadges}
          canIssueCertificates={canIssueCertificates}
        />
      </div>
    </>
  );
}
