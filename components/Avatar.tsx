"use client";
import Image from "next/image";

export function Avatar({
  src, name, size = 40, className = ""
}: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size / 2.4 }}
      className={`rounded-full bg-[var(--bleu)] text-white font-semibold flex items-center justify-center ${className}`}
    >
      {initial}
    </div>
  );
}
