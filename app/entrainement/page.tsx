"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { Plus, Calendar, MapPin, Users as UsersIcon } from "lucide-react";

export default function Page() {
  return <LayoutApp><Inner /></LayoutApp>;
}

function Inner() {
  const supa = useSupabase();
  const { user: me, rang } = useUser();
  const [planning, setPlanning] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    titre: "", description: "", plan: "", date_session: "", lieu: "", rank_min: 1, capacite_max: 10
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
    await supa.from("training_sessions").insert({ ...form, createur_id: me?.id });
    setOpen(false); load();
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
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--bleu)]">{s.statut}</span>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle session" size="lg" footer={<>
        <button className="bouton-gris" onClick={() => setOpen(false)}>Annuler</button>
        <button className="bouton-bleu" onClick={create}>Créer</button>
      </>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><label className="label">Titre</label><input className="input" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div className="sm:col-span-2"><label className="label">Plan</label><textarea className="input" rows={4} value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} /></div>
          <div><label className="label">Date</label><input type="datetime-local" className="input" value={form.date_session} onChange={e => setForm({...form, date_session: e.target.value})} /></div>
          <div><label className="label">Lieu</label><input className="input" value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})} /></div>
          <div><label className="label">Rang min</label><input type="number" className="input" value={form.rank_min} onChange={e => setForm({...form, rank_min: parseInt(e.target.value) || 1})} /></div>
          <div><label className="label">Capacité</label><input type="number" className="input" value={form.capacite_max} onChange={e => setForm({...form, capacite_max: parseInt(e.target.value) || 10})} /></div>
        </div>
      </Modal>
    </div>
  );
}
