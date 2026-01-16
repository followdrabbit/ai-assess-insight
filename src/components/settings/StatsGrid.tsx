import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  suffix?: string;
  prefix?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  variant?: 'cards' | 'inline' | 'compact';
  className?: string;
}

const colorClasses: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
};

const iconBgClasses: Record<string, string> = {
  default: 'bg-muted',
  primary: 'bg-primary/10',
  success: 'bg-green-100 dark:bg-green-900/30',
  warning: 'bg-amber-100 dark:bg-amber-900/30',
  destructive: 'bg-destructive/10',
  muted: 'bg-muted/50',
};

export function StatsGrid({ 
  stats, 
  columns = 4, 
  variant = 'cards',
  className 
}: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  if (variant === 'inline') {
    return (
      <div className={cn("flex flex-wrap items-center gap-4 sm:gap-6", className)}>
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={cn(
              "flex flex-col",
              index > 0 && "border-l border-border pl-4 sm:pl-6"
            )}
          >
            <div className={cn(
              "text-xl sm:text-2xl font-bold",
              colorClasses[stat.color || 'default']
            )}>
              {stat.prefix}{stat.value}{stat.suffix}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-wrap gap-3", className)}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
            >
              {Icon && (
                <div className={cn(
                  "p-1.5 rounded",
                  iconBgClasses[stat.color || 'default']
                )}>
                  <Icon className={cn("h-3.5 w-3.5", colorClasses[stat.color || 'default'])} />
                </div>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  "text-lg font-semibold",
                  colorClasses[stat.color || 'default']
                )}>
                  {stat.prefix}{stat.value}{stat.suffix}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: cards variant
  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="card-interactive">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={cn(
                    "text-2xl font-bold",
                    colorClasses[stat.color || 'default']
                  )}>
                    {stat.prefix}{stat.value}{stat.suffix}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stat.label}
                  </div>
                  {stat.trend && (
                    <div className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      stat.trend.isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      <span>{stat.trend.isPositive ? '↑' : '↓'}</span>
                      <span>{Math.abs(stat.trend.value)}%</span>
                    </div>
                  )}
                </div>
                {Icon && (
                  <div className={cn(
                    "p-2 rounded-lg",
                    iconBgClasses[stat.color || 'default']
                  )}>
                    <Icon className={cn("h-4 w-4", colorClasses[stat.color || 'default'])} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Helper to create common stat configurations
export const createStat = (
  label: string, 
  value: number | string, 
  options?: Partial<StatItem>
): StatItem => ({
  label,
  value,
  ...options,
});

// Preset stat configurations
export const createTotalStat = (value: number, label = 'Total'): StatItem => ({
  label,
  value,
  color: 'default',
});

export const createActiveStat = (value: number, label = 'Ativos'): StatItem => ({
  label,
  value,
  color: 'success',
});

export const createDisabledStat = (value: number, label = 'Desabilitados'): StatItem => ({
  label,
  value,
  color: 'muted',
});

export const createCustomStat = (value: number, label = 'Personalizados'): StatItem => ({
  label,
  value,
  color: 'primary',
});

export const createFilteredStat = (value: number, label = 'Exibindo'): StatItem => ({
  label,
  value,
  color: 'default',
});
