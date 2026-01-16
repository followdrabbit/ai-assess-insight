import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface DashboardKPICardProps {
  label: string;
  value: string | number;
  suffix?: string;
  helpTooltip?: ReactNode;
  progress?: number;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  animationDelay?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantStyles = {
  default: 'border-border',
  success: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30',
  warning: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30',
  danger: 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30',
  info: 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30',
};

export function DashboardKPICard({
  label,
  value,
  suffix = '',
  helpTooltip,
  progress,
  trend,
  subtitle,
  icon,
  className,
  onClick,
  animationDelay = 0,
  variant = 'default',
}: DashboardKPICardProps) {
  return (
    <div 
      className={cn(
        "kpi-card relative overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
        "hover:shadow-lg transition-shadow p-3 sm:p-4",
        onClick && "cursor-pointer",
        variantStyles[variant],
        className
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`, 
        animationFillMode: 'backwards' 
      }}
      onClick={onClick}
    >
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-bl-full" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-1 gap-1">
        <div className="kpi-label flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm truncate">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        {helpTooltip}
      </div>

      {/* Value */}
      <div className="kpi-value text-xl sm:text-2xl md:text-3xl">
        {value}{suffix}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="mt-3">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Trend indicator */}
      {trend && (
        <div className={cn(
          "text-sm font-medium mt-2",
          trend.isPositive === true && "text-green-600",
          trend.isPositive === false && "text-red-600",
          trend.isPositive === undefined && "text-muted-foreground"
        )}>
          {trend.value > 0 ? '+' : ''}{trend.value}{trend.label || ''}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div className="text-sm text-muted-foreground mt-2">
          {subtitle}
        </div>
      )}
    </div>
  );
}
