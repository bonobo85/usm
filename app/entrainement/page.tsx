"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { api } from "@/lib/api";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { Plus, Calendar, MapPin, Users as UsersIcon, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { RANGS, BADGES_META, ORDRE_BADGES } from "@/lib/constants";

const JOURS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDay = firstDay.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;
  const days: { date: Date; currentMonth: boolean }[] = [];
  for (let i = startDay - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), currentMonth: false });
  for (let d = 1; d <= lastDay.getDate(); d++) days.push({ date: new Date(year, month, d), currentMonth: true });
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) days.push({ date: new Date(year, month + 1, d), currentMonth: false });
  return days;
}
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export default function Page() { return <LayoutApp><Inner /></LayoutApp>; }

function Inner() {
  const supa = useSupabase();
  const { user: me, rang, estConnecte } = useUser();
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ titre: "", description: "", plan: "", date_session: "", lieu: "", rank_min: 1, capacite_max: 10, badge_cible_code: "" });
  const [calDate, setCalDate] = useState(new Date());

  const load = useCallback(async () => {
    if (!estConnecte) return;
    const { data } = await supa.from("training_sessions")
      .select("*, training_registrations(id, user_id, annule)")
      .order("date_session", { ascending: false }).limit(200);
    setAllSessions(data ?? []);
  }, [supa, estConnecte]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const planning = allSessions.filter(s => new Date(s.date_session) >= now && s.statut !== "annule");
  const past = allSessions.filter(s => new Date(s.date_session) < now || s.statut === "termine" || s.statut === "annule");

  const calYear = calDate.getFullYear(), calMonth = calDate.getMonth();
  const monthDays = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);
  const sessionsForDay = (date: Date) => allSessions.filter(s => sameDay(new Date(s.date_session), date));

  const create = async () => {
    if (!form.titre || !form.date_session) return;
    setSaving(true); setErrMsg(null);
    const r = await api("session:create", form);
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setOpen(false); setStep(1);
    setForm({ titre: "", description: "", plan: "", date_session: "", lieu: "", rank_min: 1, capacite_max: 10, badge_cible_code: "" });
    await load();
  };

  const toggle = async (s: any) => {
    if (!me?.id) return;
    const activeReg = s.training_registrations?.find((r: any) => r.user_id === me.id && !r.annule);
    const action = activeReg ? "session:unregister" : "session:register";
    const r = await api(action, { session_id: s.id });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    await load();
  };

  const SessionCard = (s: any) => {
    const inscrits = s.training_registrations?.filter((r: any) => !r.annule).length ?? 0;
    const complet = inscrits >= (s.capacite_max ?? 10);
    const mine = s.training_registrations?.find((r: any) => r.user_id === me?.id && !r.annule);
    return (
      <div key={s.id} className="carte">
        <div className="flex justify-between mb-2">
          <Link href={`/entrainement/${s.id}`} className="font-semibold hover:text-[var(--or)]">{s.titre}</Link>
          <span className={`text-xs px-2 py-0.5 rounded text-white ${s.statut === "planifie" ? "bg-[var(--bleu)]" : s.statut === "termine" ? "bg-[#2D8B4E]" : "bg-[var(--texte-muted)]"}`}>
            {s.statut === "planifie" ? "Planifié" : s.statut === "termine" ? "Terminé" : s.statut}
          </span>
        </div>
        <p className="text-xs text-[var(--texte-muted)] flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(s.date_session).toLocaleString("fr-FR")}</p>
        {s.lieu && <p className="text-xs text-[var(--texte-muted)] flex items-center gap-1"><MapPin className="w-3 h-3" />{s.lieu}</p>}
        <p className="text-xs text-[var(--texte-muted)] flex items-center gap-1 mt-1"><UsersIcon className="w-3 h-3" />{inscrits}/{s.capacite_max}</p>
        <div className="h-1.5 bg-[var(--fond)] rounded mt-2 overflow-hidden">
          <div className="h-full bg-[var(--or)] rounded" style={{ width: `${Math.min(100, (inscrits / (s.capacite_max ?? 10)) * 100)}%` }} />
        </div>
        {s.statut === "planifie" && (
          <button onClick={() => toggle(s)} disabled={!mine && complet} className={`mt-3 w-full text-sm rounded-md py-1.5 ${mine ? "bouton-rouge" : complet ? "bouton-gris" : "bouton-bleu"} justify-center`}>
            {mine ? "Se désinscrire" : complet ? "Complet" : "S'inscrire"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="titre-page">Entraînement</h1>
        {rang >= 4 && <button className="bouton-or" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nouvelle session</button>}
      </div>

      {errMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 text-sm text-[var(--rouge)]">
          {errMsg} <button className="ml-2 underline" onClick={() => setErrMsg(null)}>×</button>
        </div>
      )}

      <Tabs tabs={[
        { label: `Planning (${planning.length})`, icon: <Calendar className="w-4 h-4" />, content: <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{planning.map(SessionCard)}{planning.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune session.</p>}</div> },
        { label: "Calendrier", icon: <CalendarDays className="w-4 h-4" />, content: (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="bouton-gris py-1 px-2"><ChevronLeft className="w-4 h-4" /></button>
                <h2 className="text-lg font-semibold min-w-[180px] text-center">{MOIS[calMonth]} {calYear}</h2>
                <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="bouton-gris py-1 px-2"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <button onClick={() => setCalDate(new Date())} className="bouton-gris text-xs">Aujourd&apos;hui</button>
            </div>
            <div className="cal-grid mb-1">{JOURS.map(j => <div key={j} className="text-center text-xs font-semibold text-[var(--texte-muted)] py-2">{j}</div>)}</div>
            <div className="cal-grid">
              {monthDays.map(({ date, currentMonth }, idx) => {
                const sessions = sessionsForDay(date);
                const isToday = sameDay(date, now);
                return (
                  <div key={idx} className={`cal-cell ${isToday ? 'today' : ''} ${!currentMonth ? 'other-month' : ''}`}>
                    <div className={`cal-day-num ${isToday ? 'text-[var(--or)]' : ''}`}>{date.getDate()}</div>
                    {sessions.slice(0, 2).map(s => (
                      <Link key={s.id} href={`/entrainement/${s.id}`} className="cal-event" style={{ background: s.statut === "planifie" ? "var(--bleu)" : "#2D8B4E", color: "#fff" }} title={s.titre}>
                        {new Date(s.date_session).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} {s.titre}
                      </Link>
                    ))}
                    {sessions.length > 2 && <div className="text-[10px] text-[var(--texte-muted)] px-1">+{sessions.length - 2}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )},
        { label: "Passées", content: <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{past.map(SessionCard)}{past.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune.</p>}</div> }
      ]} />

      <Modal open={open} onClose={() => { setOpen(false); setStep(1); setErrMsg(null); }} title={`Nouvelle session — Étape ${step}/3`} size="lg">
        {errMsg && <div className="mb-3 p-2 rounded bg-[var(--rouge)]/10 text-sm text-[var(--rouge)]">{errMsg}</div>}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Informations générales</p>
            <div><label className="label">Titre *</label><input className="input" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Ex: Formation Tir Avancé" autoFocus /></div>
            <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="flex justify-end gap-2"><button className="bouton-gris" onClick={() => { setOpen(false); setStep(1); }}>Annuler</button><button className="bouton-bleu" onClick={() => setStep(2)} disabled={!form.titre.trim()}>Suivant →</button></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Planification</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Date et heure *</label><input type="datetime-local" className="input" value={form.date_session} onChange={e => setForm({...form, date_session: e.target.value})} /></div>
              <div><label className="label">Lieu</label><input className="input" value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})} placeholder="Stand de tir" /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className="label">Rang min</label><select className="input" value={form.rank_min} onChange={e => setForm({...form, rank_min: parseInt(e.target.value) || 1})}>{RANGS.map(r => <option key={r.level} value={r.level}>{r.nom}</option>)}</select></div>
              <div><label className="label">Capacité max</label><input type="number" className="input" value={form.capacite_max} onChange={e => setForm({...form, capacite_max: parseInt(e.target.value) || 10})} /></div>
              <div><label className="label">Badge cible</label><select className="input" value={form.badge_cible_code} onChange={e => setForm({...form, badge_cible_code: e.target.value})}><option value="">Aucun</option>{ORDRE_BADGES.map(c => <option key={c} value={c}>{BADGES_META[c]?.nom}</option>)}</select></div>
            </div>
            <div className="flex justify-between"><button className="bouton-gris" onClick={() => setStep(1)}>← Retour</button><button className="bouton-bleu" onClick={() => setStep(3)} disabled={!form.date_session}>Suivant →</button></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Plan de session</p>
            <div><label className="label">Plan détaillé</label><textarea className="input" rows={5} value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} placeholder={"1. Échauffement\n2. Exercice\n3. Débriefing"} /></div>
            <div className="bg-[var(--fond)] rounded-lg p-3">
              <p className="text-xs text-[var(--texte-muted)] uppercase tracking-wider mb-2">Récapitulatif</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-[var(--texte-muted)]">Titre</span><span>{form.titre}</span>
                <span className="text-[var(--texte-muted)]">Date</span><span>{form.date_session ? new Date(form.date_session).toLocaleString("fr-FR") : "—"}</span>
                <span className="text-[var(--texte-muted)]">Lieu</span><span>{form.lieu || "—"}</span>
                <span className="text-[var(--texte-muted)]">Capacité</span><span>{form.capacite_max}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <button className="bouton-gris" onClick={() => setStep(2)}>← Retour</button>
              <div className="flex gap-2">
                <button className="bouton-gris" onClick={() => { setOpen(false); setStep(1); }}>Annuler</button>
                <button className="bouton-or" onClick={create} disabled={saving}>{saving ? "..." : "Créer"}</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
