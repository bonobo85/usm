'use client';

import { useState } from 'react';
import Link from 'next/link';

import { PageHeader } from '@/components/ui/PageHeader';
import type { Agent, Grade } from '@/lib/types';
import { GRADE_LABELS } from '@/lib/types';
import { getInitials } from '@/lib/utils/format';

interface Props {
  agents: Agent[];
  badgeCounts: Record<string, number>;
  counts: Record<Grade, number>;
  currentAgent: Agent;
}

const GRADE_PILL_STYLES: Record<Grade, string> = {
  sheriff: 'bg-gradient-to-br from-[#b8252b] to-[#2e0608] border-[#b8252b]/50',
  leader: 'bg-gradient-to-br from-[#b8851e] to-[#2b1c04] border-[#b8851e]/50',
  co_leader: 'bg-gradient-to-br from-[#a07a1a] to-[#2a1e08] border-usm-gold/40',
  operator: 'bg-gradient-to-br from-[#2c5fb8] to-[#0a1530] border-[#2c5fb8]/50',
  operator_second: 'bg-gradient-to-br from-[#3b67c2] to-[#0c1a35] border-[#3b67c2]/50',
  usm: 'bg-gradient-to-br from-[#5e3b9c] to-[#14082e] border-[#5e3b9c]/50',
  usm_test: 'bg-gradient-to-br from-panel-3 to-panel border-border',
};

const CARD_GRADE_STYLES: Record<Grade, string> = {
  sheriff: 'bg-usm-red/20 text-[#ff7a82] border-usm-red/50',
  leader: 'bg-[#b8851e]/20 text-[#f0c14b] border-[#b8851e]/50',
  co_leader: 'bg-usm-gold/15 text-usm-gold-light border-usm-gold/40',
  operator: 'bg-[#2c5fb8]/20 text-[#7aa5e8] border-[#2c5fb8]/50',
  operator_second: 'bg-[#2c5fb8]/15 text-[#7aa5e8] border-[#2c5fb8]/40',
  usm: 'bg-[#5e3b9c]/20 text-[#ad8ee0] border-[#5e3b9c]/50',
  usm_test: 'bg-panel-3 text-text-dim border-border',
};

const GRADE_ORDER_FILTERS: Grade[] = ['sheriff', 'leader', 'co_leader', 'operator', 'operator_second', 'usm', 'usm_test'];

export function RosterGrid({ agents, badgeCounts, counts, currentAgent }: Props) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | 'all'>('all');
  const [formateurOnly, setFormateurOnly] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 24;

  const filtered = agents.filter((a) => {
    if (gradeFilter !== 'all' && a.grade !== gradeFilter) return false;
    if (formateurOnly && !a.is_formateur) return false;
    if (search) {
      const s = search.toLowerCase();
      const match =
        (a.pseudo_rp || '').toLowerCase().includes(s) ||
        (a.matricule || '').toLowerCase().includes(s) ||
        (a.discord_username || '').toLowerCase().includes(s) ||
        (a.specialties || []).some((sp) => sp.toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Reset à la page 1 quand les filtres changent
  function updateFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <>
      <PageHeader title="Annuaire USM" subtitle={`${agents.length} agent${agents.length !== 1 ? 's' : ''} actif${agents.length !== 1 ? 's' : ''}`} />

      {/* Pills par grade */}
      <div className="grid grid-cols-7 gap-2.5 mb-4">
        {GRADE_ORDER_FILTERS.map((g) => (
          <button
            key={g}
            onClick={() => updateFilter(() => setGradeFilter(gradeFilter === g ? 'all' : g))}
            className={`rounded-xl p-3.5 text-center border transition-all relative overflow-hidden ${GRADE_PILL_STYLES[g]} ${gradeFilter === g ? 'ring-2 ring-usm-gold' : ''}`}
          >
            <div className="text-[11px] text-white/75 uppercase tracking-wider font-semibold mb-1.5">{GRADE_LABELS[g]}</div>
            <div className={`text-[26px] font-bold text-white leading-none ${g === 'usm_test' ? 'text-text-dim' : ''}`}>{counts[g]}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-3 mb-4 flex items-center gap-2.5">
        <input
          value={search}
          onChange={(e) => updateFilter(() => setSearch(e.target.value))}
          placeholder="🔍 Rechercher par nom, matricule, spécialité..."
          className="input flex-1 max-w-[340px]"
        />
        <label className="flex items-center gap-2 px-3 py-2 bg-bg-2 border border-border rounded-lg cursor-pointer hover:border-usm-gold-dark transition-colors text-xs">
          <input type="checkbox" checked={formateurOnly} onChange={(e) => updateFilter(() => setFormateurOnly(e.target.checked))} className="w-3.5 h-3.5 accent-usm-gold" />
          <span>Formateurs uniquement</span>
        </label>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-text-faint">Aucun agent trouvé.</div>
        ) : (
          paginated.map((a) => (
            <Link
              key={a.id}
              href={`/roster/${a.id}`}
              className="card cursor-pointer transition-all hover:border-usm-gold-dark hover:-translate-y-0.5 hover:shadow-2xl relative"
            >
              {/* Banner */}
              <div className="h-[60px] bg-gradient-to-br from-[#2c5fb8] to-[#5e3b9c] relative overflow-hidden">
                <span className="absolute -right-2.5 -top-7 text-[120px] text-usm-gold opacity-[0.08] leading-none font-black">★</span>
              </div>

              {/* Avatar */}
              <div className="-mt-7 ml-4 w-14 h-14 rounded-xl bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-extrabold text-lg border-[3px] border-panel shadow-lg overflow-hidden">
                {a.photo_url || a.discord_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photo_url || a.discord_avatar_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(a.pseudo_rp || a.discord_username)
                )}
              </div>

              {/* Body */}
              <div className="px-4 pt-2.5 pb-4">
                <div className="font-mono text-[10.5px] text-text-faint uppercase tracking-wider mb-0.5">{a.matricule || 'sans matricule'}</div>
                <div className="text-base font-bold text-text mb-1.5 tracking-tight">{a.pseudo_rp || a.discord_username || 'Sans nom'}</div>
                <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider border ${CARD_GRADE_STYLES[a.grade]}`}>
                  {GRADE_LABELS[a.grade]}
                </span>
                <div className="flex gap-3.5 mt-3 pt-2.5 border-t border-border text-[11px] text-text-faint">
                  {a.date_recruitment && (
                    <div><strong className="text-text-dim font-semibold">{ageFromDate(a.date_recruitment)}</strong> ancien.</div>
                  )}
                  <div><strong className="text-text-dim font-semibold">{badgeCounts[a.id] || 0}</strong> badges</div>
                </div>
              </div>

              {/* Tag Formateur */}
              {a.is_formateur && (
                <div className="absolute top-2.5 right-2.5 bg-gradient-to-br from-usm-gold/25 to-usm-gold/10 border border-usm-gold/50 text-usm-gold-light px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur">
                  Formateur
                </div>
              )}
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Précédent
          </button>
          <span className="text-xs text-text-faint px-3">
            Page {currentPage} / {totalPages} · {filtered.length} agents
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant →
          </button>
        </div>
      )}
    </>
  );
}

function ageFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  if (days < 365) return `${Math.floor(days / 30)}mois`;
  const years = Math.floor(days / 365);
  return `${years}an${years > 1 ? 's' : ''}`;
}
