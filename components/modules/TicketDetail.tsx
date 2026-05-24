'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, UserCheck, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent, Grade } from '@/lib/types';
import { GRADE_LABELS, GRADE_ORDER } from '@/lib/types';
import { formatDateTime, getInitials } from '@/lib/utils/format';

// Helper local (pour éviter d'importer permissions.ts qui contient du code serveur)
function hasMinimumGrade(agent: Agent | null, minGrade: Grade): boolean {
  if (!agent) return false;
  return GRADE_ORDER[agent.grade] >= GRADE_ORDER[minGrade];
}

interface TicketWithAgents {
  id: string;
  opened_by: string;
  category: 'technical' | 'hr' | 'sanction' | 'other';
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  assigned_to: string | null;
  created_at: string;
  closed_at: string | null;
  opener: Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade' | 'discord_avatar_url'> | null;
  assignee: Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade' | 'discord_avatar_url'> | null;
}

interface MessageWithAuthor {
  id: string;
  ticket_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author: Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade' | 'discord_avatar_url'> | null;
}

interface Props {
  ticket: TicketWithAgents;
  messages: MessageWithAuthor[];
  currentAgent: Agent;
}

const CATEGORY_LABELS: Record<TicketWithAgents['category'], string> = {
  technical: 'Technique',
  hr: 'RH',
  sanction: 'Sanction',
  other: 'Autre',
};

const STATUS_LABELS: Record<TicketWithAgents['status'], string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  closed: 'Clôturé',
};

const STATUS_STYLES: Record<TicketWithAgents['status'], string> = {
  open: 'bg-[#2c5fb8]/20 text-[#7aa5e8] border-[#2c5fb8]/40',
  in_progress: 'bg-usm-gold/15 text-usm-gold-light border-usm-gold/30',
  closed: 'bg-[#1e7a4e]/15 text-[#5ee0a1] border-[#1e7a4e]/30',
};

