"use client";
import { ReactNode } from "react";
import { useUser } from "@/lib/useUser";
import { Lock } from "lucide-react";

export function AccesRefuse({ message }: { message?: string }) {
  return (
    <div className="carte text-center max-w-lg mx-auto mt-12">
      <Lock className="w-10 h-10 mx-auto text-[var(--rouge)] mb-3" />
      <h2 className="titre-page mb-1">Accès refusé</h2>
      <p className="text-sm text-[var(--texte-muted)]">
        {message ?? "Vous n'avez pas les autorisations requises pour cette section."}
      </p>
    </div>
  );
}

export function PermissionGate({
  children, rangMin, permission, condition
}: {
  children: ReactNode;
  rangMin?: number;
  permission?: string;
  condition?: boolean;
}) {
  const { rang, hasPermission, estEnChargement, estConnecte } = useUser();
  if (estEnChargement) return <div className="text-center text-[var(--texte-muted)] mt-12">Chargement…</div>;
  if (!estConnecte) return <AccesRefuse message="Connexion requise." />;
  if (rangMin !== undefined && rang < rangMin) return <AccesRefuse />;
  if (permission && !hasPermission(permission)) return <AccesRefuse />;
  if (condition === false) return <AccesRefuse />;
  return <>{children}</>;
}
