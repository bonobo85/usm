"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { PermissionGate } from "@/components/PermissionGate";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { Modal } from "@/components/Modal";
import { RANGS, getRang, peutAttribuerRang } from "@/lib/constants";

export default function Page() {
  const { rang, hasPermission, estEnChargement } = useUser();
  if (estEnChargement) return null;
  const ok = rang >= 7 || hasPermission("dev");
  return <PermissionGate condition={ok}><LayoutApp><Inner /></LayoutApp></PermissionGate>;
}

function Inner() {
  const supa = useSupabase();
  const { rang } = useUser();
  const [members, setMembers] = useState<any[]>([]);
  const [target, setTarget] = useState<any>(null);
  const [newRank, setNewRank] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supa.from("users").select("*").eq("is_active", true).order("rank_level", { ascending: false });
    setMembers(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const apply = async () => {
    if (!target || reason.length < 3) return;
    setErrMsg(null);
    const r = await api("user:rank_change", { user_id: target.id, nouveau_rang: newRank, raison: reason });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    setTarget(null); setReason(""); load();
  };

  const now = Date.now();
  const dotColor = (lc: string) => {
    const diff = now - new Date(lc).getTime();
    if (diff < 5 * 60_000) return "#2D8B4E";
    if (diff < 60 * 60_000) return "#C9994F";
    return "#4A5670";
  };

  return (
    <div>
      <h1 className="titre-page mb-4">Admin</h1>
      {errMsg && <div className="mb-4 p-3 rounded-lg bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 text-sm text-[var(--rouge)]">{errMsg} <button className="ml-2 underline" onClick={() => setErrMsg(null)}>×</button></div>}
      <Tabs tabs={[
        {
          label: "Rangs",
          content: (
            <div className="space-y-2">
              {members.map(m => {
                const r = getRang(m.rank_level);
                return (
                  <div key={m.id} className="carte flex items-center gap-3" style={{ borderLeft: `3px solid ${r.couleur}` }}>
                    <Avatar src={m.avatar_url} name={m.surnom ?? m.username} size={36} />
                    <span className="font-semibold text-sm">{m.surnom ?? m.username}</span>
                    <RankBadge level={m.rank_level} size="xs" />
                    {peutAttribuerRang(rang, m.rank_level) && (
                      <button onClick={() => { setTarget(m); setNewRank(m.rank_level); }} className="ml-auto bouton-gris text-xs">Modifier</button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        },
        {
          label: "Connectés",
          content: (
            <div className="space-y-2">
              {members.slice().sort((a,b) => new Date(b.derniere_connexion).getTime() - new Date(a.derniere_connexion).getTime()).map(m => (
                <div key={m.id} className="carte flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: dotColor(m.derniere_connexion) }} />
                  <span className="text-sm">{m.surnom ?? m.username}</span>
                  <span className="ml-auto text-xs text-[var(--texte-muted)]">{new Date(m.derniere_connexion).toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          )
        },
        {
          label: "Permissions",
          content: <p className="text-sm text-[var(--texte-muted)]">Réservé Shériff / dev — gestion des permissions <code>dev / admin_panel / super_admin</code>.</p>
        },
        {
          label: "Vue d'ensemble",
          content: (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase">Membres</p><p className="text-2xl font-semibold">{members.length}</p></div>
              <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase">Co-Lead+</p><p className="text-2xl font-semibold">{members.filter(m => m.rank_level >= 7).length}</p></div>
              <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase">Op+</p><p className="text-2xl font-semibold">{members.filter(m => m.rank_level >= 6).length}</p></div>
              <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase">Disponibles</p><p className="text-2xl font-semibold">{members.filter(m => m.statut === "disponible").length}</p></div>
            </div>
          )
        }
      ]} />

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Changer le rang de ${target?.surnom ?? target?.username}`}
        footer={<>
          <button className="bouton-gris" onClick={() => setTarget(null)}>Annuler</button>
          <button className="bouton-bleu" onClick={apply} disabled={reason.length < 3}>Appliquer</button>
        </>}>
        <div className="space-y-3">
          <div><label className="label">Nouveau rang</label>
            <select className="input" value={newRank} onChange={e => setNewRank(parseInt(e.target.value))}>
              {RANGS.filter(r => r.level < rang).map(r => <option key={r.level} value={r.level}>{r.nom}</option>)}
            </select>
          </div>
          <div><label className="label">Raison (min 3 car.)</label>
            <textarea className="input" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
