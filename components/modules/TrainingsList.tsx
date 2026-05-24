'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CheckCircle2, Lock, Pencil, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent, Training, Grade } from '@/lib/types';
import { GRADE_LABELS, GRADE_ORDER } from '@/lib/types';

interface Props {
  trainings: Training[];
  acquiredIds: string[];
  currentAgent: Agent;
  canCreate: boolean;
  canValidate: boolean;
}

const MAX_BADGE_SIZE = 1024 * 1024; // 1 Mo
const ACCEPTED_BADGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

const VALIDATOR_GRADES: Grade[] = ['operator', 'co_leader', 'leader', 'sheriff'];

export function TrainingsList({ trainings, acquiredIds, currentAgent, canCreate, canValidate }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'acquired' | 'available'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState<Training | null>(null);
  const [showEditModal, setShowEditModal] = useState<Training | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Training | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const acquiredSet = new Set(acquiredIds);

  const filtered = trainings.filter((t) => {
    if (filter === 'acquired') return acquiredSet.has(t.id);
    if (filter === 'available') return !acquiredSet.has(t.id);
    return true;
  });

  return (
    <>
      <PageHeader
        title="Formations & badges"
        subtitle={`${trainings.length} formation${trainings.length !== 1 ? 's' : ''} · ${acquiredIds.length} acquise${acquiredIds.length !== 1 ? 's' : ''}`}
        actions={
          canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn-gold flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nouvelle formation
            </button>
          )
        }
      />

      <div className="flex gap-1.5 mb-4">
        {([
          { v: 'all' as const, l: `Toutes (${trainings.length})` },
          { v: 'acquired' as const, l: `Acquises (${acquiredIds.length})` },
          { v: 'available' as const, l: `Disponibles (${trainings.length - acquiredIds.length})` },
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

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-text-faint">Aucune formation à afficher.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TrainingCard
              key={t.id}
              training={t}
              acquired={acquiredSet.has(t.id)}
              canValidate={canValidate}
              canEdit={canCreate}
              onValidate={() => setShowValidateModal(t)}
              onEdit={() => setShowEditModal(t)}
              onDelete={() => setShowDeleteModal(t)}
            />
          ))}
        </div>
      )}

      {/* Modal créer */}
      <CreateOrEditModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onDone={() => { setShowCreateModal(false); router.refresh(); }}
        showToast={showToast}
        submitting={submitting}
        setSubmitting={setSubmitting}
      />

      {/* Modal éditer */}
      {showEditModal && (
        <CreateOrEditModal
          open={true}
          onClose={() => setShowEditModal(null)}
          onDone={() => { setShowEditModal(null); router.refresh(); }}
          showToast={showToast}
          submitting={submitting}
          setSubmitting={setSubmitting}
          training={showEditModal}
        />
      )}

      {/* Modal supprimer */}
      {showDeleteModal && (
        <DeleteModal
          training={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onDone={() => { setShowDeleteModal(null); router.refresh(); }}
          showToast={showToast}
        />
      )}

      {/* Modal valider pour un agent */}
      {showValidateModal && (
        <ValidateModal
          training={showValidateModal}
          currentAgent={currentAgent}
          onClose={() => setShowValidateModal(null)}
          onDone={() => { setShowValidateModal(null); router.refresh(); }}
          showToast={showToast}
        />
      )}
    </>
  );
}

// ============================================================
// CARTE FORMATION
// ============================================================

