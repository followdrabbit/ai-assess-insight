import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie } from 'recharts';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DomainSpecificIndicators } from '@/components/DomainSpecificIndicators';
import { Answer } from '@/lib/database';
import { 
  MaturityScoreHelp,
  CoverageHelp, 
  EvidenceReadinessHelp, 
  DomainFunctionHelp,
  DomainRiskDistributionHelp,
  DomainFrameworkCoverageHelp,
  DomainMetricsHelpAware,
  DomainCriticalGapsHelp,
  DomainRoadmapHelp,
  FrameworkCategoryHelp,
} from '@/components/HelpTooltip';
import { OverallMetrics, CriticalGap, RoadmapItem, FrameworkCoverage } from '@/lib/scoring';
import { frameworkCategoryLabels, frameworkCategoryColors, FrameworkCategoryId } from '@/lib/frameworkCategories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Framework } from '@/lib/frameworks';
import { getQuestionFrameworkIds } from '@/lib/frameworks';
import { downloadHtmlReport } from '@/lib/htmlReportExport';
import {
  DashboardHeader,
  DashboardFrameworkSelector,
  DashboardKPIGrid,
  DashboardKPICard,
  DashboardRoadmapGrid,
} from '@/components/dashboard';

// Domain function keys for i18n
const getDomainFunctionLabels = (t: (key: string) => string, securityDomainId: string): Record<string, string> => {
  switch (securityDomainId) {
    case 'CLOUD_SECURITY':
      return {
        GOVERN: t('domainFunctions.cloudGovern'),
        MANAGE: t('domainFunctions.cloudManage'),
        MEASURE: t('domainFunctions.cloudMeasure'),
        MAP: t('domainFunctions.cloudMap'),
      };
    case 'DEVSECOPS':
      return {
        GOVERN: t('domainFunctions.devsecopsGovern'),
        MANAGE: t('domainFunctions.devsecopsManage'),
        MEASURE: t('domainFunctions.devsecopsMeasure'),
        MAP: t('domainFunctions.devsecopsMap'),
      };
    default:
      return {
        GOVERN: t('domainFunctions.aiGovern'),
        MAP: t('domainFunctions.aiMap'),
        MEASURE: t('domainFunctions.aiMeasure'),
        MANAGE: t('domainFunctions.aiManage'),
      };
  }
};

const nistFunctionColors: Record<string, string> = {
  GOVERN: 'hsl(var(--chart-1))',
  MAP: 'hsl(var(--chart-2))',
  MEASURE: 'hsl(var(--chart-3))',
  MANAGE: 'hsl(var(--chart-4))',
};

// Domain-specific chart config keys
const getDomainChartConfig = (t: (key: string) => string, securityDomainId: string) => {
  switch (securityDomainId) {
    case 'CLOUD_SECURITY':
      return {
        title: t('domainFunctions.cloudTitle'),
        description: t('domainFunctions.cloudDescription'),
      };
    case 'DEVSECOPS':
      return {
        title: t('domainFunctions.devsecopsTitle'),
        description: t('domainFunctions.devsecopsDescription'),
      };
    default:
      return {
        title: t('domainFunctions.aiTitle'),
        description: t('domainFunctions.aiDescription'),
      };
  }
};

// Framework category labels and colors imported from shared lib

export interface ActiveQuestion {
  questionId: string;
  questionText: string;
  subcatId: string;
  domainId: string;
  ownershipType?: string;
  frameworks: string[];
}

interface ExecutiveDashboardProps {
  metrics: OverallMetrics;
  criticalGaps: CriticalGap[];
  roadmap: RoadmapItem[];
  frameworkCoverage: FrameworkCoverage[];
  enabledFrameworks: Framework[];
  selectedFrameworkIds: string[];
  onFrameworkSelectionChange: (frameworkIds: string[]) => void;
  activeQuestions: ActiveQuestion[];
  domainSwitcher?: React.ReactNode;
  securityDomainId?: string; // Current security domain context
  answers?: Map<string, Answer>; // Answers map for domain-specific indicators
}

type CriticalityFilter = 'all' | 'Critical' | 'High' | 'Medium' | 'Low';
type NistFunctionFilter = 'all' | 'GOVERN' | 'MAP' | 'MEASURE' | 'MANAGE';

