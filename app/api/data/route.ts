import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Permission required for each action
const PERMS: Record<string, number> = {
  // Annonces
  "announcement:create": 7,
  "announcement:delete": 7,
  // Users / profil
  "user:update_self": 1,
  "user:update_other": 7,
  "user:rank_change": 7,
  "user:add_badge": 7,
  "user:revoke_badge": 7,
  "user:add_permission": 9,
  // Notes internes
  "note:create": 7,
  "note:delete": 7,
  // Sessions entrainement
  "session:create": 4,
  "session:update": 4,
  "session:delete": 4,
  "session:register": 1,    // self
  "session:unregister": 1,  // self
  // Rapports
  "report:create": 1,       // self
  "report:update_self": 1,
  "report:update_any": 5,
  "report:publish": 5,
  // Recrutements
  "rc:create": 4,
  "rc:take": 4,
  "rc:result": 4,
  // Sanctions
  "sanction:create_ticket": 5,
  "sanction:apply": 7,
  // Archives
  "archive:create": 7,
  // Training attendance
  "session:attendance": 5,
  "session:complete": 4,
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.action) return NextResponse.json({ error: "missing action" }, { status: 400 });

  const { action, payload } = body;
  const minRank = PERMS[action];
  if (minRank == null) return NextResponse.json({ error: "unknown action" }, { status: 400 });
  if (user.rank_level < minRank) return NextResponse.json({ error: "forbidden", required: minRank, has: user.rank_level }, { status: 403 });

  const supa = supabaseAdmin();

  try {
    switch (action) {
      // ── ANNONCES ──
      case "announcement:create": {
        const { type, titre, contenu } = payload;
        if (!titre?.trim()) return NextResponse.json({ error: "titre required" }, { status: 400 });
        const { data, error } = await supa.from("announcements").insert({
          type: type || "communique",
          titre: titre.trim(),
          contenu: contenu?.trim() || null,
          auteur_id: user.id
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
      }

      case "announcement:delete": {
        const { id } = payload;
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const { error } = await supa.from("announcements").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      // ── USERS ──
      case "user:update_self": {
        const { surnom, date_naissance, lieu_naissance, telephone } = payload;
        const { error } = await supa.from("users").update({
          surnom: surnom || null,
          date_naissance: date_naissance || null,
          lieu_naissance: lieu_naissance || null,
          telephone: telephone || null
        }).eq("id", user.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "user:update_other": {
        const { user_id, fields } = payload;
        if (!user_id || !fields) return NextResponse.json({ error: "missing" }, { status: 400 });
        const safe: any = {};
        for (const k of ["surnom", "date_naissance", "lieu_naissance", "telephone", "is_active", "statut"]) {
          if (k in fields) safe[k] = fields[k];
        }
        const { error } = await supa.from("users").update(safe).eq("id", user_id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "user:rank_change": {
        const { user_id, nouveau_rang, raison } = payload;
        if (!user_id || !nouveau_rang || !raison || raison.length < 3)
          return NextResponse.json({ error: "invalid" }, { status: 400 });
        if (nouveau_rang >= user.rank_level)
          return NextResponse.json({ error: "cannot promote at or above your own rank" }, { status: 403 });
        const { data: target } = await supa.from("users").select("rank_level").eq("id", user_id).single();
        if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });
        await supa.from("users").update({ rank_level: nouveau_rang }).eq("id", user_id);
        await supa.from("rank_history").insert({
          user_id, ancien_rang: target.rank_level, nouveau_rang,
          modifie_par: user.id, raison
        });
        return NextResponse.json({ ok: true });
      }

      case "user:add_badge": {
        const { user_id, badge_code, raison } = payload;
        if (!user_id || !badge_code) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data: badge } = await supa.from("badges").select("id").eq("code", badge_code).single();
        if (!badge) return NextResponse.json({ error: "badge not found" }, { status: 404 });
        // Check if already active
        const { data: existing } = await supa.from("user_badges").select("id, is_active").eq("user_id", user_id).eq("badge_id", badge.id).maybeSingle();
        if (existing) {
          if (existing.is_active) return NextResponse.json({ error: "already has badge" }, { status: 400 });
          await supa.from("user_badges").update({ is_active: true, raison: raison || null, attribue_par: user.id, attribue_le: new Date().toISOString() }).eq("id", existing.id);
        } else {
          await supa.from("user_badges").insert({ user_id, badge_id: badge.id, attribue_par: user.id, raison: raison || null });
        }
        return NextResponse.json({ ok: true });
      }

      case "user:revoke_badge": {
        const { user_id, badge_code, raison } = payload;
        if (!user_id || !badge_code || !raison || raison.length < 3) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data: badge } = await supa.from("badges").select("id").eq("code", badge_code).single();
        if (!badge) return NextResponse.json({ error: "badge not found" }, { status: 404 });
        const { error } = await supa.from("user_badges").update({
          is_active: false, raison_revocation: raison, revoque_par: user.id, revoque_le: new Date().toISOString()
        }).eq("user_id", user_id).eq("badge_id", badge.id).eq("is_active", true);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      // ── NOTES ──
      case "note:create": {
        const { user_id, contenu } = payload;
        if (!user_id || !contenu?.trim()) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { error } = await supa.from("profile_notes").insert({ user_id, auteur_id: user.id, contenu: contenu.trim() });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "note:delete": {
        const { id } = payload;
        if (!id) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { error } = await supa.from("profile_notes").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      // ── SESSIONS ENTRAINEMENT ──
      case "session:create": {
        const { titre, description, plan, date_session, lieu, rank_min, capacite_max } = payload;
        if (!titre || !date_session) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data, error } = await supa.from("training_sessions").insert({
          titre, description: description || null, plan: plan || null,
          date_session, lieu: lieu || null,
          rank_min: rank_min || 1, capacite_max: capacite_max || 10,
          createur_id: user.id, statut: "planifie"
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
      }

      case "session:register": {
        const { session_id } = payload;
        if (!session_id) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data: existing } = await supa.from("training_registrations")
          .select("id, annule").eq("session_id", session_id).eq("user_id", user.id).maybeSingle();
        if (existing) {
          await supa.from("training_registrations").update({ annule: false }).eq("id", existing.id);
        } else {
          await supa.from("training_registrations").insert({ session_id, user_id: user.id });
        }
        return NextResponse.json({ ok: true });
      }

      case "session:unregister": {
        const { session_id } = payload;
        if (!session_id) return NextResponse.json({ error: "missing" }, { status: 400 });
        await supa.from("training_registrations").update({ annule: true })
          .eq("session_id", session_id).eq("user_id", user.id);
        return NextResponse.json({ ok: true });
      }

      case "session:attendance": {
        const { session_id, user_id, statut, badge_obtenu } = payload;
        if (!session_id || !user_id || !statut) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data: existing } = await supa.from("training_attendance")
          .select("id").eq("session_id", session_id).eq("user_id", user_id).maybeSingle();
        if (existing) {
          await supa.from("training_attendance").update({
            statut, badge_obtenu: !!badge_obtenu, pointe_par: user.id, pointe_le: new Date().toISOString()
          }).eq("id", existing.id);
        } else {
          await supa.from("training_attendance").insert({
            session_id, user_id, statut, badge_obtenu: !!badge_obtenu, pointe_par: user.id
          });
        }
        return NextResponse.json({ ok: true });
      }

      case "session:complete": {
        const { session_id } = payload;
        if (!session_id) return NextResponse.json({ error: "missing" }, { status: 400 });
        await supa.from("training_sessions").update({ statut: "termine" }).eq("id", session_id);
        return NextResponse.json({ ok: true });
      }

      // ── RAPPORTS ──
      case "report:create": {
        const { template_code, titre } = payload;
        const { data, error } = await supa.from("reports").insert({
          titre: titre || "Nouveau rapport",
          template_code: template_code || "custom",
          type: template_code || "custom",
          auteur_id: user.id,
          statut: "draft", contenu: {}, sections: []
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
      }

      case "report:update_self": {
        const { id, fields } = payload;
        if (!id || !fields) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data: r } = await supa.from("reports").select("auteur_id").eq("id", id).single();
        if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
        if (r.auteur_id !== user.id && user.rank_level < 5) return NextResponse.json({ error: "forbidden" }, { status: 403 });
        const safe: any = {};
        for (const k of ["titre", "contenu", "sections", "statut"]) if (k in fields) safe[k] = fields[k];
        safe.updated_at = new Date().toISOString();
        await supa.from("reports").update(safe).eq("id", id);
        return NextResponse.json({ ok: true });
      }

      case "report:publish": {
        const { id } = payload;
        if (!id) return NextResponse.json({ error: "missing" }, { status: 400 });
        await supa.from("reports").update({
          publie: true, publie_par: user.id, publie_le: new Date().toISOString(), statut: "validated"
        }).eq("id", id);
        return NextResponse.json({ ok: true });
      }

      // ── RECRUTEMENTS ──
      case "rc:create": {
        const { candidat_nom, candidat_discord, date_rc, lieu, notes } = payload;
        if (!candidat_nom || !date_rc) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data, error } = await supa.from("recrutements").insert({
          candidat_nom, candidat_discord: candidat_discord || null,
          date_rc, lieu: lieu || null, notes: notes || null,
          createur_id: user.id, statut: "planifie"
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
      }

      case "rc:take": {
        const { id } = payload;
        if (!id) return NextResponse.json({ error: "missing" }, { status: 400 });
        await supa.from("recrutements").update({ formateur_id: user.id, statut: "en_cours" }).eq("id", id);
        return NextResponse.json({ ok: true });
      }

      case "rc:result": {
        const { recrutement_id, candidat_nom, date_rc, formateur_id, tir_note, conduite_note, procedure_note, comportement_note, points_forts, points_faibles, observations, resultat } = payload;
        if (!recrutement_id) return NextResponse.json({ error: "missing" }, { status: 400 });
        const notes = [parseFloat(tir_note) || 0, parseFloat(conduite_note) || 0, parseFloat(procedure_note) || 0, parseFloat(comportement_note) || 0];
        const globale = parseFloat((notes.reduce((a, b) => a + b, 0) / 4).toFixed(2));
        await supa.from("rc_resultats").insert({
          recrutement_id, candidat_nom, date_rc, formateur_id,
          tir_note: notes[0], conduite_note: notes[1], procedure_note: notes[2], comportement_note: notes[3],
          note_globale: globale, points_forts, points_faibles, observations, resultat,
          redacteur_id: user.id
        });
        await supa.from("recrutements").update({ statut: "termine" }).eq("id", recrutement_id);
        return NextResponse.json({ ok: true });
      }

      // ── HELPDESK / SANCTIONS ──
      case "sanction:create_ticket": {
        const { type, titre, contenu, priorite, cible_user_id } = payload;
        if (!titre) return NextResponse.json({ error: "missing" }, { status: 400 });
        const { data, error } = await supa.from("helpdesk_tickets").insert({
          type: type || "retour", titre, contenu: contenu || null,
          priorite: priorite || "normale",
          auteur_id: user.id,
          cible_user_id: cible_user_id || null,
          statut: "ouvert"
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
      }

      default:
        return NextResponse.json({ error: "action not implemented" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("API /data error", action, e);
    return NextResponse.json({ error: e.message || "server error" }, { status: 500 });
  }
}
