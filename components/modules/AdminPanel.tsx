'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Zap, HardDrive, Clock, Check, Shield, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { Agent, Permission, Grade } from '@/lib/types';
import { GRADE_LABELS } from '@/lib/types';
import { timeAgo, getInitials } from '@/lib/utils/format';

interface Props {
  agents: Agent[];
  permissions: Permission[];
  matrix: Record<string, Record<Grade, boolean>>;
  logs: any[];
  currentAgent: Agent;
  stats: { totalAgents: number; actionsToday: number };
}

const ALL_GRADES: Grade[] = ['sheriff', 'leader', 'co_leader', 'operator', 'operator_second', 'usm', 'usm_test'];
const GRADE_LABELS_SHORT: Record<Grade, string> = {
  sheriff: 'Shérif',
  leader: 'Leader',
  co_leader: 'Co-lead',
  operator: 'Op.',
  operator_second: 'Op.2',
  usm: 'USM',
  usm_test: 'Test',
};

export function AdminPanel({ agents, permissions, matrix, logs, currentAgent, stats }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'overview' | 'permissions' | 'users' | 'logs'>('overview');
  const [localMatrix, setLocalMatrix] = useState(matrix);

  async function togglePermission(permKey: string, grade: Grade) {
    if (!currentAgent.is_admin) {
      showToast('Réservé aux admins', 'error');
      return;
    }
    const supabase = createClient();
    const newValue = !localMatrix[permKey][grade];
    setLocalMatrix({
      ...localMatrix,
      [permKey]: { ...localMatrix[permKey], [grade]: newValue },
    });

    if (newValue) {
      const { error } = await supabase.from('role_permissions').insert({ grade, permission_key: permKey });
      if (error) {
        showToast(`Erreur : ${error.message}`, 'error');
        setLocalMatrix(matrix);
      }
    } else {
      const { error } = await supabase.from('role_permissions').delete().eq('grade', grade).eq('permission_key', permKey);
      if (error) {
        showToast(`Erreur : ${error.message}`, 'error');
        setLocalMatrix(matrix);
      }
    }
  }

  async function toggleAdmin(agentId: string, currentValue: boolean) {
    if (!currentAgent.is_admin) {
      showToast('Réservé aux admins', 'error');
      return;
    }
    if (!confirm(currentValue ? 'Retirer les droits admin de cet agent ?' : 'Promouvoir cet agent admin ?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('agents').update({ is_admin: !currentValue }).eq('id', agentId);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      return;
    }
    showToast(currentValue ? 'Droits admin retirés' : 'Promu admin', 'success');
    router.refresh();
  }

  async function changeGrade(agentId: string, newGrade: Grade) {
    if (!currentAgent.is_admin) {
      showToast('Réservé aux admins', 'error');
      return;
    }
    const supabase = createClient();
    // grade_locked = true : empêche le resync Discord d'écraser ce grade manuel
    const { error } = await supabase
      .from('agents')
      .update({ grade: newGrade, grade_locked: true })
      .eq('id', agentId);
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
      return;
    }
    showToast(`Grade changé en ${GRADE_LABELS[newGrade]} (verrouillé)`, 'success');
    router.refresh();
  }

  return (
    <>
      <PageHeader title="Panel administration" subtitle="Configuration et supervision du portail" />

      <div className="flex gap-0.5 bg-panel border border-border rounded-xl p-1 mb-5 overflow-x-auto">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} emoji="📊" label="Vue d'ensemble" />
        <TabBtn active={tab === 'permissions'} onClick={() => setTab('permissions')} emoji="🔐" label="Permissions" />
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} emoji="👥" label="Utilisateurs" />
        <TabBtn active={tab === 'logs'} onClick={() => setTab('logs')} emoji="📋" label={`Logs (${logs.length})`} />
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-4 gap-3.5 mb-5">
            <StatCard color="blue" icon={Users} label="Utilisateurs total" value={stats.totalAgents} delta="Synchronisé Discord" deltaType="up" />
            <StatCard color="green" icon={Zap} label="Actions 24h" value={stats.actionsToday} delta="Audit log actif" deltaType="up" />
            <StatCard color="purple" icon={HardDrive} label="Stockage" value="—" delta="Avatars & badges" />
            <StatCard color="gold" icon={Clock} label="Uptime" value="OK" delta="Système stable" deltaType="up" />
          </div>

          <Card title="État système" emoji="⚙">
            <div className="space-y-2.5 pt-1">
              <SysRow label="Supabase API" value="Connecté" status="green" />
              <SysRow label="Discord Bot" value={process.env.NEXT_PUBLIC_DISCORD_BOT_STATUS || 'Configuration requise'} status="amber" />
              <SysRow label="Storage" value="Avatars & badges" status="green" />
            </div>
          </Card>
        </>
      )}

      {tab === 'permissions' && (
        <div className="card overflow-x-auto">
          <div className="grid grid-cols-[280px_repeat(7,1fr)] bg-bg-2 border-b border-border min-w-[900px]">
            <div className="px-4 py-3.5 text-[10.5px] text-text-faint uppercase tracking-wider font-semibold">Permission</div>
            {ALL_GRADES.map((g) => (
              <div key={g} className="px-2 py-3.5 text-[10.5px] text-text-faint uppercase tracking-wider font-semibold text-center">{GRADE_LABELS_SHORT[g]}</div>
            ))}
          </div>
          {permissions.map((p) => (
            <div key={p.key} className="grid grid-cols-[280px_repeat(7,1fr)] border-b border-border-soft last:border-b-0 hover:bg-panel-2 min-w-[900px]">
              <div className="px-4 py-3.5">
                <div className="text-[13px] text-text font-medium">{p.label}</div>
                <span className="block text-[10.5px] text-text-faint font-mono mt-0.5">{p.key}</span>
              </div>
              {ALL_GRADES.map((g) => (
                <div key={g} className="px-2 py-3.5 flex items-center justify-center">
                  <button
                    onClick={() => togglePermission(p.key, g)}
                    disabled={!currentAgent.is_admin}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      localMatrix[p.key]?.[g]
                        ? 'bg-gradient-to-br from-usm-gold to-usm-gold-dark border-usm-gold text-[#0a0a12] shadow-md'
                        : 'bg-bg-2 border-border hover:border-usm-gold'
                    } ${!currentAgent.is_admin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {localMatrix[p.key]?.[g] && <Check className="w-3 h-3 font-bold" />}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_100px_100px] gap-3 bg-bg-2 px-4 py-3 border-b border-border text-[10.5px] text-text-faint uppercase tracking-wider font-semibold">
            <div>Agent</div>
            <div>Grade</div>
            <div>Matricule</div>
            <div>Statut</div>
            <div>Actions</div>
          </div>
          {agents.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_140px_120px_100px_100px] gap-3 px-4 py-3 border-b border-border-soft last:border-b-0 items-center hover:bg-panel-2">
              <Link href={`/roster/${a.id}`} className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-bold text-[11px] shrink-0">
                  {getInitials(a.pseudo_rp || a.discord_username)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-text truncate">{a.pseudo_rp || a.discord_username || 'Sans nom'}</div>
                  <div className="text-[11px] text-text-faint font-mono truncate">{a.discord_id || '—'}</div>
                </div>
              </Link>
              <div className="text-[11.5px] text-text-dim">
                {currentAgent.is_admin ? (
                  <select
                    value={a.grade}
                    onChange={(e) => changeGrade(a.id, e.target.value as Grade)}
                    className="input text-[11px] h-[28px] py-0 px-1.5 w-full"
                    title={a.grade_locked ? 'Grade verrouillé (manuel)' : 'Synchronisé Discord'}
                  >
                    {(['sheriff', 'leader', 'co_leader', 'operator', 'operator_second', 'usm', 'usm_test'] as Grade[]).map((g) => (
                      <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                    ))}
                  </select>
                ) : (
                  GRADE_LABELS[a.grade]
                )}
              </div>
              <div className="text-[11.5px] text-text-dim font-mono">{a.matricule || '—'}</div>
              <div>
                {a.is_admin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-usm-gold/15 border border-usm-gold/40 rounded text-[10px] text-usm-gold-light font-bold uppercase">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
                {!a.is_active && <span className="text-[11px] text-text-faint">Inactif</span>}
              </div>
              <div>
                {currentAgent.is_admin && a.id !== currentAgent.id && (
                  <button
                    onClick={() => toggleAdmin(a.id, a.is_admin)}
                    className="text-xs text-text-faint hover:text-usm-gold transition-colors flex items-center gap-1"
                    title={a.is_admin ? 'Retirer admin' : 'Promouvoir admin'}
                  >
                    {a.is_admin ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'logs' && (
        <div className="card overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-text-faint text-sm">Aucun log.</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3 border-b border-border-soft last:border-b-0 items-center text-[12.5px]">
                <div className="font-mono text-[11px] text-text-faint">{timeAgo(l.created_at)}</div>
                <div className="text-text">
                  <strong className="text-usm-gold-light font-semibold">{l.actor?.pseudo_rp || 'Système'}</strong>{' '}
                  <span className="text-text-dim">{l.action}</span>
                  {l.target_type && <span className="text-text-faint text-[11px] ml-2">{l.target_type}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function TabBtn({ active, onClick, emoji, label }: { active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[12.5px] font-semibold rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
        active ? 'text-text bg-panel-3 shadow-md' : 'text-text-faint hover:text-text'
      }`}
    >
      <span>{emoji}</span> {label}
    </button>
  );
}

function SysRow({ label, value, status }: { label: string; value: string; status: 'green' | 'amber' | 'red' }) {
  const colors = {
    green: 'text-[#5ee0a1] bg-[#5ee0a1]',
    amber: 'text-usm-gold-light bg-usm-gold-light',
    red: 'text-[#ff7a82] bg-[#ff7a82]',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-soft last:border-b-0 text-[12.5px]">
      <span className="text-text-dim">{label}</span>
      <span className={`font-mono text-xs flex items-center gap-1.5 ${colors[status].split(' ')[0]}`}>
        <span className={`w-2 h-2 rounded-full ${colors[status].split(' ')[1]} shadow-[0_0_8px_currentColor]`} />
        {value}
      </span>
    </div>
  );
}
