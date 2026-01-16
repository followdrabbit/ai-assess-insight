import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Download } from 'lucide-react';
import { DomainSwitcher } from '@/components/DomainSwitcher';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { cn } from '@/lib/utils';
import MaturityTrendChart from '@/components/MaturityTrendChart';
import { DomainSpecificIndicators } from '@/components/DomainSpecificIndicators';
import { 
  MaturityScoreHelp, 
  CoverageHelp, 
  EvidenceReadinessHelp,
  FrameworkCategoryHelp,
  OwnershipHelp,
  DomainMetricsHelpAware,
  DomainCriticalGapsHelp,
  DomainRoadmapHelp,
} from '@/components/HelpTooltip';
import { domains } from '@/lib/dataset';
import { frameworkCategoryLabels, frameworkCategoryColors, FrameworkCategoryId } from '@/lib/frameworkCategories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Framework, getQuestionFrameworkIds } from '@/lib/frameworks';
import { downloadHtmlReport } from '@/lib/htmlReportExport';
import {
  DashboardHeader,
  DashboardFrameworkSelector,
  DashboardKPIGrid,
  DashboardKPICard,
  DashboardSection,
  DashboardRoadmapGrid,
  PeriodComparisonCard,
} from '@/components/dashboard';

// Framework category labels and colors imported from shared lib

type StatusFilter = 'all' | 'incomplete' | 'at-risk' | 'on-track';
type SortField = 'name' | 'coverage' | 'maturity' | 'gaps';
type SortOrder = 'asc' | 'desc';

