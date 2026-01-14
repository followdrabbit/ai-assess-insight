import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie } from 'recharts';
import { cn } from '@/lib/utils';
import { 
  MaturityScoreHelp, 
  CoverageHelp, 
  EvidenceReadinessHelp, 
  CriticalGapsHelp,
  NistFunctionHelp 
} from '@/components/HelpTooltip';
import { OverallMetrics, CriticalGap, RoadmapItem, FrameworkCoverage } from '@/lib/scoring';
import { FrameworkCategoryId } from '@/lib/dataset';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Framework, getFrameworkById } from '@/lib/frameworks';
import { getQuestionFrameworkIds } from '@/lib/frameworks';

// NIST AI RMF function display names
const nistFunctionLabels: Record<string, string> = {
  GOVERN: 'Governar',
  MAP: 'Mapear',
  MEASURE: 'Medir',
  MANAGE: 'Gerenciar',
};

const nistFunctionColors: Record<string, string> = {
  GOVERN: 'hsl(var(--chart-1))',
  MAP: 'hsl(var(--chart-2))',
  MEASURE: 'hsl(var(--chart-3))',
  MANAGE: 'hsl(var(--chart-4))',
};

// Rationalized Framework Categories - Authoritative Set Only
const frameworkCategoryLabels: Record<FrameworkCategoryId, string> = {
  NIST_AI_RMF: 'NIST AI RMF',
  SECURITY_BASELINE: 'ISO 27001/27002',
  AI_RISK_MGMT: 'ISO 23894 / Gestão de Riscos',
  SECURE_DEVELOPMENT: 'NIST SSDF / CSA',
  PRIVACY_LGPD: 'LGPD / Privacidade',
  THREAT_EXPOSURE: 'OWASP LLM + API',
};

