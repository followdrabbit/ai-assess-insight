import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import MaturityTrendChart from '@/components/MaturityTrendChart';
import { DomainSwitcher } from '@/components/DomainSwitcher';

export default function DashboardExecutive() {
  const {
    isLoading,
    questionsLoading,
    metrics,
    criticalGaps,
    roadmap,
    frameworkCoverage,
    enabledFrameworks,
    selectedFrameworkIds,
    handleFrameworkSelectionChange,
    questionsForDashboard,
  } = useDashboardMetrics();

  if (isLoading || questionsLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão estratégica para CISO e liderança de segurança
          </p>
        </div>
        <DomainSwitcher variant="badge" />
      </div>

      <ExecutiveDashboard 
        metrics={metrics}
        criticalGaps={criticalGaps}
        roadmap={roadmap}
        frameworkCoverage={frameworkCoverage}
        enabledFrameworks={enabledFrameworks}
        selectedFrameworkIds={selectedFrameworkIds}
        onFrameworkSelectionChange={handleFrameworkSelectionChange}
        activeQuestions={questionsForDashboard}
      />

      {/* Maturity Trend Chart */}
      <MaturityTrendChart className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" />
    </div>
  );
}
