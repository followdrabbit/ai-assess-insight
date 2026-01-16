import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardKPIGridProps {
  columns?: 2 | 3 | 4 | 5;
  className?: string;
  children: ReactNode;
}

const columnClasses = {
  2: 'grid-cols-1 xs:grid-cols-2',
  3: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-5',
};

export function DashboardKPIGrid({
  columns = 4,
  className,
  children,
}: DashboardKPIGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      columnClasses[columns],
      className
    )}>
      {children}
    </div>
  );
}
