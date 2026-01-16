import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { RoadmapItem } from '@/lib/scoring';
import { DashboardSection } from './DashboardSection';
import { ReactNode } from 'react';

interface DashboardRoadmapGridProps {
  items: RoadmapItem[];
  title?: string;
  subtitle?: string;
  helpTooltip?: ReactNode;
  animationDelay?: number;
  className?: string;
  /** Priority configuration for each column */
  columnConfig?: {
    immediate: { label: string };
    short: { label: string };
    medium: { label: string };
  };
  /** Max items per column */
  maxItemsPerColumn?: number;
}

const defaultColumnConfig = {
  immediate: { label: '0-30 dias' },
  short: { label: '30-60 dias' },
  medium: { label: '60-90 dias' },
};

const priorityStyles = {
  immediate: { 
    color: 'border-red-500', 
    bg: 'bg-red-50 dark:bg-red-950/20',
    dotColor: 'bg-red-500' 
  },
  short: { 
    color: 'border-amber-500', 
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    dotColor: 'bg-amber-500' 
  },
  medium: { 
    color: 'border-blue-500', 
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    dotColor: 'bg-blue-500' 
  },
};

export function DashboardRoadmapGrid({
  items,
  title = 'Roadmap Estratégico',
  subtitle,
  helpTooltip,
  animationDelay = 300,
  className,
  columnConfig = defaultColumnConfig,
  maxItemsPerColumn = 5,
}: DashboardRoadmapGridProps) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return null;
  }

  const legendActions = (
    <div className="flex gap-2 text-xs">
      {(['immediate', 'short', 'medium'] as const).map((priority) => (
        <span key={priority} className="flex items-center gap-1">
          <div className={cn("w-2 h-2 rounded-full", priorityStyles[priority].dotColor)} />
          {columnConfig[priority].label}
        </span>
      ))}
    </div>
  );

  return (
    <DashboardSection
      title={title}
      subtitle={subtitle}
      helpTooltip={helpTooltip}
      actions={legendActions}
      animationDelay={animationDelay}
      card
      className={className}
    >
      <div className="grid md:grid-cols-3 gap-4">
        {(['immediate', 'short', 'medium'] as const).map((priority, idx) => {
          const columnItems = items.filter(r => r.priority === priority);
          const style = priorityStyles[priority];
          const config = columnConfig[priority];

          return (
            <div
              key={priority}
              className={cn(
                "rounded-lg p-4 border-l-4 animate-in fade-in-0 slide-in-from-left-4 duration-400",
                style.color,
                style.bg
              )}
              style={{ animationDelay: `${animationDelay + 50 + idx * 100}ms`, animationFillMode: 'backwards' }}
            >
              <h4 className="font-medium text-sm mb-3">{config.label}</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {columnItems.length > 0 ? (
                  columnItems.slice(0, maxItemsPerColumn).map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="text-xs cursor-pointer hover:bg-muted/50 p-1.5 rounded -mx-1.5 transition-colors group"
                      onClick={() => navigate(`/assessment?questionId=${item.questionId}`)}
                    >
                      <p className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {item.action}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {item.domain} · {item.ownershipType}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma ação pendente</p>
                )}
                {columnItems.length > maxItemsPerColumn && (
                  <p className="text-xs text-primary font-medium">
                    +{columnItems.length - maxItemsPerColumn} mais itens
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardSection>
  );
}
