"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { api } from "@/lib/api";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { Plus, FileText } from "lucide-react";

export default function Page() { return <LayoutApp><Inner /></LayoutApp>; }

function Inner() {
  const supa = useSupabase();
  const { user: me, rang, estConnecte } = useUser();
  const [reports, setReports] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!estConnecte) return;
    const { data } = await supa.from("reports").select("*").order("created_at", { ascending: false });
    setReports(data ?? []);
    const { data: t } = await supa.from("report_templates").select("*").eq("is_active", true);
    setTemplates(t ?? []);
  }, [supa, estConnecte]);

  useEffect(() => { load(); }, [load]);

  const create = async (template_code: string) => {
    setErrMsg(null);
    const r = await api<{ id: string }>("report:create", { template_code, titre: "Nouveau rapport" });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setOpenNew(false);
    if (r.data?.id) location.href = `/rapports/${r.data.id}`;
  };

  const Card = (r: any) => (
    <Link href={`/rapports/${r.id}`} key={r.id} className="carte hover:border-[var(--or)] transition flex items-center gap-3">
      <FileText className="w-5 h-5 text-[var(--or)]" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{r.titre}</p>
        <p className="text-xs text-[var(--texte-muted)]">{r.template_code}</p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded bg-[var(--bleu)] text-white">{r.statut}</span>
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
      {errMsg && <div className="mb-4 p-3 rounded-lg bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 text-sm text-[var(--rouge)]">{errMsg} <button className="ml-2 underline" onClick={() => setErrMsg(null)}>×</button></div>}
      <Tabs tabs={[
        { label: `Mes rapports (${mine.length})`, content: <div className="grid sm:grid-cols-2 gap-3">{mine.map(Card)}{mine.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun.</p>}</div> },
        ...(rang >= 5 ? [{ label: `À publier (${toPub.length})`, content: <div className="grid sm:grid-cols-2 gap-3">{toPub.map(Card)}{toPub.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun.</p>}</div> }] : []),
        { label: `Publiés (${pub.length})`, content: <div className="grid sm:grid-cols-2 gap-3">{pub.map(Card)}{pub.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun.</p>}</div> }
      ]} />
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Choisir un modèle">
        <div className="grid grid-cols-2 gap-3">
          {templates.map(t => (
            <button key={t.code} onClick={() => create(t.code)} className="carte text-left hover:border-[var(--or)] transition">
              <p className="font-semibold text-sm">{t.nom}</p>
              <p className="text-xs text-[var(--texte-muted)]">{t.description}</p>
            </button>
          ))}
          {templates.length === 0 && <p className="text-sm text-[var(--texte-muted)] col-span-2">Aucun template.</p>}
        </div>
      </Modal>
    </div>
  );
}
