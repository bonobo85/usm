'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, Save, Camera, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent } from '@/lib/types';
import { GRADE_LABELS, DISCIPLINARY_LABELS, GRADE_ORDER } from '@/lib/types';
import { formatDate, getInitials } from '@/lib/utils/format';
import { CertificatesManager } from './CertificatesManager';

interface Props {
  target: Agent;
  currentAgent: Agent;
  badges: any[];
  disciplinary: any[];
  certificates?: any[];
  isSelf: boolean;
  canManageBadges?: boolean;
  canIssueCertificates?: boolean;
}

const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 Mo
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ProfileView({ target, currentAgent, badges, disciplinary, certificates = [], isSelf, canManageBadges = false, canIssueCertificates = false }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'overview' | 'badges' | 'disciplinary' | 'certificates'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [pseudoRp, setPseudoRp] = useState(target.pseudo_rp || '');
  const [bio, setBio] = useState(target.bio || '');
  const [matricule, setMatricule] = useState(target.matricule || '');
  const [specialties, setSpecialties] = useState((target.specialties || []).join(', '));
  const [photoUrl, setPhotoUrl] = useState(target.photo_url || '');
  const [dateRecruitment, setDateRecruitment] = useState(target.date_recruitment || '');

  // Permissions de visualisation
  const isCoLeaderPlus = GRADE_ORDER[currentAgent.grade] >= GRADE_ORDER['co_leader'] || currentAgent.is_admin;
  const isOperatorPlus = GRADE_ORDER[currentAgent.grade] >= GRADE_ORDER['operator'] || currentAgent.is_admin;
  const canSeeStats = isSelf || isOperatorPlus;
  const canSeeDisciplinary = isCoLeaderPlus;
  const canEdit = isSelf || currentAgent.is_admin;

  // L'avatar affiché : priorité à photo_url (uploadée), fallback Discord
  const displayedAvatar = target.photo_url || target.discord_avatar_url;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showToast('Format invalide. Accepté : JPG, PNG, WEBP, GIF', 'error');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      showToast('Image trop lourde. Max 2 Mo', 'error');
      return;
    }

    setUploadingPhoto(true);
    const supabase = createClient();

    // Path : {user_id}/avatar.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${target.id}/avatar.${ext}`;

    // Upsert pour remplacer si déjà existant
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      showToast(`Upload échoué : ${uploadError.message}`, 'error');
      setUploadingPhoto(false);
      return;
    }

    // Récupère l'URL publique (avec timestamp pour buster le cache)
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const newUrl = `${pub.publicUrl}?t=${Date.now()}`;

    setPhotoUrl(newUrl);
    showToast('Photo uploadée. N\'oublie pas d\'enregistrer.', 'info');
    setUploadingPhoto(false);
  }

  async function handleRemovePhoto() {
    if (!confirm('Supprimer ta photo de profil ?')) return;
    setUploadingPhoto(true);
    const supabase = createClient();

    // Supprime tous les fichiers du dossier user
    const { data: files } = await supabase.storage.from('avatars').list(target.id);
    if (files && files.length > 0) {
      await supabase.storage
        .from('avatars')
        .remove(files.map((f) => `${target.id}/${f.name}`));
    }

    setPhotoUrl('');
    showToast('Photo supprimée. N\'oublie pas d\'enregistrer.', 'info');
    setUploadingPhoto(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createClient();
    const updatePayload: Record<string, unknown> = {
      pseudo_rp: pseudoRp,
      bio,
      matricule: matricule || null,
      specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
      photo_url: photoUrl || null,
    };
    // Seul un admin peut modifier la date de recrutement
    if (currentAgent.is_admin && dateRecruitment) {
      updatePayload.date_recruitment = dateRecruitment;
    }
    const { error } = await supabase
      .from('agents')
      .update(updatePayload)
      .eq('id', target.id);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      setSubmitting(false);
      return;
    }
    showToast('Profil mis à jour', 'success');
    setShowEditModal(false);
    setSubmitting(false);
    router.refresh();
  }

  async function handleRemoveBadge(badgeId: string, badgeName: string) {
    if (!confirm(`Retirer le badge "${badgeName}" à ${target.pseudo_rp || 'cet agent'} ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('agent_trainings').delete().eq('id', badgeId);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      return;
    }
    showToast('Badge retiré', 'success');
    router.refresh();
  }

  const stats = {
    badges: badges.length,
    disciplinary: disciplinary.length,
    ancientete: target.date_recruitment ? `${calcMonths(target.date_recruitment)}` : '—',
  };

  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border p-7 flex gap-6 mb-5"
        style={{ background: 'linear-gradient(135deg, #0d0f24 0%, #1d2052 50%, #4a2a7a 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 500px 250px at 90% -20%, rgba(212, 161, 58, 0.15), transparent 60%)' }} />

        <div className="w-[110px] h-[110px] rounded-2xl bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] text-4xl font-extrabold shrink-0 shadow-2xl relative z-10 overflow-hidden">
          {displayedAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayedAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(target.pseudo_rp || target.discord_username)
          )}
        </div>

        <div className="flex-1 relative z-10 text-white">
          {target.matricule && (
            <span className="inline-block px-2.5 py-1 bg-usm-gold/15 border border-usm-gold/40 rounded-full font-mono text-[11px] text-usm-gold-light font-medium mb-2.5">
              🎖 {target.matricule}
              {target.date_recruitment && ` · Recruté le ${formatDate(target.date_recruitment)}`}
            </span>
          )}
          <h1 className="text-[32px] font-bold text-white leading-none tracking-tight">
            {target.pseudo_rp || target.discord_username || 'Sans nom'}
          </h1>
          <div className="mt-2.5 inline-block px-3.5 py-1.5 bg-gradient-to-br from-usm-red-bright to-[#2e0608] text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-lg">
            {GRADE_LABELS[target.grade]}
            {target.is_formateur && ' · Formateur'}
          </div>
          {target.bio && (
            <p className="mt-3.5 text-white/[0.78] text-[13px] leading-relaxed max-w-[540px]">{target.bio}</p>
          )}
          <div className="mt-4 flex gap-7 text-[11px]">
            <StatItem label="Badges" value={stats.badges.toString()} />
            <StatItem label="Ancienneté" value={stats.ancientete} />
            {canSeeStats && <StatItem label="Sanctions" value={disciplinary.filter((d) => d.status === 'applied').length.toString()} />}
            <StatItem label="Statut" value={target.is_active ? '● Actif' : '○ Inactif'} valueClass={target.is_active ? 'text-[#5ee0a1]' : 'text-text-faint'} />
          </div>
        </div>

        {canEdit && (
          <button onClick={() => setShowEditModal(true)} className="relative z-10 self-start btn-ghost flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" /> Modifier
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-panel border border-border rounded-xl p-1 mb-5">
        <Tab active={tab === 'overview'} onClick={() => setTab('overview')} emoji="👤" label="Vue d'ensemble" />
        <Tab active={tab === 'badges'} onClick={() => setTab('badges')} emoji="🎖" label={`Badges & formations (${badges.length})`} />
        {canSeeDisciplinary && <Tab active={tab === 'disciplinary'} onClick={() => setTab('disciplinary')} emoji="⚠️" label={`Disciplinaire (${disciplinary.length})`} />}
        {(canSeeStats || certificates.length > 0) && <Tab active={tab === 'certificates'} onClick={() => setTab('certificates')} emoji="📜" label={`Attestations (${certificates.length})`} />}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <Card title="Identité" emoji="📋">
            <div className="space-y-3 pt-1">
              <Row label="Pseudo RP" value={target.pseudo_rp || '—'} />
              <Row label="Discord" value={target.discord_username || '—'} />
              <Row label="Matricule" value={target.matricule || 'Non assigné'} />
              <Row label="Grade" value={GRADE_LABELS[target.grade]} />
              {target.is_formateur && <Row label="Statut" value="Formateur" />}
              {target.specialties && target.specialties.length > 0 && (
                <Row label="Spécialités" value={target.specialties.join(', ')} />
              )}
              <Row label="Recruté le" value={target.date_recruitment ? formatDate(target.date_recruitment) : '—'} />
            </div>
          </Card>

          <Card title="Derniers badges" emoji="🏅">
            {badges.length === 0 ? (
              <div className="text-center text-text-faint py-4 text-sm">Aucun badge.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {badges.slice(0, 6).map((b: any) => (
                  <div key={b.id} className="bg-gradient-to-br from-panel-2 to-panel border border-border rounded-lg p-3 text-center hover:border-usm-gold transition-all">
                    <div
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-usm-gold-light to-usm-gold-dark mx-auto mb-2 flex items-center justify-center text-[#0a0a12] text-lg font-black overflow-hidden"
                      style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.3), inset 0 0 0 2px #b8252b' }}
                    >
                      {b.training?.badge_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.training.badge_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        b.training?.badge_icon || '★'
                      )}
                    </div>
                    <div className="text-[10.5px] font-semibold text-text truncate">{b.training?.name || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'badges' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {badges.length === 0 ? (
            <div className="col-span-full text-center py-12 text-text-faint">Aucun badge obtenu.</div>
          ) : (
            badges.map((b: any) => (
              <div key={b.id} className="card p-4 text-center hover:border-usm-gold transition-all hover:-translate-y-1 relative group">
                {canManageBadges && (
                  <button
                    onClick={() => handleRemoveBadge(b.id, b.training?.name || 'badge')}
                    className="absolute top-2 right-2 w-6 h-6 rounded-md bg-usm-red/10 text-[#ff7a82] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-usm-red/20"
                    title="Retirer ce badge"
                    aria-label="Retirer ce badge"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-usm-gold-light to-usm-gold-dark mx-auto mb-3 flex items-center justify-center text-[#0a0a12] text-2xl font-black overflow-hidden"
                  style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.4), inset 0 0 0 3px #b8252b' }}
                >
                  {b.training?.badge_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.training.badge_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    b.training?.badge_icon || '★'
                  )}
                </div>
                <div className="text-sm font-semibold text-text mb-1">{b.training?.name || '—'}</div>
                <div className="text-[11px] text-text-faint font-mono">{formatDate(b.validated_at)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'disciplinary' && canSeeDisciplinary && (
        <div className="space-y-2">
          {disciplinary.length === 0 ? (
            <div className="card p-12 text-center text-text-faint">Aucun enregistrement disciplinaire.</div>
          ) : (
            disciplinary.map((d) => (
              <div key={d.id} className="card p-4 flex items-center gap-4">
                <div className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-usm-red/15 text-[#ff7a82] border-usm-red/40 shrink-0">
                  {DISCIPLINARY_LABELS[d.type as keyof typeof DISCIPLINARY_LABELS]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text font-medium truncate">{d.reason}</div>
                  <div className="text-[11px] text-text-faint mt-1">Statut : {d.status} · {formatDate(d.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'certificates' && (
        <CertificatesManager
          certificates={certificates}
          targetAgent={{
            id: target.id,
            pseudo_rp: target.pseudo_rp,
            matricule: target.matricule,
            grade: target.grade,
          }}
          currentAgent={currentAgent}
          canIssue={canIssueCertificates}
        />
      )}

      {/* Edit modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier mon profil"
        size="md"
        footer={
          <>
            <button onClick={() => setShowEditModal(false)} className="btn-ghost" disabled={submitting}>Annuler</button>
            <button onClick={handleSave} className="btn-gold flex items-center gap-1.5" disabled={submitting}>
              <Save className="w-3.5 h-3.5" />
              {submitting ? '...' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Photo de profil */}
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Photo de profil</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-bold text-lg overflow-hidden shrink-0">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : target.discord_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={target.discord_avatar_url} alt="" className="w-full h-full object-cover opacity-60" />
                ) : (
                  getInitials(target.pseudo_rp || target.discord_username)
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto || submitting}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingPhoto ? 'Upload...' : photoUrl ? 'Changer' : 'Importer une photo'}
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto || submitting}
                    className="btn-ghost text-xs flex items-center gap-1.5 text-[#ff7a82]"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                )}
                <p className="text-[11px] text-text-faint">JPG, PNG, WEBP ou GIF · 2 Mo max</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Pseudo RP</label>
            <input value={pseudoRp} onChange={(e) => setPseudoRp(e.target.value)} className="input w-full" placeholder="Nom RP" />
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Matricule souhaité</label>
            <input value={matricule} onChange={(e) => setMatricule(e.target.value)} className="input w-full font-mono" placeholder="Ex: USM-042" />
            <p className="text-[11px] text-text-faint mt-1.5">Le matricule sera validé par un Co-leader ou supérieur.</p>
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input w-full min-h-[80px] resize-y" placeholder="Présentation courte..." />
          </div>
          <div>
            <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Spécialités (séparées par des virgules)</label>
            <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} className="input w-full" placeholder="Ex: Tir, Conduite, Négociation" />
          </div>
          {currentAgent.is_admin && (
            <div>
              <label className="block text-[11px] text-usm-gold uppercase tracking-wider font-semibold mb-2">Date de recrutement (admin)</label>
              <input
                type="date"
                value={dateRecruitment ? String(dateRecruitment).slice(0, 10) : ''}
                onChange={(e) => setDateRecruitment(e.target.value)}
                className="input w-full"
              />
              <p className="text-[11px] text-text-faint mt-1.5">Modifiable uniquement par un administrateur.</p>
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}

function StatItem({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-usm-gold-light/80 uppercase tracking-wider text-[10.5px] font-semibold">{label}</div>
      <div className={`text-white text-sm mt-1 font-medium ${valueClass}`}>{value}</div>
    </div>
  );
}

function Tab({ active, onClick, emoji, label }: { active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[12.5px] font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
        active ? 'text-text bg-panel-3 shadow-md' : 'text-text-faint hover:text-text'
      }`}
    >
      <span>{emoji}</span> {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-border-soft last:border-b-0">
      <div className="text-[10.5px] text-text-faint uppercase tracking-wider font-semibold w-28 shrink-0">{label}</div>
      <div className="text-sm text-text">{value}</div>
    </div>
  );
}

function calcMonths(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  if (months < 1) return 'moins d\'un mois';
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return `${years} an${years > 1 ? 's' : ''}${restMonths > 0 ? ` ${restMonths} mois` : ''}`;
}
