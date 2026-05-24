'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent, ApplicationStatus, Application } from '@/lib/types';
import { formatDate, getInitials } from '@/lib/utils/format';

interface ApplicationWithReviewer extends Application {
  reviewer?: Pick<Agent, 'pseudo_rp' | 'matricule'> | null;
}

interface Props {
  applications: ApplicationWithReviewer[];
  currentAgent: Agent;
  canValidate: boolean;
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Nouvelle',
  in_review: 'En examen',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: 'bg-[#2c5fb8]/20 text-[#7aa5e8] border-[#2c5fb8]/40',
  in_review: 'bg-usm-gold/15 text-usm-gold-light border-usm-gold/30',
  accepted: 'bg-[#1e7a4e]/15 text-[#5ee0a1] border-[#1e7a4e]/30',
  rejected: 'bg-usm-red/15 text-[#ff7a82] border-usm-red/30',
};

export function RecruitmentView({ applications, currentAgent, canValidate }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(applications[0]?.id || null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const filtered = applications.filter((a) => filter === 'all' || a.status === filter);
  const selected = applications.find((a) => a.id === selectedId);

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    in_review: applications.filter((a) => a.status === 'in_review').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  async function handleDecide(status: 'accepted' | 'rejected') {
    if (!selected) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('applications')
      .update({
        status,
        reviewed_by: currentAgent.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', selected.id);

    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }

    showToast(status === 'accepted' ? 'Candidature acceptée' : 'Candidature refusée', 'success');
    setReviewNotes('');
    setSubmitting(false);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Recrutement"
        subtitle={`${applications.length} candidature${applications.length !== 1 ? 's' : ''}`}
        actions={
          <a href="/admin/recruitment-form" className="btn-ghost flex items-center gap-1.5">
            ⚙ Gérer les questions
          </a>
        }
      />

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {([
          { v: 'all' as const, l: `Toutes (${counts.all})` },
          { v: 'pending' as const, l: `Nouvelles (${counts.pending})` },
          { v: 'in_review' as const, l: `En examen (${counts.in_review})` },
          { v: 'accepted' as const, l: `Acceptées (${counts.accepted})` },
          { v: 'rejected' as const, l: `Refusées (${counts.rejected})` },
        ]).map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
              filter === f.v
                ? 'bg-gradient-to-br from-usm-gold to-usm-gold-dark text-[#0a0a12] border-usm-gold shadow-md'
                : 'bg-panel text-text-dim border-border hover:text-text'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="card p-12 text-center text-text-faint">Aucune candidature pour le moment.</div>
      ) : (
        <div className="grid grid-cols-[1fr_400px] gap-4">
          {/* Liste */}
          <div className="space-y-2">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full bg-panel border rounded-xl p-4 grid grid-cols-[auto_1fr_auto_auto] gap-3.5 items-center text-left transition-all ${
                  selectedId === a.id
                    ? 'border-usm-gold ring-1 ring-usm-gold shadow-lg shadow-usm-gold/10'
                    : 'border-border hover:border-usm-gold-dark'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5865f2] to-[#404eed] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {getInitials(a.discord_username || 'A')}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-text text-[13.5px] truncate">{a.discord_username || 'Anonyme'}</div>
                  <div className="text-[11.5px] text-text-faint mt-0.5 truncate">
                    {a.form_data?.real_age ? `${a.form_data.real_age} ans` : ''}
                    {a.form_data?.availability ? ` · ${a.form_data.availability}` : ''}
                  </div>
                </div>
                <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[a.status]}`}>
                  {STATUS_LABELS[a.status]}
                </span>
                <span className="text-[11px] text-text-faint font-mono">{formatDate(a.created_at)}</span>
              </button>
            ))}
          </div>

          {/* Détail */}
          {selected ? (
            <div className="card overflow-hidden sticky top-0 self-start">
              <div
                className="p-5 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d0f24 0%, #1d2052 50%, #4a2a7a 100%)' }}
              >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(212, 161, 58, 0.15), transparent 60%)' }} />
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] text-xl font-extrabold mb-3 shadow-2xl relative z-10">
                  {getInitials(selected.discord_username || 'A')}
                </div>
                <div className="text-xl font-bold text-white mb-1 relative z-10">{selected.discord_username || 'Anonyme'}</div>
                <div className="font-mono text-xs text-usm-gold-light relative z-10">
                  Discord ID: {selected.discord_id || '—'}
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {Object.entries(selected.form_data || {}).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] text-usm-gold uppercase tracking-widest font-semibold mb-1">{formatFieldKey(k)}</div>
                    <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">{String(v)}</div>
                  </div>
                ))}
                <div>
                  <div className="text-[10px] text-usm-gold uppercase tracking-widest font-semibold mb-1">Soumise le</div>
                  <div className="text-[13px] text-text">{formatDate(selected.created_at)}</div>
                </div>
                {selected.review_notes && (
                  <div>
                    <div className="text-[10px] text-usm-gold uppercase tracking-widest font-semibold mb-1">Notes d&apos;examen</div>
                    <div className="text-[13px] text-text-dim italic">{selected.review_notes}</div>
                  </div>
                )}
              </div>

              {canValidate && selected.status !== 'accepted' && selected.status !== 'rejected' && (
                <div className="p-3 border-t border-border bg-bg-2 space-y-2">
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="input w-full text-xs min-h-[60px] resize-y"
                    placeholder="Notes d&apos;examen (optionnel)..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleDecide('rejected')} className="btn-danger flex-1 flex items-center justify-center gap-1.5" disabled={submitting}>
                      <X className="w-3.5 h-3.5" /> Refuser
                    </button>
                    <button onClick={() => handleDecide('accepted')} className="btn-success flex-1 flex items-center justify-center gap-1.5" disabled={submitting}>
                      <Check className="w-3.5 h-3.5" /> Accepter
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center text-text-faint text-sm">Sélectionne une candidature.</div>
          )}
        </div>
      )}
    </>
  );
}

function formatFieldKey(key: string): string {
  const map: Record<string, string> = {
    real_age: 'Âge réel',
    rp_character: 'Personnage RP',
    rp_experience: 'Expérience RP',
    availability: 'Disponibilités',
    motivation: 'Motivation',
  };
  return map[key] || key.replace(/_/g, ' ');
}
