import type { Grade } from '@/lib/types';

const DISCORD_API = 'https://discord.com/api/v10';

interface DiscordMember {
  roles: string[];
  user: { id: string; username: string; avatar: string | null };
  nick: string | null;
}

/**
 * Récupère les rôles Discord d'un user dans le serveur USM.
 */
export async function fetchGuildMember(discordUserId: string): Promise<DiscordMember | null> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    console.warn('Discord guild/bot token non configuré');
    return null;
  }

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Erreur fetch Discord member', e);
    return null;
  }
}

/**
 * Détermine le grade USM le plus élevé à partir des rôles Discord.
 */
export function getGradeFromDiscordRoles(roleIds: string[]): { grade: Grade | null; isFormateur: boolean } {
  const roleMap: Array<{ envKey: string; grade: Grade; priority: number }> = [
    { envKey: 'DISCORD_ROLE_SHERIFF', grade: 'sheriff', priority: 7 },
    { envKey: 'DISCORD_ROLE_LEADER', grade: 'leader', priority: 6 },
    { envKey: 'DISCORD_ROLE_COLEADER', grade: 'co_leader', priority: 5 },
    { envKey: 'DISCORD_ROLE_OPERATOR', grade: 'operator', priority: 4 },
    { envKey: 'DISCORD_ROLE_OPERATOR_SECOND', grade: 'operator_second', priority: 3 },
    { envKey: 'DISCORD_ROLE_USM', grade: 'usm', priority: 2 },
    { envKey: 'DISCORD_ROLE_USM_TEST', grade: 'usm_test', priority: 1 },
  ];

  const formateurRoleId = process.env.DISCORD_ROLE_FORMATEUR;
  const isFormateur = formateurRoleId ? roleIds.includes(formateurRoleId) : false;

  let highestGrade: Grade | null = null;
  let highestPriority = 0;

  for (const { envKey, grade, priority } of roleMap) {
    const roleId = process.env[envKey];
    if (roleId && roleIds.includes(roleId) && priority > highestPriority) {
      highestGrade = grade;
      highestPriority = priority;
    }
  }

  return { grade: highestGrade, isFormateur };
}

/**
 * Vérifie qu'un utilisateur a un rôle USM (peu importe lequel).
 */
export function hasUsmRole(roleIds: string[]): boolean {
  const { grade } = getGradeFromDiscordRoles(roleIds);
  return grade !== null;
}

/**
 * Vérifie que l'utilisateur a le rôle BCSO (prérequis pour postuler).
 */
export function hasBcsoRole(roleIds: string[]): boolean {
  const bcsoRoleId = process.env.DISCORD_ROLE_BCSO;
  if (!bcsoRoleId) {
    console.warn('DISCORD_ROLE_BCSO non configuré');
    return false;
  }
  return roleIds.includes(bcsoRoleId);
}

/**
 * Envoie un message dans un canal Discord (notif).
 */
export async function sendDiscordMessage(channelId: string, content: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    return res.ok;
  } catch (e) {
    console.error('Erreur envoi Discord', e);
    return false;
  }
}
