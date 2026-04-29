import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const BUCKETS = ["avatars", "documents-prives", "rapports"] as const;
type Bucket = (typeof BUCKETS)[number];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const bucket = form.get("bucket") as Bucket | null;
  if (!file || !bucket || !BUCKETS.includes(bucket))
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Limite 10 Mo
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "file too large" }, { status: 413 });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

  const supa = supabaseAdmin();
  const { error: upErr } = await supa.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  if (bucket === "avatars") {
    const { data } = supa.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ ok: true, path, url: data.publicUrl, public: true });
  }

  // Bucket privé : URL signée 1h
  const { data: signed, error: sErr } = await supa.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path, url: signed.signedUrl, public: false });
}
