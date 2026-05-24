import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { agentHasPermission, loadRolePermissions } from '@/lib/auth/permissions';
import type { Agent } from '@/lib/types';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .single<Agent>();

  if (!agent) redirect('/login');

  // Compteurs en attente
  const [
    { count: sanctionsCount },
    { count: ticketsCount },
    { count: applicationsCount },
    { count: notificationsCount },
    rolePerms,
  ] = await Promise.all([
    supabase
      .from('disciplinary_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'in_review']),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    loadRolePermissions(),
  ]);

  const canValidateApplications = agentHasPermission(agent, 'validate_application', rolePerms);

  return (
    <div className="grid grid-cols-[240px_1fr] h-screen overflow-hidden">
      <Sidebar
        agent={agent}
        pendingCounts={{
          sanctions: sanctionsCount || 0,
          tickets: ticketsCount || 0,
          applications: applicationsCount || 0,
          notifications: notificationsCount || 0,
        }}
        canValidateApplications={canValidateApplications}
      />
      <main className="flex flex-col overflow-hidden bg-bg">{children}</main>
    </div>
  );
}
