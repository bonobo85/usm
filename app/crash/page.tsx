"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { PermissionGate } from "@/components/PermissionGate";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { getRang } from "@/lib/constants";

export default function Page() {
  const { peutVoirCrash, estEnChargement } = useUser();
  if (estEnChargement) return null;
  return <PermissionGate condition={peutVoirCrash()}><LayoutApp><Inner /></LayoutApp></PermissionGate>;
}

function Inner() {
  const supa = useSupabase();
  const [members, setMembers] = useState<any[]>([]);
  const [invs, setInvs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supa.from("users").select("id, username, surnom, avatar_url, rank_level, user_badges!inner(is_active, badges!inner(code))").eq("user_badges.is_active", true).eq("user_badges.badges.code", "CRASH");
      setMembers(data ?? []);
      const { data: i } = await supa.from("investigations").select("*").order("created_at", { ascending: false });
      setInvs(i ?? []);
    })();
  }, []);

  return (
    <div>
      <h1 className="titre-page mb-4">CRASH</h1>
      <Tabs tabs={[
        {
          label: "Membres CRASH",
          content: (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(m => {
                const r = getRang(m.rank_level);
                return (
                  <div key={m.id} className="carte flex items-center gap-3" style={{ borderLeft: `3px solid ${r.couleur}` }}>
                    <Avatar src={m.avatar_url} name={m.surnom ?? m.username} size={40} />
                    <div>
                      <p className="font-semibold text-sm">{m.surnom ?? m.username}</p>
                      <RankBadge level={m.rank_level} size="xs" />
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun membre.</p>}
            </div>
          )
        },
        {
          label: "Enquêtes",
          content: (
            <div className="space-y-2">
              {invs.map(i => (
                <div key={i.id} className="carte" style={{ borderLeft: "3px solid var(--rouge)" }}>
                  <div className="flex justify-between"><span className="font-semibold">{i.titre}</span><span className="text-xs px-2 py-0.5 rounded bg-[var(--rouge)]">{i.statut}</span></div>
                  {i.description && <p className="text-xs text-[var(--texte-muted)] mt-1">{i.description}</p>}
                </div>
              ))}
            </div>
          )
        }
      ]} />
    </div>
  );
}
