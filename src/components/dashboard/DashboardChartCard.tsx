import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardChartCardProps {
  title?: string;
  subtitle?: string;
  helpTooltip?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  animationDelay?: number;
}

export function DashboardChartCard({
  title,
  subtitle,
  helpTooltip,
  actions,
  className,
  children,
  onClick,
  animationDelay = 0,
}: DashboardChartCardProps) {
  return (
    <Card 
      className={cn(
        "p-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
        onClick && "cursor-pointer hover:shadow-lg transition-shadow",
        className
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`, 
        animationFillMode: 'backwards' 
      }}
      onClick={onClick}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {title && (
              <h4 className="text-sm font-semibold">{title}</h4>
            )}
            {helpTooltip}
          </div>
          {actions}
        </div>
      )}
      {subtitle && (
        <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      )}
      {children}
    </Card>
  );
}
