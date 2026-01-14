import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { domains, maturityLevels } from '@/lib/dataset';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage } from '@/lib/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { cn } from '@/lib/utils';
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

type CriticalityFilter = 'all' | 'Critical' | 'High' | 'Medium' | 'Low';
type ResponseFilter = 'all' | 'Não' | 'Parcial' | 'Não respondido';
type SortField = 'criticality' | 'score' | 'subcategory' | 'domain';
type SortOrder = 'asc' | 'desc';

const criticalityOrder: Record<string, number> = {
  'Critical': 4,
  'High': 3,
  'Medium': 2,
  'Low': 1,
};

export default function DashboardSpecialist() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState<CriticalityFilter>('all');
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('criticality');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedHeatmapDomain, setSelectedHeatmapDomain] = useState<string>('all');
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set());

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const allCriticalGaps = useMemo(() => getCriticalGaps(answers, 0.5), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers), [answers]);

  // Response distribution for pie chart
  const responseDistribution = useMemo(() => {
    const dist = { Sim: 0, Parcial: 0, Não: 0, NA: 0, 'Não respondido': 0 };
    const allQuestions = metrics.totalQuestions;
    
    answers.forEach(a => {
      if (a.response && dist[a.response as keyof typeof dist] !== undefined) {
        dist[a.response as keyof typeof dist]++;
      }
    });
    dist['Não respondido'] = allQuestions - answers.size;

    return [
      { name: 'Sim', value: dist.Sim, color: 'hsl(142, 71%, 45%)' },
      { name: 'Parcial', value: dist.Parcial, color: 'hsl(45, 93%, 47%)' },
      { name: 'Não', value: dist.Não, color: 'hsl(0, 72%, 51%)' },
      { name: 'N/A', value: dist.NA, color: 'hsl(220, 9%, 46%)' },
      { name: 'Pendente', value: dist['Não respondido'], color: 'hsl(220, 15%, 80%)' },
    ].filter(d => d.value > 0);
  }, [answers, metrics.totalQuestions]);

  // Unique domains for filter
  const domainOptions = useMemo(() => {
    return domains.map(d => ({ id: d.domainId, name: d.domainName }));
  }, []);

  // Filtered and sorted gaps
  const filteredGaps = useMemo(() => {
    let filtered = allCriticalGaps.filter(gap => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!gap.questionText.toLowerCase().includes(search) &&
            !gap.subcatName.toLowerCase().includes(search) &&
            !gap.questionId.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Criticality filter
      if (criticalityFilter !== 'all' && gap.criticality !== criticalityFilter) {
        return false;
      }

      // Response filter
      if (responseFilter !== 'all' && gap.response !== responseFilter) {
        return false;
      }

      // Domain filter
      if (domainFilter !== 'all' && gap.domainId !== domainFilter) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'criticality':
          comparison = (criticalityOrder[a.criticality] || 0) - (criticalityOrder[b.criticality] || 0);
          break;
        case 'score':
          comparison = a.effectiveScore - b.effectiveScore;
          break;
        case 'subcategory':
          comparison = a.subcatName.localeCompare(b.subcatName);
          break;
        case 'domain':
          comparison = a.domainId.localeCompare(b.domainId);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allCriticalGaps, searchTerm, criticalityFilter, responseFilter, domainFilter, sortField, sortOrder]);

  // Filtered heatmap data
  const heatmapData = useMemo(() => {
    if (selectedHeatmapDomain === 'all') {
      return metrics.domainMetrics.flatMap(dm => dm.subcategoryMetrics);
    }
    const domain = metrics.domainMetrics.find(dm => dm.domainId === selectedHeatmapDomain);
    return domain ? domain.subcategoryMetrics : [];
  }, [metrics.domainMetrics, selectedHeatmapDomain]);

  // Quick stats
  const quickStats = useMemo(() => ({
    totalGaps: allCriticalGaps.length,
    criticalCount: allCriticalGaps.filter(g => g.criticality === 'Critical').length,
    highCount: allCriticalGaps.filter(g => g.criticality === 'High').length,
    notRespondedCount: allCriticalGaps.filter(g => g.response === 'Não respondido').length,
    noCount: allCriticalGaps.filter(g => g.response === 'Não').length,
    partialCount: allCriticalGaps.filter(g => g.response === 'Parcial').length,
  }), [allCriticalGaps]);

  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName.length > 15 ? dm.domainName.slice(0, 13) + '...' : dm.domainName,
    fullName: dm.domainName,
    score: Math.round(dm.score * 100),
    coverage: Math.round(dm.coverage * 100),
    level: dm.maturityLevel.level,
    color: dm.maturityLevel.color,
    nistFunction: dm.nistFunction,
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

  // Group frameworks by category for better navigation
  const groupedFrameworks = useMemo(() => {
    const groups: Record<string, typeof frameworkCoverage> = {};
    frameworkCoverage.forEach(fw => {
      // Extract category from framework name
      const category = fw.framework.split(' ')[0] || 'Outros';
      if (!groups[category]) groups[category] = [];
      groups[category].push(fw);
    });
    return groups;
  }, [frameworkCoverage]);

  const clearFilters = () => {
    setSearchTerm('');
    setCriticalityFilter('all');
    setResponseFilter('all');
    setDomainFilter('all');
    setSortField('criticality');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || criticalityFilter !== 'all' || responseFilter !== 'all' || domainFilter !== 'all';

  const toggleFrameworkExpanded = (category: string) => {
    setExpandedFrameworks(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Especialista</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Arquiteto / Engenheiro - Detalhes técnicos e implementação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reports')}
          >
            Exportar Dados
          </Button>
        </div>
      </div>

      {answers.size === 0 && (
        <div className="card-elevated p-6 text-center">
          <p className="text-muted-foreground">Nenhuma avaliação realizada ainda.</p>
        </div>
      )}

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={criticalityFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setCriticalityFilter('all')}
        >
          Todos Gaps ({quickStats.totalGaps})
        </Badge>
        <Badge 
          variant={criticalityFilter === 'Critical' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            criticalityFilter !== 'Critical' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
          )}
          onClick={() => setCriticalityFilter('Critical')}
        >
          Críticos ({quickStats.criticalCount})
        </Badge>
        <Badge 
          variant={criticalityFilter === 'High' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            criticalityFilter !== 'High' && "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-300"
          )}
          onClick={() => setCriticalityFilter('High')}
        >
          Alto ({quickStats.highCount})
        </Badge>
        <span className="border-l border-border mx-2" />
        <Badge 
          variant={responseFilter === 'Não respondido' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            responseFilter !== 'Não respondido' && "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300"
          )}
          onClick={() => setResponseFilter(responseFilter === 'Não respondido' ? 'all' : 'Não respondido')}
        >
          Pendentes ({quickStats.notRespondedCount})
        </Badge>
        <Badge 
          variant={responseFilter === 'Não' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            responseFilter !== 'Não' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
          )}
          onClick={() => setResponseFilter(responseFilter === 'Não' ? 'all' : 'Não')}
        >
          Ausentes ({quickStats.noCount})
        </Badge>
        <Badge 
          variant={responseFilter === 'Parcial' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            responseFilter !== 'Parcial' && "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300"
          )}
          onClick={() => setResponseFilter(responseFilter === 'Parcial' ? 'all' : 'Parcial')}
        >
          Parciais ({quickStats.partialCount})
        </Badge>
      </div>

      {/* Specialist KPIs */}
      <div className="stats-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total de Perguntas</div>
          <div className="kpi-value">{metrics.totalQuestions}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Em {domains.length} domínios
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Respondidas</div>
          <div className="kpi-value">{metrics.answeredQuestions}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {Math.round(metrics.coverage * 100)}% de cobertura
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Controles Ausentes</div>
          <div className="kpi-value text-destructive">
            {quickStats.noCount + quickStats.notRespondedCount}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Resposta "Não" ou pendente
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Controles Parciais</div>
          <div className="kpi-value text-amber-600">
            {quickStats.partialCount}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Implementação incompleta
          </div>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="gaps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gaps">Gaps Técnicos</TabsTrigger>
          <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="domains">Por Domínio</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
        </TabsList>

        {/* Technical Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por ID, texto ou subcategoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full font-mono"
              />
            </div>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Domínio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Domínios</SelectItem>
                {domainOptions.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="criticality">Criticidade</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="subcategory">Subcategoria</SelectItem>
                <SelectItem value="domain">Domínio</SelectItem>
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
                Limpar
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredGaps.length} de {allCriticalGaps.length} gaps
          </div>

          {/* Gaps Table */}
          {filteredGaps.length > 0 ? (
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-[100px]">ID</th>
                      <th>Subcategoria</th>
                      <th className="max-w-md">Pergunta</th>
                      <th className="w-[100px]">Status</th>
                      <th className="w-[100px]">Criticidade</th>
                      <th className="w-[80px]">Score</th>
                      <th className="w-[80px]">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGaps.slice(0, 50).map(gap => (
                      <tr key={gap.questionId} className="group">
                        <td className="font-mono text-xs whitespace-nowrap">{gap.questionId}</td>
                        <td className="whitespace-nowrap text-sm">{gap.subcatName}</td>
                        <td className="max-w-md">
                          <p className="text-sm line-clamp-2" title={gap.questionText}>
                            {gap.questionText}
                          </p>
                        </td>
                        <td>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded whitespace-nowrap",
                            gap.response === 'Não respondido' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            gap.response === 'Não' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          )}>
                            {gap.response}
                          </span>
                        </td>
                        <td>
                          <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                            {gap.criticality}
                          </span>
                        </td>
                        <td className="font-mono text-sm">{Math.round(gap.effectiveScore * 100)}%</td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => navigate(`/assessment?q=${gap.questionId}`)}
                          >
                            Ir →
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredGaps.length > 50 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
                  Mostrando 50 de {filteredGaps.length} gaps. Use os filtros para refinar a busca.
                </div>
              )}
            </div>
          ) : (
            <div className="card-elevated p-8 text-center text-muted-foreground">
              {hasActiveFilters 
                ? 'Nenhum gap encontrado com os filtros aplicados.' 
                : 'Nenhum gap técnico identificado ainda.'}
            </div>
          )}
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={selectedHeatmapDomain} onValueChange={setSelectedHeatmapDomain}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por domínio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Domínios</SelectItem>
                {domainOptions.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4 text-xs">
              {maturityLevels.map(level => (
                <div key={level.level} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: level.color }} />
                  <span>{level.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">
              Mapa de Calor por Subcategoria
              {selectedHeatmapDomain !== 'all' && (
                <span className="font-normal text-muted-foreground ml-2">
                  ({heatmapData.length} subcategorias)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1">
              {heatmapData.map(sm => (
                <div
                  key={sm.subcatId}
                  className="heatmap-cell aspect-square flex items-center justify-center text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity relative group"
                  style={{ backgroundColor: sm.maturityLevel.color }}
                  onClick={() => navigate('/assessment')}
                >
                  {Math.round(sm.score * 100)}
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                    <div className="font-medium">{sm.subcatName}</div>
                    <div className="text-muted-foreground">
                      {sm.criticality} · {sm.answeredQuestions}/{sm.totalQuestions} resp.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Distribuição de Respostas</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={responseDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {responseDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Resumo por Criticidade</h3>
              <div className="space-y-4">
                {['Critical', 'High', 'Medium', 'Low'].map(crit => {
                  const count = allCriticalGaps.filter(g => g.criticality === crit).length;
                  const percent = allCriticalGaps.length > 0 ? (count / allCriticalGaps.length) * 100 : 0;
                  return (
                    <div key={crit}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("criticality-badge", `criticality-${crit.toLowerCase()}`)}>
                          {crit}
                        </span>
                        <span className="font-mono text-sm">{count} gaps</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full",
                            crit === 'Critical' ? 'bg-red-500' :
                            crit === 'High' ? 'bg-orange-500' :
                            crit === 'Medium' ? 'bg-blue-500' :
                            'bg-gray-400'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Detalhamento por Domínio</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value}%`, 
                      name === 'score' ? 'Maturidade' : 'Cobertura'
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

          {/* Domain Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.domainMetrics.map(dm => (
              <div 
                key={dm.domainId}
                className="card-elevated p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setDomainFilter(dm.domainId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{dm.domainName}</h4>
                  <span 
                    className="text-lg font-bold"
                    style={{ color: dm.maturityLevel.color }}
                  >
                    {Math.round(dm.score * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {dm.nistFunction && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">
                      {dm.nistFunction}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {dm.criticalGaps} gaps
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all" 
                    style={{ 
                      width: `${dm.score * 100}%`,
                      backgroundColor: dm.maturityLevel.color 
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{dm.answeredQuestions}/{dm.totalQuestions} perguntas</span>
                  <span>{Math.round(dm.coverage * 100)}% cobertura</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4">
          {/* Framework Categories */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Maturidade por Categoria de Framework</h3>
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
                    <span>{fc.answeredQuestions}/{fc.totalQuestions} perguntas</span>
                    <span>{fc.coverage}% cobertura</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grouped Framework Coverage */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Cobertura Detalhada por Framework</h3>
            <div className="space-y-2">
              {Object.entries(groupedFrameworks).map(([category, frameworks]) => (
                <Collapsible
                  key={category}
                  open={expandedFrameworks.has(category)}
                  onOpenChange={() => toggleFrameworkExpanded(category)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{category}</span>
                        <span className="text-xs text-muted-foreground">
                          {frameworks.length} frameworks
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm">
                          {Math.round(frameworks.reduce((acc, fw) => acc + fw.averageScore, 0) / frameworks.length * 100)}% média
                        </span>
                        <span className="text-muted-foreground">
                          {expandedFrameworks.has(category) ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                      {frameworks.map(fw => (
                        <div key={fw.framework} className="p-3 bg-background rounded-lg border border-border">
                          <div className="font-medium text-sm truncate" title={fw.framework}>
                            {fw.framework}
                          </div>
                          <div className="text-xl font-bold mt-1">{Math.round(fw.averageScore * 100)}%</div>
                          <div className="text-xs text-muted-foreground">
                            {fw.answeredQuestions}/{fw.totalQuestions} perguntas
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
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
