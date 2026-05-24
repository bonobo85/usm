'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent, TicketCategory, TicketStatus } from '@/lib/types';
import { getInitials, formatDate } from '@/lib/utils/format';

interface Props {
  tickets: any[];
  currentAgent: Agent;
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical: '🔧 Technique',
  hr: '👥 RH',
  sanction: '⚠️ Sanction',
  other: '📌 Autre',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  closed: 'Clos',
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-[#2c5fb8]/20 text-[#7aa5e8] border-[#2c5fb8]/40',
  in_progress: 'bg-usm-gold/15 text-usm-gold-light border-usm-gold/30',
  closed: 'bg-text-faint/15 text-text-faint border-border',
};

export function TicketsView({ tickets, currentAgent }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TicketCategory>('all');

  const [category, setCategory] = useState<TicketCategory>('technical');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  // Filtrage
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const statusCounts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      showToast('Sujet et contenu obligatoires', 'error');
      return;
    }
    setSubmitting(true);
    const supabase = createClient();

    // Create ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        opened_by: currentAgent.id,
        category,
        subject,
      })
      .select()
      .single();

    if (error || !ticket) {
      showToast(`Erreur : ${error?.message}`, 'error');
      setSubmitting(false);
      return;
    }

    // Create first message
    const { error: msgError } = await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      author_id: currentAgent.id,
      content,
    });

    if (msgError) {
      showToast(`Ticket créé mais message non envoyé : ${msgError.message}`, 'error');
      setSubmitting(false);
      router.refresh();
      return;
    }

    showToast('Ticket créé', 'success');
    setSubject(''); setContent(''); setCategory('technical');
    setShowCreateModal(false);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Tickets de support"
        subtitle={`${filteredTickets.length} ticket${filteredTickets.length !== 1 ? 's' : ''}${filteredTickets.length !== tickets.length ? ` (sur ${tickets.length})` : ''}`}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-gold flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nouveau ticket
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'all' as const, l: `Tous (${statusCounts.all})` },
            { v: 'open' as const, l: `Ouverts (${statusCounts.open})` },
            { v: 'in_progress' as const, l: `En cours (${statusCounts.in_progress})` },
            { v: 'closed' as const, l: `Clôturés (${statusCounts.closed})` },
          ]).map((f) => (
            <button
              key={f.v}
              onClick={() => setStatusFilter(f.v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                statusFilter === f.v
                  ? 'bg-gradient-to-br from-usm-gold to-usm-gold-dark text-[#0a0a12] border-usm-gold'
                  : 'bg-panel text-text-dim border-border hover:text-text'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | TicketCategory)}
          className="input text-xs h-[30px] py-0 ml-2"
        >
          <option value="all">Toutes catégories</option>
          <option value="technical">Technique</option>
          <option value="hr">RH</option>
          <option value="sanction">Sanction</option>
          <option value="other">Autre</option>
        </select>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="card p-12 text-center text-text-faint">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-text-faint/40" />
          {tickets.length === 0 ? 'Aucun ticket pour le moment.' : 'Aucun ticket ne correspond aux filtres.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="card p-4 flex items-center gap-4 hover:border-usm-gold-dark transition-colors cursor-pointer no-underline"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-bold text-sm shrink-0">
                {getInitials(t.opener?.pseudo_rp || t.opener?.discord_username)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-text-dim">{CATEGORY_LABELS[t.category as TicketCategory]}</span>
                  <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status as TicketStatus]}`}>
                    {STATUS_LABELS[t.status as TicketStatus]}
                  </span>
                </div>
                <div className="text-sm font-semibold text-text truncate">{t.subject}</div>
                <div className="text-[11px] text-text-faint mt-0.5">par {t.opener?.pseudo_rp || 'Anonyme'} · {formatDate(t.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau ticket"
        size="md"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-ghost" disabled={submitting}>Annuler</button>
            <button onClick={handleCreate} className="btn-gold" disabled={submitting}>
              {submitting ? 'Envoi...' : 'Créer le ticket'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Catégorie</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className="input w-full">
              {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Sujet</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input w-full" placeholder="Résumé court..." required />
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Description</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="input w-full min-h-[120px] resize-y" placeholder="Détails de la demande..." required />
          </div>
        </form>
      </Modal>
    </>
  );
}
