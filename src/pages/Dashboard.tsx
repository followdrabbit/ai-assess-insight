import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAnswersStore } from '@/lib/stores';
import { domains, subcategories, maturityLevels, nistAiRmfFunctions, frameworkCategories, frameworkCategoryIds, questions as defaultQuestions } from '@/lib/dataset';
import { frameworkCategoryLabels, frameworkCategoryColors } from '@/lib/frameworkCategories';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, generateRoadmap, ActiveQuestion } from '@/lib/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { cn } from '@/lib/utils';
import { 
  PersonaSelector, 
  PersonaType, 
  MaturityScoreHelp, 
  CoverageHelp, 
  EvidenceReadinessHelp, 
  CriticalGapsHelp,
  NistFunctionHelp 
} from '@/components/HelpTooltip';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { getAllCustomQuestions, getDisabledQuestions, getEnabledFrameworks, getSelectedFrameworks, setSelectedFrameworks, getAllCustomFrameworks } from '@/lib/database';
import { frameworks as defaultFrameworks, Framework, getQuestionFrameworkIds } from '@/lib/frameworks';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [persona, setPersona] = useState<PersonaType>('executive');
  
  const [allActiveQuestions, setAllActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [enabledFrameworks, setEnabledFrameworks] = useState<Framework[]>([]);
  const [enabledFrameworkIds, setEnabledFrameworkIds] = useState<string[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);

  // NIST AI RMF function display names - using translation keys
  const getNistFunctionLabel = (func: string) => {
    const labels: Record<string, string> = {
      GOVERN: t('dashboard.nistGovern', 'Govern'),
      MAP: t('dashboard.nistMap', 'Map'),
      MEASURE: t('dashboard.nistMeasure', 'Measure'),
      MANAGE: t('dashboard.nistManage', 'Manage'),
    };
    return labels[func] || func;
  };

  const nistFunctionColors: Record<string, string> = {
    GOVERN: 'hsl(var(--chart-1))',
    MAP: 'hsl(var(--chart-2))',
    MEASURE: 'hsl(var(--chart-3))',
    MANAGE: 'hsl(var(--chart-4))',
  };

  // Load active questions and frameworks
  useEffect(() => {
    async function loadData() {
      try {
        const [customQuestions, disabledQuestionIds, enabledIds, selectedIds, customFrameworks] = await Promise.all([
          getAllCustomQuestions(),
          getDisabledQuestions(),
          getEnabledFrameworks(),
          getSelectedFrameworks(),
          getAllCustomFrameworks()
        ]);

        // Combine default and custom questions, excluding disabled ones
        const active: ActiveQuestion[] = [
          ...defaultQuestions
            .filter(q => !disabledQuestionIds.includes(q.questionId))
            .map(q => ({
              questionId: q.questionId,
              questionText: q.questionText,
              subcatId: q.subcatId,
              domainId: q.domainId,
              ownershipType: q.ownershipType,
              frameworks: q.frameworks || []
            })),
          ...customQuestions
            .filter(q => !q.isDisabled)
            .map(q => ({
              questionId: q.questionId,
              questionText: q.questionText,
              subcatId: q.subcatId || '',
              domainId: q.domainId,
              ownershipType: q.ownershipType,
              frameworks: q.frameworks || []
            }))
        ];

        setAllActiveQuestions(active);
        setEnabledFrameworkIds(enabledIds);

        // Combine default and custom frameworks, filter by enabled
        const allFrameworks: Framework[] = [
          ...defaultFrameworks,
          ...customFrameworks.map(cf => ({
            frameworkId: cf.frameworkId,
            frameworkName: cf.frameworkName,
            shortName: cf.shortName,
            description: cf.description,
            targetAudience: cf.targetAudience,
            assessmentScope: cf.assessmentScope,
            defaultEnabled: cf.defaultEnabled,
            version: cf.version,
            category: cf.category as 'core' | 'high-value' | 'tech-focused',
            references: cf.references
          }))
        ];

        const enabledSet = new Set(enabledIds);
        const enabled = allFrameworks.filter(f => enabledSet.has(f.frameworkId));
        setEnabledFrameworks(enabled);
        setSelectedFrameworkIds(selectedIds);

      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to default questions
        const defaultEnabledIds = ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'];
        setAllActiveQuestions(defaultQuestions.map(q => ({
          questionId: q.questionId,
          questionText: q.questionText,
          subcatId: q.subcatId,
          domainId: q.domainId,
          ownershipType: q.ownershipType,
          frameworks: q.frameworks || []
        })));
        setEnabledFrameworkIds(defaultEnabledIds);
        setEnabledFrameworks(defaultFrameworks.filter(f => f.defaultEnabled));
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter questions by enabled frameworks - this is the base set
  const questionsFilteredByEnabledFrameworks = useMemo(() => {
    if (enabledFrameworkIds.length === 0) return allActiveQuestions;
    
    const enabledSet = new Set(enabledFrameworkIds);
    return allActiveQuestions.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      // Include question if any of its frameworks is in the enabled set
      return questionFrameworkIds.some(id => enabledSet.has(id));
    });
  }, [allActiveQuestions, enabledFrameworkIds]);

  // Handle framework selection change
  const handleFrameworkSelectionChange = async (frameworkIds: string[]) => {
    setSelectedFrameworkIds(frameworkIds);
    try {
      await setSelectedFrameworks(frameworkIds);
    } catch (error) {
      console.error('Error saving framework selection:', error);
    }
  };

  // Base metrics (enabled frameworks) for the non-executive personas
  const metrics = useMemo(
    () => calculateOverallMetrics(answers, questionsFilteredByEnabledFrameworks),
    [answers, questionsFilteredByEnabledFrameworks]
  );
  const criticalGaps = useMemo(
    () => getCriticalGaps(answers, 0.5, questionsFilteredByEnabledFrameworks),
    [answers, questionsFilteredByEnabledFrameworks]
  );
  const frameworkCoverage = useMemo(
    () => getFrameworkCoverage(answers, questionsFilteredByEnabledFrameworks),
    [answers, questionsFilteredByEnabledFrameworks]
  );
  const roadmap = useMemo(
    () => generateRoadmap(answers, 10, questionsFilteredByEnabledFrameworks),
    [answers, questionsFilteredByEnabledFrameworks]
  );

  // Executive dashboard must also respect the user's selected frameworks
  const questionsForExecutiveDashboard = useMemo(() => {
    if (selectedFrameworkIds.length === 0) return questionsFilteredByEnabledFrameworks;

    const selectedSet = new Set(selectedFrameworkIds);
    return questionsFilteredByEnabledFrameworks.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      return questionFrameworkIds.some(id => selectedSet.has(id));
    });
  }, [questionsFilteredByEnabledFrameworks, selectedFrameworkIds]);

  const executiveMetrics = useMemo(
    () => calculateOverallMetrics(answers, questionsForExecutiveDashboard),
    [answers, questionsForExecutiveDashboard]
  );
  const executiveCriticalGaps = useMemo(
    () => getCriticalGaps(answers, 0.5, questionsForExecutiveDashboard),
    [answers, questionsForExecutiveDashboard]
  );
  const executiveFrameworkCoverage = useMemo(
    () => getFrameworkCoverage(answers, questionsForExecutiveDashboard),
    [answers, questionsForExecutiveDashboard]
  );
  const executiveRoadmap = useMemo(
    () => generateRoadmap(answers, 10, questionsForExecutiveDashboard),
    [answers, questionsForExecutiveDashboard]
  );

  // Data for charts
  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName.length > 15 ? dm.domainName.slice(0, 13) + '...' : dm.domainName,
    fullName: dm.domainName,
    score: Math.round(dm.score * 100),
    coverage: Math.round(dm.coverage * 100),
    level: dm.maturityLevel.level,
    color: dm.maturityLevel.color,
    nistFunction: dm.nistFunction,
  }));

  const nistFunctionData = metrics.nistFunctionMetrics.map(nf => ({
    function: getNistFunctionLabel(nf.function),
    score: Math.round(nf.score * 100),
    fullMark: 100,
    color: nistFunctionColors[nf.function],
  }));

  // Framework category data for charts
  const frameworkCategoryData = metrics.frameworkCategoryMetrics
    .filter(fc => fc.totalQuestions > 0)
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

  const ownershipData = metrics.ownershipMetrics.map(om => ({
    name: om.ownershipType,
    score: Math.round(om.score * 100),
    coverage: Math.round(om.coverage * 100),
    total: om.totalQuestions,
    answered: om.answeredQuestions,
  }));

  // Status translation helper
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'incomplete': return t('dashboard.incomplete');
      case 'at-risk': return t('dashboard.atRisk');
      default: return t('dashboard.adequate');
    }
  };

  if (isLoading || dataLoading) {
    return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb 
        items={[
          { label: t('navigation.dashboard'), icon: LayoutDashboard }
        ]} 
      />

      {/* Header with Persona Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.maturityDashboard')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('dashboard.selectView')}
          </p>
        </div>
        <PersonaSelector value={persona} onChange={setPersona} />
      </div>

      {answers.size === 0 && (
        <div className="card-elevated p-6 text-center">
          <p className="text-muted-foreground mb-4">{t('dashboard.noData')}</p>
          <button 
            onClick={() => navigate('/assessment')}
            className="text-primary hover:underline font-medium"
          >
            {t('dashboard.startAssessment')}
          </button>
        </div>
      )}

      {/* Executive View */}
      {persona === 'executive' && (
        <ExecutiveDashboard 
          metrics={executiveMetrics}
          criticalGaps={executiveCriticalGaps}
          roadmap={executiveRoadmap}
          frameworkCoverage={executiveFrameworkCoverage}
          enabledFrameworks={enabledFrameworks}
          selectedFrameworkIds={selectedFrameworkIds}
          onFrameworkSelectionChange={handleFrameworkSelectionChange}
          activeQuestions={questionsForExecutiveDashboard}
        />
      )}

      {/* GRC View */}
      {persona === 'grc' && (
        <>
          {/* GRC KPI Cards - Focus on Coverage and Evidence */}
          <div className="stats-grid">
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <div className="kpi-label">{t('dashboard.overallCoverage')}</div>
                <CoverageHelp />
              </div>
              <div className="kpi-value">{Math.round(metrics.coverage * 100)}%</div>
              <div className="text-sm text-muted-foreground mt-2">
                {metrics.answeredQuestions} {t('common.of')} {metrics.totalQuestions}
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <div className="kpi-label">{t('dashboard.evidenceReadiness')}</div>
                <EvidenceReadinessHelp />
              </div>
              <div className="kpi-value">{Math.round(metrics.evidenceReadiness * 100)}%</div>
              <div className="text-sm text-muted-foreground mt-2">
                {t('dashboard.forAudit')}
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <div className="kpi-label">{t('dashboard.overallScore')}</div>
                <MaturityScoreHelp />
              </div>
              <div className="kpi-value" style={{ color: metrics.maturityLevel.color }}>
                {Math.round(metrics.overallScore * 100)}%
              </div>
              <div className={cn("maturity-badge mt-2", `maturity-${metrics.maturityLevel.level}`)}>
                {metrics.maturityLevel.name}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">{t('dashboard.controlsWithoutEvidence')}</div>
              <div className="kpi-value text-amber-600">
                {Math.round((1 - metrics.evidenceReadiness) * metrics.answeredQuestions)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {t('dashboard.needDocumentation')}
              </div>
            </div>
          </div>

          {/* Coverage vs Maturity by Domain */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">{t('dashboard.coverageVsMaturity')}</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('dashboard.domain')}</th>
                    <th>{t('dashboard.nistFunction')}</th>
                    <th>{t('dashboard.coverage')}</th>
                    <th>{t('dashboard.maturity')}</th>
                    <th>{t('dashboard.gaps')}</th>
                    <th>{t('dashboard.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.domainMetrics.map(dm => {
                    const status = dm.coverage < 0.5 ? 'incomplete' : 
                                   dm.score < 0.5 ? 'at-risk' : 'on-track';
                    return (
                      <tr key={dm.domainId}>
                        <td className="font-medium">{dm.domainName}</td>
                        <td>
                          <span className="text-xs px-2 py-1 rounded bg-muted">
                            {dm.nistFunction || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${dm.coverage * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs">{Math.round(dm.coverage * 100)}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
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
                        </td>
                        <td className="font-mono">{dm.criticalGaps}</td>
                        <td>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            status === 'incomplete' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            status === 'at-risk' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          )}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evidence Readiness by Ownership */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">{t('dashboard.maturityByOwner')}</h3>
              <div className="space-y-4">
                {ownershipData.map(od => (
                  <div key={od.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{od.name}</span>
                      <span className="font-mono text-sm">{od.score}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${od.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-20">
                        {od.answered}/{od.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">{t('dashboard.frameworkCoverage')}</h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {frameworkCoverage.map(fw => (
                  <div key={fw.framework} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1" title={fw.framework}>{fw.framework}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {fw.answeredQuestions}/{fw.totalQuestions}
                      </span>
                      <span className="font-mono text-sm w-12 text-right">
                        {Math.round(fw.averageScore * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Framework Category Maturity - GRC View */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">{t('dashboard.maturityByFrameworkCategory', 'Maturity by Framework Category')}</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('dashboard.category', 'Category')}</th>
                    <th>{t('assessment.questions')}</th>
                    <th>{t('assessment.answered')}</th>
                    <th>{t('dashboard.coverage')}</th>
                    <th>{t('dashboard.maturity')}</th>
                    <th>{t('dashboard.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {frameworkCategoryData.map(fc => {
                    const status = fc.coverage < 50 ? 'incomplete' : 
                                   fc.score < 50 ? 'at-risk' : 'on-track';
                    return (
                      <tr key={fc.categoryId}>
                        <td className="font-medium">{fc.name}</td>
                        <td className="font-mono">{fc.totalQuestions}</td>
                        <td className="font-mono">{fc.answeredQuestions}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${fc.coverage}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs">{fc.coverage}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full" 
                                style={{ 
                                  width: `${fc.score}%`,
                                  backgroundColor: fc.maturityLevel.color 
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs">{fc.score}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            status === 'incomplete' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            status === 'at-risk' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          )}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subcategories with Low Evidence */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">{t('dashboard.lowEvidenceSubcategories', 'Subcategories with Low Evidence Readiness')}</h3>
            <div className="space-y-2">
              {metrics.domainMetrics
                .flatMap(dm => dm.subcategoryMetrics)
                .filter(sm => sm.answeredQuestions > 0 && sm.score < 0.7)
                .sort((a, b) => a.score - b.score)
                .slice(0, 8)
                .map(sm => (
                  <div 
                    key={sm.subcatId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{sm.subcatName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sm.ownershipType || 'GRC'} · {sm.answeredQuestions}/{sm.totalQuestions} {t('assessment.questions').toLowerCase()}
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
        </>
      )}

      {/* Specialist View */}
      {persona === 'specialist' && (
        <>
          {/* Specialist KPIs */}
          <div className="stats-grid">
            <div className="kpi-card">
              <div className="kpi-label">{t('dashboard.totalQuestions')}</div>
              <div className="kpi-value">{metrics.totalQuestions}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {t('dashboard.inDomains', { count: domains.length })}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">{t('assessment.answered')}</div>
              <div className="kpi-value">{metrics.answeredQuestions}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {Math.round(metrics.coverage * 100)}% {t('dashboard.coverage').toLowerCase()}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">{t('dashboard.missingControls', 'Missing Controls')}</div>
              <div className="kpi-value text-destructive">
                {criticalGaps.filter(g => g.response === 'Não' || g.response === 'Não respondido').length}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {t('dashboard.noOrUnanswered', '"No" or unanswered')}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">{t('dashboard.partialControls', 'Partial Controls')}</div>
              <div className="kpi-value text-amber-600">
                {Array.from(answers.values()).filter(a => a.response === 'Parcial').length}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {t('dashboard.incompleteImplementation', 'Incomplete implementation')}
              </div>
            </div>
          </div>

          {/* Full Domain Breakdown */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">{t('dashboard.domainBreakdown', 'Domain Breakdown')}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value}%`, 
                      name === 'score' ? t('dashboard.maturity') : t('dashboard.coverage')
                    ]}
                    labelFormatter={(label) => domainChartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="score" name="score" radius={[0, 4, 4, 0]}>
                    {domainChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subcategory Heatmap */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">{t('dashboard.subcategoryHeatmap', 'Subcategory Heatmap')}</h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
              {metrics.domainMetrics.flatMap(dm => 
                dm.subcategoryMetrics.map(sm => (
                  <div
                    key={sm.subcatId}
                    className="heatmap-cell aspect-square flex items-center justify-center text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: sm.maturityLevel.color }}
                    title={`${sm.subcatName}: ${Math.round(sm.score * 100)}% (${sm.criticality})`}
                    onClick={() => navigate('/assessment')}
                  >
                    {Math.round(sm.score * 100)}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              {maturityLevels.map(level => (
                <div key={level.level} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: level.color }} />
                  <span>{level.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Gap List */}
          {criticalGaps.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">{t('dashboard.technicalGapList', 'Technical Gap List')}</h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>{t('dashboard.subcategory', 'Subcategory')}</th>
                      <th>{t('dashboard.question', 'Question')}</th>
                      <th>{t('dashboard.status')}</th>
                      <th>{t('assessment.criticality')}</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalGaps.map(gap => (
                      <tr key={gap.questionId}>
                        <td className="font-mono text-xs whitespace-nowrap">{gap.questionId}</td>
                        <td className="whitespace-nowrap">{gap.subcatName}</td>
                        <td className="max-w-md">
                          <p className="truncate">{gap.questionText}</p>
                        </td>
                        <td>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            gap.response === 'Não respondido' ? 'bg-gray-100 text-gray-700' :
                            gap.response === 'Não' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          )}>
                            {gap.response}
                          </span>
                        </td>
                        <td>
                          <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                            {gap.criticality}
                          </span>
                        </td>
                        <td className="font-mono">{Math.round(gap.effectiveScore * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Framework Category Cards - Specialist View */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">{t('dashboard.maturityByFrameworkCategory', 'Maturity by Framework Category')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.frameworkAlignmentDesc', 'Alignment with reference frameworks for financial institutions')}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworkCategoryData.map(fc => (
                <div key={fc.categoryId} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{fc.name}</span>
                    <span 
                      className="text-lg font-bold"
                      style={{ color: fc.maturityLevel.color }}
                    >
                      {fc.score}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full transition-all" 
                      style={{ 
                        width: `${fc.score}%`,
                        backgroundColor: fc.maturityLevel.color 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fc.answeredQuestions}/{fc.totalQuestions} {t('assessment.questions').toLowerCase()}</span>
                    <span>{fc.coverage}% {t('dashboard.coverage').toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Framework Coverage */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">{t('dashboard.detailedFrameworkCoverage', 'Detailed Framework Coverage')}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {frameworkCoverage.map(fw => (
                <div key={fw.framework} className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm truncate" title={fw.framework}>
                    {fw.framework}
                  </div>
                  <div className="text-2xl font-bold mt-1">{Math.round(fw.averageScore * 100)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {fw.answeredQuestions}/{fw.totalQuestions} {t('assessment.questions').toLowerCase()}
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${fw.coverage * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
