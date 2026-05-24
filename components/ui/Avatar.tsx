import { getInitials } from '@/lib/utils/format';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'gold' | 'red' | 'blue';
  className?: string;
}

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-2xl',
};

const VARIANTS = {
  gold: 'from-usm-gold to-usm-gold-dark text-[#0a0a12]',
  red: 'from-usm-red-bright to-[#6b1418] text-white',
  blue: 'from-[#5865f2] to-[#404eed] text-white',
};

export function Avatar({ src, name, size = 'md', variant = 'gold', className = '' }: AvatarProps) {
  const initials = getInitials(name || 'Agent');

  return (
    <div
      className={`${SIZES[size]} rounded-full bg-gradient-to-br ${VARIANTS[variant]} flex items-center justify-center font-bold flex-shrink-0 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || 'Avatar'} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
