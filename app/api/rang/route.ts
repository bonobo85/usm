import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { peutAttribuerRang } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { user_id, nouveau_rang, raison } = await req.json();
  if (!user_id || !nouveau_rang || !raison || raison.length < 3)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supa = supabaseAdmin();
  const { data: target } = await supa.from("users").select("rank_level").eq("id", user_id).single();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!peutAttribuerRang(session.user.rank_level, nouveau_rang) || nouveau_rang >= session.user.rank_level)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await supa.from("users").update({ rank_level: nouveau_rang }).eq("id", user_id);
  await supa.from("rank_history").insert({
    user_id, ancien_rang: target.rank_level, nouveau_rang,
    modifie_par: session.user.id, raison
  });
  return NextResponse.json({ ok: true });
}
