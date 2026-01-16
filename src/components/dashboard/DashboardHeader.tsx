import { ReactNode } from 'react';
import { Download, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  domainSwitcher?: ReactNode;
  onExport?: () => void;
  exportLabel?: string;
  className?: string;
  children?: ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  icon: Icon,
  domainSwitcher,
  onExport,
  exportLabel = 'Exportar Relatório',
  className,
  children,
}: DashboardHeaderProps) {
  return (
    <div className={cn(
      "card-elevated p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20",
      className
    )}>
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Title row */}
          <div className="flex items-start sm:items-center gap-3">
            {Icon && (
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-primary truncate">{title}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{subtitle}</p>
            </div>
          </div>
          {/* Actions row - stacks on mobile */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {domainSwitcher}
            {onExport && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onExport}
                className="h-7 rounded-full px-2 sm:px-3 text-xs gap-1 sm:gap-1.5"
              >
                <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden xs:inline">{exportLabel}</span>
                <span className="xs:hidden">Export</span>
              </Button>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
