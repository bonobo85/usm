import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  fetchGuildMember,
  getGradeFromDiscordRoles,
  hasUsmRole,
  hasBcsoRole,
} from '@/lib/discord/api';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message || 'unknown')}`
    );
  }

  const meta = data.user.user_metadata || {};
  const discordId = meta.provider_id || meta.sub || meta.discord_id || data.user.identities?.[0]?.id;

  if (!discordId) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=no_discord_id`);
  }

  const member = await fetchGuildMember(discordId);

  // Si le user vient pour candidater (next=/apply) on est plus permissif
  const wantsToApply = next === '/apply' || next.startsWith('/apply');

  if (!member) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_in_guild`);
  }

  // Si veut candidater : vérifie qu'il a BCSO et n'est PAS encore USM
  if (wantsToApply) {
    if (hasUsmRole(member.roles)) {
      // Déjà USM, redirige direct vers dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
    if (!hasBcsoRole(member.roles)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=not_bcso`);
    }
    // OK, c'est un BCSO qui peut candidater
    return NextResponse.redirect(`${origin}/apply`);
  }

  // Sinon, flow normal : doit être USM
  if (!hasUsmRole(member.roles)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_usm`);
  }

  const { grade, isFormateur } = getGradeFromDiscordRoles(member.roles);

  // Sync via admin client pour bypass RLS
  const adminClient = createAdminClient();

  // Vérifie si le grade est verrouillé manuellement (ne pas écraser depuis Discord)
  const { data: existing } = await adminClient
    .from('agents')
    .select('grade_locked')
    .eq('id', data.user.id)
    .maybeSingle();

  const gradeLocked = existing?.grade_locked === true;

  const updatePayload: Record<string, unknown> = {
    id: data.user.id,
    discord_id: discordId,
    discord_username: meta.full_name || meta.name || meta.user_name || data.user.email,
    discord_avatar_url: meta.avatar_url,
    is_formateur: isFormateur,
    last_login: new Date().toISOString(),
    is_active: true,
  };

  // Ne met à jour le grade depuis Discord QUE s'il n'est pas verrouillé manuellement
  if (!gradeLocked) {
    updatePayload.grade = grade || 'usm_test';
  }

  await adminClient.from('agents').upsert(updatePayload, { onConflict: 'id' });

  return NextResponse.redirect(`${origin}${next}`);
}
