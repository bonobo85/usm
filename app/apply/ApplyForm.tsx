'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

interface FormQuestion {
  id: string;
  field_key: string;
  label: string;
  description: string | null;
  type: 'text' | 'textarea' | 'number' | 'select';
  options: string[];
  required: boolean;
  position: number;
}

interface Props {
  questions: FormQuestion[];
  userId: string;
  discordId: string;
  discordUsername: string;
}

export function ApplyForm({ questions, userId, discordId, discordUsername }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setField(key: string, value: string) {
    setFormData((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Vérif champs requis
    for (const q of questions) {
      if (q.required && !(formData[q.field_key] || '').trim()) {
        showToast(`Champ requis : ${q.label}`, 'error');
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('applications').insert({
      user_id: userId,
      discord_id: discordId,
      discord_username: discordUsername,
      form_data: formData,
      status: 'pending',
    });

    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="card p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#1e7a4e]/20 border border-[#1e7a4e]/50 flex items-center justify-center text-[#5ee0a1] text-2xl">
          ✓
        </div>
        <h2 className="text-xl font-bold text-text">Candidature reçue !</h2>
        <p className="text-text-faint text-sm leading-relaxed">
          Ta candidature a bien été enregistrée. Un Co-leader USM va l&apos;examiner sous peu et tu
          recevras une notification Discord avec la décision.
        </p>
        <p className="text-text-faint text-xs">Tu peux fermer cette page.</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-faint">
          Aucune question de formulaire n&apos;est configurée pour le moment. Reviens plus tard ou
          contacte un Co-leader.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div className="text-[12px] text-text-faint p-3 bg-bg-2 rounded-lg border border-border-soft">
        Tu postules avec ton compte Discord <strong className="text-text-dim">{discordUsername}</strong>.
        Toutes les questions marquées <span className="text-usm-red">*</span> sont obligatoires.
      </div>

      {questions.map((q) => (
        <div key={q.id}>
          <label className="block text-[11.5px] text-usm-gold uppercase tracking-wider font-semibold mb-1.5">
            {q.label}
            {q.required && <span className="text-usm-red ml-1">*</span>}
          </label>
          {q.description && <p className="text-[11px] text-text-faint mb-2">{q.description}</p>}

          {q.type === 'textarea' && (
            <textarea
              value={formData[q.field_key] || ''}
              onChange={(e) => setField(q.field_key, e.target.value)}
              className="input w-full min-h-[80px] resize-y"
              required={q.required}
              maxLength={2000}
            />
          )}

          {q.type === 'text' && (
            <input
              type="text"
              value={formData[q.field_key] || ''}
              onChange={(e) => setField(q.field_key, e.target.value)}
              className="input w-full"
              required={q.required}
              maxLength={200}
            />
          )}

          {q.type === 'number' && (
            <input
              type="number"
              value={formData[q.field_key] || ''}
              onChange={(e) => setField(q.field_key, e.target.value)}
              className="input w-full"
              required={q.required}
              min="13"
              max="120"
            />
          )}

          {q.type === 'select' && (
            <select
              value={formData[q.field_key] || ''}
              onChange={(e) => setField(q.field_key, e.target.value)}
              className="input w-full"
              required={q.required}
            >
              <option value="">— Choisir —</option>
              {(q.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold w-full py-3 text-sm font-semibold"
      >
        {submitting ? 'Envoi en cours...' : 'Soumettre ma candidature'}
      </button>
    </form>
  );
}
