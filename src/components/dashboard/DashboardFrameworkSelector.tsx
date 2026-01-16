import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Framework } from '@/lib/frameworks';

interface DashboardFrameworkSelectorProps {
  frameworks: Framework[];
  selectedIds: string[];
  onToggle: (frameworkId: string) => void;
  helpTooltip?: ReactNode;
  className?: string;
}

export function DashboardFrameworkSelector({
  frameworks,
  selectedIds,
  onToggle,
  helpTooltip,
  className,
}: DashboardFrameworkSelectorProps) {
  const selectionCount = selectedIds.length;
  
  return (
    <div className={cn("border-t pt-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium">Frameworks em Análise</span>
        {helpTooltip}
        <span className="text-xs text-muted-foreground">
          ({selectionCount === 0 ? 'Todos' : `${selectionCount} selecionados`})
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {frameworks.map(fw => {
          const isSelected = selectionCount === 0 || selectedIds.includes(fw.frameworkId);
          return (
            <Badge
              key={fw.frameworkId}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md",
                isSelected 
                  ? "bg-primary hover:bg-primary/90" 
                  : "opacity-50 hover:opacity-100 hover:border-primary/50"
              )}
              onClick={() => onToggle(fw.frameworkId)}
            >
              {fw.shortName}
            </Badge>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Clique nos frameworks acima para filtrar os dados exibidos.
        {selectionCount > 0 && ` (${selectionCount} selecionados)`}
      </p>
    </div>
  );
}
