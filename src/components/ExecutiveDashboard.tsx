import { useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Framework category display names
const frameworkCategoryLabels: Record<FrameworkCategoryId, string> = {
  AI_GOVERNANCE: 'Governança de IA',
  SECURITY_FOUNDATION: 'Fundamentos de Segurança',
  ENGINEERING: 'Engenharia',
  PRIVACY: 'Privacidade',
  FINANCIAL_BR: 'Regulação Financeira BR',
  THREAT_INTELLIGENCE: 'Inteligência de Ameaças',
};

const frameworkCategoryColors: Record<FrameworkCategoryId, string> = {
  AI_GOVERNANCE: 'hsl(var(--chart-1))',
  SECURITY_FOUNDATION: 'hsl(var(--chart-2))',
  ENGINEERING: 'hsl(var(--chart-3))',
  PRIVACY: 'hsl(var(--chart-4))',
  FINANCIAL_BR: 'hsl(var(--chart-5))',
  THREAT_INTELLIGENCE: 'hsl(221, 83%, 53%)',
};

interface ExecutiveDashboardProps {
  metrics: OverallMetrics;
  criticalGaps: CriticalGap[];
  roadmap: RoadmapItem[];
  frameworkCoverage: FrameworkCoverage[];
}

type DomainFilter = 'all' | string;
type CriticalityFilter = 'all' | 'Critical' | 'High' | 'Medium' | 'Low';
type NistFunctionFilter = 'all' | 'GOVERN' | 'MAP' | 'MEASURE' | 'MANAGE';

export function ExecutiveDashboard({ 
  metrics, 
  criticalGaps, 
  roadmap,
  frameworkCoverage 
}: ExecutiveDashboardProps) {
  const navigate = useNavigate();
  
  // Filter states
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<CriticalityFilter>('all');
  const [nistFilter, setNistFilter] = useState<NistFunctionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGaps, setShowAllGaps] = useState(false);

  // Filter critical gaps
  const filteredGaps = useMemo(() => {
    let filtered = [...criticalGaps];
    
    if (domainFilter !== 'all') {
      filtered = filtered.filter(g => g.domainId === domainFilter);
    }
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
  }, [criticalGaps, domainFilter, criticalityFilter, nistFilter, searchQuery]);

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

  // Risk distribution for pie chart
  const riskDistribution = useMemo(() => {
    const distribution = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    criticalGaps.forEach(gap => {
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
  }, [criticalGaps]);

  // Unique domains for filter
  const uniqueDomains = useMemo(() => {
    const domains = new Map<string, string>();
    criticalGaps.forEach(g => domains.set(g.domainId, g.domainName));
    return Array.from(domains.entries());
  }, [criticalGaps]);

  const clearFilters = () => {
    setDomainFilter('all');
    setCriticalityFilter('all');
    setNistFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = domainFilter !== 'all' || criticalityFilter !== 'all' || nistFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Executive Summary Header */}
      <div className="card-elevated p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
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
              onClick={() => navigate('/assessment')}
            >
              Continuar Avaliação
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/reports')}
            >
              Exportar Relatório
            </Button>
          </div>
        </div>
      </div>

      {/* Executive KPI Cards - Enhanced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card relative overflow-hidden">
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

        <div className="kpi-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/10 rounded-bl-full" />
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Gaps Críticos</div>
            <CriticalGapsHelp />
          </div>
          <div className="kpi-value text-destructive">{metrics.criticalGaps}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Requerem ação prioritária
          </div>
          <div className="mt-3 pt-3 border-t text-xs">
            <span className={cn(
              metrics.criticalGaps === 0 ? 'text-green-600' :
              metrics.criticalGaps <= 5 ? 'text-amber-600' : 'text-red-600'
            )}>
              {metrics.criticalGaps === 0 ? 'Excelente' :
               metrics.criticalGaps <= 5 ? 'Atenção necessária' : 'Ação imediata'}
            </span>
          </div>
        </div>

        <div className="kpi-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full" />
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Cobertura</div>
            <CoverageHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.coverage * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            {metrics.answeredQuestions} de {metrics.totalQuestions} perguntas
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {metrics.totalQuestions - metrics.answeredQuestions} perguntas pendentes
          </div>
        </div>

        <div className="kpi-card relative overflow-hidden">
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
        <div className="card-elevated p-6">
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
        <div className="card-elevated p-6">
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
        <div className="card-elevated p-6">
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

      {/* Framework Category Maturity */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold mb-4">Maturidade por Categoria de Framework</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {frameworkCategoryData.map(fc => (
            <div 
              key={fc.categoryId} 
              className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
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
      {roadmap.length > 0 && (
        <div className="card-elevated p-6">
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
            {['immediate', 'short', 'medium'].map(priority => {
              const items = roadmap.filter(r => r.priority === priority);
              const config = {
                immediate: { label: '0-30 dias', color: 'border-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
                short: { label: '30-60 dias', color: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                medium: { label: '60-90 dias', color: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
              }[priority]!;
              
              return (
                <div key={priority} className={cn("rounded-lg p-4 border-l-4", config.color, config.bg)}>
                  <h4 className="font-medium text-sm mb-3">{config.label}</h4>
                  <div className="space-y-2">
                    {items.length > 0 ? items.map((item, idx) => (
                      <div key={idx} className="text-xs">
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
      <div className="card-elevated p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold">Gaps Críticos</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredGaps.length} gaps encontrados
              {hasActiveFilters && ` (de ${criticalGaps.length} total)`}
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
            
            <Select value={domainFilter} onValueChange={(v) => setDomainFilter(v as DomainFilter)}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Domínio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Domínios</SelectItem>
                {uniqueDomains.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={criticalityFilter} onValueChange={(v) => setCriticalityFilter(v as CriticalityFilter)}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Criticidade" />
              </SelectTrigger>
              <SelectContent>
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
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
              onClick={() => navigate('/assessment')}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{gap.subcatName}</p>
                  <p className="text-xs text-muted-foreground truncate">{gap.domainName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {gap.nistFunction && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded hidden md:inline">
                    {nistFunctionLabels[gap.nistFunction]}
                  </span>
                )}
                <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                  {gap.criticality}
                </span>
                <span className="font-mono text-sm w-12 text-right">{Math.round(gap.effectiveScore * 100)}%</span>
              </div>
            </div>
          ))}
          
          {filteredGaps.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
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
