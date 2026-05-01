"use client";
import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

const SIZES = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

export function Modal({
  open, onClose, title, children, size = "md", footer
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: keyof typeof SIZES;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${SIZES[size]} max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--bordure)] bg-[var(--fond-clair)] shadow-2xl`}
        style={{ animation: "modalIn 0.2s ease" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--bordure)] bg-[var(--fond-clair)] rounded-t-xl">
          {title && <h2 className="text-lg font-semibold text-[var(--texte)]">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-md text-[var(--texte-muted)] hover:text-[var(--texte)] hover:bg-[var(--fond-carte)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 px-6 py-4 border-t border-[var(--bordure)] bg-[var(--fond-clair)] flex justify-end gap-2 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
