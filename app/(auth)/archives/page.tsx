import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Agent } from '@/lib/types';
import { GRADE_LABELS } from '@/lib/types';
import { hasMinimumGrade } from '@/lib/auth/permissions';
import { Archive as ArchiveIcon, FileText, Users } from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function ArchivesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .single<Agent>();
  if (!agent) redirect('/login');

  if (!hasMinimumGrade(agent, 'co_leader') && !agent.is_admin) redirect('/dashboard');

  const { data: inactiveAgents } = await supabase
    .from('agents')
    .select('*')
    .eq('is_active', false)
    .order('updated_at', { ascending: false })
    .returns<Agent[]>();

  const formerMembers: Agent[] = inactiveAgents || [];

  // Attestations récentes (toutes, avec nom de l'agent concerné)
  const { data: certificates } = await supabase
    .from('certificates')
    .select('id, ref_number, type, is_crash, issued_at, agent_id, agent:agents!certificates_agent_id_fkey(pseudo_rp, matricule)')
    .order('issued_at', { ascending: false })
    .limit(50);

  const certs = certificates || [];
  const CERT_TYPE_LABELS: Record<string, string> = {
    recruitment: 'Recrutement',
    formation: 'Formation',
    badge_removal: 'Retrait de badge',
    dismissal: 'Fin de service',
  };

  return (
    <>
      <Topbar
        agent={agent}
        breadcrumb={[{ label: 'Administration' }, { label: 'Archives' }]}
      />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <PageHeader
          title="Archives"
          subtitle="Anciens membres et documents officiels"
        />

        <div className="space-y-6">
          {/* Section : anciens membres */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-usm-gold" />
              <h2 className="text-sm font-semibold text-text uppercase tracking-wider">
                Anciens membres ({formerMembers.length})
              </h2>
            </div>

            {formerMembers.length === 0 ? (
              <Card className="p-12 text-center text-text-faint">
                <ArchiveIcon className="w-12 h-12 mx-auto mb-3 text-text-faint/40" />
                <div className="text-sm">Aucun ancien membre archivé.</div>
                <div className="text-[11px] text-text-faint/70 mt-2">
                  Les agents désactivés apparaîtront ici.
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {formerMembers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/roster/${m.id}`}
                    className="card p-4 hover:border-usm-gold-dark transition-colors text-center group no-underline"
                  >
                    <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-text-faint/30 to-text-faint/10 flex items-center justify-center text-text-faint font-bold text-base mb-2 overflow-hidden grayscale">
                      {m.discord_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.discord_avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(m.pseudo_rp || m.discord_username || 'A')
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-text-dim truncate group-hover:text-text">
                      {m.pseudo_rp || m.discord_username || 'Anonyme'}
                    </div>
                    <div className="text-[10.5px] text-text-faint mt-0.5">
                      {GRADE_LABELS[m.grade]}
                      {m.matricule && ` · #${m.matricule}`}
                    </div>
                    <div className="text-[10px] text-text-faint/70 mt-1.5 italic">
                      Archivé le {formatDate(m.updated_at)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Section : documents officiels */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-usm-gold" />
              <h2 className="text-sm font-semibold text-text uppercase tracking-wider">
                Attestations délivrées ({certs.length})
              </h2>
            </div>

            {certs.length === 0 ? (
              <Card className="p-8 text-center text-text-faint">
                <FileText className="w-10 h-10 mx-auto mb-3 text-text-faint/40" />
                <div className="text-sm">Aucune attestation délivrée pour le moment.</div>
              </Card>
            ) : (
              <div className="space-y-2">
                {certs.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/roster/${c.agent_id || ''}`}
                    className="card p-3.5 flex items-center gap-3 hover:border-usm-gold-dark transition-colors no-underline"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg-2 border border-border flex items-center justify-center text-text-dim shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-text">
                          {CERT_TYPE_LABELS[c.type] || c.type}
                        </span>
                        {c.is_crash && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2c5fb8]/20 text-[#7aa5e8] border border-[#2c5fb8]/40">
                            CRASH
                          </span>
                        )}
                        <span className="text-[12px] text-text-dim">
                          — {c.agent?.pseudo_rp || 'Agent'}
                          {c.agent?.matricule ? ` (#${c.agent.matricule})` : ''}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-text-faint font-mono">
                        {c.ref_number} · {formatDate(c.issued_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
