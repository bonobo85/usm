"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { Plus, FileText } from "lucide-react";

export default function Page() {
  return <LayoutApp><Inner /></LayoutApp>;
}

function Inner() {
  const supa = useSupabase();
  const { user: me, rang } = useUser();
  const [reports, setReports] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [openNew, setOpenNew] = useState(false);

  const load = async () => {
    const { data } = await supa.from("reports").select("*").order("created_at", { ascending: false });
    setReports(data ?? []);
    const { data: t } = await supa.from("report_templates").select("*").eq("is_active", true);
    setTemplates(t ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (template_code: string) => {
    const { data } = await supa.from("reports").insert({
      titre: "Nouveau rapport", template_code, type: template_code, auteur_id: me?.id, statut: "draft", contenu: {}, sections: []
    }).select().single();
    setOpenNew(false);
    if (data) location.href = `/rapports/${data.id}`;
  };

  const Card = (r: any) => (
    <Link href={`/rapports/${r.id}`} key={r.id} className="carte hover:border-[var(--or)] transition flex items-center gap-3">
      <FileText className="w-5 h-5 text-[var(--or)]" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{r.titre}</p>
        <p className="text-xs text-[var(--texte-muted)]">{r.template_code}</p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded bg-[var(--bleu)]">{r.statut}</span>
    </Link>
  );

  const mine = reports.filter(r => r.auteur_id === me?.id);
  const toPub = reports.filter(r => r.statut === "submitted");
  const pub = reports.filter(r => r.publie);

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="titre-page">Rapports</h1>
        <button className="bouton-or" onClick={() => setOpenNew(true)}><Plus className="w-4 h-4" /> Nouveau rapport</button>
      </div>

      <Tabs tabs={[
        { label: "Mes rapports", content: <div className="grid sm:grid-cols-2 gap-3">{mine.map(Card)}{mine.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun rapport.</p>}</div> },
        ...(rang >= 5 ? [{ label: "À publier", content: <div className="grid sm:grid-cols-2 gap-3">{toPub.map(Card)}</div> }] : []),
        { label: "Publiés", content: <div className="grid sm:grid-cols-2 gap-3">{pub.map(Card)}</div> }
      ]} />

      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Choisir un modèle">
        <div className="grid grid-cols-2 gap-2">
          {templates.map(t => (
            <button key={t.code} onClick={() => create(t.code)} className="carte text-left hover:border-[var(--or)]">
              <p className="font-semibold text-sm">{t.nom}</p>
              <p className="text-xs text-[var(--texte-muted)]">{t.description}</p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
