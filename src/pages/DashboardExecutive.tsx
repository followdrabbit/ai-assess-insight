import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, generateRoadmap } from '@/lib/scoring';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';

export default function DashboardExecutive() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers, 0.5), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers), [answers]);
  const roadmap = useMemo(() => generateRoadmap(answers, 10), [answers]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão estratégica para CISO e liderança de segurança
        </p>
      </div>

      {answers.size === 0 && (
        <div className="card-elevated p-6 text-center">
          <p className="text-muted-foreground mb-4">Nenhuma avaliação realizada ainda.</p>
          <button 
            onClick={() => navigate('/assessment')}
            className="text-primary hover:underline font-medium"
          >
            Iniciar avaliação
          </button>
        </div>
      )}

      <ExecutiveDashboard 
        metrics={metrics}
        criticalGaps={criticalGaps}
        roadmap={roadmap}
        frameworkCoverage={frameworkCoverage}
      />
    </div>
  );
}
