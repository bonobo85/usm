"use client";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { supabaseWithToken, supabaseBrowser } from "./supabase";

export function useSupabase() {
  const { data } = useSession();
  const token = data?.supabase_token;
  return useMemo(() => (token ? supabaseWithToken(token) : supabaseBrowser()), [token]);
}
