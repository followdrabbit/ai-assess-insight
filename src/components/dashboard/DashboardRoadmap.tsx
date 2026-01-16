import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { RoadmapItem } from '@/lib/scoring';
import { useState } from 'react';

interface DashboardRoadmapProps {
  items: RoadmapItem[];
  maxVisible?: number;
  className?: string;
  emptyMessage?: string;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export function DashboardRoadmap({
  items,
  maxVisible = 5,
  className,
  emptyMessage = 'Nenhum item de roadmap disponível.',
}: DashboardRoadmapProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  const handleNavigateToQuestion = (questionId: string) => {
    navigate(`/assessment?questionId=${questionId}`);
  };

  if (items.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Target className="h-8 w-8 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {visibleItems.map((item, index) => (
        <Card 
          key={item.questionId}
          className={cn(
            "p-4 hover:shadow-md transition-all cursor-pointer group",
            "animate-in fade-in-0 slide-in-from-left-4 duration-300"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => handleNavigateToQuestion(item.questionId)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", priorityColors[item.priority])}
                >
                  {priorityLabels[item.priority] || item.priority}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {item.domain}
                </span>
              </div>
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {item.action}
              </p>
              
              {/* Impact and effort indicators */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Impacto: <strong>{item.impact}</strong></span>
                <span>Esforço: <strong>{item.effort}</strong></span>
                <span className="text-primary">{item.timeframe}</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </Card>
      ))}

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Mostrar mais ({items.length - maxVisible} restantes)
            </>
          )}
        </Button>
      )}
    </div>
  );
}
