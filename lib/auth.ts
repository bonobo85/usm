import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "./supabase";

/**
 * Scopes Discord :
 *  - identify : profil de base
 *  - guilds   : liste des serveurs où le user est présent
 *  - guilds.members.read : récupère les rôles du user dans CHAQUE serveur (via /users/@me/guilds/{id}/member)
 */
const DISCORD_SCOPES = "identify guilds guilds.members.read";

async function fetchDiscordGuilds(accessToken: string) {
  const r = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) return [];
  return (await r.json()) as Array<{ id: string; name: string; icon: string | null; permissions: string }>;
}

async function fetchGuildMember(accessToken: string, guildId: string) {
  const r = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) return null;
  return (await r.json()) as { roles: string[]; nick: string | null };
}

async function buildDiscordPayload(accessToken: string) {
  const guilds = await fetchDiscordGuilds(accessToken);
  // Pour chaque serveur on essaie d'aller chercher les rôles (badges)
  const enriched = await Promise.all(
    guilds.slice(0, 50).map(async g => {
      const member = await fetchGuildMember(accessToken, g.id);
      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        roles: member?.roles ?? [],
        nick: member?.nick ?? null
      };
    })
  );
  return enriched;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: DISCORD_SCOPES } }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "discord") return false;
      const supa = supabaseAdmin();

      const discordGuilds = account.access_token
        ? await buildDiscordPayload(account.access_token)
        : [];

      const { data: existing } = await supa
        .from("users")
        .select("id, is_active")
        .eq("discord_id", account.providerAccountId)
        .maybeSingle();

      if (existing) {
        if (!existing.is_active) return false;
        await supa
          .from("users")
          .update({
            username: user.name ?? "Inconnu",
            avatar_url: user.image,
            derniere_connexion: new Date().toISOString(),
            statut: "disponible",
            discord_guilds: discordGuilds
          })
          .eq("id", existing.id);
      } else {
        const { data: created } = await supa
          .from("users")
          .insert({
            discord_id: account.providerAccountId,
            username: user.name ?? "Inconnu",
            avatar_url: user.image,
            rank_level: 1,
            statut: "disponible",
            is_active: true,
            discord_guilds: discordGuilds
          })
          .select("id")
          .single();

        // audit
        if (created) {
          await supa.from("rank_history").insert({
            user_id: created.id,
            ancien_rang: null,
            nouveau_rang: 1,
            raison: "inscription"
          });
        }

        // webhook éventuel
        if (process.env.DISCORD_WEBHOOK_NEW_MEMBER) {
          fetch(process.env.DISCORD_WEBHOOK_NEW_MEMBER, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: `Nouveau membre : **${user.name}**` })
          }).catch(() => {});
        }
      }
      return true;
    },

    async jwt({ token, account }) {
      // 1ère connexion : on hydrate
      if (account?.provider === "discord") {
        token.discord_id = account.providerAccountId;
      }

      const supa = supabaseAdmin();
      if (token.discord_id) {
        const { data: u } = await supa
          .from("users")
          .select("id, discord_id, username, surnom, avatar_url, rank_level, is_active, discord_guilds")
          .eq("discord_id", token.discord_id)
          .maybeSingle();

        if (u) {
          token.user_id = u.id;
          token.username = u.username;
          token.surnom = u.surnom;
          token.avatar_url = u.avatar_url;
          token.rank_level = u.rank_level;
          token.is_active = u.is_active;
          token.discord_guilds = u.discord_guilds ?? [];

          const { data: rang } = await supa
            .from("ranks")
            .select("nom")
            .eq("level", u.rank_level)
            .single();
          token.rank_nom = rang?.nom;

          const { data: perms } = await supa
            .from("user_permissions")
            .select("permission")
            .eq("user_id", u.id);
          token.permissions = (perms ?? []).map(p => p.permission);

          const { data: badges } = await supa
            .from("user_badges")
            .select("badge_id, is_active, badges(code)")
            .eq("user_id", u.id)
            .eq("is_active", true);
          token.badges = (badges ?? [])
            .map((b: any) => b.badges?.code)
            .filter(Boolean);

          // heartbeat
          await supa
            .from("users")
            .update({ derniere_connexion: new Date().toISOString() })
            .eq("id", u.id);
        }
      }

      // JWT custom signé pour Supabase RLS
      if (token.user_id) {
        token.supabase_token = jwt.sign(
          {
            sub: token.user_id,
            user_id: token.user_id,
            rank_level: token.rank_level ?? 1,
            aud: "authenticated",
            role: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2
          },
          process.env.NEXTAUTH_SECRET!
        );
      }

      return token;
    },

    async session({ session, token }) {
      if (!token.is_active) {
        session.user = null;
        return session;
      }
      session.user = {
        ...session.user,
        id: token.user_id as string,
        discord_id: token.discord_id as string,
        username: token.username as string,
        surnom: token.surnom as string | null,
        avatar_url: token.avatar_url as string | null,
        rank_level: (token.rank_level as number) ?? 1,
        rank_nom: token.rank_nom as string,
        permissions: (token.permissions as string[]) ?? [],
        badges: (token.badges as string[]) ?? [],
        is_active: token.is_active as boolean,
        discord_guilds: (token.discord_guilds as any[]) ?? []
      } as any;
      session.supabase_token = token.supabase_token;
      return session;
    }
  },
  events: {
    async signOut({ token }) {
      if (token?.user_id) {
        const supa = supabaseAdmin();
        await supa.from("users").update({ statut: "hors_ligne" }).eq("id", token.user_id);
      }
    }
  },
  pages: { signIn: "/login" }
};