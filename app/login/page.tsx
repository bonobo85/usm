"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--fond)] p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--bleu)] opacity-[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[var(--or)] opacity-[0.04] rounded-full blur-[100px]" />
      </div>
      <div className="carte w-full max-w-md text-center relative z-10">
        <img
          src="/usm-logo.png"
          alt="USM Logo"
          className="mx-auto w-24 h-24 rounded-full object-cover mb-6 ring-2 ring-[var(--or)] shadow-lg shadow-[var(--or)]/20"
        />
        <h1 className="text-3xl font-bold tracking-[0.1em] text-[var(--or)] mb-1">U.S. MARSHAL</h1>
        <p className="text-sm text-[var(--texte-muted)] mb-8">
          Portail USM - BCSO RévoRP
        </p>
        <button
          onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          Se connecter avec Discord
        </button>
        <p className="mt-4 text-[11px] text-[var(--texte-muted)]">
          Profil + serveurs Discord & rôles
        </p>
      </div>
    </div>
  );
}
