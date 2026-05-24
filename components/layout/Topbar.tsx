import type { Agent } from '@/lib/types';
import { getInitials } from '@/lib/utils/format';
import { SearchBar } from './SearchBar';
import { NotificationsBell } from './NotificationsBell';

interface TopbarProps {
  agent: Agent;
  unreadNotifications?: number;
  breadcrumb?: { label: string; href?: string }[];
}

export function Topbar({ agent, unreadNotifications = 0, breadcrumb }: TopbarProps) {
  const displayName = agent.pseudo_rp || agent.discord_username || 'Agent';
  const avatarUrl = agent.photo_url || agent.discord_avatar_url;

  return (
    <header className="h-[52px] border-b border-border flex items-center px-6 gap-4 bg-bg">
      <SearchBar />

      <div className="text-[13px] text-text-faint font-medium">
        {breadcrumb && breadcrumb.length > 0 ? (
          breadcrumb.map((b, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-2">/</span>}
              {i === breadcrumb.length - 1 ? (
                <strong className="text-text font-semibold">{b.label}</strong>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))
        ) : (
          <strong className="text-text font-semibold">Portail USM</strong>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <NotificationsBell userId={agent.id} initialUnreadCount={unreadNotifications} />

        <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-panel border border-border rounded-full transition-colors hover:border-usm-gold-dark">
          <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] font-bold text-[10.5px] overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <span className="text-[13px] font-medium">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
