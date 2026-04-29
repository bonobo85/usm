"use client";
import Navbar from "./Navbar";
import { useUser } from "@/lib/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const { estConnecte, estEnChargement } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!estEnChargement && !estConnecte) router.push("/login");
  }, [estConnecte, estEnChargement, router]);

  if (estEnChargement) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--texte-muted)]">Chargement…</div>;
  }
  if (!estConnecte) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 sm:p-6">{children}</main>
    </div>
  );
}
