"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { PermissionGate } from "@/components/PermissionGate";
import { useUser } from "@/lib/useUser";
import { useSupabase } from "@/lib/useSupabase";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { getRang, estColeadMin } from "@/lib/constants";
import { Plus, Play, CheckCircle, User, MapPin, Calendar, MessageSquare } from "lucide-react";

export default function Page() {
  const { peutVoirFormateurs, estEnChargement } = useUser();
  if (estEnChargement) return null;
  return (
    <PermissionGate condition={peutVoirFormateurs()}>
      <LayoutApp><Inner /></LayoutApp>
    </PermissionGate>
  );
}

function Inner() {
  const supa = useSupabase();
  const { user: me, rang } = useUser();
  const [rcs, setRcs] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [attestations, setAttestations] = useState<any[]>([]);
  const [openRC, setOpenRC] = useState(false);
  const [openResult, setOpenResult] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({
    candidat_nom: "", candidat_discord: "", date_rc: "", lieu: "",
    notes: ""
  });
  const [resultForm, setResultForm] = useState<any>({
    tir_note: "", conduite_note: "", procedure_note: "", comportement_note: "",
    points_forts: "", points_faibles: "", observations: "", resultat: "admis"
  });

  const load = async () => {
    const { data: r } = await supa.from("recrutements").select("*").order("created_at", { ascending: false });
    setRcs(r ?? []);
    const { data: re } = await supa.from("rc_resultats").select("*").order("created_at", { ascending: false });
    setResults(re ?? []);
    const { data: a } = await supa.from("attestations").select("*").order("created_at", { ascending: false });
    setAttestations(a ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.candidat_nom || !form.date_rc) return;
    await supa.from("recrutements").insert({ ...form, createur_id: me?.id });
    setOpenRC(false);
    setStep(1);
    setForm({ candidat_nom: "", candidat_discord: "", date_rc: "", lieu: "", notes: "" });
    load();
  };

  const take = async (id: string) => {
    await supa.from("recrutements").update({ formateur_id: me?.id, statut: "en_cours" }).eq("id", id);
    load();
  };

  const submitResult = async () => {
    if (!openResult) return;
    const notes = [
      parseFloat(resultForm.tir_note) || 0,
      parseFloat(resultForm.conduite_note) || 0,
      parseFloat(resultForm.procedure_note) || 0,
      parseFloat(resultForm.comportement_note) || 0
    ];
    const globale = (notes.reduce((a, b) => a + b, 0) / 4).toFixed(2);

    await supa.from("rc_resultats").insert({
      recrutement_id: openResult.id,
      candidat_nom: openResult.candidat_nom,
      date_rc: openResult.date_rc,
      formateur_id: openResult.formateur_id,
      tir_note: notes[0],
      conduite_note: notes[1],
      procedure_note: notes[2],
      comportement_note: notes[3],
      note_globale: parseFloat(globale),
      points_forts: resultForm.points_forts,
      points_faibles: resultForm.points_faibles,
      observations: resultForm.observations,
      resultat: resultForm.resultat,
      redacteur_id: me?.id
    });
    await supa.from("recrutements").update({ statut: "termine" }).eq("id", openResult.id);
    setOpenResult(null);
    setResultForm({ tir_note: "", conduite_note: "", procedure_note: "", comportement_note: "", points_forts: "", points_faibles: "", observations: "", resultat: "admis" });
    load();
  };

  const rcPending = rcs.filter(r => r.statut !== "termine");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="titre-page">Formateurs</h1>
        <button className="bouton-or" onClick={() => setOpenRC(true)}><Plus className="w-4 h-4" /> Nouveau RC</button>
      </div>

      <Tabs tabs={[
        {
          label: "RC à faire",
          content: (
            <div className="space-y-3">
              {rcPending.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun RC en attente.</p>}
              {rcPending.map(r => (
                <div key={r.id} className="carte">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--or)]" />
                        {r.candidat_nom}
                      </p>
                      <p className="text-xs text-[var(--texte-muted)] ml-6">{r.candidat_discord}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.statut === "planifie" ? "bg-[var(--bleu)]" : r.statut === "en_cours" ? "bg-[var(--or)]" : "bg-[var(--texte-muted)]"}`}>
                      {r.statut === "planifie" ? "Planifié" : r.statut === "en_cours" ? "En cours" : r.statut}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-[var(--texte-muted)] ml-6 mb-3">
                    {r.date_rc && (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.date_rc).toLocaleString("fr-FR")}</span>
                    )}
                    {r.lieu && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.lieu}</span>
                    )}
                  </div>
                  <div className="flex gap-2 ml-6">
                    {!r.formateur_id && (
                      <button onClick={() => take(r.id)} className="bouton-bleu text-xs py-1">
                        <Play className="w-3 h-3" /> Prendre le RC
                      </button>
                    )}
                    {r.formateur_id && r.statut === "en_cours" && (
                      <button onClick={() => setOpenResult(r)} className="bouton-vert text-xs py-1">
                        <CheckCircle className="w-3 h-3" /> Saisir résultat
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        },
        {
          label: "Résultats RC",
          content: (
            <div className="space-y-3">
              {results.map(r => {
                const color = (r.note_globale ?? 0) >= 14 ? "#2D8B4E" : (r.note_globale ?? 0) >= 10 ? "#D97706" : "#B32134";
                return (
                  <div key={r.id} className="carte">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{r.candidat_nom}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold" style={{ color }}>{r.note_globale}/20</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${r.resultat === "admis" ? "bg-[#2D8B4E]" : r.resultat === "refuse" ? "bg-[var(--rouge)]" : "bg-[var(--or)]"}`}>
                          {r.resultat === "admis" ? "Admis" : r.resultat === "refuse" ? "Refusé" : "À repasser"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-center mb-2">
                      <div className="bg-[var(--fond)] rounded p-2">
                        <div className="text-[var(--texte-muted)]">Tir</div>
                        <div className="font-semibold">{r.tir_note}/20</div>
                      </div>
                      <div className="bg-[var(--fond)] rounded p-2">
                        <div className="text-[var(--texte-muted)]">Conduite</div>
                        <div className="font-semibold">{r.conduite_note}/20</div>
                      </div>
                      <div className="bg-[var(--fond)] rounded p-2">
                        <div className="text-[var(--texte-muted)]">Procédure</div>
                        <div className="font-semibold">{r.procedure_note}/20</div>
                      </div>
                      <div className="bg-[var(--fond)] rounded p-2">
                        <div className="text-[var(--texte-muted)]">Comportement</div>
                        <div className="font-semibold">{r.comportement_note}/20</div>
                      </div>
                    </div>
                    {r.points_forts && <p className="text-xs text-[#2D8B4E]">✓ {r.points_forts}</p>}
                    {r.points_faibles && <p className="text-xs text-[var(--rouge)]">✗ {r.points_faibles}</p>}
                  </div>
                );
              })}
              {results.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun résultat.</p>}
            </div>
          )
        },
        {
          label: "Attestations",
          content: (
            <div className="space-y-2">
              {attestations.map(a => (
                <div key={a.id} className="carte flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--or)]">{a.numero}</span>
                  <span className="text-sm">{a.objet}</span>
                  <span className="ml-auto text-xs text-[var(--texte-muted)]">{a.type}</span>
                </div>
              ))}
              {attestations.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucune attestation.</p>}
            </div>
          )
        }
      ]} />

      {/* New RC Modal - stepped form */}
      <Modal open={openRC} onClose={() => { setOpenRC(false); setStep(1); }} title={`Nouveau RC — Étape ${step}/2`} size="lg">
        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)] mb-2">Informations sur le candidat</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Nom du candidat *</label><input className="input" value={form.candidat_nom} onChange={e => setForm({...form, candidat_nom: e.target.value})} placeholder="Nom complet RP" /></div>
              <div><label className="label">Discord</label><input className="input" value={form.candidat_discord} onChange={e => setForm({...form, candidat_discord: e.target.value})} placeholder="user#0000" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="bouton-gris" onClick={() => { setOpenRC(false); setStep(1); }}>Annuler</button>
              <button className="bouton-bleu" onClick={() => setStep(2)} disabled={!form.candidat_nom.trim()}>Suivant →</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--texte-muted)] mb-2">Planification de la session</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Date et heure *</label><input type="datetime-local" className="input" value={form.date_rc} onChange={e => setForm({...form, date_rc: e.target.value})} /></div>
              <div><label className="label">Lieu</label><input className="input" value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})} placeholder="Ex: QG BCSO" /></div>
            </div>
            <div><label className="label">Notes / remarques</label><textarea className="input" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes additionnelles..." /></div>
            <div className="flex justify-between pt-2">
              <button className="bouton-gris" onClick={() => setStep(1)}>← Retour</button>
              <div className="flex gap-2">
                <button className="bouton-gris" onClick={() => { setOpenRC(false); setStep(1); }}>Annuler</button>
                <button className="bouton-or" onClick={create} disabled={!form.date_rc}>Créer le RC</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Result entry modal */}
      <Modal open={!!openResult} onClose={() => setOpenResult(null)} title={`Résultat RC — ${openResult?.candidat_nom}`} size="lg"
        footer={<>
          <button className="bouton-gris" onClick={() => setOpenResult(null)}>Annuler</button>
          <button className="bouton-or" onClick={submitResult}>Valider le résultat</button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--texte-muted)]">Notation sur 20</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="label">Tir</label><input type="number" step="0.5" min="0" max="20" className="input" value={resultForm.tir_note} onChange={e => setResultForm({...resultForm, tir_note: e.target.value})} /></div>
            <div><label className="label">Conduite</label><input type="number" step="0.5" min="0" max="20" className="input" value={resultForm.conduite_note} onChange={e => setResultForm({...resultForm, conduite_note: e.target.value})} /></div>
            <div><label className="label">Procédure</label><input type="number" step="0.5" min="0" max="20" className="input" value={resultForm.procedure_note} onChange={e => setResultForm({...resultForm, procedure_note: e.target.value})} /></div>
            <div><label className="label">Comportement</label><input type="number" step="0.5" min="0" max="20" className="input" value={resultForm.comportement_note} onChange={e => setResultForm({...resultForm, comportement_note: e.target.value})} /></div>
          </div>
          <div><label className="label">Points forts</label><textarea className="input" rows={2} value={resultForm.points_forts} onChange={e => setResultForm({...resultForm, points_forts: e.target.value})} /></div>
          <div><label className="label">Points faibles</label><textarea className="input" rows={2} value={resultForm.points_faibles} onChange={e => setResultForm({...resultForm, points_faibles: e.target.value})} /></div>
          <div><label className="label">Observations</label><textarea className="input" rows={2} value={resultForm.observations} onChange={e => setResultForm({...resultForm, observations: e.target.value})} /></div>
          <div><label className="label">Résultat final</label>
            <select className="input" value={resultForm.resultat} onChange={e => setResultForm({...resultForm, resultat: e.target.value})}>
              <option value="admis">Admis</option>
              <option value="refuse">Refusé</option>
              <option value="a_repasser">À repasser</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
