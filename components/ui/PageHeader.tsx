interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  emoji?: string;
}

export function PageHeader({ title, subtitle, actions, emoji }: PageHeaderProps) {
  return (
    <div className="flex items-end gap-5 mb-6 pb-4 border-b border-border">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight leading-none flex items-center gap-3">
          {emoji && <span className="text-2xl">{emoji}</span>}
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-text-faint font-mono mt-1.5 tracking-wide">
            // {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="ml-auto flex gap-2">{actions}</div>}
    </div>
  );
}
