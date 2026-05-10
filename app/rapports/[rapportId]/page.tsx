"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { api } from "@/lib/api";
import { Save, Send, BadgeCheck, Loader2, Plus, Trash2 } from "lucide-react";

export default function Page() {
  const supa = useSupabase();
  const { user: me, rang, estConnecte } = useUser();
  const { rapportId } = useParams<{ rapportId: string }>();
  const [r, setR] = useState<any>(null);
  const [tpl, setTpl] = useState<any>(null);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState<any>({});
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!estConnecte || !rapportId) return;
    setLoading(true);
    const { data } = await supa.from("reports").select("*").eq("id", rapportId).single();
    if (!data) { setLoading(false); return; }
    setR(data);
    setTitre(data.titre ?? "");
    setContenu(data.contenu ?? {});
    setSections(data.sections ?? []);
    if (data.template_code) {
      const { data: t } = await supa.from("report_templates").select("*").eq("code", data.template_code).single();
      setTpl(t);
    }
    setLoading(false);
  }, [supa, estConnecte, rapportId]);

  useEffect(() => { load(); }, [load]);

  const save = async (statut?: string) => {
    setSaving(true); setErrMsg(null); setSavedMsg(null);
    const fields: any = { titre, contenu, sections };
    if (statut) fields.statut = statut;
    const result = await api("report:update_self", { id: r.id, fields });
    setSaving(false);
    if (!result.ok) { setErrMsg(result.error || "Erreur"); return; }
    setSavedMsg(statut === "submitted" ? "Soumis !" : "Enregistré");
    setTimeout(() => setSavedMsg(null), 2000);
    await load();
  };

  const publish = async () => {
    setSaving(true); setErrMsg(null);
    const result = await api("report:publish", { id: r.id });
    setSaving(false);
    if (!result.ok) { setErrMsg(result.error || "Erreur"); return; }
    await load();
  };

  if (loading) return <LayoutApp><div className="flex items-center gap-2 text-[var(--texte-muted)] mt-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div></LayoutApp>;
  if (!r) return <LayoutApp><p className="text-[var(--texte-muted)] text-center mt-12">Rapport introuvable.</p></LayoutApp>;

  const isCustom = r.template_code === "custom";
  const isAuthor = r.auteur_id === me?.id;
  const canEdit = (isAuthor && !r.publie) || rang >= 5;
  const canPublish = rang >= 5 && !r.publie;

  const addCustomSection = () => setSections([...sections, { titre: "Nouvelle section", contenu: "" }]);
  const updateSection = (i: number, key: string, val: string) => {
    const next = [...sections];
    next[i] = { ...next[i], [key]: val };
    setSections(next);
  };
  const removeSection = (i: number) => setSections(sections.filter((_, idx) => idx !== i));

  return (
    <LayoutApp>
      <div className="carte mb-4">
        {r.publie && (
          <div className="mb-3 p-2 bg-[var(--or)]/10 border border-[var(--or)] rounded flex items-center gap-2 text-sm">
            <BadgeCheck className="w-4 h-4 text-[var(--or)]" /> Publié le {new Date(r.publie_le).toLocaleString("fr-FR")}
          </div>
        )}
        {errMsg && <div className="mb-3 p-2 bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 rounded text-sm text-[var(--rouge)]">{errMsg}</div>}
        {savedMsg && <div className="mb-3 p-2 bg-[#2D8B4E]/10 border border-[#2D8B4E]/30 rounded text-sm text-[#2D8B4E]">{savedMsg}</div>}

        <input className="input text-lg font-semibold" value={titre} onChange={e => setTitre(e.target.value)} disabled={!canEdit} />
        <p className="text-xs text-[var(--texte-muted)] mt-1">Type : {r.template_code} • Statut : {r.statut}</p>

        {tpl && !isCustom && tpl.sections?.map((sec: any, si: number) => (
          <div key={si} className="mt-4">
            <h3 className="text-sm font-semibold text-[var(--or)] uppercase tracking-wider mb-2">{sec.titre}</h3>
            <div className="space-y-3">
              {sec.champs?.map((champ: any, ci: number) => (
                <div key={ci}>
                  <label className="label">{champ.label}{champ.required && " *"}</label>
                  {champ.type === "textarea" ? (
                    <textarea className="input" rows={3}
                      value={contenu[champ.nom] ?? ""}
                      onChange={e => setContenu({...contenu, [champ.nom]: e.target.value})}
                      disabled={!canEdit}
                    />
                  ) : (
                    <input className="input" type={champ.type === "datetime" ? "datetime-local" : champ.type}
                      value={contenu[champ.nom] ?? ""}
                      onChange={e => setContenu({...contenu, [champ.nom]: e.target.value})}
                      disabled={!canEdit}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {isCustom && (
          <div className="mt-4 space-y-4">
            {sections.map((s, i) => (
              <div key={i} className="border border-[var(--bordure)] rounded p-3">
                <div className="flex justify-between mb-2">
                  <input className="input text-sm font-semibold flex-1 mr-2" value={s.titre} onChange={e => updateSection(i, "titre", e.target.value)} disabled={!canEdit} />
                  {canEdit && <button onClick={() => removeSection(i)} className="text-[var(--rouge)] p-1 hover:bg-[var(--rouge)]/10 rounded"><Trash2 className="w-4 h-4" /></button>}
                </div>
                <textarea className="input" rows={4} value={s.contenu} onChange={e => updateSection(i, "contenu", e.target.value)} disabled={!canEdit} />
              </div>
            ))}
            {canEdit && <button onClick={addCustomSection} className="bouton-gris text-xs"><Plus className="w-3 h-3" /> Ajouter une section</button>}
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => save()} disabled={saving} className="bouton-gris"><Save className="w-4 h-4" /> {saving ? "..." : "Enregistrer brouillon"}</button>
            {!r.publie && <button onClick={() => save("submitted")} disabled={saving} className="bouton-bleu"><Send className="w-4 h-4" /> Soumettre</button>}
            {canPublish && r.statut === "submitted" && <button onClick={publish} disabled={saving} className="bouton-or"><BadgeCheck className="w-4 h-4" /> Publier</button>}
          </div>
        )}
      </div>
    </LayoutApp>
  );
}
