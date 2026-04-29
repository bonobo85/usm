"use client";
import LayoutApp from "@/components/LayoutApp";
import { Clock } from "lucide-react";

export default function BcsoPage() {
  return (
    <LayoutApp>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="carte text-center max-w-lg">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--bleu)]/20 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-[var(--bleu)]" />
          </div>
          <h1 className="titre-page mb-2">En attente de permissions</h1>
          <p className="text-sm text-[var(--texte-muted)] mb-4">
            Votre compte est actuellement au rang <strong className="text-[var(--texte)]">BCSO</strong>. 
            Vous êtes en attente de validation par un membre du commandement.
          </p>
          <p className="text-xs text-[var(--texte-muted)]">
            Un Co-Leader ou supérieur doit promouvoir votre compte pour accéder à l&apos;ensemble du portail.
          </p>
          <div className="mt-6 p-3 rounded-lg bg-[var(--fond)] border border-[var(--bordure)]">
            <p className="text-xs text-[var(--texte-muted)]">
              En attendant, vous pouvez consulter votre profil et le tableau de bord.
            </p>
          </div>
        </div>
      </div>
    </LayoutApp>
  );
}
