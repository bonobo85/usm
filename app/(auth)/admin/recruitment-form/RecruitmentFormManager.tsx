'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, X, Pencil, Trash2, GripVertical } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent } from '@/lib/types';

interface Question {
  id: string;
  field_key: string;
  label: string;
  description: string | null;
  type: 'text' | 'textarea' | 'number' | 'select';
  options: string[];
  required: boolean;
  position: number;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  proposer?: { pseudo_rp: string } | null;
  approver?: { pseudo_rp: string } | null;
}

interface Props {
  questions: Question[];
  currentAgent: Agent;
  isCoLeaderPlus: boolean;
}

const STATUS_STYLES = {
  pending: 'bg-usm-gold/15 text-usm-gold-light border-usm-gold/30',
  approved: 'bg-[#1e7a4e]/15 text-[#5ee0a1] border-[#1e7a4e]/30',
  rejected: 'bg-usm-red/15 text-[#ff7a82] border-usm-red/30',
  archived: 'bg-text-faint/15 text-text-faint border-border',
};

const STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  archived: 'Archivée',
};

export function RecruitmentFormManager({ questions, currentAgent, isCoLeaderPlus }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showModal, setShowModal] = useState<{ mode: 'create' | 'edit'; q?: Question } | null>(null);

  const filtered = questions.filter((q) => filter === 'all' || q.status === filter);
  const counts = {
    all: questions.length,
    pending: questions.filter((q) => q.status === 'pending').length,
    approved: questions.filter((q) => q.status === 'approved').length,
    rejected: questions.filter((q) => q.status === 'rejected').length,
  };

  async function handleApprove(q: Question) {
    const supabase = createClient();
    const { error } = await supabase
      .from('application_form_questions')
      .update({ status: 'approved', approved_by: currentAgent.id })
      .eq('id', q.id);
    if (error) return showToast(`Erreur : ${error.message}`, 'error');
    showToast('Question approuvée', 'success');
    router.refresh();
  }

  async function handleReject(q: Question) {
    const supabase = createClient();
    const { error } = await supabase
      .from('application_form_questions')
      .update({ status: 'rejected', approved_by: currentAgent.id })
      .eq('id', q.id);
    if (error) return showToast(`Erreur : ${error.message}`, 'error');
    showToast('Question refusée', 'success');
    router.refresh();
  }

  async function handleDelete(q: Question) {
    if (!confirm(`Supprimer la question "${q.label}" ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('application_form_questions').delete().eq('id', q.id);
    if (error) return showToast(`Erreur : ${error.message}`, 'error');
    showToast('Question supprimée', 'success');
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Questions du formulaire de recrutement"
        subtitle="Propose, valide et organise les questions posées aux candidats"
        actions={
          <button
            onClick={() => setShowModal({ mode: 'create' })}
            className="btn-gold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Proposer une question
          </button>
        }
      />

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
              filter === f
                ? 'bg-gradient-to-br from-usm-gold to-usm-gold-dark text-[#0a0a12] border-usm-gold'
                : 'bg-panel text-text-dim border-border hover:text-text'
            }`}
          >
            {f === 'all' ? `Toutes (${counts.all})` : `${STATUS_LABELS[f]} (${counts[f]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-text-faint">Aucune question.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start gap-3">
                <GripVertical className="w-4 h-4 text-text-faint mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10.5px] text-text-faint font-mono">#{q.position}</span>
                    <span className="font-semibold text-text text-sm">{q.label}</span>
                    {q.required && <span className="text-[10px] text-usm-red font-bold">*requis</span>}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_STYLES[q.status]}`}>
                      {STATUS_LABELS[q.status]}
                    </span>
                    <span className="text-[10px] uppercase text-text-faint font-medium ml-auto">{q.type}</span>
                  </div>
                  {q.description && <p className="text-[12px] text-text-faint mb-1">{q.description}</p>}
                  <div className="text-[10.5px] text-text-faint/70 flex gap-2 flex-wrap">
                    <span>clé: <code className="font-mono">{q.field_key}</code></span>
                    {q.proposer && <span>proposée par {q.proposer.pseudo_rp}</span>}
                    {q.approver && <span>traitée par {q.approver.pseudo_rp}</span>}
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  {isCoLeaderPlus && q.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(q)}
                        className="btn-ghost text-xs flex items-center gap-1.5 text-[#5ee0a1]"
                        title="Approuver"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleReject(q)}
                        className="btn-ghost text-xs flex items-center gap-1.5 text-[#ff7a82]"
                        title="Refuser"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {isCoLeaderPlus && (
                    <>
                      <button
                        onClick={() => setShowModal({ mode: 'edit', q })}
                        className="btn-ghost text-xs"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        className="btn-ghost text-xs text-[#ff7a82]"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <QuestionModal
          mode={showModal.mode}
          question={showModal.q}
          isCoLeaderPlus={isCoLeaderPlus}
          currentAgent={currentAgent}
          maxPosition={Math.max(0, ...questions.map((q) => q.position))}
          onClose={() => setShowModal(null)}
          onDone={() => {
            setShowModal(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

interface QuestionModalProps {
  mode: 'create' | 'edit';
  question?: Question;
  isCoLeaderPlus: boolean;
  currentAgent: Agent;
  maxPosition: number;
  onClose: () => void;
  onDone: () => void;
}

function QuestionModal({ mode, question, isCoLeaderPlus, currentAgent, maxPosition, onClose, onDone }: QuestionModalProps) {
  const { showToast } = useToast();
  const isEdit = mode === 'edit';

  const [fieldKey, setFieldKey] = useState(question?.field_key || '');
  const [label, setLabel] = useState(question?.label || '');
  const [description, setDescription] = useState(question?.description || '');
  const [type, setType] = useState<Question['type']>(question?.type || 'text');
  const [options, setOptions] = useState((question?.options || []).join('\n'));
  const [required, setRequired] = useState(question?.required ?? true);
  const [position, setPosition] = useState(question?.position ?? maxPosition + 1);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldKey.trim() || !label.trim()) {
      showToast('Clé et label sont obligatoires', 'error');
      return;
    }
    // Vérif format de fieldKey (slug)
    if (!/^[a-z_][a-z0-9_]*$/.test(fieldKey)) {
      showToast('La clé doit être en snake_case (ex: real_age)', 'error');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const payload: Partial<Question> & { proposed_by?: string; status?: Question['status'] } = {
      field_key: fieldKey.trim(),
      label: label.trim(),
      description: description.trim() || null,
      type,
      options: type === 'select' ? options.split('\n').map((o) => o.trim()).filter(Boolean) : [],
      required,
      position,
    };

    if (isEdit && question) {
      const { error } = await supabase
        .from('application_form_questions')
        .update(payload)
        .eq('id', question.id);
      if (error) {
        showToast(`Erreur : ${error.message}`, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Question mise à jour', 'success');
    } else {
      // Création : status = pending si Formateur, approved direct si Co-leader+
      payload.proposed_by = currentAgent.id;
      payload.status = isCoLeaderPlus ? 'approved' : 'pending';
      const { error } = await supabase.from('application_form_questions').insert(payload);
      if (error) {
        const msg = error.code === '23505' ? 'Cette clé est déjà utilisée' : `Erreur : ${error.message}`;
        showToast(msg, 'error');
        setSubmitting(false);
        return;
      }
      showToast(isCoLeaderPlus ? 'Question créée et approuvée' : 'Question proposée, en attente de validation', 'success');
    }
    setSubmitting(false);
    onDone();
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Modifier la question' : 'Proposer une question'}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Annuler</button>
          <button onClick={handleSubmit} className="btn-gold" disabled={submitting}>
            {submitting ? '...' : isEdit ? 'Enregistrer' : 'Soumettre'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Clé technique (snake_case)</label>
          <input
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value.toLowerCase())}
            className="input w-full font-mono text-xs"
            placeholder="real_age"
            disabled={isEdit}
          />
          <p className="text-[10.5px] text-text-faint mt-1">Identifiant interne, ne peut pas être modifié après création.</p>
        </div>

        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Question affichée</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="input w-full" placeholder="Ton âge réel ?" />
        </div>

        <div>
          <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Description (optionnel)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="input w-full" placeholder="Précision affichée sous la question" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Type de champ</label>
            <select value={type} onChange={(e) => setType(e.target.value as Question['type'])} className="input w-full">
              <option value="text">Texte court</option>
              <option value="textarea">Texte long</option>
              <option value="number">Nombre</option>
              <option value="select">Liste déroulante</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Position</label>
            <input
              type="number"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="input w-full"
              min={1}
            />
          </div>
        </div>

        {type === 'select' && (
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Options (une par ligne)</label>
            <textarea
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              className="input w-full min-h-[100px] resize-y font-mono text-xs"
              placeholder="Oui&#10;Non&#10;Peut-être"
            />
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="w-4 h-4 accent-usm-gold"
          />
          <span className="text-sm text-text">Champ obligatoire</span>
        </label>
      </form>
    </Modal>
  );
}
