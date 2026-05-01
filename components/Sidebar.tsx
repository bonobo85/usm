"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Home, Users, Calendar, GraduationCap, Award, Siren,
  FileText, MessageSquare, Archive, Settings, LogOut, Menu, X,
  Sun, Moon, ChevronRight, Bell
} from "lucide-react";
import { useUser } from "@/lib/useUser";
import { useTheme } from "@/lib/useTheme";
import { Avatar } from "./Avatar";
import { RankBadge } from "./RankBadge";
import { BadgesRow } from "./BadgeTag";

export default function Sidebar() {
  const path = usePathname();
  const { user, surnom, rang, badges, peutVoirCrash, peutVoirFormateurs, hasPermission } = useUser();
  const { theme, toggle: toggleTheme, mounted } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showCrash = peutVoirCrash();
  const showForm = peutVoirFormateurs();
  const showAdmin = rang >= 7 || hasPermission("dev");

  const sections: { title?: string; items: { href: string; label: string; icon: any }[] }[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/personnel", label: "Personnel", icon: Users },
        { href: "/entrainement", label: "Entraînement", icon: Calendar },
      ]
    },
    {
      title: "Opérations",
      items: [
        ...(showForm ? [{ href: "/formateurs", label: "Formateurs", icon: GraduationCap }] : []),
        { href: "/rapports", label: "Rapports", icon: FileText },
        ...(rang >= 5 ? [{ href: "/badges", label: "Badges", icon: Award }] : []),
        ...(showCrash ? [{ href: "/crash", label: "CRASH", icon: Siren }] : []),
      ]
    },
    {
      title: "Administration",
      items: [
        ...(rang >= 5 ? [{ href: "/sanctions", label: "Retour & Sanction", icon: MessageSquare }] : []),
        ...(rang >= 6 ? [{ href: "/archives", label: "Archives", icon: Archive }] : []),
        ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
      ]
    },
  ].filter(s => s.items.length > 0);

  const NavItem = ({ href, label, icon: Icon, onClick }: any) => {
    const active = path?.startsWith(href);
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          active
            ? "bg-[var(--or)]/15 text-[var(--or)] border-l-[3px] border-[var(--or)] ml-[-1px]"
            : "text-[var(--texte-muted)] hover:text-[var(--texte)] hover:bg-[var(--fond-carte)]"
        }`}
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-[var(--or)]" : "text-[var(--texte-muted)] group-hover:text-[var(--texte)]"}`} />
        <span className="truncate">{label}</span>
        {active && <ChevronRight className="w-3 h-3 ml-auto text-[var(--or)] opacity-50" />}
      </Link>
    );
  };

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Profile card at top */}
      <div className="p-4 pb-3">
        <Link
          href={`/profil/${user?.id}`}
          onClick={onNav}
          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--fond-carte)] border border-[var(--bordure)] hover:border-[var(--or)] transition group"
        >
          <Avatar src={user?.avatar_url} name={surnom ?? "?"} size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate group-hover:text-[var(--or)] transition">
              {surnom}
            </p>
            <RankBadge level={rang} size="xs" />
            {badges.length > 0 && (
              <div className="mt-1">
                <BadgesRow codes={badges.slice(0, 3)} size="xs" />
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Logo */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <img src="/usm-logo.png" alt="USM" className="w-7 h-7 rounded-full object-cover" />
        <span className="text-[var(--or)] font-bold tracking-[0.15em] text-xs">U.S. MARSHAL</span>
      </div>

      {/* Separator */}
      <div className="mx-4 border-t border-[var(--bordure)]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--texte-muted)] font-semibold px-3 mb-1.5">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItem key={item.href} {...item} onClick={onNav} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-4 border-t border-[var(--bordure)]" />

      {/* Bottom actions */}
      <div className="p-3 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-[var(--texte-muted)] hover:text-[var(--texte)] hover:bg-[var(--fond-carte)] transition">
          <Bell className="w-[18px] h-[18px]" />
          <span>Notifications</span>
        </button>

        {mounted && (
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-[var(--texte-muted)] hover:text-[var(--texte)] hover:bg-[var(--fond-carte)] transition"
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
          </button>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-[var(--rouge)] hover:bg-[var(--rouge)]/10 transition"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[260px] bg-[var(--fond-clair)] border-r border-[var(--bordure)] z-40 transition-colors duration-300">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-[var(--fond-clair)] border-b border-[var(--bordure)] h-14 flex items-center px-4 gap-3 transition-colors duration-300">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-md text-[var(--texte-muted)] hover:text-[var(--texte)] hover:bg-[var(--fond-carte)]">
          <Menu className="w-5 h-5" />
        </button>
        <img src="/usm-logo.png" alt="USM" className="w-7 h-7 rounded-full object-cover" />
        <span className="text-[var(--or)] font-bold tracking-widest text-xs">USM</span>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/profil/${user?.id}`} className="flex items-center gap-2">
            <Avatar src={user?.avatar_url} name={surnom ?? "?"} size={28} />
            <span className="text-xs font-semibold hidden sm:inline">{surnom}</span>
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 bg-[var(--fond-clair)] border-r border-[var(--bordure)] overflow-y-auto"
            style={{ animation: "slideInLeft 0.2s ease" }}
          >
            <div className="flex items-center justify-end p-3">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md text-[var(--texte-muted)] hover:text-[var(--texte)] hover:bg-[var(--fond-carte)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent onNav={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
