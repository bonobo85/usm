import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { hasMinimumGrade } from '@/lib/auth/permissions';
import { RecruitmentFormManager } from './RecruitmentFormManager';

export const dynamic = 'force-dynamic';

export default async function RecruitmentFormPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .single<Agent>();
  if (!agent) redirect('/login');

  // Seul Formateur+ ou Co-leader+ accède
  const isFormateurOrAbove = agent.is_formateur || hasMinimumGrade(agent, 'co_leader') || agent.is_admin;
  if (!isFormateurOrAbove) redirect('/dashboard');

  const { data: questions } = await supabase
    .from('application_form_questions')
    .select('*, proposer:agents!application_form_questions_proposed_by_fkey(pseudo_rp), approver:agents!application_form_questions_approved_by_fkey(pseudo_rp)')
    .order('position');

  return (
    <>
      <Topbar
        agent={agent}
        breadcrumb={[
          { label: 'Administration' },
          { label: 'Questions de recrutement' },
        ]}
      />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <RecruitmentFormManager
          questions={questions || []}
          currentAgent={agent}
          isCoLeaderPlus={hasMinimumGrade(agent, 'co_leader') || agent.is_admin}
        />
      </div>
    </>
  );
}
