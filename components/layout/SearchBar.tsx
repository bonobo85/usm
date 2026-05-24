'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Megaphone, MessageCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GRADE_LABELS } from '@/lib/types';

interface SearchResult {
  id: string;
  kind: 'agent' | 'announcement' | 'ticket';
  title: string;
  subtitle?: string;
  href: string;
}

const KIND_ICONS = {
  agent: User,
  announcement: Megaphone,
  ticket: MessageCircle,
};

const KIND_LABELS = {
  agent: 'Agent',
  announcement: 'Annonce',
  ticket: 'Ticket',
};

export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // CMD+K / Ctrl+K pour ouvrir
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Auto-focus à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounce recherche
  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const queryStr = `%${q}%`;

    const [agentsRes, announcementsRes, ticketsRes] = await Promise.all([
      supabase
        .from('agents')
        .select('id, pseudo_rp, matricule, grade, discord_username')
        .or(`pseudo_rp.ilike.${queryStr},matricule.ilike.${queryStr},discord_username.ilike.${queryStr}`)
        .limit(5),
      supabase
        .from('announcements')
        .select('id, title')
        .ilike('title', queryStr)
        .limit(3),
      supabase
        .from('tickets')
        .select('id, subject, status')
        .ilike('subject', queryStr)
        .limit(3),
    ]);

    const newResults: SearchResult[] = [
      ...(agentsRes.data || []).map((a) => ({
        id: a.id,
        kind: 'agent' as const,
        title: a.pseudo_rp || a.discord_username || 'Agent',
        subtitle: `${GRADE_LABELS[a.grade as keyof typeof GRADE_LABELS] || ''}${a.matricule ? ` · #${a.matricule}` : ''}`,
        href: `/roster/${a.id}`,
      })),
      ...(announcementsRes.data || []).map((a) => ({
        id: a.id,
        kind: 'announcement' as const,
        title: a.title,
        href: '/announcements',
      })),
      ...(ticketsRes.data || []).map((t) => ({
        id: t.id,
        kind: 'ticket' as const,
        title: t.subject,
        subtitle: `#${t.id.slice(0, 8)} · ${t.status}`,
        href: `/tickets/${t.id}`,
      })),
    ];

    setResults(newResults);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => performSearch(query), 200);
    return () => clearTimeout(t);
  }, [query, performSearch]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }

  function handleSelect(r: SearchResult) {
    setOpen(false);
    router.push(r.href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2.5 h-[30px] rounded-md border border-border flex-1 max-w-[280px] text-text-faint hover:text-text hover:border-usm-gold-dark transition-all bg-panel/40"
        aria-label="Rechercher (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-[12px]">Rechercher...</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-bg-2 border border-border-soft font-mono">⌘K</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh] bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-panel border border-border rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Search className="w-4 h-4 text-text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Chercher un agent, une annonce, un ticket..."
                className="flex-1 bg-transparent border-none outline-none text-text text-sm placeholder:text-text-faint"
              />
              <button
                onClick={() => setOpen(false)}
                className="text-text-faint hover:text-text"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-text-faint text-sm">Recherche...</div>
              ) : query.length < 2 ? (
                <div className="p-6 text-center text-text-faint text-sm">Tape au moins 2 caractères</div>
              ) : results.length === 0 ? (
                <div className="p-6 text-center text-text-faint text-sm">Aucun résultat pour &quot;{query}&quot;</div>
              ) : (
                <ul>
                  {results.map((r, i) => {
                    const Icon = KIND_ICONS[r.kind];
                    return (
                      <li key={`${r.kind}-${r.id}`}>
                        <button
                          onClick={() => handleSelect(r)}
                          onMouseEnter={() => setSelectedIndex(i)}
                          className={`w-full px-5 py-3 flex items-center gap-3 text-left transition-colors ${
                            selectedIndex === i ? 'bg-usm-gold/[0.08]' : 'hover:bg-panel-2'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-md bg-bg-2 border border-border-soft flex items-center justify-center text-text-dim shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-text truncate">{r.title}</div>
                            {r.subtitle && (
                              <div className="text-[11px] text-text-faint truncate">{r.subtitle}</div>
                            )}
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-text-faint font-semibold">
                            {KIND_LABELS[r.kind]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-5 py-2 border-t border-border-soft text-[10.5px] text-text-faint flex gap-3">
              <span><kbd className="px-1 py-0.5 bg-bg-2 border border-border-soft rounded font-mono text-[9.5px]">↑↓</kbd> Naviguer</span>
              <span><kbd className="px-1 py-0.5 bg-bg-2 border border-border-soft rounded font-mono text-[9.5px]">↵</kbd> Ouvrir</span>
              <span><kbd className="px-1 py-0.5 bg-bg-2 border border-border-soft rounded font-mono text-[9.5px]">esc</kbd> Fermer</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
