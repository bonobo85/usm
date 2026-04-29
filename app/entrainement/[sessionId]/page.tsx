"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { getRang } from "@/lib/constants";
import { Calendar, MapPin, Users, Award } from "lucide-react";

export default function Page() {
  const supa = useSupabase();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user: me, rang } = useUser();
  const [s, setS] = useState<any>(null);

  const load = async () => {
    const { data } = await supa.from("training_sessions").select("*, training_registrations(id, user_id, annule, users(id, surnom, username, avatar_url, rank_level)), training_attendance(*), badges:badge_cible_id(code, nom, couleur)").eq("id", sessionId).single();
    setS(data);
  };
  useEffect(() => { load(); }, [sessionId]);

  if (!s) return <LayoutApp><p className="text-[var(--texte-muted)]">Chargement…</p></LayoutApp>;

  const setStatut = async (uid: string, statut: string) => {
    const existing = s.training_attendance?.find((a: any) => a.user_id === uid);
    if (existing) {
      await supa.from("training_attendance").update({ statut, pointe_par: me?.id }).eq("id", existing.id);
    } else {
      await supa.from("training_attendance").insert({ session_id: s.id, user_id: uid, statut, pointe_par: me?.id });
    }
    load();
  };
  const grantBadge = async (uid: string) => {
    if (!s.badge_cible_id) return;
    await supa.from("user_badges").insert({ user_id: uid, badge_id: s.badge_cible_id, attribue_par: me?.id, raison: `Session ${s.titre}` });
    const a = s.training_attendance?.find((x: any) => x.user_id === uid);
    if (a) await supa.from("training_attendance").update({ badge_obtenu: true }).eq("id", a.id);
    load();
  };

  return (
    <LayoutApp>
      <div className="carte mb-4">
        <h1 className="titre-page mb-2">{s.titre}</h1>
        <p className="text-sm text-[var(--texte-muted)] flex flex-wrap gap-4">
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(s.date_session).toLocaleString("fr-FR")}</span>
          {s.lieu && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {s.lieu}</span>}
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Rang min {s.rank_min} • cap. {s.capacite_max}</span>
          {s.badges && <span className="flex items-center gap-1"><Award className="w-4 h-4" /> {s.badges.nom}</span>}
        </p>
        {s.plan && <pre className="mt-3 p-3 bg-[var(--fond-clair)] rounded text-xs whitespace-pre-wrap font-mono">{s.plan}</pre>}
      </div>

      <div className="carte">
        <h2 className="titre-section">Inscrits</h2>
        <div className="space-y-2">
          {s.training_registrations?.filter((r: any) => !r.annule).map((r: any) => {
            const u = r.users;
            const att = s.training_attendance?.find((a: any) => a.user_id === u.id);
            const rk = getRang(u.rank_level);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-2" style={{ borderLeft: `3px solid ${rk.couleur}`, paddingLeft: 8 }}>
                <Avatar src={u.avatar_url} name={u.surnom ?? u.username} size={32} />
                <span className="text-sm font-medium">{u.surnom ?? u.username}</span>
                <RankBadge level={u.rank_level} size="xs" />
                {att?.statut && <span className="text-xs px-2 py-0.5 rounded bg-[var(--bleu)]">{att.statut}</span>}
                {rang >= 5 && (
                  <div className="ml-auto flex flex-wrap gap-1">
                    {["present","retard","excuse","absent"].map(st => (
                      <button key={st} onClick={() => setStatut(u.id, st)} className="text-xs px-2 py-0.5 rounded border border-[var(--bordure)] hover:bg-[var(--bleu)]">{st}</button>
                    ))}
                    {s.badge_cible_id && (
                      <button onClick={() => grantBadge(u.id)} className="text-xs px-2 py-0.5 rounded bg-[var(--or)] text-white">🏅</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </LayoutApp>
  );
}
