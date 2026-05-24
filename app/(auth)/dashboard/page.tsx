import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { AlertTriangle, Megaphone, Users, Clock, Zap, ChevronRight, BadgeCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { GRADE_LABELS } from '@/lib/types';
import type { Agent, Announcement } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .single<Agent>();

  if (!agent) redirect('/login');

  const [
    { count: activeAgentsCount },
    { count: sanctionsCount },
    { count: pendingSanctionsCount },
    { count: applicationsCount },
    { count: badgesCount },
    { count: openTicketsCount },
    { data: announcements },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('disciplinary_records').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
    supabase.from('disciplinary_records').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_review']),
    supabase.from('agent_trainings').select('*', { count: 'exact', head: true }),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase
      .from('announcements')
      .select('*, author:agents!announcements_author_id_fkey(pseudo_rp, matricule, grade, discord_avatar_url)')
      .order('published_at', { ascending: false })
      .limit(4),
    supabase
      .from('audit_logs')
      .select('*')
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const displayName = agent.pseudo_rp || agent.discord_username || 'Agent';

  return (
    <>
      <Topbar agent={agent} breadcrumb={[{ label: 'Portail' }, { label: 'Tableau de bord' }]} />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        {/* Welcome */}
        <div
          className="relative overflow-hidden rounded-xl border border-border p-6 mb-4 flex items-center justify-between animate-fade-in"
          style={{
            background: 'linear-gradient(120deg, #1a1530 0%, #2a2050 35%, #4a2a7a 100%)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 400px 200px at 90% -30%, rgba(212, 161, 58, 0.12), transparent 60%)',
            }}
          />
          <div className="relative z-10">
            <h1 className="text-[28px] font-bold text-white tracking-tight leading-none">
              Bienvenue, <span className="text-usm-gold-light">{displayName}</span>
            </h1>
            <div className="mt-2.5 flex items-center gap-2.5 text-white/70 text-[13px]">
              {agent.matricule && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-usm-gold/15 border border-usm-gold/40 rounded-full text-usm-gold-light font-mono text-[11.5px] font-medium">
                  🎖 Matricule {agent.matricule}
                </span>
              )}
              <span>· {GRADE_LABELS[agent.grade]}</span>
              {agent.is_formateur && <span className="text-usm-gold-light">· Formateur</span>}
            </div>
          </div>
          <div className="text-right relative z-10">
            <div className="text-[12.5px] text-white/70 font-medium capitalize">{dateStr}</div>
            <div className="font-mono text-[22px] text-usm-gold-light font-semibold mt-0.5">{timeStr}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3.5 mb-4">
          <StatCard
            color="red"
            icon={AlertTriangle}
            label="Sanctions en cours"
            value={sanctionsCount || 0}
            delta={pendingSanctionsCount ? `↑ ${pendingSanctionsCount} demandes en attente` : 'Aucune en attente'}
            deltaType={pendingSanctionsCount ? 'down' : 'neutral'}
          />
          <StatCard
            color="blue"
            icon={Megaphone}
            label="Annonces actives"
            value={announcements?.length || 0}
            delta="↑ Voir toutes"
            deltaType="up"
          />
          <StatCard
            color="green"
            icon={Users}
            label="Agents actifs"
            value={activeAgentsCount || 0}
            delta="Synchronisé Discord"
            deltaType="up"
          />
          <StatCard
            color="purple"
            icon={BadgeCheck}
            label="Candidatures"
            value={applicationsCount || 0}
            delta={applicationsCount ? 'À traiter' : 'À jour'}
          />
        </div>

        {/* Grid 2 cols */}
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          {/* Annonces */}
          <Card title="Annonces importantes" emoji="📢" action={<Link href="/announcements" className="text-xs text-usm-gold hover:text-usm-gold-light">Voir toutes →</Link>}>
            {!announcements || announcements.length === 0 ? (
              <div className="py-8 text-center text-text-faint text-sm">Aucune annonce pour le moment.</div>
            ) : (
              announcements.map((a: any) => (
                <div key={a.id} className="py-3.5 flex gap-3 border-b border-border-soft last:border-b-0 first:pt-0 last:pb-0">
                  <Avatar
                    src={a.author?.discord_avatar_url}
                    name={a.author?.pseudo_rp}
                    size="sm"
                    variant={a.type === 'internal' ? 'red' : 'blue'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-[13px] text-text">{a.author?.pseudo_rp || 'Anonyme'}</span>
                      <span className="text-[11px] text-text-faint font-mono">{formatDateTime(a.published_at)}</span>
                      {a.type === 'internal' && (
                        <span className="text-[9px] bg-usm-red text-white px-1.5 py-px rounded font-bold uppercase tracking-wider">Interne</span>
                      )}
                    </div>
                    <div className="font-medium text-text mb-1 text-[13.5px]">{a.title}</div>
                    <div className="text-text-dim text-[12.5px] leading-relaxed line-clamp-2">{a.content}</div>
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* Sidebar : À traiter + Activités */}
          <div className="flex flex-col gap-4">
            <Card title="À traiter" emoji="⚡">
              <Link href="/disciplinary" className="block">
                <div className="p-3 border border-border rounded-lg mb-2 flex items-center gap-3 bg-panel-2 cursor-pointer hover:border-usm-gold-dark transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#b8252b] to-[#2e0608] flex items-center justify-center text-white flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-text">{pendingSanctionsCount || 0} demande{pendingSanctionsCount !== 1 ? 's' : ''} de sanction</div>
                    <div className="text-[11.5px] text-text-faint mt-0.5">en attente de validation</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-faint" />
                </div>
              </Link>
              <Link href="/recruitment" className="block">
                <div className="p-3 border border-border rounded-lg mb-2 flex items-center gap-3 bg-panel-2 cursor-pointer hover:border-usm-gold-dark transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-text">{applicationsCount || 0} candidature{applicationsCount !== 1 ? 's' : ''}</div>
                    <div className="text-[11.5px] text-text-faint mt-0.5">à examiner</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-faint" />
                </div>
              </Link>
              <Link href="/tickets" className="block">
                <div className="p-3 border border-border rounded-lg flex items-center gap-3 bg-panel-2 cursor-pointer hover:border-usm-gold-dark transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2c5fb8] to-[#0a1530] flex items-center justify-center text-white flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-text">{openTicketsCount || 0} ticket{openTicketsCount !== 1 ? 's ouverts' : ' ouvert'}</div>
                    <div className="text-[11.5px] text-text-faint mt-0.5">à traiter</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-faint" />
                </div>
              </Link>
            </Card>

            <Card title="Vos activités récentes" emoji="🕒">
              {!recentActivity || recentActivity.length === 0 ? (
                <div className="py-4 text-center text-text-faint text-sm">Aucune activité récente.</div>
              ) : (
                recentActivity.map((a: any) => (
                  <div key={a.id} className="p-2.5 border border-border rounded-lg mb-2 last:mb-0 flex items-center gap-3 bg-panel-2">
                    <div className="w-7 h-7 rounded-md bg-[#2c5fb8]/15 border border-[#2c5fb8]/30 flex items-center justify-center text-[#7aa5e8] flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[12.5px] font-medium text-text">{formatAction(a.action)}</div>
                      <div className="text-[11px] text-text-faint font-mono mt-0.5">{timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    'announcement.created': 'Annonce publiée',
    'announcement.deleted': 'Annonce supprimée',
    'sanction.requested': 'Sanction demandée',
    'sanction.applied': 'Sanction appliquée',
    'training.validated': 'Formation validée',
    'application.accepted': 'Candidature acceptée',
    'application.rejected': 'Candidature refusée',
    'permission.updated': 'Permissions modifiées',
  };
  return map[action] || action;
}
