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
      "card-elevated p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20",
      className
    )}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-primary">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {domainSwitcher}
            {onExport && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onExport}
                className="h-7 rounded-full px-3 text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                {exportLabel}
              </Button>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
