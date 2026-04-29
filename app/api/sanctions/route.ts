import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.rank_level < 7) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user_id, type, raison, duree_jours, ticket_id } = await req.json();
  if (!user_id || !type || !raison) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const supa = supabaseAdmin();
  const { data: s } = await supa.from("sanctions").insert({ user_id, type, raison, duree_jours, createur_id: session.user.id }).select().single();
  if (ticket_id && s) await supa.from("helpdesk_tickets").update({ statut: "applique", traite_par: session.user.id, traite_le: new Date().toISOString(), sanction_appliquee_id: s.id }).eq("id", ticket_id);
  return NextResponse.json({ ok: true, sanction: s });
}
