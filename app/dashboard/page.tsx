"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import Link from "next/link";
import { Users, Calendar, FileText, GraduationCap, Megaphone, Crown } from "lucide-react";
import { getRang } from "@/lib/constants";

type Stat = { label: string; value: number; href: string; icon: any; tooltip: string };

export default function DashboardPage() {
  const supa = useSupabase();
  const { surnom } = useUser();
  const [stats, setStats] = useState<Stat[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
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

      const { data: ann } = await supa
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
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
    })();
  }, [supa]);

  return (
    <LayoutApp>
      <div className="mb-6">
        <h1 className="titre-page">Bonjour, {surnom}</h1>
        <p className="text-sm text-[var(--texte-muted)]">Vue d'ensemble de l'unité</p>
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
          <h2 className="titre-section flex items-center gap-2"><Megaphone className="w-4 h-4" /> Annonces</h2>
          {annonces.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune annonce.</p>}
          <div className="space-y-3">
            {annonces.map(a => {
              if (a.type === "promotion") {
                const meta = a.metadata ?? {};
                const ar = getRang(meta.ancien_rang ?? 1);
                const nr = getRang(meta.nouveau_rang ?? 1);
                return (
                  <div key={a.id} className="border-l-4 pl-3 py-1" style={{ borderColor: nr.couleur }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-4 h-4 text-[var(--or)]" />
                      <span className="text-xs uppercase tracking-wider text-[var(--or)] font-semibold">Promotion</span>
                    </div>
                    <p className="text-sm font-medium">{a.titre}</p>
                    <p className="text-xs text-[var(--texte-muted)] mt-0.5">
                      {ar.nom} <span className="mx-1">→</span> {nr.nom}
                    </p>
                  </div>
                );
              }
              return (
                <div key={a.id} className="border-l-4 border-[var(--bleu)] pl-3 py-1">
                  <p className="text-sm font-medium">{a.titre}</p>
                  {a.contenu && <p className="text-xs text-[var(--texte-muted)] mt-0.5">{a.contenu}</p>}
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
    </LayoutApp>
  );
}
