import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client navigateur générique (anon, sans JWT custom) */
export const supabaseBrowser = (): SupabaseClient =>
  createClient(url, anon, { auth: { persistSession: false } });

/** Client navigateur authentifié avec un JWT signé NEXTAUTH_SECRET (RLS via auth.jwt()) */
export const supabaseWithToken = (token: string): SupabaseClient =>
  createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });

/** Client serveur avec service role (à n'utiliser QUE côté serveur) */
export const supabaseAdmin = (): SupabaseClient => {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, service, { auth: { persistSession: false } });
};
