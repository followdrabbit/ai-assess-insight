import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CriticalGap } from '@/lib/scoring';
import { useState } from 'react';

interface DashboardGapsListProps {
  gaps: CriticalGap[];
  maxVisible?: number;
  showDomain?: boolean;
  showSubcategory?: boolean;
  className?: string;
  emptyMessage?: string;
}

const criticalityColors: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
};

const criticalityLabels: Record<string, string> = {
  Critical: 'Crítico',
  High: 'Alto',
  Medium: 'Médio',
  Low: 'Baixo',
};

export function DashboardGapsList({
  gaps,
  maxVisible = 5,
  showDomain = true,
  showSubcategory = true,
  className,
  emptyMessage = 'Nenhum gap crítico identificado.',
}: DashboardGapsListProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const visibleGaps = expanded ? gaps : gaps.slice(0, maxVisible);
  const hasMore = gaps.length > maxVisible;

  const handleNavigateToQuestion = (questionId: string) => {
    navigate(`/assessment?questionId=${questionId}`);
  };

  if (gaps.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {visibleGaps.map((gap, index) => (
        <Card 
          key={gap.questionId}
          className={cn(
            "p-4 hover:shadow-md transition-all cursor-pointer group",
            "animate-in fade-in-0 slide-in-from-left-4 duration-300"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => handleNavigateToQuestion(gap.questionId)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", criticalityColors[gap.criticality])}
                >
                  {criticalityLabels[gap.criticality] || gap.criticality}
                </Badge>
                {showDomain && gap.domainName && (
                  <Badge variant="secondary" className="text-xs">
                    {gap.domainName}
                  </Badge>
                )}
                {showSubcategory && gap.subcatName && (
                  <span className="text-xs text-muted-foreground truncate">
                    {gap.subcatName}
                  </span>
                )}
              </div>
              <p className="text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {gap.questionText}
              </p>
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
              Mostrar mais ({gaps.length - maxVisible} restantes)
            </>
          )}
        </Button>
      )}
    </div>
  );
}
