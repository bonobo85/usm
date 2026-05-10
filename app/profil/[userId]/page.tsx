"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { RankBadge, StatusDot } from "@/components/RankBadge";
import { BadgesRow } from "@/components/BadgeTag";
import { Modal } from "@/components/Modal";
import { getRang, estColeadMin, RANGS, ORDRE_BADGES, BADGES_META } from "@/lib/constants";
import { Edit3, Save, X, AlertTriangle, StickyNote, Trash2, Send, Loader2, Award, Crown, Plus } from "lucide-react";

export default function ProfilPage() {
  const supa = useSupabase();
  const { user: me, rang: myRang, estConnecte, estEnChargement } = useUser();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [hist, setHist] = useState<any[]>([]);
  const [badgesList, setBadgesList] = useState<string[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [showRankModal, setShowRankModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null);
  const [rankForm, setRankForm] = useState({ nouveau_rang: 1, raison: "" });
  const [revokeReason, setRevokeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const isMe = me?.id === userId;
  const canEditProfile = isMe || estColeadMin(myRang);
  const canSeeNotes = estColeadMin(myRang) && !isMe;
  const canManageRank = estColeadMin(myRang) && !isMe;
  const canManageBadges = estColeadMin(myRang) && !isMe;

  const loadProfile = useCallback(async () => {
    if (!userId || !estConnecte) return;
    setLoading(true);
    setError(null);

    const { data: userData, error: userErr } = await supa.from("users").select("*").eq("id", userId).single();
    if (userErr || !userData) {
      setError("Profil introuvable.");
      setLoading(false);
      return;
    }
    setProfile(userData);
    setForm({
      surnom: userData.surnom ?? "",
      date_naissance: userData.date_naissance ?? "",
      lieu_naissance: userData.lieu_naissance ?? "",
      telephone: userData.telephone ?? ""
    });

    const { data: ub } = await supa.from("user_badges").select("is_active, badges(code)").eq("user_id", userId).eq("is_active", true);
    setBadgesList((ub ?? []).map((b: any) => b.badges?.code).filter(Boolean));

    const { data: rh } = await supa.from("rank_history").select("*").eq("user_id", userId).order("modifie_le", { ascending: false });
    setHist(rh ?? []);

    if (estColeadMin(myRang) && !isMe) {
      const { data: n } = await supa.from("profile_notes").select("*, auteur:auteur_id(surnom, username)").eq("user_id", userId).order("created_at", { ascending: false });
      setNotes(n ?? []);
    }

    setLoading(false);
  }, [userId, estConnecte, supa, myRang, isMe]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const save = async () => {
    setSaving(true); setErrMsg(null);
    const r = isMe
      ? await api("user:update_self", form)
      : await api("user:update_other", { user_id: userId, fields: form });
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setEdit(false);
    await loadProfile();
  };

  const changeRank = async () => {
    if (rankForm.raison.length < 3) return;
    setSaving(true); setErrMsg(null);
    const r = await api("user:rank_change", { user_id: userId, nouveau_rang: rankForm.nouveau_rang, raison: rankForm.raison });
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setShowRankModal(false);
    setRankForm({ nouveau_rang: 1, raison: "" });
    await loadProfile();
  };

  const grantBadge = async (badge_code: string) => {
    setSaving(true); setErrMsg(null);
    const r = await api("user:add_badge", { user_id: userId, badge_code });
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setShowBadgeModal(false);
    await loadProfile();
  };

  const revokeBadge = async () => {
    if (!showRevokeModal || revokeReason.length < 3) return;
    setSaving(true); setErrMsg(null);
    const r = await api("user:revoke_badge", { user_id: userId, badge_code: showRevokeModal, raison: revokeReason });
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setShowRevokeModal(null);
    setRevokeReason("");
    await loadProfile();
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const r = await api("note:create", { user_id: userId, contenu: newNote.trim() });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setNewNote("");
    const { data: n } = await supa.from("profile_notes").select("*, auteur:auteur_id(surnom, username)").eq("user_id", userId).order("created_at", { ascending: false });
    setNotes(n ?? []);
  };

  const deleteNote = async (noteId: string) => {
    const r = await api("note:delete", { id: noteId });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  if (estEnChargement || loading) return (
    <LayoutApp><div className="flex items-center justify-center mt-20 gap-2 text-[var(--texte-muted)]"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div></LayoutApp>
  );

  if (error || !profile) return (
    <LayoutApp>
      <div className="carte text-center max-w-md mx-auto mt-12">
        <AlertTriangle className="w-10 h-10 mx-auto text-[var(--or)] mb-3" />
        <p className="text-sm text-[var(--texte-muted)]">{error || "Profil introuvable."}</p>
      </div>
    </LayoutApp>
  );

  const missingBadges = ORDRE_BADGES.filter(c => !badgesList.includes(c));

  return (
    <LayoutApp>
      {errMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 text-sm text-[var(--rouge)]">
          {errMsg} <button className="ml-2 underline" onClick={() => setErrMsg(null)}>×</button>
        </div>
      )}

      {/* Header */}
      <div className="carte mb-4 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Avatar src={profile.avatar_url} name={profile.surnom ?? profile.username} size={84} />
          <span className="absolute bottom-1 right-1"><StatusDot statut={profile.statut} /></span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="titre-page mb-1">{profile.surnom ?? profile.username}</h1>
          <div className="flex items-center gap-2 mb-2">
            <RankBadge level={profile.rank_level} size="md" />
            <span className="text-xs text-[var(--texte-muted)]">
              {profile.statut === "disponible" ? "Disponible" : profile.statut === "occupe" ? "Occupé" : profile.statut === "absent" ? "Absent" : "Hors ligne"}
            </span>
          </div>
          <BadgesRow codes={badgesList} size="sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageRank && rankForm.nouveau_rang < myRang && profile.rank_level < myRang && (
            <button onClick={() => { setShowRankModal(true); setRankForm({ nouveau_rang: profile.rank_level, raison: "" }); }} className="bouton-bleu text-xs"><Crown className="w-4 h-4" /> Changer rang</button>
          )}
          {canManageBadges && missingBadges.length > 0 && (
            <button onClick={() => setShowBadgeModal(true)} className="bouton-or text-xs"><Award className="w-4 h-4" /> Ajouter badge</button>
          )}
          {canEditProfile && !edit && <button onClick={() => setEdit(true)} className="bouton-gris text-xs"><Edit3 className="w-4 h-4" /> Modifier</button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Info */}
        <div className="carte">
          <h2 className="titre-section">Informations</h2>
          {edit ? (
            <div className="space-y-3">
              <div><label className="label">Surnom</label><input className="input" value={form.surnom} onChange={e => setForm({...form, surnom: e.target.value})} /></div>
              <div><label className="label">Date de naissance</label><input type="date" className="input" value={form.date_naissance ?? ""} onChange={e => setForm({...form, date_naissance: e.target.value})} /></div>
              <div><label className="label">Lieu de naissance</label><input className="input" value={form.lieu_naissance ?? ""} onChange={e => setForm({...form, lieu_naissance: e.target.value})} /></div>
              <div><label className="label">Téléphone</label><input className="input" value={form.telephone ?? ""} onChange={e => setForm({...form, telephone: e.target.value})} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={save} disabled={saving} className="bouton-bleu"><Save className="w-4 h-4" /> {saving ? "..." : "Enregistrer"}</button>
                <button onClick={() => setEdit(false)} className="bouton-gris"><X className="w-4 h-4" /> Annuler</button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2.5 text-sm">
              <Row k="Username" v={profile.username} />
              <Row k="Surnom" v={profile.surnom ?? "—"} />
              <Row k="Date de naissance" v={profile.date_naissance ?? "—"} />
              <Row k="Lieu de naissance" v={profile.lieu_naissance ?? "—"} />
              <Row k="Téléphone" v={profile.telephone ?? "—"} />
              <Row k="Discord ID" v={profile.discord_id} />
              <Row k="Dernière connexion" v={profile.derniere_connexion ? new Date(profile.derniere_connexion).toLocaleString("fr-FR") : "—"} />
            </dl>
          )}
        </div>

        {/* Rank history */}
        <div className="carte">
          <h2 className="titre-section">Historique des rangs</h2>
          {hist.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun changement.</p>}
          <ul className="space-y-2 text-sm">
            {hist.map(h => (
              <li key={h.id} className="border-l-2 border-[var(--bleu)] pl-3">
                <div className="flex justify-between">
                  <span>{h.ancien_rang != null ? getRang(h.ancien_rang).nom : "—"} → {getRang(h.nouveau_rang).nom}</span>
                  <span className="text-xs text-[var(--texte-muted)]">{new Date(h.modifie_le).toLocaleDateString("fr-FR")}</span>
                </div>
                {h.raison && <p className="text-xs text-[var(--texte-muted)]">{h.raison}</p>}
              </li>
            ))}
          </ul>
        </div>

        {/* Badges */}
        <div className="carte">
          <h2 className="titre-section">Badges</h2>
          {badgesList.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun badge.</p>}
          <BadgesRow codes={badgesList} size="md" onRevoke={canManageBadges ? (code) => setShowRevokeModal(code) : undefined} />
        </div>

        {/* Documents */}
        <div className="carte lg:col-span-3">
          <h2 className="titre-section">Documents</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {["📷 Photo de profil", "🪪 Carte d'identité", "🚗 Permis"].map((doc, i) => (
              <div key={i} className="bg-[var(--fond)] rounded-md p-3 flex items-center justify-between">
                <span className="text-sm">{doc}</span>
                {canEditProfile && <button className="bouton-gris text-xs py-1 px-2">Upload</button>}
              </div>
            ))}
          </div>
        </div>

        {/* Notes internes */}
        {canSeeNotes && (
          <div className="carte lg:col-span-3">
            <h2 className="titre-section flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Notes internes
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--or)]/20 text-[var(--or)] font-normal normal-case tracking-normal">Co-Leader+</span>
            </h2>
            <div className="flex gap-2 mb-4">
              <input className="input flex-1" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Ajouter une note…" onKeyDown={e => e.key === "Enter" && addNote()} />
              <button onClick={addNote} disabled={!newNote.trim()} className="bouton-or py-2 px-3"><Send className="w-4 h-4" /></button>
            </div>
            {notes.length === 0 && <p className="text-sm text-[var(--texte-muted)] text-center py-4">Aucune note.</p>}
            <div className="space-y-2">
              {notes.map(n => (
                <div key={n.id} className="bg-[var(--fond)] rounded-md p-3 group" style={{ borderLeft: "3px solid var(--or)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{n.contenu}</p>
                      <p className="text-[10px] text-[var(--texte-muted)] mt-1">{n.auteur?.surnom ?? n.auteur?.username ?? "Staff"} — {new Date(n.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                    <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-[var(--rouge)] hover:bg-[var(--rouge)]/10 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rank modal */}
      <Modal open={showRankModal} onClose={() => setShowRankModal(false)} title={`Changer le rang de ${profile.surnom ?? profile.username}`} footer={<>
        <button className="bouton-gris" onClick={() => setShowRankModal(false)}>Annuler</button>
        <button className="bouton-bleu" onClick={changeRank} disabled={rankForm.raison.length < 3 || saving}>{saving ? "..." : "Appliquer"}</button>
      </>}>
        <div className="space-y-3">
          <div><label className="label">Nouveau rang</label>
            <select className="input" value={rankForm.nouveau_rang} onChange={e => setRankForm({...rankForm, nouveau_rang: parseInt(e.target.value)})}>
              {RANGS.filter(r => r.level < myRang).map(r => <option key={r.level} value={r.level}>{r.nom}</option>)}
            </select>
          </div>
          <div><label className="label">Raison (min 3 car.)</label>
            <textarea className="input" rows={3} value={rankForm.raison} onChange={e => setRankForm({...rankForm, raison: e.target.value})} placeholder="Motif..." />
          </div>
        </div>
      </Modal>

      {/* Badge add modal */}
      <Modal open={showBadgeModal} onClose={() => setShowBadgeModal(false)} title="Attribuer un badge">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {missingBadges.map(c => {
            const meta = BADGES_META[c];
            return (
              <button key={c} onClick={() => grantBadge(c)} disabled={saving} className="carte text-left hover:border-[var(--or)] transition">
                <p className="font-semibold text-sm" style={{ color: meta.couleur }}>{meta.nom}</p>
                <p className="text-xs text-[var(--texte-muted)]">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Badge revoke modal */}
      <Modal open={!!showRevokeModal} onClose={() => { setShowRevokeModal(null); setRevokeReason(""); }} title="Révoquer un badge" footer={<>
        <button className="bouton-gris" onClick={() => { setShowRevokeModal(null); setRevokeReason(""); }}>Annuler</button>
        <button className="bouton-rouge" onClick={revokeBadge} disabled={revokeReason.length < 3 || saving}>{saving ? "..." : "Révoquer"}</button>
      </>}>
        <p className="text-sm mb-3">Révoquer <strong>{showRevokeModal}</strong> de <strong>{profile.surnom ?? profile.username}</strong> ?</p>
        <label className="label">Raison (min 3 car.)</label>
        <textarea className="input" rows={3} value={revokeReason} onChange={e => setRevokeReason(e.target.value)} autoFocus />
      </Modal>
    </LayoutApp>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (<div className="flex justify-between gap-4"><dt className="text-xs uppercase tracking-wider text-[var(--texte-muted)]">{k}</dt><dd className="text-right">{v}</dd></div>);
}
