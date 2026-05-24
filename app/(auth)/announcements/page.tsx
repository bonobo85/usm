import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { redirect } from 'next/navigation';
import type { Agent } from '@/lib/types';
import { AnnouncementsList } from '@/components/modules/AnnouncementsList';
import { agentHasPermission, loadRolePermissions } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents').select('*').eq('id', user.id).single<Agent>();
  if (!agent) redirect('/login');

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*, author:agents!announcements_author_id_fkey(id, pseudo_rp, matricule, grade, discord_avatar_url)')
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false });

  const rolePerms = await loadRolePermissions();
  const canCreatePublic = agentHasPermission(agent, 'create_announcement', rolePerms);
  const canCreateInternal = agentHasPermission(agent, 'create_internal_post', rolePerms);

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Communications' }, { label: 'Annonces' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <AnnouncementsList
          announcements={announcements || []}
          currentAgent={agent}
          canCreatePublic={canCreatePublic}
          canCreateInternal={canCreateInternal}
        />
      </div>
    </>
  );
}
