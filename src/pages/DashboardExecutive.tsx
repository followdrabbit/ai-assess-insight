import { useTranslation } from 'react-i18next';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import MaturityTrendChart from '@/components/MaturityTrendChart';
import { PeriodComparisonCard } from '@/components/dashboard';
import { DomainSwitcher } from '@/components/DomainSwitcher';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { cn } from '@/lib/utils';
import { Briefcase } from 'lucide-react';

export default function DashboardExecutive() {
  const { t } = useTranslation();
  const {
    isLoading,
    questionsLoading,
    isTransitioning,
    currentDomainInfo,
    metrics,
    criticalGaps,
    roadmap,
    frameworkCoverage,
    enabledFrameworks,
    selectedFrameworkIds,
    handleFrameworkSelectionChange,
    questionsForDashboard,
    answers,
  } = useDashboardMetrics();

  if (isLoading || questionsLoading) {
    return <div className="flex items-center justify-center h-64">{t('dashboard.loading')}</div>;
  }

  return (
    <div 
      className={cn(
        "space-y-6 transition-all duration-300 ease-out",
        isTransitioning && "opacity-50 scale-[0.99] blur-[1px]"
      )}
    >
      {/* Breadcrumb */}
      <PageBreadcrumb 
        items={[
          { label: t('dashboard.dashboards'), href: '/dashboard' },
          { label: t('navigation.executive'), icon: Briefcase }
        ]} 
      />

      <ExecutiveDashboard
        metrics={metrics}
        criticalGaps={criticalGaps}
        roadmap={roadmap}
        frameworkCoverage={frameworkCoverage}
        enabledFrameworks={enabledFrameworks}
        selectedFrameworkIds={selectedFrameworkIds}
        onFrameworkSelectionChange={handleFrameworkSelectionChange}
        activeQuestions={questionsForDashboard}
        domainSwitcher={<DomainSwitcher variant="badge" />}
        securityDomainId={currentDomainInfo?.domainId || 'AI_SECURITY'}
        answers={answers}
      />

      {/* Period Comparison */}
      <PeriodComparisonCard 
        securityDomainId={currentDomainInfo?.domainId}
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" 
      />

      {/* Maturity Trend Chart */}
      <MaturityTrendChart className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100" />
    </div>
  );
}
