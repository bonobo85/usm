"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { Bell, Crown, Megaphone, X } from "lucide-react";

type Toast = {
  id: string;
  type: "promotion" | "communique" | "info";
  titre: string;
  contenu?: string;
  timestamp: number;
  exiting?: boolean;
};

export function RealtimeNotifications() {
  const supa = useSupabase();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const channelRef = useRef<any>(null);

  const addToast = useCallback((t: Omit<Toast, "id" | "timestamp">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { ...t, id, timestamp: Date.now() };
    setToasts(prev => [...prev.slice(-4), toast]); // keep max 5

    // Auto-remove after 6s
    setTimeout(() => {
      setToasts(prev =>
        prev.map(x => x.id === id ? { ...x, exiting: true } : x)
      );
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== id));
      }, 300);
    }, 6000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev =>
      prev.map(x => x.id === id ? { ...x, exiting: true } : x)
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    // Subscribe to realtime inserts on announcements table
    const channel = supa
      .channel("announcements-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            addToast({
              type: row.type || "info",
              titre: row.titre,
              contenu: row.contenu || undefined,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supa.removeChannel(channelRef.current);
      }
    };
  }, [supa, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`carte flex items-start gap-3 shadow-xl border-l-4 ${t.exiting ? 'toast-exit' : 'toast-enter'}`}
          style={{
            borderLeftColor: t.type === "promotion" ? "var(--or)" : t.type === "communique" ? "var(--bleu)" : "var(--texte-muted)",
          }}
        >
          <div className="mt-0.5">
            {t.type === "promotion" ? (
              <Crown className="w-5 h-5 text-[var(--or)]" />
            ) : (
              <Megaphone className="w-5 h-5 text-[var(--bleu)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t.titre}</p>
            {t.contenu && (
              <p className="text-xs text-[var(--texte-muted)] mt-0.5 truncate">{t.contenu}</p>
            )}
            <p className="text-[10px] text-[var(--texte-muted)] mt-1">
              {t.type === "promotion" ? "Promotion" : t.type === "communique" ? "Communiqué" : "Information"}
            </p>
          </div>
          <button onClick={() => dismiss(t.id)} className="text-[var(--texte-muted)] hover:text-[var(--texte)] p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