export default function DashboardGRC() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Use centralized dashboard metrics hook
  const {
    isLoading,
    questionsLoading,
    isTransitioning,
    currentDomainInfo,
    answers,
    enabledFrameworks,
    selectedFrameworkIds,
    questionsForDashboard,
    metrics,
    criticalGaps,
    frameworkCoverage,
    roadmap,
    toggleFramework,
  } = useDashboardMetrics();

  // Filter and search states (local to this dashboard)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('gaps');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [selectedOwnership, setSelectedOwnership] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedFrameworkCategory, setSelectedFrameworkCategory] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  // Unique ownership types for filter
  const ownershipTypes = useMemo(() => {
    const types = new Set<string>();
    metrics.domainMetrics.forEach(dm => {
      dm.subcategoryMetrics.forEach(sm => {
        if (sm.ownershipType) types.add(sm.ownershipType);
      });
    });
    return Array.from(types).sort();
  }, [metrics]);

  // Helper function to determine status
  const getStatus = (coverage: number, score: number) => {
    if (coverage < 0.5) return 'incomplete';
    if (score < 0.5) return 'at-risk';
    return 'on-track';
  };

  // Filtered and sorted domain metrics
  const filteredDomainMetrics = useMemo(() => {
    let filtered = metrics.domainMetrics.filter(dm => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesDomain = dm.domainName.toLowerCase().includes(search);
        const matchesSubcat = dm.subcategoryMetrics.some(sm => 
          sm.subcatName.toLowerCase().includes(search)
        );
        if (!matchesDomain && !matchesSubcat) return false;
      }

      if (statusFilter !== 'all') {
        const status = getStatus(dm.coverage, dm.score);
        if (status !== statusFilter) return false;
      }

      if (ownershipFilter !== 'all') {
        const hasOwnership = dm.subcategoryMetrics.some(sm => 
          sm.ownershipType === ownershipFilter
        );
        if (!hasOwnership) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.domainName.localeCompare(b.domainName);
          break;
        case 'coverage':
          comparison = a.coverage - b.coverage;
          break;
        case 'maturity':
          comparison = a.score - b.score;
          break;
        case 'gaps':
          comparison = a.criticalGaps - b.criticalGaps;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [metrics.domainMetrics, searchTerm, statusFilter, ownershipFilter, sortField, sortOrder]);

  // Framework coverage filtered by selected frameworks
  const filteredFrameworkCoverage = useMemo(() => {
    // Map framework IDs to display names
    const frameworkIdToName: Record<string, string> = {
      'NIST_AI_RMF': 'NIST AI RMF',
      'ISO_27001_27002': 'ISO/IEC 27001 / 27002',
      'ISO_23894': 'ISO/IEC 23894',
      'LGPD': 'LGPD',
      'NIST_SSDF': 'NIST SSDF',
      'CSA_CCM': 'CSA AI Security',
      'CSA_AI': 'CSA AI Security',
      'OWASP_LLM': 'OWASP Top 10 for LLM Applications',
      'OWASP_API': 'OWASP API Security Top 10'
    };
    
    // Use enabled frameworks as default when no specific selection
    const effectiveFrameworkIds = selectedFrameworkIds.length > 0 
      ? selectedFrameworkIds 
      : enabledFrameworks.map(f => f.frameworkId);
    
    // Get the display names for selected/enabled frameworks
    const selectedFrameworkNames = new Set(
      effectiveFrameworkIds.map(id => frameworkIdToName[id]).filter(Boolean)
    );
    
    // Filter by selected frameworks
    let filtered = frameworkCoverage.filter(fw => 
      selectedFrameworkNames.has(fw.framework)
    );
    
    // Also apply search term if present
    if (searchTerm) {
      filtered = filtered.filter(fw => 
        fw.framework.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [frameworkCoverage, searchTerm, selectedFrameworkIds, enabledFrameworks]);

  // Summary stats for quick view
  const quickStats = useMemo(() => ({
    totalDomains: metrics.domainMetrics.length,
    incompleteCount: metrics.domainMetrics.filter(dm => getStatus(dm.coverage, dm.score) === 'incomplete').length,
    atRiskCount: metrics.domainMetrics.filter(dm => getStatus(dm.coverage, dm.score) === 'at-risk').length,
    onTrackCount: metrics.domainMetrics.filter(dm => getStatus(dm.coverage, dm.score) === 'on-track').length,
    criticalGapsCount: criticalGaps.length,
    frameworksCount: frameworkCoverage.length,
  }), [metrics.domainMetrics, criticalGaps, frameworkCoverage]);

  const toggleDomainExpanded = (domainId: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOwnershipFilter('all');
    setSortField('gaps');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || ownershipFilter !== 'all';

  const ownershipData = metrics.ownershipMetrics.map(om => ({
    name: om.ownershipType,
    score: Math.round(om.score * 100),
    coverage: Math.round(om.coverage * 100),
    total: om.totalQuestions,
    answered: om.answeredQuestions,
  }));

  // Get detailed ownership info for selected owner
  const selectedOwnershipDetails = useMemo(() => {
    if (!selectedOwnership) return null;
    
    const ownerMetric = metrics.ownershipMetrics.find(om => om.ownershipType === selectedOwnership);
    if (!ownerMetric) return null;

    // Get all subcategories for this owner
    const subcategories = metrics.domainMetrics
      .flatMap(dm => dm.subcategoryMetrics.map(sm => ({ ...sm, domainName: dm.domainName })))
      .filter(sm => sm.ownershipType === selectedOwnership);

    // Get gaps for this owner
    const gaps = criticalGaps.filter(g => g.ownershipType === selectedOwnership);

    // Get domains with this ownership
    const domains = metrics.domainMetrics.filter(dm => 
      dm.subcategoryMetrics.some(sm => sm.ownershipType === selectedOwnership)
    );

    // Calculate additional metrics
    const criticalCount = gaps.filter(g => g.criticality === 'Critical').length;
    const highCount = gaps.filter(g => g.criticality === 'High').length;
    const pendingQuestions = ownerMetric.totalQuestions - ownerMetric.answeredQuestions;

    return {
      name: selectedOwnership,
      score: Math.round(ownerMetric.score * 100),
      coverage: Math.round(ownerMetric.coverage * 100),
      totalQuestions: ownerMetric.totalQuestions,
      answeredQuestions: ownerMetric.answeredQuestions,
      pendingQuestions,
      totalGaps: gaps.length,
      criticalCount,
      highCount,
      subcategories: subcategories.sort((a, b) => a.score - b.score),
      gaps: gaps.slice(0, 10),
      domains,
    };
  }, [selectedOwnership, metrics, criticalGaps]);

  // Map framework IDs to their category IDs
  const frameworkIdToCategoryId: Record<string, FrameworkCategoryId> = {
    'NIST_AI_RMF': 'NIST_AI_RMF',
    'ISO_27001_27002': 'SECURITY_BASELINE',
    'ISO_23894': 'AI_RISK_MGMT',
    'LGPD': 'PRIVACY_LGPD',
    'NIST_SSDF': 'SECURE_DEVELOPMENT',
    'CSA_CCM': 'SECURE_DEVELOPMENT',
    'CSA_AI': 'SECURE_DEVELOPMENT',
    'OWASP_LLM': 'THREAT_EXPOSURE',
    'OWASP_API': 'THREAT_EXPOSURE'
  };

  // Get selected category IDs based on selected frameworks
  const selectedCategoryIds = useMemo(() => {
    const effectiveFrameworkIds = selectedFrameworkIds.length > 0 
      ? selectedFrameworkIds 
      : enabledFrameworks.map(f => f.frameworkId);
    
    const categoryIds = new Set<FrameworkCategoryId>();
    effectiveFrameworkIds.forEach(fwId => {
      const categoryId = frameworkIdToCategoryId[fwId];
      if (categoryId) categoryIds.add(categoryId);
    });
    return categoryIds;
  }, [selectedFrameworkIds, enabledFrameworks]);

  const frameworkCategoryData = metrics.frameworkCategoryMetrics
    .filter(fc => fc.totalQuestions > 0 && selectedCategoryIds.has(fc.categoryId))
    .map(fc => ({
      categoryId: fc.categoryId,
      name: frameworkCategoryLabels[fc.categoryId] || fc.categoryId,
      score: Math.round(fc.score * 100),
      coverage: Math.round(fc.coverage * 100),
      totalQuestions: fc.totalQuestions,
      answeredQuestions: fc.answeredQuestions,
      color: frameworkCategoryColors[fc.categoryId] || 'hsl(var(--primary))',
      maturityLevel: fc.maturityLevel,
    }));

  // Selected domain details for modal
  const selectedDomainDetails = useMemo(() => {
    if (!selectedDomain) return null;

    const domainMetrics = metrics.domainMetrics.find(dm => dm.domainId === selectedDomain);
    if (!domainMetrics) return null;

    const domainData = domains.find(d => d.domainId === selectedDomain);

    // Get all questions for this domain
    const domainQuestions = questionsForDashboard.filter(q => q.domainId === selectedDomain);

    // Calculate question-level details
    const questionDetails = domainQuestions.map(q => {
      const answer = answers.get(q.questionId);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        subcatId: q.subcatId,
        ownershipType: q.ownershipType,
        response: answer?.response || 'Não respondido',
      };
    });

    // Calculate response breakdown
    const responseBreakdown = {
      Sim: questionDetails.filter(q => q.response === 'Sim').length,
      Parcial: questionDetails.filter(q => q.response === 'Parcial').length,
      Não: questionDetails.filter(q => q.response === 'Não').length,
      NA: questionDetails.filter(q => q.response === 'NA').length,
      'Não respondido': questionDetails.filter(q => q.response === 'Não respondido').length,
    };

    // Get gaps for this domain
    const domainGaps = criticalGaps.filter(g => g.domainId === selectedDomain);

    // Group gaps by criticality
    const gapsByCriticality = {
      Critical: domainGaps.filter(g => g.criticality === 'Critical').length,
      High: domainGaps.filter(g => g.criticality === 'High').length,
      Medium: domainGaps.filter(g => g.criticality === 'Medium').length,
      Low: domainGaps.filter(g => g.criticality === 'Low').length,
    };

    return {
      ...domainMetrics,
      description: domainData?.description || '',
      questions: questionDetails,
      responseBreakdown,
      gaps: domainGaps,
      gapsByCriticality,
    };
  }, [selectedDomain, metrics.domainMetrics, domains, questionsForDashboard, answers, criticalGaps]);

  // Selected framework category details for modal
  const selectedFrameworkCategoryDetails = useMemo(() => {
    if (!selectedFrameworkCategory) return null;

    const categoryData = frameworkCategoryData.find(fc => fc.categoryId === selectedFrameworkCategory);
    if (!categoryData) return null;

    // Get questions for this category
    const categoryQuestions = questionsForDashboard.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      return questionFrameworkIds.some(fwId => {
        const catId = frameworkIdToCategoryId[fwId];
        return catId === selectedFrameworkCategory;
      });
    });

    // Calculate question details
    const questionDetails = categoryQuestions.map(q => {
      const answer = answers.get(q.questionId);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        response: answer?.response || 'Não respondido',
      };
    });

    // Response breakdown
    const responseBreakdown = {
      Sim: questionDetails.filter(q => q.response === 'Sim').length,
      Parcial: questionDetails.filter(q => q.response === 'Parcial').length,
      Não: questionDetails.filter(q => q.response === 'Não').length,
      NA: questionDetails.filter(q => q.response === 'NA').length,
      'Não respondido': questionDetails.filter(q => q.response === 'Não respondido').length,
    };

    // Get gaps for this category
    const categoryGaps = criticalGaps.filter(g => {
      const question = questionsForDashboard.find(q => q.questionId === g.questionId);
      if (!question) return false;
      const questionFrameworkIds = getQuestionFrameworkIds(question.frameworks);
      return questionFrameworkIds.some(fwId => {
        const catId = frameworkIdToCategoryId[fwId];
        return catId === selectedFrameworkCategory;
      });
    });

    return {
      ...categoryData,
      questions: questionDetails,
      responseBreakdown,
      gaps: categoryGaps,
    };
  }, [selectedFrameworkCategory, frameworkCategoryData, questionsForDashboard, answers, criticalGaps, frameworkIdToCategoryId]);

  // Selected individual framework details for modal
  const selectedFrameworkDetails = useMemo(() => {
    if (!selectedFramework) return null;

    const fwCoverage = filteredFrameworkCoverage.find(fw => fw.framework === selectedFramework);
    if (!fwCoverage) return null;

    // Get questions for this framework
    const frameworkQuestions = questionsForDashboard.filter(q => {
      return q.frameworks?.some(f => 
        f === selectedFramework || 
        selectedFramework.includes(f) || 
        f.includes(selectedFramework.split(' ')[0])
      );
    });

    // Calculate question details
    const questionDetails = frameworkQuestions.map(q => {
      const answer = answers.get(q.questionId);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        domainId: q.domainId,
        response: answer?.response || 'Não respondido',
      };
    });

    // Response breakdown
    const responseBreakdown = {
      Sim: questionDetails.filter(q => q.response === 'Sim').length,
      Parcial: questionDetails.filter(q => q.response === 'Parcial').length,
      Não: questionDetails.filter(q => q.response === 'Não').length,
      NA: questionDetails.filter(q => q.response === 'NA').length,
      'Não respondido': questionDetails.filter(q => q.response === 'Não respondido').length,
    };

    // Get gaps
    const frameworkGaps = criticalGaps.filter(g => {
      const question = questionsForDashboard.find(q => q.questionId === g.questionId);
      if (!question) return false;
      return question.frameworks?.some(f => 
        f === selectedFramework || 
        selectedFramework.includes(f) || 
        f.includes(selectedFramework.split(' ')[0])
      );
    });

    return {
      name: selectedFramework,
      score: fwCoverage.averageScore,
      coverage: fwCoverage.coverage,
      totalQuestions: fwCoverage.totalQuestions,
      answeredQuestions: fwCoverage.answeredQuestions,
      questions: questionDetails,
      responseBreakdown,
      gaps: frameworkGaps,
    };
  }, [selectedFramework, filteredFrameworkCoverage, questionsForDashboard, answers, criticalGaps]);

  // Export report handler
  const handleExportReport = () => {
    // Filter enabled frameworks by selected IDs (or use all enabled if none selected)
    const effectiveIds = selectedFrameworkIds.length > 0 ? selectedFrameworkIds : enabledFrameworks.map(f => f.frameworkId);
    const selectedFrameworks = enabledFrameworks.filter(f => effectiveIds.includes(f.frameworkId));
    
    downloadHtmlReport({
      dashboardType: 'grc',
      metrics,
      criticalGaps,
      selectedFrameworks,
      frameworkCoverage,
      frameworkCategoryData,
      generatedAt: new Date(),
      ownershipData,
      quickStats,
    });
  };

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
          { label: t('navigation.grc'), icon: Users }
        ]} 
      />

      {/* Header with Domain Switcher and Framework Selector */}
      <DashboardHeader
        title={t('dashboard.grcTitle')}
        subtitle={t('dashboard.grcSubtitle')}
        icon={Users}
        domainSwitcher={<DomainSwitcher variant="badge" />}
        onExport={handleExportReport}
      >
        <DashboardFrameworkSelector
          frameworks={enabledFrameworks}
          selectedIds={selectedFrameworkIds}
          onToggle={toggleFramework}
          helpTooltip={<FrameworkCategoryHelp />}
        />
      </DashboardHeader>


      {/* Quick Status Pills - Enhanced with animations */}
      <div className="flex flex-wrap gap-2 animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
        <Badge 
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer transition-all duration-200 hover:scale-105"
          onClick={() => setStatusFilter('all')}
        >
          {t('dashboard.all')} ({quickStats.totalDomains})
        </Badge>
        <Badge 
          variant={statusFilter === 'incomplete' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-105",
            statusFilter !== 'incomplete' && "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          )}
          onClick={() => setStatusFilter('incomplete')}
        >
          {t('dashboard.incomplete')} ({quickStats.incompleteCount})
        </Badge>
        <Badge 
          variant={statusFilter === 'at-risk' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-105",
            statusFilter !== 'at-risk' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
          )}
          onClick={() => setStatusFilter('at-risk')}
        >
          {t('dashboard.atRisk')} ({quickStats.atRiskCount})
        </Badge>
        <Badge 
          variant={statusFilter === 'on-track' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-105",
            statusFilter !== 'on-track' && "bg-green-50 text-green-700 hover:bg-green-100 border-green-300"
          )}
          onClick={() => setStatusFilter('on-track')}
        >
          {t('dashboard.onTrack')} ({quickStats.onTrackCount})
        </Badge>
      </div>

      {/* GRC KPI Cards - Standardized */}
      <DashboardKPIGrid columns={4}>
        <DashboardKPICard
          label={t('dashboard.overallCoverage')}
          value={Math.round(metrics.coverage * 100)}
          suffix="%"
          helpTooltip={<CoverageHelp />}
          progress={metrics.coverage * 100}
          subtitle={`${metrics.answeredQuestions} ${t('dashboard.of')} ${metrics.totalQuestions}`}
          animationDelay={0}
        />
        <DashboardKPICard
          label={t('dashboard.evidenceReadiness')}
          value={Math.round(metrics.evidenceReadiness * 100)}
          suffix="%"
          helpTooltip={<EvidenceReadinessHelp />}
          progress={metrics.evidenceReadiness * 100}
          subtitle={t('dashboard.forAudit')}
          animationDelay={75}
          variant="success"
        />
        <DashboardKPICard
          label={t('dashboard.overallScore')}
          value={Math.round(metrics.overallScore * 100)}
          suffix="%"
          helpTooltip={<MaturityScoreHelp />}
          subtitle={t('dashboard.recommendedGoal')}
          animationDelay={150}
          variant="warning"
        />
        <DashboardKPICard
          label={t('dashboard.criticalGaps')}
          value={quickStats.criticalGapsCount}
          helpTooltip={<DomainCriticalGapsHelp securityDomainId={currentDomainInfo?.domainId || 'AI_SECURITY'} />}
          subtitle={quickStats.criticalGapsCount > 0 ? t('dashboard.priorityActionNeeded') : t('dashboard.noCriticalGaps')}
          animationDelay={225}
          variant="danger"
        />
      </DashboardKPIGrid>

      {/* Domain-Specific Indicators */}
      <DomainSpecificIndicators 
        securityDomainId={currentDomainInfo?.domainId || 'AI_SECURITY'}
        questions={questionsForDashboard}
        answers={answers}
      />

      {/* Strategic Roadmap - Standardized */}
      <DashboardRoadmapGrid
        items={roadmap}
        title={t('dashboard.strategicRoadmap')}
        subtitle={t('dashboard.roadmapSubtitle')}
        helpTooltip={<DomainRoadmapHelp securityDomainId={currentDomainInfo?.domainId || 'AI_SECURITY'} />}
        animationDelay={300}
        maxItemsPerColumn={5}
      />

      {/* Tabs for different views */}
      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains" className="gap-1">{t('dashboard.byDomain')}</TabsTrigger>
          <TabsTrigger value="frameworks">{t('dashboard.byFramework')}</TabsTrigger>
          <TabsTrigger value="gaps">{t('dashboard.criticalGaps')}</TabsTrigger>
          <TabsTrigger value="ownership">{t('dashboard.byOwner')}</TabsTrigger>
        </TabsList>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <DashboardSection
            title={t('dashboard.domainMetrics')}
            helpTooltip={<DomainMetricsHelpAware securityDomainId={currentDomainInfo?.domainId || 'AI_SECURITY'} />}
          />
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t('dashboard.searchDomains')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('dashboard.owner')} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">{t('dashboard.allOwnersOption')}</SelectItem>
                {ownershipTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('dashboard.sortByPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="gaps">{t('dashboard.sortByGaps')}</SelectItem>
                <SelectItem value="coverage">{t('dashboard.sortByCoverage')}</SelectItem>
                <SelectItem value="maturity">{t('dashboard.sortByMaturity')}</SelectItem>
                <SelectItem value="name">{t('dashboard.sortByName')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('dashboard.clearFilters')}
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {t('dashboard.showing')} {filteredDomainMetrics.length} {t('dashboard.of')} {metrics.domainMetrics.length} {t('dashboard.byDomain').toLowerCase()}
          </div>

          {/* Domain Cards with Expandable Subcategories */}
          <div className="space-y-3">
            {filteredDomainMetrics.map((dm, idx) => {
              const status = getStatus(dm.coverage, dm.score);
              const isExpanded = expandedDomains.has(dm.domainId);
              
              // Filter subcategories based on ownership if filter is active
              const filteredSubcats = ownershipFilter !== 'all'
                ? dm.subcategoryMetrics.filter(sm => sm.ownershipType === ownershipFilter)
                : dm.subcategoryMetrics;

              return (
                <Collapsible 
                  key={dm.domainId}
                  open={isExpanded}
                  onOpenChange={() => toggleDomainExpanded(dm.domainId)}
                >
                  <div 
                    className="card-elevated overflow-hidden animate-in fade-in-0 slide-in-from-left-4 duration-400 cursor-pointer hover:border-primary/30 transition-all"
                    style={{ animationDelay: `${500 + idx * 50}ms`, animationFillMode: 'backwards' }}
                    onClick={() => setSelectedDomain(dm.domainId)}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-left">
                          <h4 className="font-medium">{dm.domainName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted">
                              {dm.nistFunction || '-'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dm.totalQuestions} {t('dashboard.questions')}
                            </span>
                            <span className="text-xs text-primary/70 ml-1">{t('dashboard.clickForDetails')}</span>
                          </div>
                        </div>
                      </div>
                        
                      <div className="flex items-center gap-6">
                        {/* Coverage */}
                        <div className="text-center min-w-[80px]">
                          <div className="text-xs text-muted-foreground mb-1">{t('dashboard.coverage')}</div>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${dm.coverage * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs">{Math.round(dm.coverage * 100)}%</span>
                          </div>
                        </div>

                        {/* Maturity */}
                        <div className="text-center min-w-[80px]">
                          <div className="text-xs text-muted-foreground mb-1">{t('dashboard.maturity')}</div>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full" 
                                style={{ 
                                  width: `${dm.score * 100}%`,
                                  backgroundColor: dm.maturityLevel.color 
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs">{Math.round(dm.score * 100)}%</span>
                          </div>
                        </div>

                        {/* Gaps */}
                        <div className="text-center min-w-[60px]">
                          <div className="text-xs text-muted-foreground mb-1">{t('dashboard.gaps')}</div>
                          <span className={cn(
                            "font-mono text-sm font-medium",
                            dm.criticalGaps > 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {dm.criticalGaps}
                          </span>
                        </div>

                        {/* Status */}
                        <span className={cn(
                          "text-xs px-2 py-1 rounded min-w-[80px] text-center",
                          status === 'incomplete' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                          status === 'at-risk' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        )}>
                          {status === 'incomplete' ? t('dashboard.incomplete') :
                           status === 'at-risk' ? t('dashboard.atRisk') : t('dashboard.adequate')}
                        </span>

                        {/* Expand indicator */}
                        <CollapsibleTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="text-muted-foreground text-lg">
                              {isExpanded ? '−' : '+'}
                            </span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t border-border bg-muted/30 p-4">
                        <div className="grid gap-2">
                          {filteredSubcats.map(sm => (
                            <div 
                              key={sm.subcatId}
                              className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{sm.subcatName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {sm.ownershipType || 'GRC'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    · {sm.answeredQuestions}/{sm.totalQuestions} {t('dashboard.questions')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={cn("criticality-badge", `criticality-${sm.criticality.toLowerCase()}`)}>
                                  {sm.criticality}
                                </span>
                                <span 
                                  className="font-mono text-sm min-w-[40px] text-right"
                                  style={{ color: sm.maturityLevel.color }}
                                >
                                  {Math.round(sm.score * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </TabsContent>

        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4">
          <div className="filter-bar">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t('dashboard.searchFrameworks')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Framework Categories */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">{t('dashboard.maturityByCategory')}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t('dashboard.clickForDetails')}</p>
              <div className="space-y-4">
                {frameworkCategoryData.map((fc, idx) => {
                  const status = fc.coverage < 50 ? 'incomplete' : 
                                 fc.score < 50 ? 'at-risk' : 'on-track';
                  return (
                    <div 
                      key={fc.categoryId} 
                      className="p-3 border border-border rounded-lg animate-in fade-in-0 slide-in-from-right-4 duration-400 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                      style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                      onClick={() => setSelectedFrameworkCategory(fc.categoryId)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{fc.name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          status === 'incomplete' ? 'bg-gray-100 text-gray-700' :
                          status === 'at-risk' ? 'bg-red-100 text-red-700' :
                          'bg-green-100 text-green-700'
                        )}>
                          {status === 'incomplete' ? 'Incompleto' :
                           status === 'at-risk' ? 'Em Risco' : 'Adequado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">Cobertura</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${fc.coverage}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs w-10">{fc.coverage}%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">{t('dashboard.maturity')}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full" 
                                style={{ 
                                  width: `${fc.score}%`,
                                  backgroundColor: fc.maturityLevel.color 
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-10">{fc.score}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {fc.answeredQuestions}/{fc.totalQuestions} {t('dashboard.questions')} {t('dashboard.answered').toLowerCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Frameworks */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">{t('dashboard.frameworkCoverage')} ({filteredFrameworkCoverage.length})</h3>
              <p className="text-xs text-muted-foreground mb-3">{t('dashboard.clickForDetails')}</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredFrameworkCoverage.map((fw, idx) => (
                  <div 
                    key={fw.framework} 
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded transition-colors animate-in fade-in-0 duration-300 cursor-pointer"
                    style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'backwards' }}
                    onClick={() => setSelectedFramework(fw.framework)}
                  >
                    <span className="text-sm truncate flex-1 mr-2" title={fw.framework}>
                      {fw.framework}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {fw.answeredQuestions}/{fw.totalQuestions}
                      </span>
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${fw.averageScore * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm w-10 text-right">
                        {Math.round(fw.averageScore * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Critical Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t('dashboard.criticalGaps')}</h3>
              <span className="text-sm text-muted-foreground">
                {criticalGaps.length} {t('dashboard.gapsIdentified').toLowerCase()}
              </span>
            </div>
            
            {criticalGaps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('dashboard.noCriticalGaps')}
              </div>
            ) : (
              <div className="space-y-3">
                {criticalGaps.slice(0, 20).map((gap, index) => (
                  <div 
                    key={gap.questionId}
                    className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            #{index + 1}
                          </span>
                          <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                            {gap.criticality}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{gap.questionText}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{gap.subcatName}</span>
                          <span>·</span>
                          <span>{gap.ownershipType}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/assessment?questionId=${gap.questionId}`)}
                      >
                        {t('dashboard.review')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Ownership Tab */}
        <TabsContent value="ownership" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold">{t('dashboard.maturityByOwner')}</h3>
                <OwnershipHelp />
              </div>
              <p className="text-xs text-muted-foreground mb-4">{t('dashboard.clickForDetails')}</p>
              <div className="space-y-4">
                {ownershipData.map((od, idx) => (
                  <div 
                    key={od.name}
                    className="p-3 border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors animate-in fade-in-0 slide-in-from-left-4 duration-400"
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                    onClick={() => setSelectedOwnership(od.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{od.name}</span>
                      <span className="font-mono text-sm">{od.score}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${od.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-24">
                        {od.answered}/{od.total} {t('dashboard.responding')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">{t('dashboard.lowReadinessSubcategories')}</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {metrics.domainMetrics
                  .flatMap(dm => dm.subcategoryMetrics)
                  .filter(sm => sm.answeredQuestions > 0 && sm.score < 0.7)
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 15)
                  .map((sm, idx) => (
                    <div 
                      key={sm.subcatId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg animate-in fade-in-0 duration-300"
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sm.subcatName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sm.ownershipType || 'GRC'} · {sm.answeredQuestions}/{sm.totalQuestions} {t('dashboard.questions')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("criticality-badge", `criticality-${sm.criticality.toLowerCase()}`)}>
                          {sm.criticality}
                        </span>
                        <span 
                          className="font-mono text-sm"
                          style={{ color: sm.maturityLevel.color }}
                        >
                          {Math.round(sm.score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Ownership Details Dialog */}
      <Dialog open={!!selectedOwnership} onOpenChange={(open) => !open && setSelectedOwnership(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t('dashboard.detailsFor', { name: selectedOwnershipDetails?.name })}
            </DialogTitle>
          </DialogHeader>

          {selectedOwnershipDetails && (
            <div className="space-y-6 mt-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: selectedOwnershipDetails.score >= 70 ? 'hsl(var(--chart-2))' : selectedOwnershipDetails.score >= 50 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))' }}>
                    {selectedOwnershipDetails.score}%
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.maturity')}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedOwnershipDetails.coverage}%
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.coverage')}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold">
                    {selectedOwnershipDetails.answeredQuestions}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.answeredCount')}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {selectedOwnershipDetails.pendingQuestions}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.pendingCount')}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{t('dashboard.assessmentProgress')}</span>
                  <span className="font-mono">{selectedOwnershipDetails.answeredQuestions}/{selectedOwnershipDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedOwnershipDetails.coverage} className="h-2" />
              </div>

              {/* Gaps Summary */}
              {selectedOwnershipDetails.totalGaps > 0 && (
                <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                  <h4 className="font-medium mb-3">{t('dashboard.gapsCount', { count: selectedOwnershipDetails.totalGaps })}</h4>
                  <div className="flex items-center gap-4 mb-4">
                    {selectedOwnershipDetails.criticalCount > 0 && (
                      <Badge variant="destructive">{selectedOwnershipDetails.criticalCount} {t('dashboard.criticals')}</Badge>
                    )}
                    {selectedOwnershipDetails.highCount > 0 && (
                      <Badge className="bg-orange-500">{selectedOwnershipDetails.highCount} {t('dashboard.highs')}</Badge>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedOwnershipDetails.gaps.map((gap, idx) => (
                      <div 
                        key={gap.questionId}
                        className="flex items-start justify-between gap-2 p-2 bg-background rounded border border-border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                          </div>
                          <p className="text-sm">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedOwnership(null);
                            navigate(`/assessment?questionId=${gap.questionId}`);
                          }}
                        >
                          {t('dashboard.review')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subcategories */}
              <div>
                <h4 className="font-medium mb-3">{t('dashboard.subcategoriesCount', { count: selectedOwnershipDetails.subcategories.length })}</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {selectedOwnershipDetails.subcategories.map(sm => (
                    <div 
                      key={sm.subcatId}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{sm.subcatName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sm.domainName} · {sm.answeredQuestions}/{sm.totalQuestions} {t('dashboard.questions')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("criticality-badge", `criticality-${sm.criticality.toLowerCase()}`)}>
                          {sm.criticality}
                        </span>
                        <span 
                          className="font-mono text-sm min-w-[40px] text-right"
                          style={{ color: sm.maturityLevel.color }}
                        >
                          {Math.round(sm.score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setOwnershipFilter(selectedOwnershipDetails.name);
                    setSelectedOwnership(null);
                  }}
                >
                  {t('dashboard.filterByOwner', { owner: selectedOwnershipDetails.name })}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Framework Category Details Modal */}
      <Dialog open={!!selectedFrameworkCategory} onOpenChange={(open) => !open && setSelectedFrameworkCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedFrameworkCategoryDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedFrameworkCategoryDetails.color }}
                  >
                    {selectedFrameworkCategoryDetails.score}%
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedFrameworkCategoryDetails.name}</DialogTitle>
                    <DialogDescription className="text-left">
                      Categoria de Framework · {selectedFrameworkCategoryDetails.maturityLevel.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: selectedFrameworkCategoryDetails.color }}>
                    {selectedFrameworkCategoryDetails.score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{selectedFrameworkCategoryDetails.coverage}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{selectedFrameworkCategoryDetails.answeredQuestions}/{selectedFrameworkCategoryDetails.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{selectedFrameworkCategoryDetails.gaps.length}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Response Breakdown */}
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Distribuição de Respostas</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedFrameworkCategoryDetails.responseBreakdown).map(([key, value]) => (
                    value > 0 && (
                      <div 
                        key={key} 
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          key === 'Sim' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          key === 'Parcial' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          key === 'Não' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          key === 'NA' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          key === 'Não respondido' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {key}: {value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Gaps List */}
              {selectedFrameworkCategoryDetails.gaps.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">
                    Gaps Identificados ({selectedFrameworkCategoryDetails.gaps.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFrameworkCategoryDetails.gaps.slice(0, 15).map((gap) => (
                      <div 
                        key={gap.questionId} 
                        className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedFrameworkCategory(null);
                            navigate(`/assessment?questionId=${gap.questionId}`);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedFrameworkCategory(null)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual Framework Details Modal */}
      <Dialog open={!!selectedFramework} onOpenChange={(open) => !open && setSelectedFramework(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedFrameworkDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold bg-primary">
                    {Math.round(selectedFrameworkDetails.score * 100)}%
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedFrameworkDetails.name}</DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedFrameworkDetails.answeredQuestions} de {selectedFrameworkDetails.totalQuestions} perguntas
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(selectedFrameworkDetails.score * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{Math.round(selectedFrameworkDetails.coverage * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{selectedFrameworkDetails.answeredQuestions}/{selectedFrameworkDetails.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{selectedFrameworkDetails.gaps.length}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso da Avaliação</span>
                  <span className="font-medium">{selectedFrameworkDetails.answeredQuestions} de {selectedFrameworkDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedFrameworkDetails.coverage * 100} className="h-2" />
              </div>

              {/* Response Breakdown */}
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Distribuição de Respostas</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedFrameworkDetails.responseBreakdown).map(([key, value]) => (
                    value > 0 && (
                      <div 
                        key={key} 
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          key === 'Sim' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          key === 'Parcial' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          key === 'Não' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          key === 'NA' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          key === 'Não respondido' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {key}: {value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Gaps List */}
              {selectedFrameworkDetails.gaps.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">
                    Gaps Identificados ({selectedFrameworkDetails.gaps.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFrameworkDetails.gaps.slice(0, 15).map((gap) => (
                      <div 
                        key={gap.questionId} 
                        className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedFramework(null);
                            navigate(`/assessment?questionId=${gap.questionId}`);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedFramework(null)}>
                  Fechar
                </Button>
                {selectedFrameworkDetails.questions.length > 0 && (
                  <Button 
                    onClick={() => {
                      setSelectedFramework(null);
                      navigate(`/assessment?questionId=${selectedFrameworkDetails.questions[0].questionId}`);
                    }}
                  >
                    Iniciar Avaliação
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Domain Details Dialog */}
      <Dialog open={!!selectedDomain} onOpenChange={(open) => !open && setSelectedDomain(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedDomainDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedDomainDetails.maturityLevel?.color || 'hsl(var(--primary))' }}
                  >
                    {Math.round(selectedDomainDetails.score * 100)}%
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedDomainDetails.domainName}</DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedDomainDetails.description || `${selectedDomainDetails.totalQuestions} perguntas`}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: selectedDomainDetails.maturityLevel?.color }}>
                    {Math.round(selectedDomainDetails.score * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(selectedDomainDetails.coverage * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {selectedDomainDetails.answeredQuestions}/{selectedDomainDetails.totalQuestions}
                  </div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    {selectedDomainDetails.gaps.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso da Avaliação</span>
                  <span className="font-medium">{selectedDomainDetails.answeredQuestions} de {selectedDomainDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedDomainDetails.coverage * 100} className="h-2" />
              </div>

              {/* Response Breakdown */}
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Distribuição de Respostas</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedDomainDetails.responseBreakdown).map(([key, value]) => (
                    value > 0 && (
                      <div 
                        key={key} 
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          key === 'Sim' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          key === 'Parcial' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          key === 'Não' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          key === 'NA' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          key === 'Não respondido' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {key}: {value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Gaps by Criticality */}
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Gaps por Criticidade</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedDomainDetails.gapsByCriticality.Critical > 0 && (
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      Crítico: {selectedDomainDetails.gapsByCriticality.Critical}
                    </div>
                  )}
                  {selectedDomainDetails.gapsByCriticality.High > 0 && (
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      Alto: {selectedDomainDetails.gapsByCriticality.High}
                    </div>
                  )}
                  {selectedDomainDetails.gapsByCriticality.Medium > 0 && (
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      Médio: {selectedDomainDetails.gapsByCriticality.Medium}
                    </div>
                  )}
                  {selectedDomainDetails.gapsByCriticality.Low > 0 && (
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Baixo: {selectedDomainDetails.gapsByCriticality.Low}
                    </div>
                  )}
                </div>
              </div>

              {/* Gaps List */}
              {selectedDomainDetails.gaps.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">
                    Gaps Identificados ({selectedDomainDetails.gaps.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedDomainDetails.gaps.slice(0, 15).map((gap) => (
                      <div 
                        key={gap.questionId} 
                        className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedDomain(null);
                            navigate(`/assessment?questionId=${gap.questionId}`);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedDomain(null)}>
                  Fechar
                </Button>
                {selectedDomainDetails.questions.length > 0 && (
                  <Button 
                    onClick={() => {
                      setSelectedDomain(null);
                      navigate(`/assessment?questionId=${selectedDomainDetails.questions[0].questionId}`);
                    }}
                  >
                    Iniciar Avaliação
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
