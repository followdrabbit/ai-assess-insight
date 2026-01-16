import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardChartsGridProps {
  columns?: 1 | 2 | 3;
  className?: string;
  children: ReactNode;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
};

export function DashboardChartsGrid({
  columns = 2,
  className,
  children,
}: DashboardChartsGridProps) {
  return (
    <div className={cn(
      "grid gap-6",
      columnClasses[columns],
      className
    )}>
      {children}
    </div>
  );
}
