"use client";
import { useSession } from "next-auth/react";
import { useMemo, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Keep a single anon client as fallback
let anonClient: SupabaseClient | null = null;
function getAnonClient() {
  if (!anonClient) anonClient = createClient(url, anon, { auth: { persistSession: false } });
  return anonClient;
}

// Cache authenticated clients by token to avoid re-creation
const tokenClients = new Map<string, SupabaseClient>();
function getTokenClient(token: string) {
  if (!tokenClients.has(token)) {
    tokenClients.clear(); // only keep one at a time
    tokenClients.set(token, createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    }));
  }
  return tokenClients.get(token)!;
}

export function useSupabase(): SupabaseClient {
  const { data } = useSession();
  const token = (data as any)?.supabase_token as string | undefined;
  return useMemo(() => token ? getTokenClient(token) : getAnonClient(), [token]);
}
