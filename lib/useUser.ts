"use client";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { peutVoirCrash, peutVoirFormateurs } from "./constants";

export function useUser() {
  const { data: session, status } = useSession();
  const user = (session?.user as any) ?? null;

  return useMemo(() => {
    const rang: number = user?.rank_level ?? 0;
    const badges: string[] = user?.badges ?? [];
    const permissions: string[] = user?.permissions ?? [];
    return {
      user,
      rang,
      rangNom: user?.rank_nom ?? null,
      surnom: user?.surnom ?? user?.username ?? null,
      badges,
      permissions,
      guilds: user?.discord_guilds ?? [],
      estConnecte: status === "authenticated" && !!user,
      estEnChargement: status === "loading",
      estActif: !!user?.is_active,
      hasRang:       (min: number) => rang >= min,
      hasPermission: (p: string) => permissions.includes(p),
      hasBadge:      (c: string) => badges.includes(c),
      peutVoirCrash:      () => peutVoirCrash(rang, badges),
      peutVoirFormateurs: () => peutVoirFormateurs(rang, badges)
    };
  }, [user, status]);
}
