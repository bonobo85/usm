"use client";
import LayoutApp from "@/components/LayoutApp";
import { Tabs } from "@/components/Tabs";
import { PermissionGate } from "@/components/PermissionGate";
import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { useUser } from "@/lib/useUser";
import { Modal } from "@/components/Modal";
import { Plus } from "lucide-react";

export default function Page() {
  return <PermissionGate rangMin={5}><LayoutApp><Inner /></LayoutApp></PermissionGate>;
}

function Inner() {
  const supa = useSupabase();
  const { user: me, rang, estConnecte } = useUser();
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ type: "retour", titre: "", contenu: "", priorite: "normale", cible_user_id: "" });

  const load = useCallback(async () => {
    if (!estConnecte) return;
    const { data } = await supa.from("helpdesk_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data ?? []);
    const { data: u } = await supa.from("users").select("id, surnom, username").eq("is_active", true);
    setUsers(u ?? []);
  }, [supa, estConnecte]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.titre.trim() || !me?.id) return;
    setSaving(true);
    await supa.from("helpdesk_tickets").insert({ ...form, auteur_id: me.id, cible_user_id: form.cible_user_id || null });
    setSaving(false);
    setOpen(false);
    setForm({ type: "retour", titre: "", contenu: "", priorite: "normale", cible_user_id: "" });
    await load();
  };

  const Card = (t: any) => (
    <div key={t.id} className="carte">
      <div className="flex justify-between mb-1">
        <span className="font-semibold text-sm">{t.titre}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-[var(--bleu)] text-white">{t.statut}</span>
      </div>
      <p className="text-xs text-[var(--texte-muted)]">{t.type} • {t.priorite}</p>
      <p className="text-[10px] text-[var(--texte-muted)] mt-1">{new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
    </div>
  );

  const mine = tickets.filter(t => t.auteur_id === me?.id);
  const traiter = tickets.filter(t => ["ouvert","en_cours"].includes(t.statut));

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="titre-page">Retour & Sanction</h1>
        <button className="bouton-or" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nouveau ticket</button>
      </div>

      <Tabs tabs={[
        { label: `Mes tickets (${mine.length})`, content: <div className="grid sm:grid-cols-2 gap-3">{mine.map(Card)}{mine.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun ticket.</p>}</div> },
        ...(rang >= 7 ? [{ label: `À traiter (${traiter.length})`, content: <div className="grid sm:grid-cols-2 gap-3">{traiter.map(Card)}{traiter.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun.</p>}</div> }] : []),
        { label: `Tous (${tickets.length})`, content: <div className="grid sm:grid-cols-2 gap-3">{tickets.map(Card)}{tickets.length === 0 && <p className="text-sm text-[var(--texte-muted)]">Aucun ticket.</p>}</div> }
      ]} />

      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau ticket">
        <div className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="retour">Retour</option>
              <option value="sanction">Sanction</option>
            </select>
          </div>
          <div>
            <label className="label">Titre *</label>
            <input className="input" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Titre du ticket..." autoFocus />
          </div>
          <div>
            <label className="label">Contenu</label>
            <textarea className="input" rows={3} value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} placeholder="Description détaillée..." />
          </div>
          <div>
            <label className="label">Priorité</label>
            <select className="input" value={form.priorite} onChange={e => setForm({...form, priorite: e.target.value})}>
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          {form.type === "sanction" && (
            <div>
              <label className="label">Cible</label>
              <select className="input" value={form.cible_user_id} onChange={e => setForm({...form, cible_user_id: e.target.value})}>
                <option value="">— choisir un membre —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.surnom ?? u.username}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="bouton-gris" onClick={() => setOpen(false)}>Annuler</button>
            <button className="bouton-bleu" onClick={create} disabled={!form.titre.trim() || saving}>
              {saving ? "Création..." : "Créer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
