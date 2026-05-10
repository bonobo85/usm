"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { PermissionGate } from "@/components/PermissionGate";
import { useUser } from "@/lib/useUser";
import { useSupabase } from "@/lib/useSupabase";
import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Modal } from "@/components/Modal";
import { Plus, Play, CheckCircle, User, MapPin, Calendar } from "lucide-react";

export default function Page() {
  const { peutVoirFormateurs, estEnChargement } = useUser();
  if (estEnChargement) return null;
  return <PermissionGate condition={peutVoirFormateurs()}><LayoutApp><Inner /></LayoutApp></PermissionGate>;
}

function Inner() {
  const supa = useSupabase();
  const { user: me, estConnecte } = useUser();
  const [rcs, setRcs] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [openRC, setOpenRC] = useState(false);
  const [openResult, setOpenResult] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ candidat_nom: "", candidat_discord: "", date_rc: "", lieu: "", notes: "" });
  const [resultForm, setResultForm] = useState({ tir_note: "", conduite_note: "", procedure_note: "", comportement_note: "", points_forts: "", points_faibles: "", observations: "", resultat: "admis" });

  const load = useCallback(async () => {
    if (!estConnecte) return;
    const { data: r } = await supa.from("recrutements").select("*").order("created_at", { ascending: false });
    setRcs(r ?? []);
    const { data: re } = await supa.from("rc_resultats").select("*").order("created_at", { ascending: false });
    setResults(re ?? []);
  }, [supa, estConnecte]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.candidat_nom || !form.date_rc) return;
    setSaving(true); setErrMsg(null);
    const r = await api("rc:create", form);
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setOpenRC(false); setStep(1);
    setForm({ candidat_nom: "", candidat_discord: "", date_rc: "", lieu: "", notes: "" });
    await load();
  };

  const take = async (id: string) => {
    setErrMsg(null);
    const r = await api("rc:take", { id });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    await load();
  };

  const submitResult = async () => {
    if (!openResult) return;
    setSaving(true); setErrMsg(null);
    const r = await api("rc:result", {
      recrutement_id: openResult.id, candidat_nom: openResult.candidat_nom,
      date_rc: openResult.date_rc, formateur_id: openResult.formateur_id,
      ...resultForm
    });
    setSaving(false);
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setOpenResult(null);
    setResultForm({ tir_note: "", conduite_note: "", procedure_note: "", comportement_note: "", points_forts: "", points_faibles: "", observations: "", resultat: "admis" });
    await load();
  };

  const rcPending = rcs.filter(r => r.statut !== "termine");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="titre-page">Formateurs</h1>
        <button className="bouton-or" onClick={() => setOpenRC(true)}><Plus className="w-4 h-4" /> Nouveau RC</button>
      </div>

      {errMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 text-sm text-[var(--rouge)]">
          {errMsg} <button className="ml-2 underline" onClick={() => setErrMsg(null)}>×</button>
        </div>
      )}

      <Tabs tabs={[
        { label: `RC à faire (${rcPending.length})`, content: (
          <div className="space-y-3">
            {rcPending.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun RC.</p>}
            {rcPending.map(r => (
              <div key={r.id} className="carte">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-[var(--or)]" />{r.candidat_nom}</p>
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${r.statut === "planifie" ? "bg-[var(--bleu)]" : "bg-[var(--or)]"}`}>{r.statut === "planifie" ? "Planifié" : "En cours"}</span>
                </div>
                {r.candidat_discord && <p className="text-xs text-[var(--texte-muted)] ml-6">{r.candidat_discord}</p>}
                <div className="flex flex-wrap gap-4 text-xs text-[var(--texte-muted)] ml-6 mb-3 mt-1">
                  {r.date_rc && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.date_rc).toLocaleString("fr-FR")}</span>}
                  {r.lieu && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.lieu}</span>}
                </div>
                <div className="flex gap-2 ml-6">
                  {!r.formateur_id && <button onClick={() => take(r.id)} className="bouton-bleu text-xs py-1"><Play className="w-3 h-3" /> Prendre</button>}
                  {r.formateur_id && r.statut === "en_cours" && <button onClick={() => setOpenResult(r)} className="bouton-vert text-xs py-1"><CheckCircle className="w-3 h-3" /> Résultat</button>}
                </div>
              </div>
            ))}
          </div>
        )},
        { label: `Résultats (${results.length})`, content: (
          <div className="space-y-3">
            {results.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun.</p>}
            {results.map(r => {
              const color = (r.note_globale ?? 0) >= 14 ? "#2D8B4E" : (r.note_globale ?? 0) >= 10 ? "#D97706" : "#B32134";
              return (
                <div key={r.id} className="carte">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{r.candidat_nom}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color }}>{r.note_globale}/20</span>
                      <span className={`text-xs px-2 py-0.5 rounded text-white ${r.resultat === "admis" ? "bg-[#2D8B4E]" : r.resultat === "refuse" ? "bg-[var(--rouge)]" : "bg-[var(--or)]"}`}>{r.resultat === "admis" ? "Admis" : r.resultat === "refuse" ? "Refusé" : "À repasser"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-center mb-2">
                    {[["Tir", r.tir_note], ["Conduite", r.conduite_note], ["Procédure", r.procedure_note], ["Comportement", r.comportement_note]].map(([label, val]) => (
                      <div key={label as string} className="bg-[var(--fond)] rounded p-2"><div className="text-[var(--texte-muted)]">{label}</div><div className="font-semibold">{val}/20</div></div>
                    ))}
                  </div>
                  {r.points_forts && <p className="text-xs text-[#2D8B4E]">✓ {r.points_forts}</p>}
                  {r.points_faibles && <p className="text-xs text-[var(--rouge)]">✗ {r.points_faibles}</p>}
                </div>
              );
            })}
          </div>
        )}
      ]} />

      <Modal open={openRC} onClose={() => { setOpenRC(false); setStep(1); }} title={`Nouveau RC — Étape ${step}/2`} size="lg">
        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Informations candidat</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Nom du candidat *</label><input className="input" value={form.candidat_nom} onChange={e => setForm({...form, candidat_nom: e.target.value})} placeholder="Nom complet RP" autoFocus /></div>
              <div><label className="label">Discord</label><input className="input" value={form.candidat_discord} onChange={e => setForm({...form, candidat_discord: e.target.value})} placeholder="user#0000" /></div>
            </div>
            <div className="flex justify-end gap-2"><button className="bouton-gris" onClick={() => { setOpenRC(false); setStep(1); }}>Annuler</button><button className="bouton-bleu" onClick={() => setStep(2)} disabled={!form.candidat_nom.trim()}>Suivant →</button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)]">Planification</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Date et heure *</label><input type="datetime-local" className="input" value={form.date_rc} onChange={e => setForm({...form, date_rc: e.target.value})} /></div>
              <div><label className="label">Lieu</label><input className="input" value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})} placeholder="Ex: QG BCSO" /></div>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <div className="flex justify-between"><button className="bouton-gris" onClick={() => setStep(1)}>← Retour</button><div className="flex gap-2"><button className="bouton-gris" onClick={() => { setOpenRC(false); setStep(1); }}>Annuler</button><button className="bouton-or" onClick={create} disabled={!form.date_rc || saving}>{saving ? "..." : "Créer"}</button></div></div>
          </div>
        )}
      </Modal>

      <Modal open={!!openResult} onClose={() => setOpenResult(null)} title={`Résultat — ${openResult?.candidat_nom}`} size="lg" footer={<><button className="bouton-gris" onClick={() => setOpenResult(null)}>Annuler</button><button className="bouton-or" onClick={submitResult} disabled={saving}>{saving ? "..." : "Valider"}</button></>}>
        <div className="space-y-4">
          <p className="text-xs text-[var(--texte-muted)]">Notation sur 20</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["Tir", "tir_note"], ["Conduite", "conduite_note"], ["Procédure", "procedure_note"], ["Comportement", "comportement_note"]].map(([label, key]) => (
              <div key={key}><label className="label">{label}</label><input type="number" step="0.5" min="0" max="20" className="input" value={(resultForm as any)[key]} onChange={e => setResultForm({...resultForm, [key]: e.target.value})} /></div>
            ))}
          </div>
          <div><label className="label">Points forts</label><textarea className="input" rows={2} value={resultForm.points_forts} onChange={e => setResultForm({...resultForm, points_forts: e.target.value})} /></div>
          <div><label className="label">Points faibles</label><textarea className="input" rows={2} value={resultForm.points_faibles} onChange={e => setResultForm({...resultForm, points_faibles: e.target.value})} /></div>
          <div><label className="label">Observations</label><textarea className="input" rows={2} value={resultForm.observations} onChange={e => setResultForm({...resultForm, observations: e.target.value})} /></div>
          <div><label className="label">Résultat final</label>
            <select className="input" value={resultForm.resultat} onChange={e => setResultForm({...resultForm, resultat: e.target.value})}>
              <option value="admis">Admis</option><option value="refuse">Refusé</option><option value="a_repasser">À repasser</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
