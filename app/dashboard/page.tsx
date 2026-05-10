"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { api } from "@/lib/api";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { Users, Calendar, FileText, GraduationCap, Megaphone, Crown, Plus, Trash2 } from "lucide-react";
import { getRang, estColeadMin } from "@/lib/constants";

export default function DashboardPage() {
  const supa = useSupabase();
  const { user: me, surnom, rang, estConnecte } = useUser();
  const [stats, setStats] = useState<{ label: string; value: number; href: string; icon: any }[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: "communique", titre: "", contenu: "" });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const canManage = estColeadMin(rang);

  const loadAll = useCallback(async () => {
    if (!estConnecte) return;
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const [r1, r2, r3, r4] = await Promise.all([
      supa.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
      supa.from("recrutements").select("*", { count: "exact", head: true }).in("statut", ["planifie", "en_cours"]),
      supa.from("reports").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supa.from("training_sessions").select("*", { count: "exact", head: true }).gte("date_session", weekAgo)
    ]);
    setStats([
      { label: "Membres actifs", value: r1.count ?? 0, href: "/personnel", icon: Users },
      { label: "RC à faire", value: r2.count ?? 0, href: "/formateurs", icon: GraduationCap },
      { label: "Rapports / sem.", value: r3.count ?? 0, href: "/rapports", icon: FileText },
      { label: "Entraînements", value: r4.count ?? 0, href: "/entrainement", icon: Calendar }
    ]);
    const { data: ann } = await supa.from("announcements").select("*").order("created_at", { ascending: false }).limit(15);
    setAnnonces(ann ?? []);
    const { data: tr } = await supa.from("training_sessions").select("*").gte("date_session", new Date().toISOString()).order("date_session").limit(5);
    setTrainings(tr ?? []);
    if (me?.id) {
      const { data: dr } = await supa.from("reports").select("id, titre, template_code, updated_at").eq("statut", "draft").eq("auteur_id", me.id).order("updated_at", { ascending: false }).limit(5);
      setDrafts(dr ?? []);
    }
  }, [supa, estConnecte, me?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const createAnnonce = async () => {
    if (!form.titre.trim()) return;
    setSaving(true); setErrMsg(null);
    const r = await api("announcement:create", form);
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setShowCreate(false);
    setForm({ type: "communique", titre: "", contenu: "" });
    await loadAll();
  };

  const deleteAnnonce = async (id: string) => {
    setSaving(true); setErrMsg(null);
    const r = await api("announcement:delete", { id });
    setSaving(false);
    setDeleting(null);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    await loadAll();
  };

  return (
    <LayoutApp>
      <div className="mb-6">
        <h1 className="titre-page">Bonjour, {surnom}</h1>
        <p className="text-sm text-[var(--texte-muted)]">Vue d&apos;ensemble</p>
      </div>

      {errMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 text-sm text-[var(--rouge)]">
          {errMsg} <button className="ml-2 underline" onClick={() => setErrMsg(null)}>×</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="carte hover:border-[var(--or)] transition group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[var(--texte-muted)]">{s.label}</span>
              <s.icon className="w-4 h-4 text-[var(--or)] opacity-70 group-hover:opacity-100" />
            </div>
            <span className="text-3xl font-semibold">{s.value}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 carte">
          <div className="flex items-center justify-between mb-3">
            <h2 className="titre-section flex items-center gap-2 mb-0"><Megaphone className="w-4 h-4" /> Annonces</h2>
            {canManage && <button onClick={() => setShowCreate(true)} className="bouton-or text-xs py-1 px-3"><Plus className="w-3 h-3" /> Nouvelle</button>}
          </div>
          {annonces.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune annonce.</p>}
          <div className="space-y-3">
            {annonces.map(a => (
              <div key={a.id} className={`border-l-4 pl-3 py-2 group ${a.type === "promotion" ? "" : "border-[var(--bleu)]"}`} style={a.type === "promotion" ? { borderColor: getRang(a.metadata?.nouveau_rang ?? 1).couleur } : {}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {a.type === "promotion" && <Crown className="w-4 h-4 text-[var(--or)]" />}
                    <p className="text-sm font-medium">{a.titre}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[var(--texte-muted)]">{new Date(a.created_at).toLocaleDateString("fr-FR")}</span>
                    {canManage && <button onClick={() => setDeleting(a.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--fond)] text-[var(--rouge)]"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                </div>
                {a.contenu && <p className="text-xs text-[var(--texte-muted)] mt-0.5">{a.contenu}</p>}
                {a.type === "promotion" && a.metadata && (
                  <p className="text-xs text-[var(--texte-muted)] mt-0.5">{getRang(a.metadata.ancien_rang).nom} → {getRang(a.metadata.nouveau_rang).nom}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="carte">
            <h2 className="titre-section">Prochains entraînements</h2>
            {trainings.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun.</p>}
            {trainings.map(t => (<Link key={t.id} href={`/entrainement/${t.id}`} className="block p-2 rounded hover:bg-[var(--fond-clair)]"><p className="text-sm font-medium">{t.titre}</p><p className="text-xs text-[var(--texte-muted)]">{new Date(t.date_session).toLocaleString("fr-FR")}</p></Link>))}
          </div>
          <div className="carte">
            <h2 className="titre-section">Mes brouillons</h2>
            {drafts.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun.</p>}
            {drafts.map(d => (<Link key={d.id} href={`/rapports/${d.id}`} className="block p-2 rounded hover:bg-[var(--fond-clair)]"><p className="text-sm font-medium truncate">{d.titre}</p></Link>))}
          </div>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setErrMsg(null); }} title="Nouvelle annonce">
        <div className="space-y-4">
          {errMsg && <div className="p-2 rounded bg-[var(--rouge)]/10 text-sm text-[var(--rouge)]">{errMsg}</div>}
          <div><label className="label">Type</label><select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="communique">Communiqué</option><option value="info">Information</option></select></div>
          <div><label className="label">Titre *</label><input className="input" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Titre..." autoFocus /></div>
          <div><label className="label">Contenu</label><textarea className="input" rows={4} value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} /></div>
          <div className="flex justify-end gap-2"><button className="bouton-gris" onClick={() => setShowCreate(false)}>Annuler</button><button className="bouton-or" onClick={createAnnonce} disabled={!form.titre.trim() || saving}>{saving ? "..." : "Publier"}</button></div>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Supprimer l'annonce">
        <p className="text-sm mb-4">Confirmer la suppression ?</p>
        <div className="flex justify-end gap-2"><button className="bouton-gris" onClick={() => setDeleting(null)}>Annuler</button><button className="bouton-rouge" onClick={() => deleting && deleteAnnonce(deleting)} disabled={saving}>{saving ? "..." : "Supprimer"}</button></div>
      </Modal>
    </LayoutApp>
  );
}
