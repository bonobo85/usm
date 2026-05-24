interface CardProps {
  title?: string;
  emoji?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, emoji, action, children, className = '' }: CardProps) {
  return (
    <div className={`bg-panel border border-border rounded-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            {emoji && <span className="text-base">{emoji}</span>}
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className={title ? 'px-4 pb-4' : 'p-4'}>{children}</div>
    </div>
  );
}
