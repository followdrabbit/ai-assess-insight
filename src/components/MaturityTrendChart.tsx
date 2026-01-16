import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMaturitySnapshots, MaturitySnapshot } from '@/lib/database';
import { cn } from '@/lib/utils';

interface MaturityTrendChartProps {
  className?: string;
}

const domainColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(221, 83%, 53%)',
  'hsl(280, 65%, 60%)',
  'hsl(30, 80%, 55%)',
];

const frameworkColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(221, 83%, 53%)',
  'hsl(340, 75%, 55%)',
  'hsl(160, 60%, 45%)',
];

export default function MaturityTrendChart({ className }: MaturityTrendChartProps) {
  const [snapshots, setSnapshots] = useState<MaturitySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState<string>('90');
  const [activeTab, setActiveTab] = useState('overall');

  useEffect(() => {
    const loadSnapshots = async () => {
      setLoading(true);
      try {
        const data = await getMaturitySnapshots(parseInt(daysBack));
        setSnapshots(data);
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSnapshots();
  }, [daysBack]);

  // Transform data for overall chart
  const overallChartData = useMemo(() => {
    return snapshots.map(s => ({
      date: s.snapshotDate,
      dateFormatted: format(parseISO(s.snapshotDate), 'dd/MM', { locale: ptBR }),
      score: Math.round(s.overallScore * 100),
      coverage: Math.round(s.overallCoverage * 100),
      evidence: Math.round(s.evidenceReadiness * 100),
      gaps: s.criticalGaps
    }));
  }, [snapshots]);

  // Transform data for domain chart
  const domainChartData = useMemo(() => {
    if (snapshots.length === 0) return [];
    
    // Get unique domains from all snapshots
    const allDomains = new Set<string>();
    snapshots.forEach(s => {
      s.domainMetrics.forEach(dm => allDomains.add(dm.domainId));
    });

    return snapshots.map(s => {
      const entry: Record<string, any> = {
        date: s.snapshotDate,
        dateFormatted: format(parseISO(s.snapshotDate), 'dd/MM', { locale: ptBR }),
      };
      
      s.domainMetrics.forEach(dm => {
        entry[dm.domainId] = Math.round(dm.score * 100);
        entry[`${dm.domainId}_name`] = dm.domainName;
      });
      
      return entry;
    });
  }, [snapshots]);

  // Get unique domains for legend
  const uniqueDomains = useMemo(() => {
    if (snapshots.length === 0) return [];
    const domains = new Map<string, string>();
    snapshots.forEach(s => {
      s.domainMetrics.forEach(dm => {
        if (!domains.has(dm.domainId)) {
          domains.set(dm.domainId, dm.domainName);
        }
      });
    });
    return Array.from(domains.entries());
  }, [snapshots]);

  // Transform data for framework chart
  const frameworkChartData = useMemo(() => {
    if (snapshots.length === 0) return [];
    
    return snapshots.map(s => {
      const entry: Record<string, any> = {
        date: s.snapshotDate,
        dateFormatted: format(parseISO(s.snapshotDate), 'dd/MM', { locale: ptBR }),
      };
      
      s.frameworkMetrics.forEach(fm => {
        const key = fm.framework.replace(/[^a-zA-Z0-9]/g, '_');
        entry[key] = Math.round(fm.score * 100);
        entry[`${key}_name`] = fm.framework;
      });
      
      return entry;
    });
  }, [snapshots]);

  // Get unique frameworks for legend
  const uniqueFrameworks = useMemo(() => {
    if (snapshots.length === 0) return [];
    const frameworks = new Map<string, string>();
    snapshots.forEach(s => {
      s.frameworkMetrics.forEach(fm => {
        const key = fm.framework.replace(/[^a-zA-Z0-9]/g, '_');
        if (!frameworks.has(key)) {
          frameworks.set(key, fm.framework);
        }
      });
    });
    return Array.from(frameworks.entries());
  }, [snapshots]);

  // Period comparison data (current month vs previous month)
  const periodComparison = useMemo(() => {
    if (snapshots.length === 0) return null;

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthSnapshots = snapshots.filter(s => {
      const date = parseISO(s.snapshotDate);
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    });

    const previousMonthSnapshots = snapshots.filter(s => {
      const date = parseISO(s.snapshotDate);
      return isWithinInterval(date, { start: previousMonthStart, end: previousMonthEnd });
    });

    if (currentMonthSnapshots.length === 0 && previousMonthSnapshots.length === 0) {
      return null;
    }

    const avgMetric = (snaps: MaturitySnapshot[], key: 'overallScore' | 'overallCoverage' | 'evidenceReadiness' | 'criticalGaps') => {
      if (snaps.length === 0) return 0;
      return snaps.reduce((sum, s) => sum + (key === 'criticalGaps' ? s[key] : s[key] * 100), 0) / snaps.length;
    };

    const currentMonth = {
      label: format(currentMonthStart, 'MMMM yyyy', { locale: ptBR }),
      score: Math.round(avgMetric(currentMonthSnapshots, 'overallScore')),
      coverage: Math.round(avgMetric(currentMonthSnapshots, 'overallCoverage')),
      evidence: Math.round(avgMetric(currentMonthSnapshots, 'evidenceReadiness')),
      gaps: Math.round(avgMetric(currentMonthSnapshots, 'criticalGaps')),
      dataPoints: currentMonthSnapshots.length
    };

    const previousMonth = {
      label: format(previousMonthStart, 'MMMM yyyy', { locale: ptBR }),
      score: Math.round(avgMetric(previousMonthSnapshots, 'overallScore')),
      coverage: Math.round(avgMetric(previousMonthSnapshots, 'overallCoverage')),
      evidence: Math.round(avgMetric(previousMonthSnapshots, 'evidenceReadiness')),
      gaps: Math.round(avgMetric(previousMonthSnapshots, 'criticalGaps')),
      dataPoints: previousMonthSnapshots.length
    };

    const variation = {
      score: currentMonth.score - previousMonth.score,
      coverage: currentMonth.coverage - previousMonth.coverage,
      evidence: currentMonth.evidence - previousMonth.evidence,
      gaps: currentMonth.gaps - previousMonth.gaps
    };

    // Chart data for bar comparison
    const barChartData = [
      { metric: 'Maturidade', current: currentMonth.score, previous: previousMonth.score },
      { metric: 'Cobertura', current: currentMonth.coverage, previous: previousMonth.coverage },
      { metric: 'Evidências', current: currentMonth.evidence, previous: previousMonth.evidence },
    ];

    return { currentMonth, previousMonth, variation, barChartData };
  }, [snapshots]);

  // Render trend indicator
  const TrendIndicator = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    const isNeutral = value === 0;
    
    if (isNeutral) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    
    return isPositive ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados históricos...</p>
        </div>
      </Card>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-2">Nenhum dado histórico disponível.</p>
          <p className="text-sm text-muted-foreground">
            Os snapshots são salvos automaticamente diariamente conforme você responde as perguntas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Evolução da Maturidade</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe a evolução dos scores ao longo do tempo
          </p>
        </div>
        <Select value={daysBack} onValueChange={setDaysBack}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overall">Score Geral</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          <TabsTrigger value="domains">Por Domínio</TabsTrigger>
          <TabsTrigger value="frameworks">Por Framework</TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overallChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => `Data: ${label}`}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      score: 'Maturidade',
                      coverage: 'Cobertura',
                      evidence: 'Prontidão Evidências',
                      gaps: 'Gaps Críticos'
                    };
                    return [name === 'gaps' ? value : `${value}%`, labels[name] || name];
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Maturidade"
                />
                <Line 
                  type="monotone" 
                  dataKey="coverage" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Cobertura"
                />
                <Line 
                  type="monotone" 
                  dataKey="evidence" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Evidências"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Summary stats */}
          {overallChartData.length >= 2 && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Variação Maturidade</div>
                <div className={cn(
                  "text-lg font-bold",
                  overallChartData[overallChartData.length - 1].score - overallChartData[0].score >= 0 
                    ? "text-green-600" 
                    : "text-red-600"
                )}>
                  {overallChartData[overallChartData.length - 1].score - overallChartData[0].score >= 0 ? '+' : ''}
                  {overallChartData[overallChartData.length - 1].score - overallChartData[0].score}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Variação Cobertura</div>
                <div className={cn(
                  "text-lg font-bold",
                  overallChartData[overallChartData.length - 1].coverage - overallChartData[0].coverage >= 0 
                    ? "text-green-600" 
                    : "text-red-600"
                )}>
                  {overallChartData[overallChartData.length - 1].coverage - overallChartData[0].coverage >= 0 ? '+' : ''}
                  {overallChartData[overallChartData.length - 1].coverage - overallChartData[0].coverage}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Variação Gaps</div>
                <div className={cn(
                  "text-lg font-bold",
                  overallChartData[overallChartData.length - 1].gaps - overallChartData[0].gaps <= 0 
                    ? "text-green-600" 
                    : "text-red-600"
                )}>
                  {overallChartData[overallChartData.length - 1].gaps - overallChartData[0].gaps <= 0 ? '' : '+'}
                  {overallChartData[overallChartData.length - 1].gaps - overallChartData[0].gaps}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparison">
          {periodComparison ? (
            <div className="space-y-6">
              {/* Period Labels */}
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="capitalize">{periodComparison.currentMonth.label}</span>
                  <span className="text-muted-foreground">({periodComparison.currentMonth.dataPoints} pontos)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                  <span className="capitalize">{periodComparison.previousMonth.label}</span>
                  <span className="text-muted-foreground">({periodComparison.previousMonth.dataPoints} pontos)</span>
                </div>
              </div>

              {/* Bar Chart Comparison */}
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodComparison.barChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                    <XAxis 
                      type="number" 
                      domain={[0, 100]} 
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="metric" 
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`]}
                    />
                    <Bar dataKey="previous" name={periodComparison.previousMonth.label} fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="current" name={periodComparison.currentMonth.label} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Score */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Maturidade</span>
                    <TrendIndicator value={periodComparison.variation.score} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{periodComparison.currentMonth.score}%</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousMonth.score}%</span>
                  </div>
                  <div className={cn(
                    "text-sm font-medium mt-1",
                    periodComparison.variation.score > 0 ? "text-green-600" : 
                    periodComparison.variation.score < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {periodComparison.variation.score > 0 ? '+' : ''}{periodComparison.variation.score}pp
                  </div>
                </div>

                {/* Coverage */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Cobertura</span>
                    <TrendIndicator value={periodComparison.variation.coverage} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{periodComparison.currentMonth.coverage}%</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousMonth.coverage}%</span>
                  </div>
                  <div className={cn(
                    "text-sm font-medium mt-1",
                    periodComparison.variation.coverage > 0 ? "text-green-600" : 
                    periodComparison.variation.coverage < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {periodComparison.variation.coverage > 0 ? '+' : ''}{periodComparison.variation.coverage}pp
                  </div>
                </div>

                {/* Evidence */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Evidências</span>
                    <TrendIndicator value={periodComparison.variation.evidence} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{periodComparison.currentMonth.evidence}%</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousMonth.evidence}%</span>
                  </div>
                  <div className={cn(
                    "text-sm font-medium mt-1",
                    periodComparison.variation.evidence > 0 ? "text-green-600" : 
                    periodComparison.variation.evidence < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {periodComparison.variation.evidence > 0 ? '+' : ''}{periodComparison.variation.evidence}pp
                  </div>
                </div>

                {/* Gaps */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Gaps Críticos</span>
                    <TrendIndicator value={periodComparison.variation.gaps} inverted />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{periodComparison.currentMonth.gaps}</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousMonth.gaps}</span>
                  </div>
                  <div className={cn(
                    "text-sm font-medium mt-1",
                    periodComparison.variation.gaps < 0 ? "text-green-600" : 
                    periodComparison.variation.gaps > 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {periodComparison.variation.gaps > 0 ? '+' : ''}{periodComparison.variation.gaps}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground mb-2">Dados insuficientes para comparação.</p>
              <p className="text-sm text-muted-foreground">
                É necessário ter dados em pelo menos dois meses para visualizar a comparação.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="domains">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={domainChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => `Data: ${label}`}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
                <Legend />
                {uniqueDomains.map(([domainId, domainName], idx) => (
                  <Line 
                    key={domainId}
                    type="monotone" 
                    dataKey={domainId} 
                    stroke={domainColors[idx % domainColors.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={domainName}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="frameworks">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={frameworkChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => `Data: ${label}`}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
                <Legend />
                {uniqueFrameworks.map(([key, name], idx) => (
                  <Line 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    stroke={frameworkColors[idx % frameworkColors.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