export function ExecutiveDashboard({ 
  metrics, 
  criticalGaps, 
  roadmap,
  frameworkCoverage,
  enabledFrameworks,
  selectedFrameworkIds,
  onFrameworkSelectionChange,
  activeQuestions,
  domainSwitcher,
  securityDomainId = 'AI_SECURITY',
  answers = new Map()
}: ExecutiveDashboardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Get domain-specific labels using i18n
  const currentFunctionLabels = getDomainFunctionLabels(t, securityDomainId);
  const currentDomainConfig = getDomainChartConfig(t, securityDomainId);
  // Filter states
  const [criticalityFilter, setCriticalityFilter] = useState<CriticalityFilter>('all');
  const [nistFilter, setNistFilter] = useState<NistFunctionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGaps, setShowAllGaps] = useState(false);

  // Modal states
  const [selectedKpiModal, setSelectedKpiModal] = useState<'score' | 'gaps' | 'coverage' | 'evidence' | null>(null);

  // Calculate correct coverage based on metrics (which comes from calculateOverallMetrics)
  // The metrics object already has the accurate answered/total count
  const coverageStats = useMemo(() => {
    const totalQuestions = metrics.totalQuestions;
    const answeredCount = metrics.answeredQuestions;
    const coverage = metrics.coverage;
    
    return {
      total: totalQuestions,
      answered: answeredCount,
      pending: Math.max(0, totalQuestions - answeredCount),
      coverage
    };
  }, [metrics]);

  // Filter questions and gaps by selected frameworks
  const filteredByFramework = useMemo(() => {
    // Use enabled frameworks as default when no specific selection
    const effectiveFrameworkIds = selectedFrameworkIds.length > 0 
      ? selectedFrameworkIds 
      : enabledFrameworks.map(f => f.frameworkId);
    
    const selectedSet = new Set(effectiveFrameworkIds);
    
    // Filter gaps - only show gaps from questions that belong to selected/enabled frameworks
    const filteredGaps = criticalGaps.filter(gap => {
      const question = activeQuestions.find(q => q.questionId === gap.questionId);
      if (!question) return false;
      const questionFrameworkIds = getQuestionFrameworkIds(question.frameworks);
      return questionFrameworkIds.some(id => selectedSet.has(id));
    });

    // Filter framework coverage
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
    
    const selectedFrameworkNames = new Set(
      effectiveFrameworkIds.map(id => frameworkIdToName[id]).filter(Boolean)
    );
    
    const filteredCoverage = frameworkCoverage.filter(fc => 
      selectedFrameworkNames.has(fc.framework)
    );

    // Filter roadmap items - keep only items whose domain has active gaps in selected frameworks
    const domainsWithGaps = new Set(filteredGaps.map(gap => gap.domainName));
    const filteredRoadmap = roadmap.filter(item => domainsWithGaps.has(item.domain));

    return { gaps: filteredGaps, coverage: filteredCoverage, roadmapItems: filteredRoadmap };
  }, [criticalGaps, frameworkCoverage, roadmap, selectedFrameworkIds, activeQuestions, enabledFrameworks]);

  // Apply additional filters to gaps
  const filteredGaps = useMemo(() => {
    let filtered = [...filteredByFramework.gaps];
    
    if (criticalityFilter !== 'all') {
      filtered = filtered.filter(g => g.criticality === criticalityFilter);
    }
    if (nistFilter !== 'all') {
      filtered = filtered.filter(g => g.nistFunction === nistFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        g.subcatName.toLowerCase().includes(query) ||
        g.domainName.toLowerCase().includes(query) ||
        g.questionText.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [filteredByFramework.gaps, criticalityFilter, nistFilter, searchQuery]);

  // KPI Modal Details
  const scoreDetails = useMemo(() => {
    const domainScores = metrics.domainMetrics
      .map(dm => ({
        name: dm.domainName,
        score: Math.round(dm.score * 100),
        coverage: Math.round(dm.coverage * 100),
        gaps: dm.criticalGaps,
        color: dm.maturityLevel.color,
      }))
      .sort((a, b) => a.score - b.score);
    
    const categoryScores = metrics.frameworkCategoryMetrics
      .filter(fc => fc.totalQuestions > 0)
      .map(fc => ({
        name: frameworkCategoryLabels[fc.categoryId] || fc.categoryId,
        score: Math.round(fc.score * 100),
        coverage: Math.round(fc.coverage * 100),
        color: frameworkCategoryColors[fc.categoryId],
      }))
      .sort((a, b) => a.score - b.score);

    return { domainScores, categoryScores };
  }, [metrics]);

  const gapsDetails = useMemo(() => {
    const gaps = filteredByFramework.gaps;
    const byCriticality = {
      Critical: gaps.filter(g => g.criticality === 'Critical'),
      High: gaps.filter(g => g.criticality === 'High'),
      Medium: gaps.filter(g => g.criticality === 'Medium'),
      Low: gaps.filter(g => g.criticality === 'Low'),
    };
    const byDomain: Record<string, typeof gaps> = {};
    gaps.forEach(g => {
      if (!byDomain[g.domainName]) byDomain[g.domainName] = [];
      byDomain[g.domainName].push(g);
    });
    const byNist: Record<string, typeof gaps> = {};
    gaps.forEach(g => {
      const nist = g.nistFunction || 'Sem função';
      if (!byNist[nist]) byNist[nist] = [];
      byNist[nist].push(g);
    });
    return { byCriticality, byDomain, byNist, total: gaps.length };
  }, [filteredByFramework.gaps]);

  const coverageDetails = useMemo(() => {
    const byDomain = metrics.domainMetrics.map(dm => ({
      name: dm.domainName,
      answered: dm.answeredQuestions,
      total: dm.totalQuestions,
      coverage: Math.round(dm.coverage * 100),
      pending: dm.totalQuestions - dm.answeredQuestions,
    })).sort((a, b) => a.coverage - b.coverage);

    const byFramework = filteredByFramework.coverage.map(fc => ({
      name: fc.framework,
      answered: fc.answeredQuestions,
      total: fc.totalQuestions,
      coverage: Math.round(fc.coverage * 100),
    })).sort((a, b) => a.coverage - b.coverage);

    return { byDomain, byFramework };
  }, [metrics, filteredByFramework.coverage]);

  const evidenceDetails = useMemo(() => {
    const domainEvidenceData = metrics.domainMetrics.map(dm => {
      // Calculate evidence readiness per domain based on subcategory metrics
      const subcatsWithEvidence = dm.subcategoryMetrics.filter(sm => sm.coverage > 0);
      const avgEvidence = subcatsWithEvidence.length > 0
        ? subcatsWithEvidence.reduce((sum, sm) => sum + sm.coverage, 0) / subcatsWithEvidence.length
        : 0;
      return {
        name: dm.domainName,
        evidenceReadiness: Math.round(avgEvidence * 100),
        totalSubcats: dm.subcategoryMetrics.length,
        withEvidence: subcatsWithEvidence.length,
      };
    }).sort((a, b) => a.evidenceReadiness - b.evidenceReadiness);

    return { byDomain: domainEvidenceData };
  }, [metrics]);

  // Filtered domain metrics
  const filteredDomainMetrics = useMemo(() => {
    let filtered = [...metrics.domainMetrics];
    
    if (nistFilter !== 'all') {
      filtered = filtered.filter(dm => dm.nistFunction === nistFilter);
    }
    
    return filtered;
  }, [metrics.domainMetrics, nistFilter]);

  // Chart data
  const domainChartData = filteredDomainMetrics.map(dm => ({
    name: dm.domainName.length > 18 ? dm.domainName.slice(0, 16) + '...' : dm.domainName,
    fullName: dm.domainName,
    score: Math.round(dm.score * 100),
    coverage: Math.round(dm.coverage * 100),
    level: dm.maturityLevel.level,
    color: dm.maturityLevel.color,
    nistFunction: dm.nistFunction,
    criticalGaps: dm.criticalGaps,
  }));

  // nistFunctionData uses the already-defined currentFunctionLabels from component top

  const nistFunctionData = metrics.nistFunctionMetrics.map(nf => ({
    function: currentFunctionLabels[nf.function] || nf.function,
    functionId: nf.function,
    score: Math.round(nf.score * 100),
    fullMark: 100,
    color: nistFunctionColors[nf.function],
  }));

  // Map framework IDs to category IDs for filtering
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

  // Get enabled category IDs based on enabled frameworks
  const enabledCategoryIds = useMemo(() => {
    const categoryIds = new Set<FrameworkCategoryId>();
    enabledFrameworks.forEach(fw => {
      const categoryId = frameworkIdToCategoryId[fw.frameworkId];
      if (categoryId) {
        categoryIds.add(categoryId);
      }
    });
    return categoryIds;
  }, [enabledFrameworks]);

  // Get selected category IDs based on selected frameworks (if any selected)
  const selectedCategoryIds = useMemo(() => {
    if (selectedFrameworkIds.length === 0) {
      return enabledCategoryIds; // Show all enabled categories if none selected
    }
    const categoryIds = new Set<FrameworkCategoryId>();
    selectedFrameworkIds.forEach(fwId => {
      const categoryId = frameworkIdToCategoryId[fwId];
      if (categoryId) {
        categoryIds.add(categoryId);
      }
    });
    return categoryIds;
  }, [selectedFrameworkIds, enabledCategoryIds]);

  const frameworkCategoryData = useMemo(() => {
    return metrics.frameworkCategoryMetrics
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
  }, [metrics.frameworkCategoryMetrics, selectedCategoryIds]);

  // Risk distribution for pie chart - use filtered gaps
  const riskDistribution = useMemo(() => {
    const distribution = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    filteredByFramework.gaps.forEach(gap => {
      if (gap.criticality in distribution) {
        distribution[gap.criticality as keyof typeof distribution]++;
      }
    });
    return [
      { name: 'Crítico', value: distribution.Critical, color: 'hsl(0, 84%, 60%)' },
      { name: 'Alto', value: distribution.High, color: 'hsl(25, 95%, 53%)' },
      { name: 'Médio', value: distribution.Medium, color: 'hsl(45, 93%, 47%)' },
      { name: 'Baixo', value: distribution.Low, color: 'hsl(142, 76%, 36%)' },
    ].filter(d => d.value > 0);
  }, [filteredByFramework.gaps]);

  const clearFilters = () => {
    setCriticalityFilter('all');
    setNistFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = criticalityFilter !== 'all' || nistFilter !== 'all' || searchQuery.trim() !== '';

  // Framework selection helpers
  const toggleFramework = (frameworkId: string) => {
    if (selectedFrameworkIds.includes(frameworkId)) {
      onFrameworkSelectionChange(selectedFrameworkIds.filter(id => id !== frameworkId));
    } else {
      onFrameworkSelectionChange([...selectedFrameworkIds, frameworkId]);
    }
  };


  const handleExportReport = useCallback(() => {
    const selectedFws = selectedFrameworkIds.length > 0 
      ? enabledFrameworks.filter(f => selectedFrameworkIds.includes(f.frameworkId))
      : enabledFrameworks;
    
    downloadHtmlReport({
      dashboardType: 'executive',
      metrics,
      criticalGaps: filteredGaps,
      frameworkCoverage: filteredByFramework.coverage,
      selectedFrameworks: selectedFws,
      roadmap: filteredByFramework.roadmapItems,
      frameworkCategoryData,
      nistFunctionData,
      riskDistribution,
      coverageStats,
      generatedAt: new Date()
    });
  }, [metrics, filteredGaps, filteredByFramework, enabledFrameworks, selectedFrameworkIds, frameworkCategoryData, nistFunctionData, riskDistribution, coverageStats]);

  // Domain-specific header configuration
  const domainHeaderConfig: Record<string, { title: string; subtitle: string }> = {
    AI_SECURITY: {
      title: 'Resumo Executivo - Maturidade em Segurança de IA',
      subtitle: 'Visão consolidada para tomada de decisão estratégica',
    },
    CLOUD_SECURITY: {
      title: 'Resumo Executivo - Maturidade em Cloud Security',
      subtitle: 'Postura de segurança cloud e conformidade com CSA CCM',
    },
    DEVSECOPS: {
      title: 'Resumo Executivo - Maturidade em DevSecOps',
      subtitle: 'Segurança no ciclo de desenvolvimento de software',
    },
  };

  const headerConfig = domainHeaderConfig[securityDomainId] || domainHeaderConfig.AI_SECURITY;

  return (
    <div className="space-y-6">
      {/* Executive Summary Header with Framework Selector */}
      <DashboardHeader
        title={headerConfig.title}
        subtitle={headerConfig.subtitle}
        domainSwitcher={domainSwitcher}
        onExport={handleExportReport}
      >
        <DashboardFrameworkSelector
          frameworks={enabledFrameworks}
          selectedIds={selectedFrameworkIds}
          onToggle={toggleFramework}
          helpTooltip={<FrameworkCategoryHelp />}
        />
      </DashboardHeader>

      {/* Executive KPI Cards - Standardized */}
      <DashboardKPIGrid columns={4}>
        <DashboardKPICard
          label="Score Geral"
          value={Math.round(metrics.overallScore * 100)}
          suffix="%"
          helpTooltip={<MaturityScoreHelp />}
          progress={metrics.overallScore * 100}
          subtitle={`Nível ${metrics.maturityLevel.level}: ${metrics.maturityLevel.name}`}
          animationDelay={0}
          onClick={() => setSelectedKpiModal('score')}
        />
        <DashboardKPICard
          label="Gaps Críticos"
          value={filteredByFramework.gaps.length}
          helpTooltip={<DomainCriticalGapsHelp securityDomainId={securityDomainId} />}
          progress={Math.min((filteredByFramework.gaps.length / Math.max(coverageStats.total * 0.1, 1)) * 100, 100)}
          subtitle="Requerem ação prioritária"
          animationDelay={75}
          variant="danger"
          onClick={() => setSelectedKpiModal('gaps')}
        />
        <DashboardKPICard
          label="Cobertura"
          value={Math.round(coverageStats.coverage * 100)}
          suffix="%"
          helpTooltip={<CoverageHelp />}
          progress={coverageStats.coverage * 100}
          subtitle={`${coverageStats.answered} de ${coverageStats.total} perguntas`}
          animationDelay={150}
          variant="info"
          onClick={() => setSelectedKpiModal('coverage')}
        />
        <DashboardKPICard
          label="Prontidão de Evidências"
          value={Math.round(metrics.evidenceReadiness * 100)}
          suffix="%"
          helpTooltip={<EvidenceReadinessHelp />}
          progress={metrics.evidenceReadiness * 100}
          subtitle="Preparação para auditoria"
          animationDelay={225}
          variant="success"
          onClick={() => setSelectedKpiModal('evidence')}
        />
      </DashboardKPIGrid>

      {/* Domain-Specific Indicators */}
      <DomainSpecificIndicators 
        securityDomainId={securityDomainId}
        questions={activeQuestions}
        answers={answers}
      />

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Domain-specific Function Radar (NIST AI RMF / Cloud Pillars / DevSecOps Practices) */}
        <div 
          className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">{currentDomainConfig.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{currentDomainConfig.description}</p>
            </div>
            <DomainFunctionHelp securityDomainId={securityDomainId} />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={nistFunctionData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="function" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {nistFunctionData.map(nf => (
              <button
                key={nf.functionId}
                onClick={() => setNistFilter(nistFilter === nf.functionId ? 'all' : nf.functionId as NistFunctionFilter)}
                className={cn(
                  "flex items-center justify-between p-2 rounded transition-colors",
                  nistFilter === nf.functionId 
                    ? "bg-primary/20 border border-primary/30" 
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                <span>{nf.function}</span>
                <span className="font-mono font-medium">{nf.score}%</span>
              </button>
            ))}
          </div>
        </div>

        {/* Domain Bar Chart */}
        <div 
          className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Maturidade por Domínio</h3>
              <DomainMetricsHelpAware securityDomainId={securityDomainId} />
            </div>
            {nistFilter !== 'all' && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                Filtro: {currentFunctionLabels[nistFilter]}
              </span>
            )}
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={domainChartData.slice(0, 6)} 
                layout="vertical" 
                margin={{ left: 0, right: 16 }}
              >
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => domainChartData.find(d => d.name === label)?.fullName || label}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {domainChartData.slice(0, 6).map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Ordenado por score</span>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs"
              onClick={() => navigate('/assessment')}
            >
              Ver todos os domínios
            </Button>
          </div>
        </div>

        {/* Risk Distribution Pie */}
        <div 
          className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Distribuição de Riscos</h3>
            <DomainRiskDistributionHelp securityDomainId={securityDomainId} />
          </div>
          {riskDistribution.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Gaps']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {riskDistribution.map(r => (
                  <button
                    key={r.name}
                    onClick={() => {
                      const critMap: Record<string, CriticalityFilter> = {
                        'Crítico': 'Critical', 'Alto': 'High', 'Médio': 'Medium', 'Baixo': 'Low'
                      };
                      const newFilter = critMap[r.name];
                      setCriticalityFilter(criticalityFilter === newFilter ? 'all' : newFilter);
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded transition-colors",
                      (r.name === 'Crítico' && criticalityFilter === 'Critical') ||
                      (r.name === 'Alto' && criticalityFilter === 'High') ||
                      (r.name === 'Médio' && criticalityFilter === 'Medium') ||
                      (r.name === 'Baixo' && criticalityFilter === 'Low')
                        ? "bg-primary/20 border border-primary/30" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span>{r.name}</span>
                    </div>
                    <span className="font-mono font-medium">{r.value}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              Nenhum gap identificado
            </div>
          )}
        </div>
      </div>

      {/* Framework Coverage */}
      {filteredByFramework.coverage.length > 0 && (
        <div 
          className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Cobertura por Framework</h3>
            <DomainFrameworkCoverageHelp securityDomainId={securityDomainId} />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredByFramework.coverage.map((fc, idx) => (
              <div 
                key={fc.framework} 
                className="p-4 bg-muted/50 rounded-lg animate-in fade-in-0 zoom-in-95 duration-300"
                style={{ animationDelay: `${700 + idx * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm truncate" title={fc.framework}>
                    {fc.framework}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold">
                    {Math.round(fc.averageScore * 100)}%
                  </span>
                  <span className="text-xs text-muted-foreground">score</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${fc.coverage * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {fc.answeredQuestions}/{fc.totalQuestions} perguntas respondidas
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Framework Category Maturity */}
      <div 
        className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '700ms', animationFillMode: 'backwards' }}
      >
        <h3 className="font-semibold mb-4">Maturidade por Categoria de Framework</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {frameworkCategoryData.map((fc, idx) => (
            <div 
              key={fc.categoryId} 
              className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-all cursor-pointer animate-in fade-in-0 zoom-in-95 duration-300 hover:scale-[1.02]"
              style={{ animationDelay: `${800 + idx * 50}ms`, animationFillMode: 'backwards' }}
              onClick={() => navigate('/assessment')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-xs truncate" title={fc.name}>{fc.name}</span>
              </div>
              <div 
                className="text-2xl font-bold mb-2"
                style={{ color: fc.maturityLevel.color }}
              >
                {fc.score}%
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full transition-all" 
                  style={{ 
                    width: `${fc.score}%`,
                    backgroundColor: fc.maturityLevel.color 
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {fc.answeredQuestions}/{fc.totalQuestions} perguntas
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Roadmap - Standardized */}
      <DashboardRoadmapGrid
        items={filteredByFramework.roadmapItems}
        title="Roadmap Estratégico"
        subtitle="Ações prioritárias para os próximos 90 dias"
        helpTooltip={<DomainRoadmapHelp securityDomainId={securityDomainId} />}
        animationDelay={850}
      />

      {/* Critical Gaps with Filters */}
      <div 
        className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '1000ms', animationFillMode: 'backwards' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-semibold">Gaps Críticos</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredGaps.length} gaps encontrados
                {hasActiveFilters && ` (de ${filteredByFramework.gaps.length} total)`}
              </p>
            </div>
            <DomainCriticalGapsHelp securityDomainId={securityDomainId} />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            
            
            <Select value={criticalityFilter} onValueChange={(v) => setCriticalityFilter(v as CriticalityFilter)}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Criticidade" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Critical">Crítico</SelectItem>
                <SelectItem value="High">Alto</SelectItem>
                <SelectItem value="Medium">Médio</SelectItem>
                <SelectItem value="Low">Baixo</SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {filteredGaps.slice(0, showAllGaps ? undefined : 5).map((gap, idx) => (
            <div 
              key={gap.questionId}
              className={cn(
                "flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 cursor-pointer",
                "transition-all duration-300 ease-out",
                "animate-in fade-in-0 slide-in-from-left-2"
              )}
              style={{ 
                animationDelay: `${idx * 50}ms`, 
                animationFillMode: 'backwards',
                animationDuration: '300ms'
              }}
              onClick={() => navigate(`/assessment?questionId=${gap.questionId}`)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg font-bold text-muted-foreground w-6 transition-all duration-200">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate transition-colors duration-200">{gap.questionText}</p>
                  <p className="text-xs text-muted-foreground truncate transition-colors duration-200">{gap.subcatName} · {gap.domainName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {gap.nistFunction && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded hidden md:inline transition-all duration-200">
                    {currentFunctionLabels[gap.nistFunction]}
                  </span>
                )}
                <span className={cn(
                  "criticality-badge transition-all duration-200",
                  `criticality-${gap.criticality.toLowerCase()}`
                )}>
                  {gap.criticality}
                </span>
                <span className="font-mono text-sm w-12 text-right transition-all duration-200">
                  {Math.round(gap.effectiveScore * 100)}%
                </span>
              </div>
            </div>
          ))}
          
          {filteredGaps.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground animate-in fade-in-0 duration-300">
              {hasActiveFilters ? 'Nenhum gap encontrado com os filtros aplicados' : 'Nenhum gap crítico identificado'}
            </div>
          )}
        </div>

        {filteredGaps.length > 5 && (
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAllGaps(!showAllGaps)}
            >
              {showAllGaps ? 'Mostrar menos' : `Ver todos (${filteredGaps.length})`}
            </Button>
          </div>
        )}
      </div>

      {/* Score Details Modal */}
      <Dialog open={selectedKpiModal === 'score'} onOpenChange={(open) => !open && setSelectedKpiModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg animate-in zoom-in-50 duration-500"
                style={{ backgroundColor: metrics.maturityLevel.color }}
              >
                {Math.round(metrics.overallScore * 100)}%
              </div>
              <div>
                <DialogTitle className="text-left text-xl">Score Geral de Maturidade</DialogTitle>
                <DialogDescription className="text-left">
                  Nível {metrics.maturityLevel.level}: {metrics.maturityLevel.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { value: `${Math.round(metrics.coverage * 100)}%`, label: 'Cobertura', colorClass: 'text-primary' },
              { value: `${metrics.answeredQuestions}/${metrics.totalQuestions}`, label: 'Respondidas', colorClass: '' },
              { value: filteredByFramework.gaps.length, label: 'Gaps', colorClass: 'text-destructive' }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 zoom-in-95 duration-300"
                style={{ animationDelay: `${100 + idx * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className={cn("text-2xl font-bold", item.colorClass)}>{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
            <h4 className="font-medium text-sm mb-3">Score por Domínio</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scoreDetails.domainScores.map((d, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-2 bg-muted/30 rounded animate-in fade-in-0 slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${250 + idx * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{d.name}</span>
                      <span className="text-sm font-mono" style={{ color: d.color }}>{d.score}%</span>
                    </div>
                    <Progress value={d.score} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
            <h4 className="font-medium text-sm mb-3">Score por Categoria de Framework</h4>
            <div className="grid grid-cols-2 gap-2">
              {scoreDetails.categoryScores.map((c, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded animate-in fade-in-0 zoom-in-95 duration-200"
                  style={{ animationDelay: `${400 + idx * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <span className="text-sm">{c.name}</span>
                  <span className="font-mono font-medium" style={{ color: c.color }}>{c.score}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
            <Button variant="outline" onClick={() => setSelectedKpiModal(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gaps Details Modal */}
      <Dialog open={selectedKpiModal === 'gaps'} onOpenChange={(open) => !open && setSelectedKpiModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-destructive animate-in zoom-in-50 duration-500">
                {gapsDetails.total}
              </div>
              <div>
                <DialogTitle className="text-left text-xl">Gaps Críticos</DialogTitle>
                <DialogDescription className="text-left">
                  Itens que requerem ação prioritária
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { value: gapsDetails.byCriticality.Critical.length, label: 'Crítico', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-600' },
              { value: gapsDetails.byCriticality.High.length, label: 'Alto', bgClass: 'bg-orange-100 dark:bg-orange-900/30', textClass: 'text-orange-600' },
              { value: gapsDetails.byCriticality.Medium.length, label: 'Médio', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-600' },
              { value: gapsDetails.byCriticality.Low.length, label: 'Baixo', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-600' }
            ].map((item, idx) => (
              <div 
                key={idx}
                className={cn("text-center p-3 rounded-lg animate-in fade-in-0 zoom-in-95 duration-300", item.bgClass)}
                style={{ animationDelay: `${100 + idx * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className={cn("text-2xl font-bold", item.textClass)}>{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
            <h4 className="font-medium text-sm mb-3">Gaps por Domínio</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.entries(gapsDetails.byDomain)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 6)
                .map(([domain, gaps], idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 bg-muted/30 rounded animate-in fade-in-0 slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${300 + idx * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <span className="text-sm truncate">{domain}</span>
                  <span className="font-mono text-sm text-destructive">{gaps.length}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
            <h4 className="font-medium text-sm mb-3">Gaps Críticos Prioritários</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredByFramework.gaps.slice(0, 8).map((gap, idx) => (
                <div 
                  key={gap.questionId} 
                  className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer animate-in fade-in-0 slide-in-from-right-2 duration-200"
                  style={{ animationDelay: `${450 + idx * 40}ms`, animationFillMode: 'backwards' }}
                  onClick={() => {
                    setSelectedKpiModal(null);
                    navigate(`/assessment?questionId=${gap.questionId}`);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                        {gap.criticality}
                      </span>
                      <span className="text-xs text-muted-foreground">{gap.domainName}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{gap.questionText}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0">Revisar</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
            <Button variant="outline" onClick={() => setSelectedKpiModal(null)}>Fechar</Button>
            <Button onClick={() => { setSelectedKpiModal(null); navigate('/assessment'); }}>
              Ir para Avaliação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coverage Details Modal */}
      <Dialog open={selectedKpiModal === 'coverage'} onOpenChange={(open) => !open && setSelectedKpiModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-blue-500 animate-in zoom-in-50 duration-500">
                {Math.round(coverageStats.coverage * 100)}%
              </div>
              <div>
                <DialogTitle className="text-left text-xl">Cobertura da Avaliação</DialogTitle>
                <DialogDescription className="text-left">
                  {coverageStats.answered} de {coverageStats.total} perguntas respondidas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { value: coverageStats.answered, label: 'Respondidas', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-600' },
              { value: coverageStats.pending, label: 'Pendentes', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-600' },
              { value: coverageStats.total, label: 'Total', bgClass: 'bg-muted/50', textClass: '' }
            ].map((item, idx) => (
              <div 
                key={idx}
                className={cn("text-center p-3 rounded-lg animate-in fade-in-0 zoom-in-95 duration-300", item.bgClass)}
                style={{ animationDelay: `${100 + idx * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className={cn("text-2xl font-bold", item.textClass)}>{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
            <h4 className="font-medium text-sm mb-3">Cobertura por Domínio</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {coverageDetails.byDomain.map((d, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-2 bg-muted/30 rounded animate-in fade-in-0 slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${250 + idx * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{d.answered}/{d.total}</span>
                    </div>
                    <Progress value={d.coverage} className="h-1.5" />
                  </div>
                  <span className={cn(
                    "font-mono text-sm min-w-[40px] text-right",
                    d.coverage < 50 ? "text-destructive" : d.coverage < 80 ? "text-amber-600" : "text-green-600"
                  )}>{d.coverage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
            <h4 className="font-medium text-sm mb-3">Cobertura por Framework</h4>
            <div className="grid grid-cols-2 gap-2">
              {coverageDetails.byFramework.map((f, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded animate-in fade-in-0 zoom-in-95 duration-200"
                  style={{ animationDelay: `${400 + idx * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <span className="text-sm truncate">{f.name}</span>
                  <span className={cn(
                    "font-mono font-medium",
                    f.coverage < 50 ? "text-destructive" : f.coverage < 80 ? "text-amber-600" : "text-green-600"
                  )}>{f.coverage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
            <Button variant="outline" onClick={() => setSelectedKpiModal(null)}>Fechar</Button>
            <Button onClick={() => { setSelectedKpiModal(null); navigate('/assessment'); }}>
              Continuar Avaliação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Details Modal */}
      <Dialog open={selectedKpiModal === 'evidence'} onOpenChange={(open) => !open && setSelectedKpiModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-green-500 animate-in zoom-in-50 duration-500">
                {Math.round(metrics.evidenceReadiness * 100)}%
              </div>
              <div>
                <DialogTitle className="text-left text-xl">Prontidão de Evidências</DialogTitle>
                <DialogDescription className="text-left">
                  Preparação para auditoria e compliance
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { value: `${Math.round(metrics.evidenceReadiness * 100)}%`, label: 'Prontidão Geral', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-600' },
              { value: metrics.domainMetrics.length, label: 'Domínios Avaliados', bgClass: 'bg-muted/50', textClass: '' }
            ].map((item, idx) => (
              <div 
                key={idx}
                className={cn("text-center p-4 rounded-lg animate-in fade-in-0 zoom-in-95 duration-300", item.bgClass)}
                style={{ animationDelay: `${100 + idx * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className={cn("text-3xl font-bold", item.textClass)}>{item.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
            <h4 className="font-medium text-sm mb-3">Prontidão por Domínio</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {evidenceDetails.byDomain.map((d, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-2 bg-muted/30 rounded animate-in fade-in-0 slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${250 + idx * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{d.withEvidence}/{d.totalSubcats} subcategorias</span>
                    </div>
                    <Progress value={d.evidenceReadiness} className="h-1.5" />
                  </div>
                  <span className={cn(
                    "font-mono text-sm min-w-[40px] text-right",
                    d.evidenceReadiness < 50 ? "text-destructive" : d.evidenceReadiness < 80 ? "text-amber-600" : "text-green-600"
                  )}>{d.evidenceReadiness}%</span>
                </div>
              ))}
            </div>
          </div>

          <div 
            className="mt-4 p-4 bg-muted/30 rounded-lg animate-in fade-in-0 slide-in-from-bottom-3 duration-300"
            style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
          >
            <h5 className="font-medium text-sm mb-2">O que é Prontidão de Evidências?</h5>
            <p className="text-sm text-muted-foreground">
              Indica o percentual de controles que possuem documentação de suporte adequada para demonstrar 
              conformidade durante auditorias. Uma alta prontidão facilita processos de certificação e 
              inspeções regulatórias.
            </p>
          </div>

          <div className="mt-6 flex justify-end animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
            <Button variant="outline" onClick={() => setSelectedKpiModal(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
