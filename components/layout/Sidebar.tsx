'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutGrid, User, Users, GraduationCap, Megaphone,
  AlertTriangle, MessageCircle, Archive, Settings, LogOut, ChevronRight, FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Agent } from '@/lib/types';

interface SidebarProps {
  agent: Agent;
  pendingCounts: {
    sanctions: number;
    tickets: number;
    applications: number;
    notifications: number;
  };
  canValidateApplications: boolean;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeDanger?: boolean;
  children?: { label: string; href: string; badge?: number }[];
}

export function Sidebar({ agent, pendingCounts, canValidateApplications }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'unité': true,
  });

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Espace agent',
      items: [
        { label: 'Tableau de bord', href: '/dashboard', icon: LayoutGrid },
        { label: 'Mon profil', href: `/roster/${agent.id}`, icon: User },
      ],
    },
    {
      title: 'Unité',
      items: [
        {
          label: 'Membres',
          icon: Users,
          children: [
            { label: 'Annuaire', href: '/roster' },
            ...(canValidateApplications
              ? [{ label: 'Recrutement', href: '/recruitment', badge: pendingCounts.applications }]
              : []),
          ],
        },
        { label: 'Formations', href: '/trainings', icon: GraduationCap },
        { label: 'Annonces', href: '/announcements', icon: Megaphone },
      ],
    },
    {
      title: 'Discipline & support',
      items: [
        {
          label: 'Disciplinaire',
          href: '/disciplinary',
          icon: AlertTriangle,
          badge: pendingCounts.sanctions,
          badgeDanger: pendingCounts.sanctions > 0,
        },
        {
          label: 'Tickets',
          href: '/tickets',
          icon: MessageCircle,
          badge: pendingCounts.tickets,
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        ...(agent.is_admin || ['sheriff', 'leader', 'co_leader'].includes(agent.grade)
          ? [{ label: 'Archives', href: '/archives', icon: Archive }]
          : []),
        ...(agent.is_formateur || agent.is_admin || ['sheriff', 'leader', 'co_leader'].includes(agent.grade)
          ? [{ label: 'Questions recrutement', href: '/admin/recruitment-form', icon: FileText }]
          : []),
        ...(agent.is_admin || ['sheriff', 'leader', 'co_leader'].includes(agent.grade)
          ? [{ label: 'Panel admin', href: '/admin', icon: Settings }]
          : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-[240px] bg-[#050509] border-r border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] text-lg font-black shadow-lg shadow-usm-gold/35 shrink-0">
          ★
        </div>
        <div>
          <div className="font-bold text-base text-text leading-tight">US Marshals</div>
          <div className="text-[10.5px] text-usm-gold font-medium mt-0.5">Portail interne</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2.5">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            <div className="px-3 pt-4 pb-1.5 text-[10px] text-text-faint uppercase tracking-widest font-semibold">
              {section.title}
            </div>

            {section.items.map((item, iIdx) => {
              const Icon = item.icon;
              const isActive = item.href ? pathname.startsWith(item.href) : false;
              const groupKey = `${sIdx}-${iIdx}`;
              const isOpen = openGroups[groupKey] ?? (item.children ? item.children.some(c => pathname.startsWith(c.href)) : false);

              if (item.children) {
                return (
                  <div key={iIdx} className="mb-0.5">
                    <button
                      onClick={() => setOpenGroups((s) => ({ ...s, [groupKey]: !isOpen }))}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-dim text-[13.5px] font-medium transition-colors hover:bg-white/5 hover:text-text"
                    >
                      <Icon className="w-[18px] h-[18px] text-text-faint" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 opacity-40 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </button>
                    <div
                      className="overflow-hidden transition-all"
                      style={{ maxHeight: isOpen ? '500px' : '0' }}
                    >
                      <div className="pl-7 py-1">
                        {item.children.map((child, cIdx) => {
                          const childActive = pathname.startsWith(child.href);
                          return (
                            <Link
                              key={cIdx}
                              href={child.href}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors ${
                                childActive
                                  ? 'text-usm-gold-light bg-usm-gold/[0.06]'
                                  : 'text-text-faint hover:bg-white/[0.03] hover:text-text-dim'
                              }`}
                            >
                              <span>{child.label}</span>
                              {child.badge && child.badge > 0 ? (
                                <span className="ml-auto text-[10px] text-usm-gold bg-usm-gold/10 px-1.5 py-px rounded-md font-mono">
                                  {child.badge}
                                </span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={iIdx}
                  href={item.href!}
                  className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors mb-0.5 ${
                    isActive
                      ? 'text-usm-gold-light bg-gradient-to-r from-usm-gold/[0.18] to-usm-gold/[0.04]'
                      : 'text-text-dim hover:bg-white/5 hover:text-text'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-usm-gold rounded-r shadow-[0_0_12px_rgba(212,161,58,0.5)]" />
                  )}
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-usm-gold' : 'text-text-faint'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-px rounded-full font-mono ${
                        item.badgeDanger
                          ? 'bg-usm-red text-white'
                          : 'bg-usm-gold text-[#0a0a12]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full bg-transparent border border-border text-text-dim py-2 rounded-md cursor-pointer text-[11px] flex items-center justify-center gap-1.5 transition-all hover:bg-usm-red/10 hover:text-[#ff7a82] hover:border-usm-red/40 font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}
