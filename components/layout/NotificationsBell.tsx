'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils/format';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  userId: string;
  initialUnreadCount?: number;
}

const TYPE_COLORS: Record<string, string> = {
  disciplinary_request: 'border-l-usm-red',
  disciplinary_applied: 'border-l-usm-red',
  disciplinary_rejected: 'border-l-text-faint',
  application_accepted: 'border-l-[#5ee0a1]',
  application_rejected: 'border-l-usm-red',
  badge_validated: 'border-l-usm-gold',
  ticket_assigned: 'border-l-usm-blue',
  ticket_reply: 'border-l-usm-blue',
  ticket_closed: 'border-l-text-faint',
  announcement: 'border-l-usm-gold-light',
  grade_change: 'border-l-usm-gold',
};

export function NotificationsBell({ userId, initialUnreadCount = 0 }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch initial du count au mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ count }) => {
        if (count !== null) setUnreadCount(count);
      });
  }, [userId]);

  // Fermer au clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Charger les notifications quand on ouvre
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setNotifications(data || []);
        setLoading(false);
      });
  }, [open, userId]);

  // Realtime : refresh count toutes les 30s tant qu'on est sur la page
  useEffect(() => {
    const interval = setInterval(async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    }, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((n) => n.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllAsRead() {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications((n) => n.map((notif) => ({ ...notif, is_read: true })));
    setUnreadCount(0);
  }

  async function handleClick(notif: Notification) {
    if (!notif.is_read) await markAsRead(notif.id);
    setOpen(false);
    if (notif.link_url) {
      router.push(notif.link_url);
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative w-[30px] h-[30px] rounded-md border border-transparent flex items-center justify-center cursor-pointer text-text-dim transition-all hover:text-text hover:bg-panel"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-usm-red flex items-center justify-center text-[9px] font-bold text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] w-[380px] max-h-[480px] bg-panel border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-usm-gold-light hover:text-usm-gold flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3 h-3" /> Tout marquer lu
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-text-faint text-sm">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-text-faint text-sm">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <div>Aucune notification</div>
              </div>
            ) : (
              <ul className="divide-y divide-border-soft">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-panel-2 transition-colors border-l-2 ${
                        TYPE_COLORS[n.type] || 'border-l-text-faint'
                      } ${!n.is_read ? 'bg-usm-gold/[0.03]' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] ${!n.is_read ? 'font-semibold text-text' : 'text-text-dim'}`}>
                              {n.title}
                            </span>
                            {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-usm-gold shrink-0" />}
                          </div>
                          {n.content && (
                            <div className="text-[11.5px] text-text-faint mt-0.5 line-clamp-2">{n.content}</div>
                          )}
                          <div className="text-[10px] text-text-faint/70 mt-1">
                            {timeAgo(n.created_at)}
                          </div>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            className="text-text-faint hover:text-text p-1"
                            aria-label="Marquer comme lue"
                            title="Marquer comme lue"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
