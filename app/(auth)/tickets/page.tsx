import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { redirect } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { TicketsView } from '@/components/modules/TicketsView';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!agent) redirect('/login');

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      *,
      opener:agents!tickets_opened_by_fkey(id, pseudo_rp, matricule, grade, discord_avatar_url)
    `)
    .order('created_at', { ascending: false });

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Support' }, { label: 'Tickets' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <TicketsView tickets={tickets || []} currentAgent={agent} />
      </div>
    </>
  );
}
