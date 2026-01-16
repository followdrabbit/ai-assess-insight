import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardSectionProps {
  title?: string;
  subtitle?: string;
  helpTooltip?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
  animationDelay?: number;
  /** Wrap content in a card-elevated container */
  card?: boolean;
  /** Additional padding class for card content */
  cardPadding?: string;
}

export function DashboardSection({
  title,
  subtitle,
  helpTooltip,
  actions,
  className,
  children,
  animationDelay = 0,
  card = false,
  cardPadding = 'p-6',
}: DashboardSectionProps) {
  const content = card ? (
    <div className={cn("card-elevated", cardPadding)}>
      {children}
    </div>
  ) : children;

  return (
    <div 
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
        className
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`, 
        animationFillMode: 'backwards' 
      }}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {title && (
              <h3 className="text-base font-semibold">{title}</h3>
            )}
            {helpTooltip}
            {subtitle && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {subtitle}
              </span>
            )}
          </div>
          {actions}
        </div>
      )}
      {content}
    </div>
  );
}
