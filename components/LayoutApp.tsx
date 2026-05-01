"use client";
import Navbar from "./Navbar";
import { RealtimeNotifications } from "./RealtimeNotifications";
import { useUser } from "@/lib/useUser";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const { estConnecte, estEnChargement, rang } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!estEnChargement && !estConnecte) router.push("/login");
  }, [estConnecte, estEnChargement, router]);

  // BCSO (rank 1) redirect to waiting page
  useEffect(() => {
    if (!estEnChargement && estConnecte && rang === 1) {
      const allowed = ["/dashboard", "/profil", "/bcso"];
      const isAllowed = allowed.some(p => pathname?.startsWith(p));
      if (!isAllowed) {
        router.push("/bcso");
      }
    }
  }, [estEnChargement, estConnecte, rang, pathname, router]);

  if (estEnChargement) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--texte-muted)]">Chargement…</div>;
  }
  if (!estConnecte) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <RealtimeNotifications />
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 sm:p-6">{children}</main>
    </div>
  );
}
