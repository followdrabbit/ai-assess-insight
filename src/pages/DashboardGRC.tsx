import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import { 
  MaturityScoreHelp, 
  CoverageHelp, 
  EvidenceReadinessHelp 
} from '@/components/HelpTooltip';
import { FrameworkCategoryId } from '@/lib/dataset';
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

type StatusFilter = 'all' | 'incomplete' | 'at-risk' | 'on-track';
type SortField = 'name' | 'coverage' | 'maturity' | 'gaps';
type SortOrder = 'asc' | 'desc';

export default function DashboardGRC() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('gaps');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers), [answers]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers), [answers]);

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
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesDomain = dm.domainName.toLowerCase().includes(search);
        const matchesSubcat = dm.subcategoryMetrics.some(sm => 
          sm.subcatName.toLowerCase().includes(search)
        );
        if (!matchesDomain && !matchesSubcat) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const status = getStatus(dm.coverage, dm.score);
        if (status !== statusFilter) return false;
      }

      // Ownership filter (check if any subcategory matches)
      if (ownershipFilter !== 'all') {
        const hasOwnership = dm.subcategoryMetrics.some(sm => 
          sm.ownershipType === ownershipFilter
        );
        if (!hasOwnership) return false;
      }

      return true;
    });

    // Sort
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

  // Framework coverage filtered
  const filteredFrameworkCoverage = useMemo(() => {
    if (!searchTerm) return frameworkCoverage;
    return frameworkCoverage.filter(fw => 
      fw.framework.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [frameworkCoverage, searchTerm]);

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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard GRC</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Governança, Riscos e Compliance - Foco em cobertura e evidências
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reports')}
          >
            Exportar Relatório
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate('/assessment')}
          >
            Continuar Avaliação
          </Button>
        </div>
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

      {/* Quick Status Pills */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setStatusFilter('all')}
        >
          Todos ({quickStats.totalDomains})
        </Badge>
        <Badge 
          variant={statusFilter === 'incomplete' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            statusFilter !== 'incomplete' && "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          )}
          onClick={() => setStatusFilter('incomplete')}
        >
          Incompletos ({quickStats.incompleteCount})
        </Badge>
        <Badge 
          variant={statusFilter === 'at-risk' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            statusFilter !== 'at-risk' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
          )}
          onClick={() => setStatusFilter('at-risk')}
        >
          Em Risco ({quickStats.atRiskCount})
        </Badge>
        <Badge 
          variant={statusFilter === 'on-track' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            statusFilter !== 'on-track' && "bg-green-50 text-green-700 hover:bg-green-100 border-green-300"
          )}
          onClick={() => setStatusFilter('on-track')}
        >
          Adequados ({quickStats.onTrackCount})
        </Badge>
      </div>

      {/* GRC KPI Cards */}
      <div className="stats-grid">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Cobertura Geral</div>
            <CoverageHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.coverage * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            {metrics.answeredQuestions} de {metrics.totalQuestions}
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Prontidão de Evidências</div>
            <EvidenceReadinessHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.evidenceReadiness * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            Para auditoria
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Score Geral</div>
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
          <div className="kpi-label">Gaps Críticos</div>
          <div className="kpi-value text-destructive">
            {quickStats.criticalGapsCount}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Requerem ação imediata
          </div>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">Por Domínio</TabsTrigger>
          <TabsTrigger value="frameworks">Por Framework</TabsTrigger>
          <TabsTrigger value="gaps">Gaps Críticos</TabsTrigger>
          <TabsTrigger value="ownership">Por Responsável</TabsTrigger>
        </TabsList>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar domínios ou subcategorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Responsáveis</SelectItem>
                {ownershipTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaps">Gaps</SelectItem>
                <SelectItem value="coverage">Cobertura</SelectItem>
                <SelectItem value="maturity">Maturidade</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
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
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredDomainMetrics.length} de {metrics.domainMetrics.length} domínios
          </div>

          {/* Domain Cards with Expandable Subcategories */}
          <div className="space-y-3">
            {filteredDomainMetrics.map(dm => {
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
                  <div className="card-elevated overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-left">
                            <h4 className="font-medium">{dm.domainName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                {dm.nistFunction || '-'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {dm.totalQuestions} perguntas
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          {/* Coverage */}
                          <div className="text-center min-w-[80px]">
                            <div className="text-xs text-muted-foreground mb-1">Cobertura</div>
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
                            <div className="text-xs text-muted-foreground mb-1">Maturidade</div>
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
                            <div className="text-xs text-muted-foreground mb-1">Gaps</div>
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
                            {status === 'incomplete' ? 'Incompleto' :
                             status === 'at-risk' ? 'Em Risco' : 'Adequado'}
                          </span>

                          {/* Expand indicator */}
                          <span className="text-muted-foreground">
                            {isExpanded ? '−' : '+'}
                          </span>
                        </div>
                      </div>
                    </CollapsibleTrigger>

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
                                    · {sm.answeredQuestions}/{sm.totalQuestions} perguntas
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
                placeholder="Buscar frameworks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Framework Categories */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Maturidade por Categoria</h3>
              <div className="space-y-4">
                {frameworkCategoryData.map(fc => {
                  const status = fc.coverage < 50 ? 'incomplete' : 
                                 fc.score < 50 ? 'at-risk' : 'on-track';
                  return (
                    <div key={fc.categoryId} className="p-3 border border-border rounded-lg">
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
                          <div className="text-xs text-muted-foreground mb-1">Maturidade</div>
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
                        {fc.answeredQuestions}/{fc.totalQuestions} perguntas respondidas
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Frameworks */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Cobertura por Framework ({filteredFrameworkCoverage.length})</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredFrameworkCoverage.map(fw => (
                  <div 
                    key={fw.framework} 
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded transition-colors"
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
              <h3 className="font-semibold">Gaps Críticos que Requerem Ação</h3>
              <span className="text-sm text-muted-foreground">
                {criticalGaps.length} itens identificados
              </span>
            </div>
            
            {criticalGaps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum gap crítico identificado. Continue o assessment para uma análise completa.
              </div>
            ) : (
              <div className="space-y-3">
                {criticalGaps.slice(0, 20).map((gap, index) => (
                  <div 
                    key={gap.questionId}
                    className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg"
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
                        onClick={() => navigate(`/assessment?q=${gap.questionId}`)}
                      >
                        Revisar
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
              <h3 className="font-semibold mb-4">Maturidade por Responsável</h3>
              <div className="space-y-4">
                {ownershipData.map(od => (
                  <div 
                    key={od.name}
                    className="p-3 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setOwnershipFilter(od.name)}
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
                        {od.answered}/{od.total} resp.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Subcategorias com Baixa Prontidão</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {metrics.domainMetrics
                  .flatMap(dm => dm.subcategoryMetrics)
                  .filter(sm => sm.answeredQuestions > 0 && sm.score < 0.7)
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 15)
                  .map(sm => (
                    <div 
                      key={sm.subcatId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sm.subcatName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sm.ownershipType || 'GRC'} · {sm.answeredQuestions}/{sm.totalQuestions} perguntas
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
    </div>
  );
}
