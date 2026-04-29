import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { estColeadMin } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!estColeadMin((session.user as any).rank_level))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { type, titre, contenu } = await req.json();
  if (!titre || titre.length < 2)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supa = supabaseAdmin();
  await supa.from("announcements").insert({
    type: type || "communique",
    titre,
    contenu: contenu || null,
    auteur_id: (session.user as any).id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!estColeadMin((session.user as any).rank_level))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supa = supabaseAdmin();
  await supa.from("announcements").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