export function TicketDetail({ ticket, messages, currentAgent }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isStaff = hasMinimumGrade(currentAgent, 'co_leader') || currentAgent.is_admin;
  const isClosed = ticket.status === 'closed';
  const canReply = !isClosed && (ticket.opened_by === currentAgent.id || ticket.assigned_to === currentAgent.id || isStaff);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      author_id: currentAgent.id,
      content: reply,
    });

    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }

    // Si le staff répond et que le ticket est encore "open", le passer en "in_progress"
    if (isStaff && ticket.status === 'open') {
      await supabase.from('tickets').update({ status: 'in_progress' }).eq('id', ticket.id);
    }

    setReply('');
    setSubmitting(false);
    showToast('Réponse envoyée', 'success');
    router.refresh();
  }

  async function handleAssignToMe() {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: currentAgent.id, status: 'in_progress' })
      .eq('id', ticket.id);

    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    showToast('Ticket assigné', 'success');
    router.refresh();
  }

  async function handleChangeStatus(status: 'open' | 'in_progress' | 'closed') {
    setSubmitting(true);
    const supabase = createClient();
    const payload: { status: typeof status; closed_at?: string | null } = { status };
    if (status === 'closed') payload.closed_at = new Date().toISOString();
    if (status !== 'closed') payload.closed_at = null;

    const { error } = await supabase.from('tickets').update(payload).eq('id', ticket.id);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    showToast(`Statut changé : ${STATUS_LABELS[status]}`, 'success');
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[1fr_280px] gap-4 max-w-6xl">
      {/* Colonne principale : thread */}
      <div className="space-y-4">
        {/* Header ticket */}
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-usm-blue to-[#1d2052] flex items-center justify-center text-white font-bold shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-semibold text-text">{ticket.subject}</h1>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[ticket.status]}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </div>
              <div className="text-[12px] text-text-faint">
                #{ticket.id.slice(0, 8)} · Catégorie : <span className="text-text-dim">{CATEGORY_LABELS[ticket.category]}</span> · Ouvert {formatDateTime(ticket.created_at)}
              </div>
            </div>
          </div>
        </Card>

        {/* Thread */}
        <div className="space-y-3">
          {messages.length === 0 ? (
            <Card className="p-6 text-center text-text-faint text-sm">Aucun message.</Card>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} isMine={m.author_id === currentAgent.id} />)
          )}
        </div>

        {/* Composer */}
        {canReply ? (
          <Card className="p-4">
            <form onSubmit={handleReply}>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Écris ta réponse..."
                className="input w-full min-h-[80px] resize-y text-sm"
                disabled={submitting}
              />
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  disabled={submitting || !reply.trim()}
                  className="btn-gold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </Card>
        ) : isClosed ? (
          <Card className="p-4 text-center text-text-faint text-sm">
            Ce ticket est clôturé. Aucune réponse possible.
          </Card>
        ) : null}
      </div>

      {/* Sidebar : infos + actions */}
      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-[10px] text-usm-gold uppercase tracking-widest font-semibold mb-3">Ouvert par</div>
          {ticket.opener ? <AgentMini agent={ticket.opener} /> : <span className="text-text-faint text-sm">Inconnu</span>}
        </Card>

        <Card className="p-4">
          <div className="text-[10px] text-usm-gold uppercase tracking-widest font-semibold mb-3">Assigné à</div>
          {ticket.assignee ? (
            <AgentMini agent={ticket.assignee} />
          ) : (
            <div className="text-text-faint text-sm mb-3">Non assigné</div>
          )}

          {isStaff && ticket.assigned_to !== currentAgent.id && !isClosed && (
            <button
              onClick={handleAssignToMe}
              disabled={submitting}
              className="btn-ghost w-full flex items-center justify-center gap-1.5 mt-3"
            >
              <UserCheck className="w-3.5 h-3.5" /> Me l&apos;assigner
            </button>
          )}
        </Card>

        {isStaff && (
          <Card className="p-4">
            <div className="text-[10px] text-usm-gold uppercase tracking-widest font-semibold mb-3">Actions</div>
            <div className="space-y-2">
              {ticket.status !== 'open' && (
                <button onClick={() => handleChangeStatus('open')} disabled={submitting} className="btn-ghost w-full flex items-center justify-center gap-1.5 text-xs">
                  Rouvrir
                </button>
              )}
              {ticket.status !== 'in_progress' && !isClosed && (
                <button onClick={() => handleChangeStatus('in_progress')} disabled={submitting} className="btn-ghost w-full flex items-center justify-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5" /> En cours
                </button>
              )}
              {ticket.status !== 'closed' && (
                <button onClick={() => handleChangeStatus('closed')} disabled={submitting} className="btn-danger w-full flex items-center justify-center gap-1.5 text-xs">
                  <CheckCircle className="w-3.5 h-3.5" /> Clôturer
                </button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isMine }: { message: MessageWithAuthor; isMine: boolean }) {
  const author = message.author;
  return (
    <Card className={`p-4 ${isMine ? 'border-usm-gold-dark/30 bg-usm-gold/[0.02]' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-bold text-xs shrink-0 overflow-hidden">
          {author?.discord_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.discord_avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(author?.pseudo_rp || 'A')
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-text text-[13.5px]">{author?.pseudo_rp || 'Utilisateur supprimé'}</span>
            {author?.grade && (
              <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-usm-gold/15 text-usm-gold-light border border-usm-gold/30">
                {GRADE_LABELS[author.grade]}
              </span>
            )}
            {author?.matricule && <span className="text-[11px] text-text-faint font-mono">#{author.matricule}</span>}
            <span className="text-[11px] text-text-faint ml-auto">{formatDateTime(message.created_at)}</span>
          </div>
          <div className="text-[13.5px] text-text whitespace-pre-wrap leading-relaxed">{message.content}</div>
        </div>
      </div>
    </Card>
  );
}

function AgentMini({ agent }: { agent: Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade' | 'discord_avatar_url'> }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-bold text-xs overflow-hidden">
        {agent.discord_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agent.discord_avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          getInitials(agent.pseudo_rp || 'A')
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{agent.pseudo_rp || 'Anonyme'}</div>
        <div className="text-[11px] text-text-faint">
          {agent.grade && GRADE_LABELS[agent.grade]}
          {agent.matricule && ` · #${agent.matricule}`}
        </div>
      </div>
    </div>
  );
}
