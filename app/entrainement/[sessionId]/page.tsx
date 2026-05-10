"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { getRang, estOpSecondMin } from "@/lib/constants";
import { Calendar, MapPin, Users, Award, Check, Clock, X, MessageCircle, Loader2 } from "lucide-react";

export default function Page() {
  const supa = useSupabase();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user: me, rang, estConnecte } = useUser();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!estConnecte || !sessionId) return;
    setLoading(true);
    const { data } = await supa.from("training_sessions")
      .select("*, training_registrations(id, user_id, annule, users(id, surnom, username, avatar_url, rank_level)), training_attendance(*), badges:badge_cible_id(code, nom, couleur)")
      .eq("id", sessionId).single();
    setS(data);
    setLoading(false);
  }, [supa, estConnecte, sessionId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LayoutApp><div className="flex items-center gap-2 text-[var(--texte-muted)] mt-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div></LayoutApp>;
  if (!s) return <LayoutApp><p className="text-[var(--texte-muted)] text-center mt-12">Session introuvable.</p></LayoutApp>;

  const setStatut = async (uid: string, statut: string) => {
    setErrMsg(null);
    const r = await api("session:attendance", { session_id: s.id, user_id: uid, statut });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    await load();
  };

  const grantBadge = async (uid: string) => {
    if (!s.badges) return;
    setErrMsg(null);
    const att = s.training_attendance?.find((a: any) => a.user_id === uid);
    if (att) {
      // Mark attendance with badge_obtenu
      await api("session:attendance", { session_id: s.id, user_id: uid, statut: att.statut || "present", badge_obtenu: true });
    }
    const r = await api("user:add_badge", { user_id: uid, badge_code: s.badges.code, raison: `Obtention via session ${s.titre}` });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    await load();
  };

  const completeSession = async () => {
    setErrMsg(null);
    const r = await api("session:complete", { session_id: s.id });
    if (!r.ok) { setErrMsg(r.error || "Erreur"); return; }
    await load();
  };

  const inscrits = (s.training_registrations ?? []).filter((r: any) => !r.annule);
  const canManage = estOpSecondMin(rang);

  return (
    <LayoutApp>
      {errMsg && <div className="mb-4 p-3 rounded-lg bg-[var(--rouge)]/10 border border-[var(--rouge)]/30 text-sm text-[var(--rouge)]">{errMsg} <button className="ml-2 underline" onClick={() => setErrMsg(null)}>×</button></div>}

      <div className="carte mb-4">
        <h1 className="titre-page">{s.titre}</h1>
        <div className="flex flex-wrap gap-3 text-sm text-[var(--texte-muted)] mt-2">
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(s.date_session).toLocaleString("fr-FR")}</span>
          {s.lieu && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{s.lieu}</span>}
          <span className="flex items-center gap-1"><Users className="w-4 h-4" />{inscrits.length}/{s.capacite_max}</span>
          {s.badges && <span className="flex items-center gap-1"><Award className="w-4 h-4" style={{color: s.badges.couleur}} />{s.badges.nom}</span>}
        </div>
        {s.description && <p className="mt-3 text-sm">{s.description}</p>}
        {s.plan && (
          <div className="mt-3">
            <h3 className="text-xs uppercase tracking-wider text-[var(--or)] font-semibold mb-1">Plan</h3>
            <pre className="text-sm whitespace-pre-wrap font-sans">{s.plan}</pre>
          </div>
        )}
        {canManage && s.statut !== "termine" && (
          <div className="mt-4">
            <button onClick={completeSession} className="bouton-vert text-xs"><Check className="w-3 h-3" /> Terminer la session</button>
          </div>
        )}
      </div>

      <div className="carte">
        <h2 className="titre-section">Inscrits ({inscrits.length})</h2>
        {inscrits.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun inscrit.</p>}
        <div className="space-y-2">
          {inscrits.map((reg: any) => {
            const u = reg.users;
            if (!u) return null;
            const att = s.training_attendance?.find((a: any) => a.user_id === u.id);
            const r = getRang(u.rank_level);
            return (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-[var(--fond-clair)]" style={{ borderLeft: `3px solid ${r.couleur}` }}>
                <Avatar src={u.avatar_url} name={u.surnom ?? u.username} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.surnom ?? u.username}</p>
                  <RankBadge level={u.rank_level} size="xs" />
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setStatut(u.id, "present")} title="Présent" className={`p-1.5 rounded ${att?.statut === "present" ? "bg-[#2D8B4E] text-white" : "hover:bg-[var(--fond)] text-[var(--texte-muted)]"}`}><Check className="w-4 h-4" /></button>
                    <button onClick={() => setStatut(u.id, "retard")} title="Retard" className={`p-1.5 rounded ${att?.statut === "retard" ? "bg-[#D97706] text-white" : "hover:bg-[var(--fond)] text-[var(--texte-muted)]"}`}><Clock className="w-4 h-4" /></button>
                    <button onClick={() => setStatut(u.id, "excuse")} title="Excusé" className={`p-1.5 rounded ${att?.statut === "excuse" ? "bg-[var(--bleu)] text-white" : "hover:bg-[var(--fond)] text-[var(--texte-muted)]"}`}><MessageCircle className="w-4 h-4" /></button>
                    <button onClick={() => setStatut(u.id, "absent")} title="Absent" className={`p-1.5 rounded ${att?.statut === "absent" ? "bg-[var(--rouge)] text-white" : "hover:bg-[var(--fond)] text-[var(--texte-muted)]"}`}><X className="w-4 h-4" /></button>
                    {s.badges && rang >= 7 && (
                      <button onClick={() => grantBadge(u.id)} title="Attribuer le badge" className={`p-1.5 rounded ${att?.badge_obtenu ? "bg-[var(--or)] text-white" : "hover:bg-[var(--fond)] text-[var(--or)]"}`}><Award className="w-4 h-4" /></button>
                    )}
                  </div>
                )}
                {!canManage && att && (
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${att.statut === "present" ? "bg-[#2D8B4E]" : att.statut === "retard" ? "bg-[#D97706]" : att.statut === "excuse" ? "bg-[var(--bleu)]" : "bg-[var(--rouge)]"}`}>
                    {att.statut === "present" ? "Présent" : att.statut === "retard" ? "Retard" : att.statut === "excuse" ? "Excusé" : "Absent"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </LayoutApp>
  );
}
