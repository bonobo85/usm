import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.rank_level < 7) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user_id, raison, notes } = await req.json();
  if (!user_id || !raison) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supa = supabaseAdmin();
  const { data: u } = await supa.from("users").select("*").eq("id", user_id).single();
  if (!u) return NextResponse.json({ error: "not found" }, { status: 404 });

  await supa.from("users").update({ is_active: false, statut: "hors_ligne" }).eq("id", user_id);
  const { data: arch } = await supa.from("archives").insert({
    user_id, username_final: u.surnom ?? u.username, rank_final: u.rank_level, raison, notes
  }).select().single();

  // Copie de l'historique
  if (arch) {
    const [{ data: rh }, { data: ub }, { data: san }, { data: rep }] = await Promise.all([
      supa.from("rank_history").select("*").eq("user_id", user_id),
      supa.from("user_badges").select("*, badges(code)").eq("user_id", user_id),
      supa.from("sanctions").select("*").eq("user_id", user_id),
      supa.from("reports").select("id, titre, statut").eq("auteur_id", user_id)
    ]);
    const rows = [
      ...(rh ?? []).map(x => ({ archive_id: arch.id, type: "rank_history", contenu: x })),
      ...(ub ?? []).map(x => ({ archive_id: arch.id, type: "badge", contenu: x })),
      ...(san ?? []).map(x => ({ archive_id: arch.id, type: "sanction", contenu: x })),
      ...(rep ?? []).map(x => ({ archive_id: arch.id, type: "report", contenu: x }))
    ];
    if (rows.length) await supa.from("archive_records").insert(rows);
  }

  return NextResponse.json({ ok: true });
}
