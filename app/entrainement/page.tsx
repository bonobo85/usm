"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { Plus, Calendar, MapPin, Users as UsersIcon, Target } from "lucide-react";
import { RANGS, BADGES_META, ORDRE_BADGES } from "@/lib/constants";

export default function Page() {
  return <LayoutApp><Inner /></LayoutApp>;
}

function Inner() {
  const supa = useSupabase();
  const { user: me, rang } = useUser();
  const [planning, setPlanning] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({
    titre: "", description: "", plan: "", date_session: "", lieu: "", rank_min: 1, capacite_max: 10, badge_cible_code: ""
  });

  const load = async () => {
    const now = new Date().toISOString();
    const { data: p } = await supa.from("training_sessions")
      .select("*, training_registrations(id, user_id, annule)")
      .gte("date_session", now)
      .order("date_session");
    const { data: pa } = await supa.from("training_sessions")
      .select("*, training_registrations(id, user_id, annule)")
      .lt("date_session", now)
      .order("date_session", { ascending: false }).limit(30);
    setPlanning(p ?? []); setPast(pa ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.titre || !form.date_session) return;
    const insert: any = {
      titre: form.titre,
      description: form.description || null,
      plan: form.plan || null,
      date_session: form.date_session,
      lieu: form.lieu || null,
      rank_min: form.rank_min,
      capacite_max: form.capacite_max,
      createur_id: me?.id
    };
    // badge_cible_id would need a lookup; for now just store without it
    await supa.from("training_sessions").insert(insert);
    setOpen(false);
    setStep(1);
    setForm({ titre: "", description: "", plan: "", date_session: "", lieu: "", rank_min: 1, capacite_max: 10, badge_cible_code: "" });
    load();
  };

  const toggle = async (s: any) => {
    const mine = s.training_registrations?.find((r: any) => r.user_id === me?.id && !r.annule);
    if (mine) {
      await supa.from("training_registrations").update({ annule: true }).eq("id", mine.id);
    } else {
      await supa.from("training_registrations").insert({ session_id: s.id, user_id: me?.id });
    }
    load();
  };

  const Card = (s: any) => {
    const inscrits = s.training_registrations?.filter((r: any) => !r.annule).length ?? 0;
    const complet = inscrits >= (s.capacite_max ?? 10);
    const mine = s.training_registrations?.find((r: any) => r.user_id === me?.id && !r.annule);
    return (
      <div key={s.id} className="carte">
        <div className="flex justify-between mb-2">
          <Link href={`/entrainement/${s.id}`} className="font-semibold hover:text-[var(--or)]">{s.titre}</Link>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--bleu)]">
            {s.statut === "planifie" ? "Planifié" : s.statut === "en_cours" ? "En cours" : s.statut === "termine" ? "Terminé" : s.statut}
          </span>
        </div>
        <p className="text-xs text-[var(--texte-muted)] flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(s.date_session).toLocaleString("fr-FR")}</p>
        {s.lieu && <p className="text-xs text-[var(--texte-muted)] flex items-center gap-1"><MapPin className="w-3 h-3" />{s.lieu}</p>}
        <p className="text-xs text-[var(--texte-muted)] flex items-center gap-1 mt-1"><UsersIcon className="w-3 h-3" />{inscrits} / {s.capacite_max}</p>
        <div className="h-1.5 bg-[var(--fond-clair)] rounded mt-2 overflow-hidden">
          <div className="h-full bg-[var(--or)]" style={{ width: `${Math.min(100, (inscrits / (s.capacite_max ?? 10)) * 100)}%` }} />
        </div>
        <button
          onClick={() => toggle(s)}
          disabled={!mine && complet}
          className={`mt-3 w-full text-sm rounded-md py-1.5 ${mine ? "bouton-rouge" : complet ? "bouton-gris" : "bouton-bleu"} justify-center`}
        >
          {mine ? "Annuler" : complet ? "Complet" : "S'inscrire"}
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="titre-page">Entraînement</h1>
        {rang >= 4 && <button className="bouton-or" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nouvelle session</button>}
      </div>

      <Tabs tabs={[
        { label: "Planning", content: <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{planning.map(Card)}{planning.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune session.</p>}</div> },
        { label: "Sessions passées", content: <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{past.map(Card)}{past.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune.</p>}</div> }
      ]} />

      {/* Stepped session creation modal */}
      <Modal open={open} onClose={() => { setOpen(false); setStep(1); }} title={`Nouvelle session — Étape ${step}/3`} size="lg">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Informations générales</p>
            <div><label className="label">Titre *</label><input className="input" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Ex: Formation Tir Avancé" /></div>
            <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description courte..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="bouton-gris" onClick={() => { setOpen(false); setStep(1); }}>Annuler</button>
              <button className="bouton-bleu" onClick={() => setStep(2)} disabled={!form.titre.trim()}>Suivant →</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Planification</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Date et heure *</label><input type="datetime-local" className="input" value={form.date_session} onChange={e => setForm({...form, date_session: e.target.value})} /></div>
              <div><label className="label">Lieu</label><input className="input" value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})} placeholder="Ex: Stand de tir LS" /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Rang minimum</label>
                <select className="input" value={form.rank_min} onChange={e => setForm({...form, rank_min: parseInt(e.target.value) || 1})}>
                  {RANGS.map(r => <option key={r.level} value={r.level}>{r.nom}</option>)}
                </select>
              </div>
              <div><label className="label">Capacité max</label><input type="number" className="input" value={form.capacite_max} onChange={e => setForm({...form, capacite_max: parseInt(e.target.value) || 10})} /></div>
              <div>
                <label className="label">Badge cible</label>
                <select className="input" value={form.badge_cible_code} onChange={e => setForm({...form, badge_cible_code: e.target.value})}>
                  <option value="">Aucun</option>
                  {ORDRE_BADGES.map(c => <option key={c} value={c}>{BADGES_META[c]?.nom ?? c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button className="bouton-gris" onClick={() => setStep(1)}>← Retour</button>
              <button className="bouton-bleu" onClick={() => setStep(3)} disabled={!form.date_session}>Suivant →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Plan de session (optionnel)</p>
            <div><label className="label">Plan détaillé</label><textarea className="input" rows={6} value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} placeholder={"1. Échauffement\n2. Exercice principal\n3. Mise en situation\n4. Débriefing"} /></div>

            {/* Summary */}
            <div className="bg-[var(--fond)] rounded-lg p-3">
              <p className="text-xs text-[var(--texte-muted)] uppercase tracking-wider mb-2">Récapitulatif</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-[var(--texte-muted)]">Titre :</span><span>{form.titre}</span>
                <span className="text-[var(--texte-muted)]">Date :</span><span>{form.date_session ? new Date(form.date_session).toLocaleString("fr-FR") : "—"}</span>
                <span className="text-[var(--texte-muted)]">Lieu :</span><span>{form.lieu || "—"}</span>
                <span className="text-[var(--texte-muted)]">Capacité :</span><span>{form.capacite_max} places</span>
                <span className="text-[var(--texte-muted)]">Badge :</span><span>{form.badge_cible_code ? BADGES_META[form.badge_cible_code]?.nom : "Aucun"}</span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button className="bouton-gris" onClick={() => setStep(2)}>← Retour</button>
              <div className="flex gap-2">
                <button className="bouton-gris" onClick={() => { setOpen(false); setStep(1); }}>Annuler</button>
                <button className="bouton-or" onClick={create}>Créer la session</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
