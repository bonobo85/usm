"use client";
import { signIn } from "next-auth/react";
import { Shield } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--fond)] p-6">
      <div className="carte w-full max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-[var(--bleu)] flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-[var(--or)]" />
        </div>
        <h1 className="titre-page mb-1">USM Portal</h1>
        <p className="text-sm text-[var(--texte-muted)] mb-6">
          United States Marshal — accès réservé
        </p>
        <button
          onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
          className="bouton-bleu w-full justify-center"
        >
          Se connecter avec Discord
        </button>
        <p className="mt-4 text-[11px] text-[var(--texte-muted)]">
          Profil + serveurs Discord & rôles
        </p>
      </div>
    </div>
  );
}
