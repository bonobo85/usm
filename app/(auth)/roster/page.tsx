import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect } from 'next/navigation';
import type { Agent, Grade } from '@/lib/types';
import { GRADE_LABELS } from '@/lib/types';
import { RosterGrid } from '@/components/modules/RosterGrid';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!agent) redirect('/login');

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const { data: badges } = await supabase
    .from('agent_trainings')
    .select('agent_id');

  const badgeCounts: Record<string, number> = {};
  for (const b of badges || []) {
    badgeCounts[b.agent_id] = (badgeCounts[b.agent_id] || 0) + 1;
  }

  // Compteurs par grade
  const counts: Record<Grade, number> = {
    sheriff: 0, leader: 0, co_leader: 0, operator: 0,
    operator_second: 0, usm: 0, usm_test: 0,
  };
  for (const a of agents || []) {
    counts[a.grade as Grade] = (counts[a.grade as Grade] || 0) + 1;
  }

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Unité' }, { label: 'Annuaire' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <RosterGrid agents={agents || []} badgeCounts={badgeCounts} counts={counts} currentAgent={agent} />
      </div>
    </>
  );
}
