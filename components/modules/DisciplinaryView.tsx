'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent, DisciplinaryType, DisciplinaryStatus } from '@/lib/types';
import { DISCIPLINARY_LABELS, GRADE_LABELS } from '@/lib/types';
import { getInitials, formatDate } from '@/lib/utils/format';

interface Props {
  records: any[];
  counts: Record<DisciplinaryType, number>;
  currentAgent: Agent;
  canRequest: boolean;
  canApply: boolean;
  allAgents: Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade'>[];
}

const SEVERITY_STYLES: Record<DisciplinaryType, string> = {
  reminder: 'bg-[#1e7a4e]/15 text-[#5ee0a1] border-[#1e7a4e]/40',
  warning: 'bg-usm-gold/15 text-usm-gold-light border-usm-gold/40',
  blame: 'bg-[#c97a3a]/15 text-[#f0a55a] border-[#c97a3a]/40',
  sanction: 'bg-usm-red/15 text-[#ff7a82] border-usm-red/40',
  exclusion: 'bg-[#6b1a1f]/30 text-[#ff6660] border-[#6b1a1f]/60',
};

const STATS_STYLES: Record<DisciplinaryType, string> = {
  reminder: 'bg-gradient-to-br from-[#1e7a4e] to-[#051a10] border-[#1e7a4e]/50',
  warning: 'bg-gradient-to-br from-[#b8851e] to-[#2b1c04] border-[#b8851e]/50',
  blame: 'bg-gradient-to-br from-[#c97a3a] to-[#3a1f0c] border-[#c97a3a]/50',
  sanction: 'bg-gradient-to-br from-usm-red to-[#2e0608] border-usm-red/50',
  exclusion: 'bg-gradient-to-br from-[#6b1a1f] to-[#1a0608] border-[#6b1a1f]/60',
};

const STATUS_STYLES: Record<DisciplinaryStatus, string> = {
  pending: 'bg-usm-gold/15 text-usm-gold-light border-usm-gold/30',
  applied: 'bg-[#1e7a4e]/15 text-[#5ee0a1] border-[#1e7a4e]/30',
  rejected: 'bg-text-faint/15 text-text-dim border-border',
  contested: 'bg-usm-red/15 text-[#ff7a82] border-usm-red/30',
};

const STATUS_LABELS: Record<DisciplinaryStatus, string> = {
  pending: 'En attente',
  applied: 'Appliquée',
  rejected: 'Rejetée',
  contested: 'Contestée',
};

