'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pin, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent, Announcement } from '@/lib/types';
import { GRADE_LABELS } from '@/lib/types';
import { formatDateTime } from '@/lib/utils/format';

interface Props {
  announcements: any[];
  currentAgent: Agent;
  canCreatePublic: boolean;
  canCreateInternal: boolean;
}

export function AnnouncementsList({ announcements, currentAgent, canCreatePublic, canCreateInternal }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'public' | 'internal'>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'public' | 'internal'>(canCreatePublic ? 'public' : 'internal');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filtered = announcements.filter((a) => filter === 'all' || a.type === filter);

  function openCreate() {
    setEditingId(null);
    setTitle('');
    setContent('');
    setType(canCreatePublic ? 'public' : 'internal');
    setIsPinned(false);
    setShowModal(true);
  }

  function openEdit(a: any) {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setType(a.type);
    setIsPinned(a.is_pinned);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Titre et contenu obligatoires', 'error');
      return;
    }
    setSubmitting(true);
    const supabase = createClient();

    if (editingId) {
      // Édition (note : le trigger d'annonce ne renvoie PAS de notif sur update, seulement insert)
      const { error } = await supabase
        .from('announcements')
        .update({ type, title, content, is_pinned: isPinned })
        .eq('id', editingId);
      if (error) {
        showToast(`Erreur : ${error.message}`, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Annonce modifiée', 'success');
    } else {
      const { error } = await supabase.from('announcements').insert({
        type, title, content, author_id: currentAgent.id, is_pinned: isPinned,
      });
      if (error) {
        showToast(`Erreur : ${error.message}`, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Annonce publiée', 'success');
    }

    setTitle(''); setContent(''); setIsPinned(false); setEditingId(null);
    setShowModal(false);
    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      return;
    }
    showToast('Annonce supprimée', 'success');
    router.refresh();
  }

  const canCreate = canCreatePublic || canCreateInternal;

  return (
    <>
      <PageHeader
        title="Annonces & communiqués"
        subtitle={`${announcements.length} publication${announcements.length !== 1 ? 's' : ''}`}
        actions={
          canCreate && (
            <button onClick={openCreate} className="btn-gold flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nouvelle annonce
            </button>
          )
        }
      />

      {/* Filtres */}
      <div className="flex gap-1.5 mb-4">
        {([
          { v: 'all', l: 'Toutes' },
          { v: 'public', l: 'Annonces publiques' },
          { v: 'internal', l: 'Communiqués internes' },
        ] as const).map((f) => (
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

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-text-faint">Aucune annonce.</div>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="card p-5 hover:border-usm-gold-dark transition-colors">
              <div className="flex items-start gap-3">
                <Avatar
                  src={a.author?.discord_avatar_url}
                  name={a.author?.pseudo_rp}
                  size="sm"
                  variant={a.type === 'internal' ? 'red' : 'blue'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-semibold text-text text-sm">{a.author?.pseudo_rp || 'Anonyme'}</span>
                    {a.author?.grade && (
                      <span className="text-[10px] text-usm-gold font-mono uppercase">{GRADE_LABELS[a.author.grade as keyof typeof GRADE_LABELS]}</span>
                    )}
                    {a.type === 'internal' ? (
                      <span className="text-[9.5px] bg-usm-red text-white px-2 py-px rounded font-bold uppercase tracking-wider">Interne</span>
                    ) : (
                      <span className="text-[9.5px] bg-[#2c5fb8] text-white px-2 py-px rounded font-bold uppercase tracking-wider">Publique</span>
                    )}
                    {a.is_pinned && (
                      <span className="flex items-center gap-1 text-[10px] text-usm-gold-light"><Pin className="w-3 h-3" /> Épinglé</span>
                    )}
                    <span className="text-[11px] text-text-faint font-mono ml-auto">{formatDateTime(a.published_at)}</span>
                  </div>
                  <h3 className="font-semibold text-base text-text mb-2">{a.title}</h3>
                  <div className="text-text-dim text-[13.5px] leading-relaxed whitespace-pre-wrap">{a.content}</div>
                </div>
                {(a.author_id === currentAgent.id || currentAgent.is_admin) && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      className="text-text-faint hover:text-usm-gold-light p-1 rounded transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-text-faint hover:text-usm-red-bright p-1 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal création / édition */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-ghost" disabled={submitting}>Annuler</button>
            <button onClick={handleSubmit} className="btn-gold" disabled={submitting}>
              {submitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Publier'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Type</label>
            <div className="flex gap-2">
              {canCreatePublic && (
                <button
                  type="button"
                  onClick={() => setType('public')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                    type === 'public' ? 'bg-[#2c5fb8]/20 border-[#2c5fb8] text-[#7aa5e8]' : 'bg-panel border-border text-text-dim'
                  }`}
                >
                  📢 Annonce publique
                </button>
              )}
              {canCreateInternal && (
                <button
                  type="button"
                  onClick={() => setType('internal')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                    type === 'internal' ? 'bg-usm-red/20 border-usm-red text-[#ff7a82]' : 'bg-panel border-border text-text-dim'
                  }`}
                >
                  🔒 Communiqué interne
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              placeholder="Titre de l'annonce"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Contenu</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input w-full min-h-[150px] resize-y"
              placeholder="Contenu de l'annonce..."
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 accent-usm-gold"
            />
            <span className="text-sm text-text-dim">Épingler en haut de la liste</span>
          </label>
        </form>
      </Modal>
    </>
  );
}
