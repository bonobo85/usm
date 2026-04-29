"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { PermissionGate } from "@/components/PermissionGate";
import { useUser } from "@/lib/useUser";
import { useSupabase } from "@/lib/useSupabase";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Plus } from "lucide-react";

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
  const [form, setForm] = useState<any>({ candidat_nom: "", candidat_discord: "", date_rc: "", lieu: "" });

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
    await supa.from("recrutements").insert({ ...form, createur_id: me?.id });
    setOpenRC(false); load();
  };
  const take = async (id: string) => {
    await supa.from("recrutements").update({ formateur_id: me?.id, statut: "en_cours" }).eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="titre-page mb-4">Formateurs</h1>
      <Tabs tabs={[
        {
          label: "RC à faire",
          content: (
            <>
              <button className="bouton-or mb-4" onClick={() => setOpenRC(true)}><Plus className="w-4 h-4" /> Nouveau RC</button>
              <div className="space-y-2">
                {rcs.filter(r => r.statut !== "termine").map(r => (
                  <div key={r.id} className="carte flex items-center gap-3">
                    <div>
                      <p className="font-semibold">{r.candidat_nom}</p>
                      <p className="text-xs text-[var(--texte-muted)]">{r.candidat_discord} • {r.lieu}</p>
                      <p className="text-xs text-[var(--texte-muted)]">{r.date_rc && new Date(r.date_rc).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-[var(--bleu)]">{r.statut}</span>
                    {!r.formateur_id && <button onClick={() => take(r.id)} className="bouton-bleu">Prendre</button>}
                  </div>
                ))}
              </div>
            </>
          )
        },
        {
          label: "Résultats RC",
          content: (
            <div className="space-y-2">
              {results.map(r => (
                <div key={r.id} className="carte">
                  <div className="flex justify-between">
                    <span className="font-semibold">{r.candidat_nom}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--or)]">{r.note_globale}/20</span>
                  </div>
                  <p className="text-xs text-[var(--texte-muted)]">{r.resultat}</p>
                </div>
              ))}
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

      <Modal open={openRC} onClose={() => setOpenRC(false)} title="Nouveau RC">
        <div className="space-y-3">
          <div><label className="label">Candidat</label><input className="input" value={form.candidat_nom} onChange={e => setForm({...form, candidat_nom: e.target.value})} /></div>
          <div><label className="label">Discord</label><input className="input" value={form.candidat_discord} onChange={e => setForm({...form, candidat_discord: e.target.value})} /></div>
          <div><label className="label">Date</label><input type="datetime-local" className="input" value={form.date_rc} onChange={e => setForm({...form, date_rc: e.target.value})} /></div>
          <div><label className="label">Lieu</label><input className="input" value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})} /></div>
          <div className="flex justify-end gap-2"><button className="bouton-gris" onClick={() => setOpenRC(false)}>Annuler</button><button className="bouton-bleu" onClick={create}>Créer</button></div>
        </div>
      </Modal>
    </div>
  );
}
