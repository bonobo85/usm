import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { redirect, notFound } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { TicketDetail } from '@/components/modules/TicketDetail';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;

  const { data: ticket } = await supabase
    .from('tickets')
    .select(
      `
      *,
      opener:agents!tickets_opened_by_fkey(id, pseudo_rp, matricule, grade, discord_avatar_url),
      assignee:agents!tickets_assigned_to_fkey(id, pseudo_rp, matricule, grade, discord_avatar_url)
    `
    )
    .eq('id', id)
    .single();

  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from('ticket_messages')
    .select(
      `
      *,
      author:agents!ticket_messages_author_id_fkey(id, pseudo_rp, matricule, grade, discord_avatar_url)
    `
    )
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  return (
    <>
      <Topbar
        agent={agent}
        breadcrumb={[
          { label: 'Support' },
          { label: 'Tickets', href: '/tickets' },
          { label: `#${ticket.id.slice(0, 8)}` },
        ]}
      />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <TicketDetail
          ticket={ticket}
          messages={messages || []}
          currentAgent={agent}
        />
      </div>
    </>
  );
}