export function DisciplinaryView({ records, counts, currentAgent, canRequest, canApply, allAgents }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | DisciplinaryStatus>('all');
  const [search, setSearch] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState<any | null>(null);

  // Request form
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState<DisciplinaryType>('warning');
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Apply form
  const [applyNotes, setApplyNotes] = useState('');

  const filtered = records.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      const match =
        (r.target?.pseudo_rp || '').toLowerCase().includes(s) ||
        (r.target?.matricule || '').toLowerCase().includes(s) ||
        (r.reason || '').toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId || !reason.trim()) {
      showToast('Agent et motif obligatoires', 'error');
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const evidenceUrls = evidence
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);
    const { error } = await supabase.from('disciplinary_records').insert({
      target_agent_id: targetId,
      type,
      reason,
      evidence_urls: evidenceUrls,
      requested_by: currentAgent.id,
      status: 'pending',
    });
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }
    showToast('Demande de sanction enregistrée', 'success');
    setTargetId(''); setReason(''); setType('warning'); setEvidence('');
    setShowRequestModal(false);
    setSubmitting(false);
    router.refresh();
  }

  async function handleApply(approve: boolean) {
    if (!showApplyModal) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('disciplinary_records')
      .update({
        status: approve ? 'applied' : 'rejected',
        applied_by: currentAgent.id,
        applied_at: new Date().toISOString(),
        application_notes: applyNotes || null,
      })
      .eq('id', showApplyModal.id);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }
    showToast(approve ? 'Sanction appliquée' : 'Demande rejetée', 'success');
    setShowApplyModal(null);
    setApplyNotes('');
    setSubmitting(false);
    router.refresh();
  }

  async function handleCancel(recordId: string) {
    if (!confirm('Annuler cette sanction ? Elle passera en statut "rejetée".')) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('disciplinary_records')
      .update({ status: 'rejected', application_notes: 'Sanction annulée par ' + (currentAgent.pseudo_rp || 'un responsable') })
      .eq('id', recordId);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      return;
    }
    showToast('Sanction annulée', 'success');
    router.refresh();
  }

  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const appliedCount = records.filter((r) => r.status === 'applied').length;
  const contestedCount = records.filter((r) => r.status === 'contested').length;

  return (
    <>
      <PageHeader
        title="Dossier disciplinaire"
        subtitle={`${records.length} enregistrement${records.length !== 1 ? 's' : ''}`}
        actions={
          canRequest && (
            <button onClick={() => setShowRequestModal(true)} className="btn-danger flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Demander une sanction
            </button>
          )
        }
      />

      {/* Stats par type */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {(['reminder', 'warning', 'blame', 'sanction', 'exclusion'] as DisciplinaryType[]).map((t) => (
          <div key={t} className={`${STATS_STYLES[t]} relative overflow-hidden border rounded-xl p-4 text-center`}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white/12 border border-white/20 flex items-center justify-center text-white font-bold relative z-10">
              {t.charAt(0).toUpperCase()}
            </div>
            <div className="text-[28px] font-bold text-white leading-none relative z-10">{counts[t]}</div>
            <div className="text-[10.5px] text-white/75 uppercase tracking-wider font-semibold mt-1.5 relative z-10">{DISCIPLINARY_LABELS[t]}{counts[t] !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <div className="flex gap-1.5">
          {([
            { v: 'all' as const, l: `Toutes (${records.length})` },
            { v: 'pending' as const, l: `En attente (${pendingCount})` },
            { v: 'applied' as const, l: `Appliquées (${appliedCount})` },
            { v: 'contested' as const, l: `Contestées (${contestedCount})` },
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
        <div className="ml-auto relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8 w-[260px]"
            placeholder="Rechercher..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[110px_1fr_160px_120px_90px_70px] gap-3 bg-bg-2 px-4 py-3 border-b border-border text-[10.5px] text-text-faint uppercase tracking-wider font-semibold">
          <div>Niveau</div>
          <div>Agent · Motif</div>
          <div>Demandé par</div>
          <div>Statut</div>
          <div>Date</div>
          <div className="text-right">Action</div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-text-faint text-sm">Aucun enregistrement disciplinaire.</div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className={`grid grid-cols-[110px_1fr_160px_120px_90px_70px] gap-3 px-4 py-3.5 border-b border-border-soft last:border-b-0 items-center transition-colors hover:bg-panel-2`}
            >
              <div
                onClick={() => { if (canApply && r.status === 'pending') setShowApplyModal(r); }}
                className={canApply && r.status === 'pending' ? 'cursor-pointer' : ''}
              >
                <span className={`inline-block px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider border ${SEVERITY_STYLES[r.type as DisciplinaryType]}`}>
                  {DISCIPLINARY_LABELS[r.type as DisciplinaryType]}
                </span>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-bold text-[11px] shrink-0">
                  {getInitials(r.target?.pseudo_rp)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-text truncate">{r.target?.pseudo_rp || 'Anonyme'} <span className="font-mono text-[10px] text-text-faint">({r.target?.matricule})</span></div>
                  <div className="text-[11.5px] text-text-faint truncate">{r.reason}</div>
                </div>
              </div>
              <div className="font-mono text-[11.5px] text-text-dim">
                {r.requester?.pseudo_rp || 'Anonyme'}
                <span className="text-text-faint"> ({r.requester?.grade ? GRADE_LABELS[r.requester.grade as keyof typeof GRADE_LABELS].slice(0, 8) : '—'})</span>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[r.status as DisciplinaryStatus]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {STATUS_LABELS[r.status as DisciplinaryStatus]}
                </span>
              </div>
              <div className="font-mono text-[11.5px] text-text-dim">{formatDate(r.created_at)}</div>
              <div className="flex justify-end gap-1">
                {canApply && r.status === 'pending' && (
                  <button
                    onClick={() => setShowApplyModal(r)}
                    className="text-[11px] text-usm-gold-light hover:text-usm-gold px-2 py-1 rounded"
                    title="Traiter"
                  >
                    Traiter
                  </button>
                )}
                {canApply && r.status === 'applied' && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    className="text-[11px] text-[#ff7a82] hover:text-usm-red-bright px-2 py-1 rounded"
                    title="Annuler la sanction"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal demande */}
      <Modal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Demander une sanction"
        size="md"
        footer={
          <>
            <button onClick={() => setShowRequestModal(false)} className="btn-ghost" disabled={submitting}>Annuler</button>
            <button onClick={handleRequest} className="btn-danger" disabled={submitting}>
              {submitting ? 'Envoi...' : 'Soumettre la demande'}
            </button>
          </>
        }
      >
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Agent visé</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="input w-full" required>
              <option value="">— Sélectionner un agent —</option>
              {allAgents.filter(a => a.id !== currentAgent.id).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.pseudo_rp || 'Sans nom'} ({a.matricule || 'sans matricule'}) — {GRADE_LABELS[a.grade]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Niveau demandé</label>
            <select value={type} onChange={(e) => setType(e.target.value as DisciplinaryType)} className="input w-full">
              {Object.entries(DISCIPLINARY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            <p className="text-[11px] text-text-faint mt-1.5">La sanction sera validée par un Co-leader ou supérieur.</p>
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Motif détaillé</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full min-h-[120px] resize-y"
              placeholder="Description précise du manquement, contexte, date, témoins..."
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Preuves (optionnel)</label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              className="input w-full min-h-[70px] resize-y font-mono text-xs"
              placeholder="Une URL par ligne (capture d'écran, vidéo, message Discord...)"
            />
            <p className="text-[11px] text-text-faint mt-1.5">Colle les liens vers tes preuves, une par ligne.</p>
          </div>
        </form>
      </Modal>

      {/* Modal application */}
      <Modal
        open={!!showApplyModal}
        onClose={() => setShowApplyModal(null)}
        title="Statuer sur la demande"
        size="md"
        footer={
          <>
            <button onClick={() => setShowApplyModal(null)} className="btn-ghost" disabled={submitting}>Annuler</button>
            <button onClick={() => handleApply(false)} className="btn-ghost" disabled={submitting}>Rejeter</button>
            <button onClick={() => handleApply(true)} className="btn-danger" disabled={submitting}>
              {submitting ? '...' : 'Appliquer'}
            </button>
          </>
        }
      >
        {showApplyModal && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Cible</div>
              <div className="text-sm text-text">{showApplyModal.target?.pseudo_rp} ({showApplyModal.target?.matricule})</div>
            </div>
            <div>
              <div className="text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Niveau demandé</div>
              <span className={`inline-block px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider border ${SEVERITY_STYLES[showApplyModal.type as DisciplinaryType]}`}>
                {DISCIPLINARY_LABELS[showApplyModal.type as DisciplinaryType]}
              </span>
            </div>
            <div>
              <div className="text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Motif</div>
              <div className="text-[13px] text-text-dim leading-relaxed bg-bg-2 border border-border rounded-lg p-3">{showApplyModal.reason}</div>
            </div>
            {showApplyModal.evidence_urls && showApplyModal.evidence_urls.length > 0 && (
              <div>
                <div className="text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Preuves ({showApplyModal.evidence_urls.length})</div>
                <div className="space-y-1.5">
                  {showApplyModal.evidence_urls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[12px] text-usm-gold-light hover:underline truncate bg-bg-2 border border-border rounded-md px-2.5 py-1.5"
                    >
                      🔗 {url}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Notes d'application (optionnel)</div>
              <textarea
                value={applyNotes}
                onChange={(e) => setApplyNotes(e.target.value)}
                className="input w-full min-h-[80px] resize-y"
                placeholder="Justification de votre décision..."
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
