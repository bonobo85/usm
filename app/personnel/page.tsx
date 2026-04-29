"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState, useMemo } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { Tabs } from "@/components/Tabs";
import { Avatar } from "@/components/Avatar";
import { RankBadge, StatusDot } from "@/components/RankBadge";
import { BadgesRow } from "@/components/BadgeTag";
import { getRang, RANGS } from "@/lib/constants";
import Link from "next/link";
import { Search, Users, LayoutGrid } from "lucide-react";

type Member = {
  id: string; username: string; surnom: string | null; avatar_url: string | null;
  rank_level: number; statut: string; user_badges: { is_active: boolean; badges: { code: string } }[];
};

export default function PersonnelPage() {
  const supa = useSupabase();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [filterRank, setFilterRank] = useState<number | null>(null);
  const [sort, setSort] = useState<"rang_desc" | "rang_asc" | "surnom">("rang_desc");

  useEffect(() => {
    (async () => {
      const { data } = await supa
        .from("users")
        .select("id, username, surnom, avatar_url, rank_level, statut, user_badges(is_active, badges(code))")
        .eq("is_active", true);
      setMembers((data as any) ?? []);
    })();
  }, [supa]);

  const filtered = useMemo(() => {
    let list = members.filter(m =>
      (filterRank === null || m.rank_level === filterRank) &&
      ((m.surnom ?? m.username).toLowerCase().includes(search.toLowerCase()) ||
        getRang(m.rank_level).nom.toLowerCase().includes(search.toLowerCase()))
    );
    if (sort === "rang_desc") list.sort((a, b) => b.rank_level - a.rank_level);
    if (sort === "rang_asc")  list.sort((a, b) => a.rank_level - b.rank_level);
    if (sort === "surnom")    list.sort((a, b) => (a.surnom ?? a.username).localeCompare(b.surnom ?? b.username));
    return list;
  }, [members, search, filterRank, sort]);

  const total = members.length;
  const dispo = members.filter(m => m.statut === "disponible").length;

  const ListView = (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--texte-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par surnom ou grade…"
            className="input pl-9"
          />
        </div>
        <select
          value={filterRank ?? ""}
          onChange={e => setFilterRank(e.target.value ? parseInt(e.target.value) : null)}
          className="input max-w-[200px]"
        >
          <option value="">Tous les grades</option>
          {RANGS.map(r => <option key={r.level} value={r.level}>{r.nom}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as any)} className="input max-w-[200px]">
          <option value="rang_desc">Grade ↓</option>
          <option value="rang_asc">Grade ↑</option>
          <option value="surnom">Surnom</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase tracking-wider">Total</p><p className="text-2xl font-semibold">{total}</p></div>
        <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase tracking-wider">Disponibles</p><p className="text-2xl font-semibold text-[#2D8B4E]">{dispo}</p></div>
        <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase tracking-wider">Affichés</p><p className="text-2xl font-semibold">{filtered.length}</p></div>
        <div className="carte"><p className="text-xs text-[var(--texte-muted)] uppercase tracking-wider">Grades distincts</p><p className="text-2xl font-semibold">{new Set(members.map(m => m.rank_level)).size}</p></div>
      </div>

      <div className="space-y-2">
        {filtered.map(m => {
          const r = getRang(m.rank_level);
          const codes = m.user_badges?.filter(b => b.is_active).map(b => b.badges.code) ?? [];
          return (
            <Link
              href={`/profil/${m.id}`}
              key={m.id}
              className="carte flex items-center gap-3 hover:border-[var(--or)] transition"
              style={{ borderLeft: `3px solid ${r.couleur}` }}
            >
              <Avatar src={m.avatar_url} name={m.surnom ?? m.username} size={42} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <StatusDot statut={m.statut} />
                  <span className="font-semibold truncate">{m.surnom ?? m.username}</span>
                  <RankBadge level={m.rank_level} size="xs" />
                </div>
                <BadgesRow codes={codes} size="xs" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const OrgaView = (
    <div className="space-y-6">
      {RANGS.slice().reverse().map(r => {
        const list = members.filter(m => m.rank_level === r.level);
        if (list.length === 0) return null;
        return (
          <div key={r.level}>
            <div className="flex items-center gap-2 mb-3">
              <RankBadge level={r.level} size="md" />
              <span className="text-xs text-[var(--texte-muted)]">({list.length})</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
              {list.map(m => (
                <Link href={`/profil/${m.id}`} key={m.id} className="flex flex-col items-center text-center group">
                  <div className="relative">
                    <Avatar src={m.avatar_url} name={m.surnom ?? m.username} size={56} className="group-hover:ring-2 ring-[var(--or)]" />
                    <span className="absolute bottom-0 right-0"><StatusDot statut={m.statut} /></span>
                  </div>
                  <span className="mt-2 text-xs truncate w-full">{m.surnom ?? m.username}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <LayoutApp>
      <h1 className="titre-page mb-4">Personnel</h1>
      <Tabs
        tabs={[
          { label: "Liste", icon: <Users className="w-4 h-4" />, content: ListView },
          { label: "Organigramme", icon: <LayoutGrid className="w-4 h-4" />, content: OrgaView }
        ]}
      />
    </LayoutApp>
  );
}
