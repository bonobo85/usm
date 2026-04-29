import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discord_id: string;
      username: string;
      surnom: string | null;
      email?: string | null;
      avatar_url: string | null;
      rank_level: number;
      rank_nom: string;
      permissions: string[];
      badges: string[];
      is_active: boolean;
      discord_guilds: { id: string; name: string; icon: string | null; roles: string[]; nick: string | null }[];
    } | null;
    supabase_token?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discord_id?: string;
    user_id?: string;
    username?: string;
    surnom?: string | null;
    avatar_url?: string | null;
    rank_level?: number;
    rank_nom?: string;
    is_active?: boolean;
    permissions?: string[];
    badges?: string[];
    discord_guilds?: any[];
    supabase_token?: string;
  }
}
