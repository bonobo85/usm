"use client";
import LayoutApp from "@/components/LayoutApp";
import { PermissionGate } from "@/components/PermissionGate";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { BadgesRow } from "@/components/BadgeTag";
import { Modal } from "@/components/Modal";
import { ORDRE_BADGES, BADGES_META, getRang } from "@/lib/constants";
import { Plus, Search } from "lucide-react";

export default function BadgesPage() {
  return (
    <PermissionGate rangMin={5}>
      <LayoutApp>
        <Inner />
      </LayoutApp>
    </PermissionGate>
  );
}

function Inner() {
  const supa = useSupabase();
  const { user: me } = useUser();
  const [members, setMembers] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<any>(null);
  const [revoking, setRevoking] = useState<{ user: any; code: string } | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    const { data } = await supa.from("users").select("id, username, surnom, avatar_url, rank_level, user_badges(id, is_active, badges(id, code))").eq("is_active", true);
    setMembers((data as any) ?? []);
    const { data: b } = await supa.from("badges").select("*").order("ordre_affichage");
    setAllBadges(b ?? []);
  };
  useEffect(() => { load(); }, []);

  const grant = async (badgeId: string) => {
    await supa.from("user_badges").insert({ user_id: target.id, badge_id: badgeId, attribue_par: me?.id });
    setTarget(null);
    load();
  };
  const revoke = async () => {
    if (!revoking || reason.length < 3) return;
    const ub = revoking.user.user_badges.find((b: any) => b.is_active && b.badges.code === revoking.code);
    if (ub) {
      await supa.from("user_badges").update({ is_active: false, raison_revocation: reason, revoque_par: me?.id, revoque_le: new Date().toISOString() }).eq("id", ub.id);
    }
    setRevoking(null); setReason(""); load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="titre-page mr-auto">Badges</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--texte-muted)]" />
          <input className="input pl-9 w-64" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        {members
          .filter(m => (m.surnom ?? m.username).toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => b.rank_level - a.rank_level)
          .map(m => {
            const r = getRang(m.rank_level);
            const codes = m.user_badges.filter((b: any) => b.is_active).map((b: any) => b.badges.code);
            const missing = ORDRE_BADGES.filter(c => !codes.includes(c));
            return (
              <div key={m.id} className="carte flex flex-wrap items-center gap-3" style={{ borderLeft: `3px solid ${r.couleur}` }}>
                <Avatar src={m.avatar_url} name={m.surnom ?? m.username} size={36} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{m.surnom ?? m.username}</p>
                  <RankBadge level={m.rank_level} size="xs" />
                </div>
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  <BadgesRow codes={codes} size="xs" onRevoke={(code) => setRevoking({ user: m, code })} />
                  {missing.length > 0 && (
                    <button onClick={() => setTarget({ ...m, _missing: missing })} className="text-xs px-2 py-1 rounded border border-dashed border-[var(--or)] text-[var(--or)] hover:bg-[var(--or)] hover:text-white transition flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Ajouter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Attribuer un badge à ${target?.surnom ?? target?.username}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {target?._missing?.map((c: string) => {
            const meta = BADGES_META[c];
            const b = allBadges.find(x => x.code === c);
            return (
              <button key={c} onClick={() => grant(b.id)} className="carte text-left hover:border-[var(--or)] transition">
                <p className="font-semibold text-sm" style={{ color: meta.couleur }}>{meta.nom}</p>
                <p className="text-xs text-[var(--texte-muted)]">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={!!revoking}
        onClose={() => { setRevoking(null); setReason(""); }}
        title="Révoquer le badge"
        footer={<>
          <button onClick={() => { setRevoking(null); setReason(""); }} className="bouton-gris">Annuler</button>
          <button onClick={revoke} disabled={reason.length < 3} className="bouton-rouge">Révoquer</button>
        </>}
      >
        <p className="text-sm mb-3">
          Révoquer <strong>{revoking?.code}</strong> de <strong>{revoking?.user?.surnom ?? revoking?.user?.username}</strong> ?
        </p>
        <label className="label">Raison (obligatoire, min 3 car.)</label>
        <textarea className="input" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
      </Modal>
    </div>
  );
}
