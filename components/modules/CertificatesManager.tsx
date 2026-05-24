'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Eye, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent } from '@/lib/types';
import { GRADE_LABELS } from '@/lib/types';
import { CertificateDocument, type CertificateRecord, type CertificateData } from './CertificateDocument';
import { formatDate } from '@/lib/utils/format';

interface Props {
  certificates: CertificateRecord[];
  targetAgent: Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade'>;
  currentAgent: Agent;
  canIssue: boolean;
}

const TYPE_LABELS: Record<CertificateRecord['type'], string> = {
  recruitment: 'Recrutement',
  formation: 'Formation',
  badge_removal: 'Retrait de badge',
  dismissal: 'Fin de service',
};

const TYPE_EMOJIS: Record<CertificateRecord['type'], string> = {
  recruitment: '🎖',
  formation: '📜',
  badge_removal: '🚫',
  dismissal: '📤',
};

export function CertificatesManager({ certificates, targetAgent, currentAgent, canIssue }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<CertificateRecord | null>(null);

  async function handleDelete(cert: CertificateRecord) {
    if (!confirm(`Supprimer l'attestation ${cert.ref_number} ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('certificates').delete().eq('id', cert.id);
    if (error) return showToast(`Erreur : ${error.message}`, 'error');
    showToast('Attestation supprimée', 'success');
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">Attestations ({certificates.length})</h3>
        {canIssue && (
          <button onClick={() => setShowCreate(true)} className="btn-gold text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Délivrer une attestation
          </button>
        )}
      </div>

      {certificates.length === 0 ? (
        <div className="card p-8 text-center text-text-faint text-sm">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          Aucune attestation délivrée.
        </div>
      ) : (
        <div className="space-y-2">
          {certificates.map((c) => (
            <div key={c.id} className="card p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-bg-2 border border-border flex items-center justify-center text-lg shrink-0">
                {TYPE_EMOJIS[c.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13.5px] font-semibold text-text">{TYPE_LABELS[c.type]}</span>
                  {c.is_crash && (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2c5fb8]/20 text-[#7aa5e8] border border-[#2c5fb8]/40">
                      CRASH
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-faint font-mono">
                  {c.ref_number} · {formatDate(c.issued_at)}
                </div>
              </div>
              <button onClick={() => setViewing(c)} className="btn-ghost text-xs flex items-center gap-1.5" title="Voir">
                <Eye className="w-3.5 h-3.5" /> Voir
              </button>
              {canIssue && (
                <button
                  onClick={() => handleDelete(c)}
                  className="btn-ghost text-xs text-[#ff7a82]"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualisation */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setViewing(null)}
        >
          <div className="my-8 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setViewing(null)}
                className="text-white/80 hover:text-white flex items-center gap-1.5 text-sm"
              >
                <X className="w-4 h-4" /> Fermer
              </button>
            </div>
            <CertificateDocument cert={viewing} />
          </div>
        </div>
      )}

      {/* Modal de création */}
      {showCreate && (
        <CreateCertificateModal
          targetAgent={targetAgent}
          currentAgent={currentAgent}
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

interface CreateModalProps {
  targetAgent: Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade'>;
  currentAgent: Agent;
  onClose: () => void;
  onDone: () => void;
}

function CreateCertificateModal({ targetAgent, currentAgent, onClose, onDone }: CreateModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<CertificateRecord['type']>('recruitment');
  const [isCrash, setIsCrash] = useState(false);

  // Pré-remplissage depuis les profils
  const [data, setData] = useState<CertificateData>({
    signer_name: currentAgent.pseudo_rp || '',
    signer_grade: 'Co-Leader',
    signer_post: 'Poste BCSO',
    signer_location: 'Sandy Shores',
    signer_email: 'leader.usm@bcso.revolution.com',
    agent_name: targetAgent.pseudo_rp || '',
    agent_grade: targetAgent.grade ? GRADE_LABELS[targetAgent.grade] : '',
    evaluator_name: '',
    probation_duration: '2 semaines',
    training_name: '',
    badge_name: '',
    removal_reason: '',
    departure_type: 'Démission',
    departure_reason: '',
    city: 'Vinewood',
    custom_text: '',
  });

  function set<K extends keyof CertificateData>(key: K, value: CertificateData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('certificates').insert({
      type,
      is_crash: isCrash,
      agent_id: targetAgent.id,
      issued_by: currentAgent.id,
      data,
    });
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }
    showToast('Attestation délivrée', 'success');
    setSubmitting(false);
    onDone();
  }

  // Aperçu live
  const previewCert: CertificateRecord = {
    id: 'preview',
    ref_number: 'USM-CERT-2026-XXXX',
    type,
    is_crash: isCrash,
    issued_at: new Date().toISOString(),
    data,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-6 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Formulaire */}
        <div className="bg-panel border border-border rounded-xl p-5 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text">Délivrer une attestation</h2>
            <button onClick={onClose} className="text-text-faint hover:text-text">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as CertificateRecord['type'])} className="input w-full">
                <option value="recruitment">Recrutement</option>
                <option value="formation">Formation</option>
                <option value="badge_removal">Retrait de badge</option>
                <option value="dismissal">Fin de service (démission/licenciement)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isCrash} onChange={(e) => setIsCrash(e.target.checked)} className="w-4 h-4 accent-usm-blue" />
              <span className="text-sm text-text">Variante CRASH (bandeau bleu)</span>
            </label>

            <div className="border-t border-border-soft pt-3">
              <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-2">Signataire</div>
              <Field label="Nom" value={data.signer_name} onChange={(v) => set('signer_name', v)} />
              <Field label="Grade" value={data.signer_grade} onChange={(v) => set('signer_grade', v)} />
              <Field label="Poste" value={data.signer_post} onChange={(v) => set('signer_post', v)} />
              <Field label="Lieu" value={data.signer_location} onChange={(v) => set('signer_location', v)} />
              <Field label="Email" value={data.signer_email} onChange={(v) => set('signer_email', v)} />
            </div>

            <div className="border-t border-border-soft pt-3">
              <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-2">Agent concerné</div>
              <Field label="Nom" value={data.agent_name} onChange={(v) => set('agent_name', v)} />
              <Field label="Grade (pré-rempli, modifiable)" value={data.agent_grade} onChange={(v) => set('agent_grade', v)} />
              <p className="text-[10px] text-text-faint -mt-1 mb-2">Adapte le grade en libellé RP si besoin (ex : Adjoint III).</p>
            </div>

            {/* Champs spécifiques au type */}
            <div className="border-t border-border-soft pt-3">
              <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-2">Détails</div>
              {type === 'recruitment' && (
                <>
                  <Field label="Évalué par (formateur)" value={data.evaluator_name} onChange={(v) => set('evaluator_name', v)} />
                  <Field label="Durée période probatoire" value={data.probation_duration} onChange={(v) => set('probation_duration', v)} />
                </>
              )}
              {type === 'formation' && (
                <>
                  <Field label="Formation suivie" value={data.training_name} onChange={(v) => set('training_name', v)} />
                  <Field label="Dispensée par" value={data.evaluator_name} onChange={(v) => set('evaluator_name', v)} />
                </>
              )}
              {type === 'badge_removal' && (
                <>
                  <Field label="Badge retiré" value={data.badge_name} onChange={(v) => set('badge_name', v)} />
                  <Field label="Motif" value={data.removal_reason} onChange={(v) => set('removal_reason', v)} />
                </>
              )}
              {type === 'dismissal' && (
                <>
                  <div className="mb-2">
                    <label className="block text-[11px] text-text-dim mb-1">Type de départ</label>
                    <select value={data.departure_type} onChange={(e) => set('departure_type', e.target.value)} className="input w-full text-sm">
                      <option value="Démission">Démission</option>
                      <option value="Licenciement">Licenciement</option>
                    </select>
                  </div>
                  <Field label="Motif" value={data.departure_reason} onChange={(v) => set('departure_reason', v)} />
                </>
              )}
              <Field label="Ville (signature)" value={data.city} onChange={(v) => set('city', v)} />
              <div className="mb-2">
                <label className="block text-[11px] text-text-dim mb-1">Texte additionnel (optionnel)</label>
                <textarea
                  value={data.custom_text}
                  onChange={(e) => set('custom_text', e.target.value)}
                  className="input w-full text-sm min-h-[60px] resize-y"
                  placeholder="Phrase libre ajoutée au paragraphe de certification..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="btn-ghost flex-1" disabled={submitting}>Annuler</button>
              <button onClick={handleSubmit} className="btn-gold flex-1" disabled={submitting}>
                {submitting ? '...' : 'Délivrer'}
              </button>
            </div>
          </div>
        </div>

        {/* Aperçu live */}
        <div className="overflow-y-auto max-h-[85vh]">
          <div className="text-[11px] text-white/60 uppercase tracking-wider font-semibold mb-2 text-center">
            Aperçu en direct
          </div>
          <div style={{ transform: 'scale(0.92)', transformOrigin: 'top center' }}>
            <CertificateDocument cert={previewCert} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2">
      <label className="block text-[11px] text-text-dim mb-1">{label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="input w-full text-sm" />
    </div>
  );
}
