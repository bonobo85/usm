import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color: 'red' | 'blue' | 'green' | 'purple' | 'gold';
}

const COLOR_CLASSES = {
  red: 'stat-card-red',
  blue: 'stat-card-blue',
  green: 'stat-card-green',
  purple: 'stat-card-purple',
  gold: 'stat-card-gold',
};

export function StatCard({ label, value, delta, deltaType = 'neutral', icon: Icon, color }: StatCardProps) {
  const deltaColor =
    deltaType === 'up' ? 'text-[#5ee0a1]' : deltaType === 'down' ? 'text-[#ff8a93]' : 'text-white/70';

  return (
    <div
      className={`${COLOR_CLASSES[color]} relative overflow-hidden border rounded-xl p-5 min-h-[116px] flex flex-col justify-between`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.08) 0%, transparent 60%)',
        }}
      />
      <div className="absolute right-5 top-5 w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white backdrop-blur-sm">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div>
        <div className="text-[10.5px] text-white/70 uppercase tracking-widest font-semibold">{label}</div>
        <div className="text-[34px] font-bold text-white leading-none tracking-tight mt-2">{value}</div>
      </div>
      {delta && <div className={`text-[11.5px] mt-1.5 font-medium ${deltaColor}`}>{delta}</div>}
    </div>
  );
}
