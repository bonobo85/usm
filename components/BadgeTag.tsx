"use client";
import { BADGES_META, contrastText, trierBadges } from "@/lib/constants";
import { X } from "lucide-react";

export function BadgeTag({
  code, size = "sm", onRevoke
}: { code: string; size?: "xs"|"sm"|"md"; onRevoke?: () => void }) {
  const meta = BADGES_META[code];
  if (!meta) return null;
  const sz = size === "xs" ? "text-[10px] px-1.5 py-0.5" : size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`group inline-flex items-center gap-1 uppercase tracking-wider font-semibold rounded ${sz}`}
      style={{ background: meta.couleur, color: contrastText(meta.couleur) }}
    >
      {meta.nom}
      {onRevoke && (
        <button
          onClick={onRevoke}
          className="opacity-0 group-hover:opacity-100 ml-0.5"
          title="Révoquer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export function BadgesRow({
  codes, size = "sm", onRevoke
}: { codes: string[]; size?: "xs"|"sm"|"md"; onRevoke?: (code: string) => void }) {
  const sorted = trierBadges(codes);
  if (sorted.length === 0) return <span className="text-[var(--texte-muted)] text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map(c => (
        <BadgeTag key={c} code={c} size={size} onRevoke={onRevoke ? () => onRevoke(c) : undefined} />
      ))}
    </div>
  );
}
