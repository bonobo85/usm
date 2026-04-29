"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Save, Send, BadgeCheck } from "lucide-react";

export default function Page() {
  const supa = useSupabase();
  const { user: me, rang } = useUser();
  const { rapportId } = useParams<{ rapportId: string }>();
  const [r, setR] = useState<any>(null);
  const [tpl, setTpl] = useState<any>(null);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState<any>({});
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supa.from("reports").select("*").eq("id", rapportId).single();
      setR(data);
      setTitre(data?.titre ?? "");
      setContenu(data?.contenu ?? {});
      setSections(data?.sections ?? []);
      if (data?.template_code) {
        const { data: t } = await supa.from("report_templates").select("*").eq("code", data.template_code).single();
        setTpl(t);
      }
    })();
  }, [rapportId]);

  if (!r) return <LayoutApp><p className="text-[var(--texte-muted)]">Chargement…</p></LayoutApp>;

  const save = async (statut?: string) => {
    const upd: any = { titre, contenu, sections, updated_at: new Date().toISOString() };
    if (statut) upd.statut = statut;
    await supa.from("reports").update(upd).eq("id", r.id);
    setR({ ...r, ...upd });
  };
  const publish = async () => {
    await supa.from("reports").update({ publie: true, publie_par: me?.id, publie_le: new Date().toISOString(), statut: "validated" }).eq("id", r.id);
    location.reload();
  };

  const isCustom = r.template_code === "custom";
  const isAuthor = r.auteur_id === me?.id;

  return (
    <LayoutApp>
      <div className="carte mb-4">
        {r.publie && (
          <div className="mb-3 p-2 bg-[var(--or)]/10 border border-[var(--or)] rounded flex items-center gap-2 text-sm">
            <BadgeCheck className="w-4 h-4 text-[var(--or)]" /> Publié le {new Date(r.publie_le).toLocaleString("fr-FR")}
          </div>
        )}
        <input className="input text-lg font-semibold" value={titre} onChange={e => setTitre(e.target.value)} disabled={!isAuthor || r.publie} />
        <p className="text-xs text-[var(--texte-muted)] mt-1">Type : {r.template_code} • Statut : {r.statut}</p>

        {tpl && !isCustom && (
          <div className="mt-4 space-y-4">
            {(tpl.sections as any[]).map((sec, i) => (
              <div key={i} className="border border-[var(--bordure)] rounded p-3">
                <h3 className="titre-section">{sec.titre}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {sec.champs.map((c: any) => (
                    <div key={c.nom} className={c.type === "textarea" ? "sm:col-span-2" : ""}>
                      <label className="label">{c.label}{c.required && " *"}</label>
                      {c.type === "textarea" ? (
                        <textarea className="input" rows={3} value={contenu[c.nom] ?? ""} onChange={e => setContenu({...contenu, [c.nom]: e.target.value})} disabled={!isAuthor || r.publie} />
                      ) : (
                        <input type={c.type === "number" ? "number" : c.type === "date" ? "date" : c.type === "datetime" ? "datetime-local" : "text"}
                          className="input" value={contenu[c.nom] ?? ""} onChange={e => setContenu({...contenu, [c.nom]: e.target.value})} disabled={!isAuthor || r.publie} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {isCustom && (
          <div className="mt-4 space-y-3">
            {sections.map((s, i) => (
              <div key={i} className="border border-[var(--bordure)] rounded p-3">
                <input className="input mb-2" value={s.titre} onChange={e => { const c = [...sections]; c[i].titre = e.target.value; setSections(c); }} />
                <textarea className="input" rows={4} value={s.texte} onChange={e => { const c = [...sections]; c[i].texte = e.target.value; setSections(c); }} />
              </div>
            ))}
            <button onClick={() => setSections([...sections, { titre: "", texte: "" }])} className="bouton-gris text-xs">+ Ajouter une section</button>
          </div>
        )}

        {isAuthor && !r.publie && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => save("draft")} className="bouton-gris"><Save className="w-4 h-4" /> Brouillon</button>
            <button onClick={() => save("submitted")} className="bouton-bleu"><Send className="w-4 h-4" /> Soumettre</button>
          </div>
        )}
        {rang >= 5 && !r.publie && (
          <button onClick={publish} className="mt-4 bouton-or"><BadgeCheck className="w-4 h-4" /> Publier</button>
        )}
      </div>
    </LayoutApp>
  );
}
