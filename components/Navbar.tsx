"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Shield, Home, Users, Calendar, GraduationCap, Award, Siren,
  ChevronDown, FileText, MessageSquare, Folder, Archive, Settings, Bell, LogOut, Menu, X
} from "lucide-react";
import { useUser } from "@/lib/useUser";
import { Avatar } from "./Avatar";
import { RankBadge } from "./RankBadge";

export default function Navbar() {
  const path = usePathname();
  const { user, surnom, rang, peutVoirCrash, peutVoirFormateurs, hasPermission } = useUser();
  const [openMore, setOpenMore] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [openProfil, setOpenProfil] = useState(false);

  const showCrash = peutVoirCrash();
  const showForm = peutVoirFormateurs();
  const showAdmin = rang >= 7 || hasPermission("dev");

  const main = [
    { href: "/dashboard",  label: "Dashboard",   icon: Home },
    { href: "/personnel",  label: "Personnel",   icon: Users },
    { href: "/entrainement", label: "Entraînement", icon: Calendar },
    showForm  && { href: "/formateurs", label: "Formateurs", icon: GraduationCap },
    rang >= 5 && { href: "/badges", label: "Badges", icon: Award },
    showCrash && { href: "/crash", label: "CRASH", icon: Siren }
  ].filter(Boolean) as { href: string; label: string; icon: any }[];

  const more = [
    { href: "/rapports", label: "Rapports", icon: FileText, show: rang >= 1 },
    { href: "/sanctions", label: "Retour & Sanction", icon: MessageSquare, show: rang >= 5 },
    { href: "/archives", label: "Archives", icon: Archive, show: rang >= 6 },
    { href: "/admin", label: "Admin", icon: Settings, show: showAdmin },
  ].filter(m => m.show);

  const Item = ({ href, label, icon: Icon }: any) => (
    <Link
      href={href}
      onClick={() => setOpenMobile(false)}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
        path?.startsWith(href)
          ? "bg-[var(--bleu)] text-white"
          : "text-[var(--texte-muted)] hover:text-white hover:bg-[var(--fond-clair)]"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 bg-[var(--fond-clair)] border-b border-[var(--bordure)]">
      <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-[var(--or)] font-bold">
          <Shield className="w-5 h-5" />
          <span className="hidden sm:inline tracking-widest text-sm">USM</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {main.map(m => <Item key={m.href} {...m} />)}
          {more.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOpenMore(o => !o)}
                className="flex items-center gap-1 px-3 py-2 rounded-md text-sm text-[var(--texte-muted)] hover:text-white hover:bg-[var(--fond-clair)]"
              >
                Plus <ChevronDown className="w-4 h-4" />
              </button>
              {openMore && (
                <div
                  onMouseLeave={() => setOpenMore(false)}
                  className="absolute top-full left-0 mt-1 w-56 carte p-1 z-50"
                >
                  {more.map(m => (
                    <Link
                      key={m.href}
                      href={m.href}
                      onClick={() => setOpenMore(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--texte-muted)] hover:text-white hover:bg-[var(--bleu)]"
                    >
                      <m.icon className="w-4 h-4" /> {m.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button className="p-2 rounded-md text-[var(--texte-muted)] hover:text-white hover:bg-[var(--fond-carte)]">
            <Bell className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setOpenProfil(o => !o)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--fond-carte)]"
            >
              <Avatar src={user?.avatar_url} name={surnom ?? "?"} size={28} />
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-xs font-semibold leading-none">{surnom}</span>
                <RankBadge level={rang} size="xs" />
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--texte-muted)]" />
            </button>
            {openProfil && (
              <div
                onMouseLeave={() => setOpenProfil(false)}
                className="absolute right-0 top-full mt-1 w-56 carte p-1 z-50"
              >
                <Link
                  href={`/profil/${user?.id}`}
                  onClick={() => setOpenProfil(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-[var(--bleu)]"
                >
                  <Users className="w-4 h-4" /> Mon profil
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--rouge)] hover:bg-[var(--rouge)] hover:text-white"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
            )}
          </div>

          <button
            className="lg:hidden p-2 rounded-md text-[var(--texte-muted)] hover:text-white hover:bg-[var(--fond-carte)]"
            onClick={() => setOpenMobile(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[var(--fond)] p-4">
          <div className="flex justify-between mb-4">
            <span className="text-[var(--or)] font-bold tracking-widest flex items-center gap-2">
              <Shield className="w-5 h-5" /> USM
            </span>
            <button onClick={() => setOpenMobile(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {[...main, ...more].map(m => <Item key={m.href} {...m} />)}
          </div>
        </div>
      )}
    </header>
  );
}
