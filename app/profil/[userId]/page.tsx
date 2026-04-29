"use client";
import LayoutApp from "@/components/LayoutApp";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Avatar } from "@/components/Avatar";
import { RankBadge, StatusDot } from "@/components/RankBadge";
import { BadgesRow } from "@/components/BadgeTag";
import { Edit3, Save, X, Server, ShieldCheck } from "lucide-react";

export default function ProfilPage() {
  const supa = useSupabase();
  const { user: me } = useUser();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [hist, setHist] = useState<any[]>([]);
  const [bHist, setBHist] = useState<any[]>([]);

  const isMe = me?.id === userId;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supa
        .from("users")
        .select("*, user_badges(is_active, attribue_le, raison, badges(code, nom))")
        .eq("id", userId)
        .single();
      setProfile(data);
      setForm({
        surnom: data?.surnom ?? "",
        date_naissance: data?.date_naissance ?? "",
        lieu_naissance: data?.lieu_naissance ?? "",
        telephone: data?.telephone ?? ""
      });

      const { data: rh } = await supa
        .from("rank_history")
        .select("*")
        .eq("user_id", userId)
        .order("modifie_le", { ascending: false });
      setHist(rh ?? []);

      setBHist(data?.user_badges ?? []);
    })();
  }, [userId, supa]);

  if (!profile) return <LayoutApp><p className="text-[var(--texte-muted)]">Chargement…</p></LayoutApp>;

  const codes = (profile.user_badges ?? []).filter((b: any) => b.is_active).map((b: any) => b.badges.code);
  const guilds = (isMe ? me?.discord_guilds : []) ?? [];

  const save = async () => {
    await supa.from("users").update(form).eq("id", userId);
    setProfile({ ...profile, ...form });
    setEdit(false);
  };

  return (
    <LayoutApp>
      <div className="carte mb-4 flex flex-wrap items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.surnom ?? profile.username} size={84} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusDot statut={profile.statut} />
            <h1 className="titre-page">{profile.surnom ?? profile.username}</h1>
          </div>
          <RankBadge level={profile.rank_level} size="md" />
          <div className="mt-2"><BadgesRow codes={codes} size="sm" /></div>
        </div>
        {isMe && !edit && (
          <button onClick={() => setEdit(true)} className="bouton-gris">
            <Edit3 className="w-4 h-4" /> Modifier
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="carte">
          <h2 className="titre-section">Informations</h2>
          {edit ? (
            <div className="space-y-3">
              <div><label className="label">Surnom</label><input className="input" value={form.surnom} onChange={e => setForm({...form, surnom: e.target.value})} /></div>
              <div><label className="label">Date de naissance</label><input type="date" className="input" value={form.date_naissance ?? ""} onChange={e => setForm({...form, date_naissance: e.target.value})} /></div>
              <div><label className="label">Lieu de naissance</label><input className="input" value={form.lieu_naissance ?? ""} onChange={e => setForm({...form, lieu_naissance: e.target.value})} /></div>
              <div><label className="label">Téléphone</label><input className="input" value={form.telephone ?? ""} onChange={e => setForm({...form, telephone: e.target.value})} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={save} className="bouton-bleu"><Save className="w-4 h-4" /> Enregistrer</button>
                <button onClick={() => setEdit(false)} className="bouton-gris"><X className="w-4 h-4" /> Annuler</button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <Row k="Username" v={profile.username} />
              <Row k="Surnom" v={profile.surnom ?? "—"} />
              <Row k="Date de naissance" v={profile.date_naissance ?? "—"} />
              <Row k="Lieu de naissance" v={profile.lieu_naissance ?? "—"} />
              <Row k="Téléphone" v={profile.telephone ?? "—"} />
              <Row k="Discord ID" v={profile.discord_id} />
            </dl>
          )}
        </div>

        <div className="carte">
          <h2 className="titre-section">Historique des rangs</h2>
          {hist.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun changement.</p>}
          <ul className="space-y-2 text-sm">
            {hist.map(h => (
              <li key={h.id} className="border-l-2 border-[var(--bleu)] pl-3">
                <div className="flex justify-between">
                  <span>{h.ancien_rang ?? "—"} → {h.nouveau_rang}</span>
                  <span className="text-xs text-[var(--texte-muted)]">{new Date(h.modifie_le).toLocaleDateString("fr-FR")}</span>
                </div>
                <p className="text-xs text-[var(--texte-muted)]">{h.raison}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="carte">
          <h2 className="titre-section">Historique des badges</h2>
          {bHist.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun badge.</p>}
          <ul className="space-y-2 text-sm">
            {bHist.map((b: any, i: number) => (
              <li key={i} className="flex items-center justify-between">
                <span className="font-medium">{b.badges?.nom}</span>
                <span className="text-xs text-[var(--texte-muted)]">
                  {new Date(b.attribue_le).toLocaleDateString("fr-FR")} {!b.is_active && "(révoqué)"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {isMe && guilds.length > 0 && (
          <div className="carte lg:col-span-3">
            <h2 className="titre-section flex items-center gap-2"><Server className="w-4 h-4" /> Mes serveurs Discord</h2>
            <p className="text-xs text-[var(--texte-muted)] mb-3">
              Liste des serveurs Discord auxquels tu es connecté, avec tes rôles sur chacun.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {guilds.map((g: any) => (
                <div key={g.id} className="border border-[var(--bordure)] rounded-md p-3 bg-[var(--fond-clair)]">
                  <div className="flex items-center gap-2 mb-2">
                    {g.icon ? (
                      <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`} alt={g.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--bleu)] flex items-center justify-center text-xs">{g.name.charAt(0)}</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{g.name}</p>
                      {g.nick && <p className="text-xs text-[var(--texte-muted)]">Pseudo : {g.nick}</p>}
                    </div>
                  </div>
                  {g.roles && g.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {g.roles.slice(0, 8).map((rid: string) => (
                        <span key={rid} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--fond-carte)] border border-[var(--bordure)] flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-[var(--or)]" />
                          {rid.slice(0, 8)}…
                        </span>
                      ))}
                      {g.roles.length > 8 && <span className="text-[10px] text-[var(--texte-muted)]">+{g.roles.length - 8}</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--texte-muted)]">Aucun rôle visible</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </LayoutApp>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-xs uppercase tracking-wider text-[var(--texte-muted)]">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
