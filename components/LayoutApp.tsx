"use client";
import Sidebar from "./Sidebar";
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
    <div className="min-h-screen">
      <Sidebar />
      <RealtimeNotifications />
      {/* Content: offset left on desktop for the fixed sidebar */}
      <main className="lg:ml-[260px] min-h-screen">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