interface TrainingCardProps {
  training: Training;
  acquired: boolean;
  canValidate: boolean;
  canEdit: boolean;
  onValidate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TrainingCard({ training, acquired, canValidate, canEdit, onValidate, onEdit, onDelete }: TrainingCardProps) {
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3 mb-3">
          {/* Badge visuel */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] text-2xl font-extrabold shrink-0 overflow-hidden">
            {training.badge_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={training.badge_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              training.badge_icon || '★'
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text text-sm">{training.name}</h3>
              {acquired && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1e7a4e]/15 text-[#5ee0a1] border border-[#1e7a4e]/30">
                  <CheckCircle2 className="w-3 h-3" /> Acquis
                </span>
              )}
            </div>
            {training.description && (
              <p className="text-[12px] text-text-faint mt-1 line-clamp-2 leading-relaxed">{training.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10.5px] text-text-faint">
          <Lock className="w-3 h-3" />
          <span>
            Validable par : <span className="text-text-dim font-medium">{GRADE_LABELS[training.required_validator_grade]}+</span>
          </span>
        </div>
      </div>

      {/* Actions */}
      {(canValidate || canEdit) && (
        <div className="px-5 py-3 border-t border-border bg-bg-2 flex gap-2 flex-wrap">
          {canValidate && (
            <button onClick={onValidate} className="btn-ghost text-xs flex items-center gap-1.5 flex-1">
              <Plus className="w-3.5 h-3.5" /> Valider pour un agent
            </button>
          )}
          {canEdit && (
            <>
              <button
                onClick={onEdit}
                className="btn-ghost text-xs flex items-center gap-1.5"
                aria-label="Modifier"
                title="Modifier"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="btn-ghost text-xs flex items-center gap-1.5 text-[#ff7a82] hover:bg-usm-red/10"
                aria-label="Supprimer"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL CRÉER / ÉDITER
// ============================================================

interface CreateOrEditModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  submitting: boolean;
  setSubmitting: (b: boolean) => void;
  training?: Training; // si défini → mode édition
}

function CreateOrEditModal({ open, onClose, onDone, showToast, submitting, setSubmitting, training }: CreateOrEditModalProps) {
  const isEdit = !!training;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(training?.name || '');
  const [description, setDescription] = useState(training?.description || '');
  const [badgeIcon, setBadgeIcon] = useState(training?.badge_icon || '★');
  const [badgeImageUrl, setBadgeImageUrl] = useState(training?.badge_image_url || '');
  const [reqValidator, setReqValidator] = useState<Grade>(training?.required_validator_grade || 'operator');
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_BADGE_TYPES.includes(file.type)) {
      showToast('Format invalide. Accepté : JPG, PNG, WEBP, SVG', 'error');
      return;
    }
    if (file.size > MAX_BADGE_SIZE) {
      showToast('Image trop lourde. Max 1 Mo', 'error');
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    // Path unique par formation (ID si edit, sinon timestamp)
    const folder = training?.id || `new-${Date.now()}`;
    const path = `${folder}/badge-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('badges').upload(path, file, {
      upsert: true,
      cacheControl: '3600',
    });

    if (upErr) {
      showToast(`Upload échoué : ${upErr.message}`, 'error');
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from('badges').getPublicUrl(path);
    setBadgeImageUrl(`${pub.publicUrl}?t=${Date.now()}`);
    showToast('Image uploadée', 'success');
    setUploading(false);
  }

  function handleRemoveImage() {
    setBadgeImageUrl('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Le nom est obligatoire', 'error');
      return;
    }
    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      badge_icon: badgeIcon || '★',
      badge_image_url: badgeImageUrl || null,
      required_validator_grade: reqValidator,
    };

    if (isEdit && training) {
      const { error } = await supabase.from('trainings').update(payload).eq('id', training.id);
      if (error) {
        showToast(`Erreur : ${error.message}`, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Formation mise à jour', 'success');
    } else {
      const { error } = await supabase.from('trainings').insert(payload);
      if (error) {
        showToast(`Erreur : ${error.message}`, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Formation créée', 'success');
    }

    setSubmitting(false);
    onDone();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la formation' : 'Nouvelle formation'}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost" disabled={submitting || uploading}>Annuler</button>
          <button onClick={handleSubmit} className="btn-gold" disabled={submitting || uploading}>
            {submitting ? '...' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image badge */}
        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Visuel du badge</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] text-2xl font-extrabold overflow-hidden shrink-0">
              {badgeImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={badgeImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                badgeIcon || '★'
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || submitting}
                className="btn-ghost text-xs flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                {uploading ? 'Upload...' : badgeImageUrl ? 'Changer l\'image' : 'Importer une image'}
              </button>
              {badgeImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploading || submitting}
                  className="btn-ghost text-xs flex items-center gap-1.5 text-[#ff7a82]"
                >
                  <X className="w-3.5 h-3.5" /> Retirer
                </button>
              )}
              <p className="text-[11px] text-text-faint">JPG, PNG, WEBP ou SVG · 1 Mo max. Sans image, l&apos;icône emoji est utilisée.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Icône (si pas d&apos;image)</label>
          <input
            value={badgeIcon}
            onChange={(e) => setBadgeIcon(e.target.value.slice(0, 4))}
            className="input w-24 text-center text-xl"
            placeholder="★"
          />
          <p className="text-[11px] text-text-faint mt-1.5">Un emoji ou caractère unicode. Exemples : ★ ⚔ ⚡ 🛡 🚁 ⊠</p>
        </div>

        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Ex: Tir tactique" />
        </div>

        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full min-h-[80px] resize-y"
            placeholder="Objectifs et contenu de la formation..."
          />
        </div>

        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Validable par (grade minimum)</label>
          <select
            value={reqValidator}
            onChange={(e) => setReqValidator(e.target.value as Grade)}
            className="input w-full"
          >
            {VALIDATOR_GRADES.map((g) => (
              <option key={g} value={g}>{GRADE_LABELS[g]}+</option>
            ))}
          </select>
          <p className="text-[11px] text-text-faint mt-1.5">Les Formateurs peuvent aussi valider, quel que soit leur grade.</p>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// MODAL SUPPRIMER (soft delete)
// ============================================================

interface DeleteModalProps {
  training: Training;
  onClose: () => void;
  onDone: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function DeleteModal({ training, onClose, onDone, showToast }: DeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [badgesCount, setBadgesCount] = useState<number | null>(null);

  // Compte les agents qui ont ce badge
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('agent_trainings')
      .select('*', { count: 'exact', head: true })
      .eq('training_id', training.id)
      .then(({ count }) => setBadgesCount(count || 0));
  }, [training.id]);

  async function handleDelete() {
    setSubmitting(true);
    const supabase = createClient();
    // Soft delete : on désactive plutôt que supprimer (préserve l'historique)
    const { error } = await supabase
      .from('trainings')
      .update({ is_active: false })
      .eq('id', training.id);

    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }
    showToast('Formation archivée', 'success');
    setSubmitting(false);
    onDone();
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Archiver la formation"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Annuler</button>
          <button onClick={handleDelete} className="btn-danger" disabled={submitting}>
            {submitting ? '...' : 'Archiver'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-text">
          Archiver la formation <strong className="text-usm-gold-light">{training.name}</strong> ?
        </p>
        <div className="card p-3 bg-usm-gold/5 border-usm-gold/30 text-[12.5px] text-text-dim space-y-1.5">
          <p>
            <strong className="text-usm-gold-light">Soft delete</strong> : la formation disparaîtra du catalogue mais{' '}
            {badgesCount === null
              ? 'les badges déjà attribués'
              : badgesCount === 0
              ? 'aucun agent ne sera affecté'
              : `${badgesCount} agent${badgesCount > 1 ? 's' : ''} qui ${badgesCount > 1 ? 'ont' : 'a'} ce badge le conserveront`}
            .
          </p>
          <p className="text-[11.5px] text-text-faint">
            L&apos;historique est préservé. Tu pourras réactiver la formation depuis l&apos;admin si besoin.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// MODAL VALIDER POUR UN AGENT
// ============================================================

interface ValidateModalProps {
  training: Training;
  currentAgent: Agent;
  onClose: () => void;
  onDone: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function ValidateModal({ training, currentAgent, onClose, onDone, showToast }: ValidateModalProps) {
  const [agents, setAgents] = useState<Pick<Agent, 'id' | 'pseudo_rp' | 'matricule' | 'grade'>[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Charge les agents au montage
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('agents')
      .select('id, pseudo_rp, matricule, grade')
      .eq('is_active', true)
      .order('pseudo_rp')
      .then(({ data }) => {
        setAgents(data || []);
        setLoaded(true);
      });
  }, []);

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgentId) {
      showToast('Sélectionne un agent', 'error');
      return;
    }
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('agent_trainings').insert({
      agent_id: selectedAgentId,
      training_id: training.id,
      validated_by: currentAgent.id,
      notes: notes || null,
    });

    if (error) {
      const msg = error.code === '23505'
        ? 'Cet agent a déjà cette formation'
        : `Erreur : ${error.message}`;
      showToast(msg, 'error');
      setSubmitting(false);
      return;
    }
    showToast('Badge attribué', 'success');
    setSubmitting(false);
    onDone();
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Valider : ${training.name}`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Annuler</button>
          <button onClick={handleValidate} className="btn-gold" disabled={submitting || !selectedAgentId}>
            {submitting ? '...' : 'Valider'}
          </button>
        </>
      }
    >
      <form onSubmit={handleValidate} className="space-y-4">
        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Agent à valider</label>
          {!loaded ? (
            <div className="input w-full text-text-faint">Chargement...</div>
          ) : (
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="input w-full"
            >
              <option value="">— Sélectionne un agent —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.pseudo_rp || 'Sans pseudo'}
                  {a.matricule ? ` · #${a.matricule}` : ''}
                  {a.grade ? ` · ${GRADE_LABELS[a.grade]}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Notes (optionnel)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full min-h-[60px] resize-y"
            placeholder="Observations sur la validation..."
          />
        </div>
      </form>
    </Modal>
  );
}
