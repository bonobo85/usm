"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { PermissionGate } from "@/components/PermissionGate";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { getRang } from "@/lib/constants";

export default function Page() {
  return <PermissionGate rangMin={6}><LayoutApp><Inner /></LayoutApp></PermissionGate>;
}

function Inner() {
  const supa = useSupabase();
  const [archives, setArchives] = useState<any[]>([]);
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: a } = await supa.from("archives").select("*").order("date_depart", { ascending: false });
      setArchives(a ?? []);
      const { data: s } = await supa.from("sanctions").select("*").order("created_at", { ascending: false });
      setSanctions(s ?? []);
      const { data: d } = await supa.from("documents").select("*").order("created_at", { ascending: false });
      setDocs(d ?? []);
    })();
  }, []);

  return (
    <div>
      <h1 className="titre-page mb-4">Archives</h1>
      <Tabs tabs={[
        {
          label: "Membres",
          content: (
            <div className="space-y-2">
              {archives.map(a => {
                const r = getRang(a.rank_final);
                return (
                  <div key={a.id} className="carte flex items-center gap-3" style={{ borderLeft: `3px solid ${r.couleur}` }}>
                    <span className="font-semibold">{a.username_final}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--bleu)]">{a.raison}</span>
                    <span className="ml-auto text-xs text-[var(--texte-muted)]">{new Date(a.date_depart).toLocaleDateString("fr-FR")}</span>
                  </div>
                );
              })}
            </div>
          )
        },
        {
          label: "Casier",
          content: (
            <div className="space-y-2">
              {sanctions.map(s => (
                <div key={s.id} className="carte"><span className="font-semibold">{s.type}</span> — <span className="text-xs text-[var(--texte-muted)]">{s.raison}</span></div>
              ))}
            </div>
          )
        },
        {
          label: "Documents",
          content: (
            <div className="space-y-2">
              {docs.map(d => (
                <a key={d.id} href={d.url} target="_blank" className="carte block hover:border-[var(--or)]">
                  <span className="font-semibold">{d.titre}</span>
                  <p className="text-xs text-[var(--texte-muted)]">{d.categorie}</p>
                </a>
              ))}
            </div>
          )
        }
      ]} />
    </div>
  );
}
