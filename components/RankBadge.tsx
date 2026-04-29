"use client";
import { getRang, contrastText } from "@/lib/constants";

export function RankBadge({ level, size = "sm" }: { level: number; size?: "xs"|"sm"|"md" }) {
  const r = getRang(level);
  const sz = size === "xs" ? "text-[10px] px-1.5 py-0.5" : size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`uppercase tracking-wider font-semibold rounded ${sz}`}
      style={{ background: r.couleur, color: contrastText(r.couleur) }}
    >
      {r.nom}
    </span>
  );
}

const STATUT_COLOR: Record<string, string> = {
  disponible: "#2D8B4E",
  occupe: "#C9994F",
  absent: "#B32134",
  hors_ligne: "#4A5670"
};

export function StatusDot({ statut }: { statut: string }) {
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: STATUT_COLOR[statut] ?? "#4A5670" }} />;
}
