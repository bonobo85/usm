"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { Users, Calendar, FileText, GraduationCap, Megaphone, Crown, Plus, Trash2, X } from "lucide-react";
import { getRang, estColeadMin } from "@/lib/constants";

type Stat = { label: string; value: number; href: string; icon: any; tooltip: string };

export default function DashboardPage() {
  const supa = useSupabase();
  const { surnom, rang } = useUser();
  const [stats, setStats] = useState<Stat[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: "communique", titre: "", contenu: "" });
  const [deleting, setDeleting] = useState<string | null>(null);

  const canManageAnnonces = estColeadMin(rang);

  const loadAll = async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const inAWeek = new Date(Date.now() + 7 * 86400_000).toISOString();
    const [{ count: members }, { count: rcs }, { count: rapports }, { count: ents }] = await Promise.all([
      supa.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
      supa.from("recrutements").select("*", { count: "exact", head: true }).in("statut", ["planifie", "en_cours"]),
      supa.from("reports").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supa.from("training_sessions").select("*", { count: "exact", head: true }).gte("date_session", weekAgo)
    ]);
    setStats([
      { label: "Membres total",     value: members ?? 0,  href: "/personnel",    icon: Users,          tooltip: "Voir le personnel" },
      { label: "RC à faire",        value: rcs ?? 0,      href: "/formateurs",   icon: GraduationCap,  tooltip: "Recrutements en attente" },
      { label: "Rapports / semaine",value: rapports ?? 0, href: "/rapports",     icon: FileText,       tooltip: "Voir les rapports" },
      { label: "Entr. / semaine",   value: ents ?? 0,     href: "/entrainement", icon: Calendar,       tooltip: "Voir les entraînements" }
    ]);

    // Annonces : communiqués + infos + promotions auto
    const { data: ann } = await supa
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    setAnnonces(ann ?? []);

    const { data: tr } = await supa
      .from("training_sessions")
      .select("*")
      .gte("date_session", new Date().toISOString())
      .lte("date_session", inAWeek)
      .order("date_session")
      .limit(5);
    setTrainings(tr ?? []);

    const { data: dr } = await supa
      .from("reports")
      .select("id, titre, template_code, updated_at")
      .eq("statut", "draft")
      .order("updated_at", { ascending: false })
      .limit(5);
    setDrafts(dr ?? []);
  };

  useEffect(() => { loadAll(); }, [supa]);

  const createAnnonce = async () => {
    if (!form.titre.trim()) return;
    await supa.from("announcements").insert({
      type: form.type,
      titre: form.titre,
      contenu: form.contenu || null,
    });
    setShowCreate(false);
    setForm({ type: "communique", titre: "", contenu: "" });
    loadAll();
  };

  const deleteAnnonce = async (id: string) => {
    await supa.from("announcements").delete().eq("id", id);
    setDeleting(null);
    loadAll();
  };

  return (
    <LayoutApp>
      <div className="mb-6">
        <h1 className="titre-page">Bonjour, {surnom}</h1>
        <p className="text-sm text-[var(--texte-muted)]">Vue d&apos;ensemble de l&apos;unité</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <Link key={s.label} href={s.href} title={s.tooltip} className="carte hover:border-[var(--or)] transition group">
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
            {canManageAnnonces && (
              <button onClick={() => setShowCreate(true)} className="bouton-or text-xs py-1 px-3">
                <Plus className="w-3 h-3" /> Nouvelle annonce
              </button>
            )}
          </div>
          {annonces.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune annonce.</p>}
          <div className="space-y-3">
            {annonces.map(a => {
              if (a.type === "promotion") {
                const meta = a.metadata ?? {};
                const ar = getRang(meta.ancien_rang ?? 1);
                const nr = getRang(meta.nouveau_rang ?? 1);
                return (
                  <div key={a.id} className="border-l-4 pl-3 py-1 group relative" style={{ borderColor: nr.couleur }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-4 h-4 text-[var(--or)]" />
                      <span className="text-xs uppercase tracking-wider text-[var(--or)] font-semibold">Promotion</span>
                      {canManageAnnonces && (
                        <button
                          onClick={() => setDeleting(a.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-[var(--rouge)]/20 text-[var(--rouge)]"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-medium">{a.titre}</p>
                    <p className="text-xs text-[var(--texte-muted)] mt-0.5">
                      {ar.nom} <span className="mx-1">→</span> {nr.nom}
                    </p>
                  </div>
                );
              }
              return (
                <div key={a.id} className="border-l-4 border-[var(--bleu)] pl-3 py-1 group relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{a.titre}</p>
                    {canManageAnnonces && (
                      <button
                        onClick={() => setDeleting(a.id)}
                        className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-[var(--rouge)]/20 text-[var(--rouge)]"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {a.contenu && <p className="text-xs text-[var(--texte-muted)] mt-0.5">{a.contenu}</p>}
                  <p className="text-[10px] text-[var(--texte-muted)] mt-1">
                    {new Date(a.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="carte">
            <h2 className="titre-section">Prochains entraînements</h2>
            {trainings.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun entraînement.</p>}
            <div className="space-y-2">
              {trainings.map(t => (
                <Link key={t.id} href={`/entrainement/${t.id}`} className="block p-2 rounded hover:bg-[var(--fond-clair)]">
                  <p className="text-sm font-medium">{t.titre}</p>
                  <p className="text-xs text-[var(--texte-muted)]">
                    {new Date(t.date_session).toLocaleString("fr-FR")}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="carte">
            <h2 className="titre-section">Mes brouillons</h2>
            {drafts.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun brouillon.</p>}
            <div className="space-y-2">
              {drafts.map(d => (
                <Link key={d.id} href={`/rapports/${d.id}`} className="block p-2 rounded hover:bg-[var(--fond-clair)]">
                  <p className="text-sm font-medium truncate">{d.titre}</p>
                  <p className="text-xs text-[var(--texte-muted)]">{d.template_code}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create announcement modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle annonce">
        <div className="space-y-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="communique">Communiqué</option>
              <option value="info">Information</option>
            </select>
          </div>
          <div>
            <label className="label">Titre</label>
            <input className="input" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Titre de l'annonce..." />
          </div>
          <div>
            <label className="label">Contenu</label>
            <textarea className="input" rows={4} value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })} placeholder="Détails de l'annonce..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="bouton-gris" onClick={() => setShowCreate(false)}>Annuler</button>
            <button className="bouton-or" onClick={createAnnonce} disabled={!form.titre.trim()}>Publier</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Supprimer l'annonce">
        <p className="text-sm mb-4">Êtes-vous sûr de vouloir supprimer cette annonce ?</p>
        <div className="flex justify-end gap-2">
          <button className="bouton-gris" onClick={() => setDeleting(null)}>Annuler</button>
          <button className="bouton-rouge" onClick={() => deleting && deleteAnnonce(deleting)}>Supprimer</button>
        </div>
      </Modal>
    </LayoutApp>
  );
}