const frameworkCategoryColors: Record<FrameworkCategoryId, string> = {
  NIST_AI_RMF: 'hsl(var(--chart-1))',
  SECURITY_BASELINE: 'hsl(var(--chart-2))',
  AI_RISK_MGMT: 'hsl(var(--chart-3))',
  SECURE_DEVELOPMENT: 'hsl(var(--chart-4))',
  PRIVACY_LGPD: 'hsl(var(--chart-5))',
  THREAT_EXPOSURE: 'hsl(221, 83%, 53%)',
};

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
  activeQuestions
}: ExecutiveDashboardProps) {
  const navigate = useNavigate();
  
  // Filter states
  const [criticalityFilter, setCriticalityFilter] = useState<CriticalityFilter>('all');
  const [nistFilter, setNistFilter] = useState<NistFunctionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGaps, setShowAllGaps] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Calculate correct coverage based on active questions
  const coverageStats = useMemo(() => {
    const totalQuestions = activeQuestions.length;
    let answeredCount = 0;
    activeQuestions.forEach(q => {
      // Check if we have a valid answer for this question
      // We need to check if the question has a response in criticalGaps or isn't in gaps (meaning it's answered/ok)
      const gap = criticalGaps.find(g => g.questionId === q.questionId);
      if (gap && gap.response !== 'Não respondido') {
        answeredCount++;
      } else if (!gap) {
        // If not in gaps, check if it might be answered (NA or above threshold)
        answeredCount++;
      }
    });
    // For a more accurate count, count questions where we have actual responses
    // This is a simplified approximation
    const coverage = totalQuestions > 0 ? Math.min(answeredCount / totalQuestions, 1) : 0;
    return {
      total: totalQuestions,
      answered: Math.min(answeredCount, totalQuestions),
      pending: Math.max(0, totalQuestions - answeredCount),
      coverage
    };
  }, [activeQuestions, criticalGaps]);

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

  const nistFunctionData = metrics.nistFunctionMetrics.map(nf => ({
    function: nistFunctionLabels[nf.function] || nf.function,
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

  const selectAllFrameworks = () => {
    onFrameworkSelectionChange(enabledFrameworks.map(f => f.frameworkId));
  };

  const clearFrameworkSelection = () => {
    onFrameworkSelectionChange([]);
  };

  // Categorize frameworks
  const frameworksByCategory = useMemo(() => {
    const categories: Record<string, Framework[]> = {
      core: [],
      'high-value': [],
      'tech-focused': []
    };
    enabledFrameworks.forEach(f => {
      if (categories[f.category]) {
        categories[f.category].push(f);
      }
    });
    return categories;
  }, [enabledFrameworks]);

  const categoryLabels: Record<string, string> = {
    core: 'Principais',
    'high-value': 'Alto Valor',
    'tech-focused': 'Técnicos'
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Header with Framework Selector */}
      <div className="card-elevated p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-primary">Resumo Executivo - Maturidade em Segurança de IA</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Visão consolidada para tomada de decisão estratégica
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/reports')}
              >
                Exportar Relatório
              </Button>
            </div>
          </div>

          {/* Framework Selector */}
          <div className="border-t pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Frameworks em Análise</span>
                <span className="text-xs text-muted-foreground">
                  ({selectedFrameworkIds.length === 0 ? 'Todos' : `${selectedFrameworkIds.length} selecionados`})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={selectAllFrameworks}
                >
                  Selecionar Todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={clearFrameworkSelection}
                  disabled={selectedFrameworkIds.length === 0}
                >
                  Limpar Seleção
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Gerenciar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-popover" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Frameworks Habilitados</h4>
                        <span className="text-xs text-muted-foreground">
                          {enabledFrameworks.length} disponíveis
                        </span>
                      </div>
                      
                      {Object.entries(frameworksByCategory).map(([category, frameworks]) => (
                        frameworks.length > 0 && (
                          <div key={category}>
                            <h5 className="text-xs font-medium text-muted-foreground mb-2">
                              {categoryLabels[category]}
                            </h5>
                            <div className="space-y-2">
                              {frameworks.map(fw => (
                                <div 
                                  key={fw.frameworkId}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    id={fw.frameworkId}
                                    checked={selectedFrameworkIds.includes(fw.frameworkId)}
                                    onCheckedChange={() => toggleFramework(fw.frameworkId)}
                                  />
                                  <label 
                                    htmlFor={fw.frameworkId}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {fw.shortName}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                      
                      <div className="pt-2 border-t">
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs"
                          onClick={() => navigate('/settings')}
                        >
                          Configurar frameworks habilitados
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Framework Pills */}
            <div className="flex flex-wrap gap-2">
              {enabledFrameworks.map(fw => {
                const isSelected = selectedFrameworkIds.length === 0 || selectedFrameworkIds.includes(fw.frameworkId);
                return (
                  <Badge
                    key={fw.frameworkId}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all",
                      isSelected 
                        ? "bg-primary hover:bg-primary/90" 
                        : "opacity-50 hover:opacity-100"
                    )}
                    onClick={() => toggleFramework(fw.frameworkId)}
                  >
                    {fw.shortName}
                  </Badge>
                );
              })}
            </div>

            {selectedFrameworkIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Exibindo dados apenas para os frameworks selecionados. Clique em um framework para alternar.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Executive KPI Cards - Enhanced with staggered animations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="kpi-card relative overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full" />
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Score Geral</div>
            <MaturityScoreHelp />
          </div>
          <div className="kpi-value" style={{ color: metrics.maturityLevel.color }}>
            {Math.round(metrics.overallScore * 100)}%
          </div>
          <div className={cn("maturity-badge mt-2", `maturity-${metrics.maturityLevel.level}`)}>
            Nível {metrics.maturityLevel.level}: {metrics.maturityLevel.name}
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            Meta recomendada: 70%+
          </div>
        </div>

        <div 
          className="kpi-card relative overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '75ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/10 rounded-bl-full" />
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Gaps Críticos</div>
            <CriticalGapsHelp />
          </div>
          <div className="kpi-value text-destructive">{filteredByFramework.gaps.length}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Requerem ação prioritária
          </div>
          <div className="mt-3 pt-3 border-t text-xs">
            <span className={cn(
              filteredByFramework.gaps.length === 0 ? 'text-green-600' :
              filteredByFramework.gaps.length <= 5 ? 'text-amber-600' : 'text-red-600'
            )}>
              {filteredByFramework.gaps.length === 0 ? 'Excelente' :
               filteredByFramework.gaps.length <= 5 ? 'Atenção necessária' : 'Ação imediata'}
            </span>
          </div>
        </div>

        <div 
          className="kpi-card relative overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full" />
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Cobertura</div>
            <CoverageHelp />
          </div>
          <div className="kpi-value">{Math.round(coverageStats.coverage * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            {coverageStats.answered} de {coverageStats.total} perguntas
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {coverageStats.pending} perguntas pendentes
          </div>
        </div>

        <div 
          className="kpi-card relative overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '225ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full" />
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Prontidão de Evidências</div>
            <EvidenceReadinessHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.evidenceReadiness * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            Documentação disponível
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            Preparação para auditoria
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* NIST AI RMF Radar */}
        <div 
          className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Funções NIST AI RMF</h3>
            <NistFunctionHelp />
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
            <h3 className="font-semibold text-sm">Maturidade por Domínio</h3>
            {nistFilter !== 'all' && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                Filtro: {nistFunctionLabels[nistFilter]}
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
          <h3 className="font-semibold text-sm mb-4">Distribuição de Riscos</h3>
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
          <h3 className="font-semibold mb-4">Cobertura por Framework</h3>
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

      {/* Strategic Roadmap */}
      {filteredByFramework.roadmapItems.length > 0 && (
        <div 
          className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '850ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Roadmap Estratégico</h3>
              <p className="text-xs text-muted-foreground mt-1">Ações prioritárias para os próximos 90 dias</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" /> 0-30 dias
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" /> 30-60 dias
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> 60-90 dias
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {['immediate', 'short', 'medium'].map((priority, idx) => {
              const items = filteredByFramework.roadmapItems.filter(r => r.priority === priority);
              const config = {
                immediate: { label: '0-30 dias', color: 'border-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
                short: { label: '30-60 dias', color: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                medium: { label: '60-90 dias', color: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
              }[priority]!;
              
              return (
                <div 
                  key={priority} 
                  className={cn(
                    "rounded-lg p-4 border-l-4 animate-in fade-in-0 slide-in-from-left-4 duration-400",
                    config.color, 
                    config.bg
                  )}
                  style={{ animationDelay: `${950 + idx * 100}ms`, animationFillMode: 'backwards' }}
                >
                  <h4 className="font-medium text-sm mb-3">{config.label}</h4>
                  <div className="space-y-2">
                    {items.length > 0 ? items.map((item, itemIdx) => (
                      <div key={itemIdx} className="text-xs">
                        <p className="font-medium">{item.action}</p>
                        <p className="text-muted-foreground mt-0.5">{item.domain} · {item.ownershipType}</p>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground">Nenhuma ação pendente</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Critical Gaps with Filters */}
      <div 
        className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '1000ms', animationFillMode: 'backwards' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold">Gaps Críticos</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredGaps.length} gaps encontrados
              {hasActiveFilters && ` (de ${filteredByFramework.gaps.length} total)`}
            </p>
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
                    {nistFunctionLabels[gap.nistFunction]}
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
    </div>
  );
}
