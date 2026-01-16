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
  Cell,
  ReferenceLine
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfQuarter, endOfQuarter, subQuarters, subWeeks, startOfWeek, endOfWeek, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, CalendarIcon, Flag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getMaturitySnapshots, MaturitySnapshot, getChartAnnotations, ChartAnnotation } from '@/lib/database';
import { cn } from '@/lib/utils';
import ChartAnnotations from '@/components/ChartAnnotations';
import { useAnswersStore } from '@/lib/stores';

interface MaturityTrendChartProps {
  className?: string;
  securityDomainId?: string;
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

type ComparisonType = 'month' | 'quarter' | 'week' | '30days' | '90days' | 'custom';

interface CustomDateRange {
  currentStart: Date | undefined;
  currentEnd: Date | undefined;
  previousStart: Date | undefined;
  previousEnd: Date | undefined;
}

// Linear regression calculation
function calculateLinearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Moving average calculation
function calculateMovingAverage(data: number[], windowSize: number): (number | null)[] {
  return data.map((_, index) => {
    if (index < windowSize - 1) return null;
    const window = data.slice(index - windowSize + 1, index + 1);
    return Math.round(window.reduce((a, b) => a + b, 0) / windowSize);
  });
}

export default function MaturityTrendChart({ className, securityDomainId: propDomainId }: MaturityTrendChartProps) {
  const { selectedSecurityDomain } = useAnswersStore();
  const effectiveDomainId = propDomainId || selectedSecurityDomain || undefined;
  
  const [snapshots, setSnapshots] = useState<MaturitySnapshot[]>([]);
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState<string>('90');
  const [activeTab, setActiveTab] = useState('overall');
  const [comparisonType, setComparisonType] = useState<ComparisonType>('month');
  const [showTrendLines, setShowTrendLines] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [showProjection, setShowProjection] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [projectionDays, setProjectionDays] = useState<number>(30);
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    currentStart: subDays(new Date(), 30),
    currentEnd: new Date(),
    previousStart: subDays(new Date(), 60),
    previousEnd: subDays(new Date(), 31),
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [snapshotData, annotationData] = await Promise.all([
          getMaturitySnapshots(parseInt(daysBack), effectiveDomainId),
          getChartAnnotations(effectiveDomainId)
        ]);
        setSnapshots(snapshotData);
        setAnnotations(annotationData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [daysBack, effectiveDomainId]);

  // Transform data for overall chart with trend lines, moving averages and projections
  const { overallChartData, projectionData } = useMemo(() => {
    const baseData = snapshots.map(s => ({
      date: s.snapshotDate,
      dateFormatted: format(parseISO(s.snapshotDate), 'dd/MM', { locale: ptBR }),
      score: Math.round(s.overallScore * 100),
      coverage: Math.round(s.overallCoverage * 100),
      evidence: Math.round(s.evidenceReadiness * 100),
      gaps: s.criticalGaps,
      isProjection: false
    }));

    if (baseData.length < 2) return { overallChartData: baseData, projectionData: null };

    // Calculate regression lines
    const scoreReg = calculateLinearRegression(baseData.map(d => d.score));
    const coverageReg = calculateLinearRegression(baseData.map(d => d.coverage));
    const evidenceReg = calculateLinearRegression(baseData.map(d => d.evidence));

    // Calculate moving averages (window of 3 for smoother lines)
    const windowSize = Math.min(3, Math.floor(baseData.length / 2));
    const scoreMA = calculateMovingAverage(baseData.map(d => d.score), windowSize);
    const coverageMA = calculateMovingAverage(baseData.map(d => d.coverage), windowSize);
    const evidenceMA = calculateMovingAverage(baseData.map(d => d.evidence), windowSize);

    const enrichedData = baseData.map((d, i) => ({
      ...d,
      scoreTrend: Math.round(scoreReg.intercept + scoreReg.slope * i),
      coverageTrend: Math.round(coverageReg.intercept + coverageReg.slope * i),
      evidenceTrend: Math.round(evidenceReg.intercept + evidenceReg.slope * i),
      scoreMA: scoreMA[i],
      coverageMA: coverageMA[i],
      evidenceMA: evidenceMA[i],
      scoreProjection: null as number | null,
      coverageProjection: null as number | null,
      evidenceProjection: null as number | null,
    }));

    // Generate projection data points
    const lastDate = parseISO(baseData[baseData.length - 1].date);
    const n = baseData.length;
    const projectionPoints: typeof enrichedData = [];

    // Add last real data point as starting point for projection
    const lastEnriched = enrichedData[enrichedData.length - 1];
    projectionPoints.push({
      ...lastEnriched,
      scoreProjection: lastEnriched.score,
      coverageProjection: lastEnriched.coverage,
      evidenceProjection: lastEnriched.evidence,
    });

    // Calculate interval between data points (average)
    const avgInterval = baseData.length > 1 
      ? Math.round((parseISO(baseData[baseData.length - 1].date).getTime() - parseISO(baseData[0].date).getTime()) / (baseData.length - 1) / (1000 * 60 * 60 * 24))
      : 3;

    // Generate future projection points
    const numProjectionPoints = Math.ceil(projectionDays / Math.max(avgInterval, 1));
    for (let i = 1; i <= numProjectionPoints; i++) {
      const futureDate = addDays(lastDate, avgInterval * i);
      const projIndex = n - 1 + i;
      
      // Clamp values between 0 and 100
      const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));
      
      projectionPoints.push({
        date: futureDate.toISOString().split('T')[0],
        dateFormatted: format(futureDate, 'dd/MM', { locale: ptBR }),
        score: null as any,
        coverage: null as any,
        evidence: null as any,
        gaps: null as any,
        isProjection: true,
        scoreTrend: null as any,
        coverageTrend: null as any,
        evidenceTrend: null as any,
        scoreMA: null,
        coverageMA: null,
        evidenceMA: null,
        scoreProjection: clamp(scoreReg.intercept + scoreReg.slope * projIndex),
        coverageProjection: clamp(coverageReg.intercept + coverageReg.slope * projIndex),
        evidenceProjection: clamp(evidenceReg.intercept + evidenceReg.slope * projIndex),
      });
    }

    // Calculate projection summary
    const lastProjection = projectionPoints[projectionPoints.length - 1];
    const projectionSummary = {
      days: projectionDays,
      score: {
        current: lastEnriched.score,
        projected: lastProjection.scoreProjection!,
        change: lastProjection.scoreProjection! - lastEnriched.score,
        trend: scoreReg.slope > 0 ? 'up' : scoreReg.slope < 0 ? 'down' : 'stable'
      },
      coverage: {
        current: lastEnriched.coverage,
        projected: lastProjection.coverageProjection!,
        change: lastProjection.coverageProjection! - lastEnriched.coverage,
        trend: coverageReg.slope > 0 ? 'up' : coverageReg.slope < 0 ? 'down' : 'stable'
      },
      evidence: {
        current: lastEnriched.evidence,
        projected: lastProjection.evidenceProjection!,
        change: lastProjection.evidenceProjection! - lastEnriched.evidence,
        trend: evidenceReg.slope > 0 ? 'up' : evidenceReg.slope < 0 ? 'down' : 'stable'
      }
    };

    return { 
      overallChartData: [...enrichedData, ...projectionPoints.slice(1)], 
      projectionData: projectionSummary 
    };
  }, [snapshots, projectionDays]);

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

  // Period comparison data based on selected comparison type
  const periodComparison = useMemo(() => {
    if (snapshots.length === 0) return null;

    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;
    let currentLabel: string, previousLabel: string;

    switch (comparisonType) {
      case 'week':
        currentStart = startOfWeek(now, { weekStartsOn: 1 });
        currentEnd = endOfWeek(now, { weekStartsOn: 1 });
        previousStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        previousEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        currentLabel = `Semana ${format(currentStart, 'dd/MM')} - ${format(currentEnd, 'dd/MM')}`;
        previousLabel = `Semana ${format(previousStart, 'dd/MM')} - ${format(previousEnd, 'dd/MM')}`;
        break;
      case 'quarter':
        currentStart = startOfQuarter(now);
        currentEnd = endOfQuarter(now);
        previousStart = startOfQuarter(subQuarters(now, 1));
        previousEnd = endOfQuarter(subQuarters(now, 1));
        currentLabel = `${format(currentStart, 'QQQ yyyy', { locale: ptBR })}`;
        previousLabel = `${format(previousStart, 'QQQ yyyy', { locale: ptBR })}`;
        break;
      case '30days':
        currentEnd = now;
        currentStart = subDays(now, 30);
        previousEnd = subDays(now, 31);
        previousStart = subDays(now, 60);
        currentLabel = `Últimos 30 dias`;
        previousLabel = `30 dias anteriores`;
        break;
      case '90days':
        currentEnd = now;
        currentStart = subDays(now, 90);
        previousEnd = subDays(now, 91);
        previousStart = subDays(now, 180);
        currentLabel = `Últimos 90 dias`;
        previousLabel = `90 dias anteriores`;
        break;
      case 'custom':
        if (!customRange.currentStart || !customRange.currentEnd || !customRange.previousStart || !customRange.previousEnd) {
          return null;
        }
        currentStart = customRange.currentStart;
        currentEnd = customRange.currentEnd;
        previousStart = customRange.previousStart;
        previousEnd = customRange.previousEnd;
        currentLabel = `${format(currentStart, 'dd/MM/yy')} - ${format(currentEnd, 'dd/MM/yy')}`;
        previousLabel = `${format(previousStart, 'dd/MM/yy')} - ${format(previousEnd, 'dd/MM/yy')}`;
        break;
      case 'month':
      default:
        currentStart = startOfMonth(now);
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 1));
        previousEnd = endOfMonth(subMonths(now, 1));
        currentLabel = format(currentStart, 'MMMM yyyy', { locale: ptBR });
        previousLabel = format(previousStart, 'MMMM yyyy', { locale: ptBR });
        break;
    }

    const currentPeriodSnapshots = snapshots.filter(s => {
      const date = parseISO(s.snapshotDate);
      return isWithinInterval(date, { start: currentStart, end: currentEnd });
    });

    const previousPeriodSnapshots = snapshots.filter(s => {
      const date = parseISO(s.snapshotDate);
      return isWithinInterval(date, { start: previousStart, end: previousEnd });
    });

    if (currentPeriodSnapshots.length === 0 && previousPeriodSnapshots.length === 0) {
      return null;
    }

    const avgMetric = (snaps: MaturitySnapshot[], key: 'overallScore' | 'overallCoverage' | 'evidenceReadiness' | 'criticalGaps') => {
      if (snaps.length === 0) return 0;
      return snaps.reduce((sum, s) => sum + (key === 'criticalGaps' ? s[key] : s[key] * 100), 0) / snaps.length;
    };

    const currentPeriod = {
      label: currentLabel,
      score: Math.round(avgMetric(currentPeriodSnapshots, 'overallScore')),
      coverage: Math.round(avgMetric(currentPeriodSnapshots, 'overallCoverage')),
      evidence: Math.round(avgMetric(currentPeriodSnapshots, 'evidenceReadiness')),
      gaps: Math.round(avgMetric(currentPeriodSnapshots, 'criticalGaps')),
      dataPoints: currentPeriodSnapshots.length
    };

    const previousPeriod = {
      label: previousLabel,
      score: Math.round(avgMetric(previousPeriodSnapshots, 'overallScore')),
      coverage: Math.round(avgMetric(previousPeriodSnapshots, 'overallCoverage')),
      evidence: Math.round(avgMetric(previousPeriodSnapshots, 'evidenceReadiness')),
      gaps: Math.round(avgMetric(previousPeriodSnapshots, 'criticalGaps')),
      dataPoints: previousPeriodSnapshots.length
    };

    const variation = {
      score: currentPeriod.score - previousPeriod.score,
      coverage: currentPeriod.coverage - previousPeriod.coverage,
      evidence: currentPeriod.evidence - previousPeriod.evidence,
      gaps: currentPeriod.gaps - previousPeriod.gaps
    };

    // Chart data for bar comparison
    const barChartData = [
      { metric: 'Maturidade', current: currentPeriod.score, previous: previousPeriod.score },
      { metric: 'Cobertura', current: currentPeriod.coverage, previous: previousPeriod.coverage },
      { metric: 'Evidências', current: currentPeriod.evidence, previous: previousPeriod.evidence },
    ];

    return { currentPeriod, previousPeriod, variation, barChartData };
  }, [snapshots, comparisonType, customRange]);

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
          {/* Trend/MA/Projection/Annotations toggles */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showTrendLines}
                onChange={(e) => setShowTrendLines(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">Tendência</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showMovingAverage}
                onChange={(e) => setShowMovingAverage(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">Média Móvel</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showProjection}
                onChange={(e) => setShowProjection(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">Projeção</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showAnnotations}
                onChange={(e) => setShowAnnotations(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">Marcos</span>
            </label>
            {showProjection && (
              <Select value={projectionDays.toString()} onValueChange={(v) => setProjectionDays(parseInt(v))}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart key={`${activeTab}-${daysBack}-${snapshots.length}`} data={overallChartData}>
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
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return ['-', name];
                    const labels: Record<string, string> = {
                      score: 'Maturidade',
                      coverage: 'Cobertura',
                      evidence: 'Prontidão Evidências',
                      gaps: 'Gaps Críticos',
                      scoreTrend: 'Tendência Maturidade',
                      coverageTrend: 'Tendência Cobertura',
                      evidenceTrend: 'Tendência Evidências',
                      scoreMA: 'MM Maturidade',
                      coverageMA: 'MM Cobertura',
                      evidenceMA: 'MM Evidências',
                    };
                    return [name === 'gaps' ? value : `${value}%`, labels[name] || name];
                  }}
                />
                <Legend />
                
                {/* Main data lines */}
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                  name="Maturidade"
                />
                <Line 
                  type="monotone" 
                  dataKey="coverage" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                  name="Cobertura"
                />
                <Line 
                  type="monotone" 
                  dataKey="evidence" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                  name="Evidências"
                />

                {/* Trend lines (linear regression) */}
                {showTrendLines && (
                  <>
                    <Line 
                      type="linear" 
                      dataKey="scoreTrend" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={1}
                      strokeDasharray="8 4"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="Tendência Maturidade"
                      legendType="none"
                    />
                    <Line 
                      type="linear" 
                      dataKey="coverageTrend" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={1}
                      strokeDasharray="8 4"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="Tendência Cobertura"
                      legendType="none"
                    />
                    <Line 
                      type="linear" 
                      dataKey="evidenceTrend" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={1}
                      strokeDasharray="8 4"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="Tendência Evidências"
                      legendType="none"
                    />
                  </>
                )}

                {/* Moving average lines */}
                {showMovingAverage && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="scoreMA" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      strokeOpacity={0.5}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="MM Maturidade"
                      legendType="none"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="coverageMA" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      strokeOpacity={0.5}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="MM Cobertura"
                      legendType="none"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="evidenceMA" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      strokeOpacity={0.5}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="MM Evidências"
                      legendType="none"
                    />
                  </>
                )}

                {/* Projection lines */}
                {showProjection && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="scoreProjection" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="Projeção Maturidade"
                      legendType="none"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="coverageProjection" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="Projeção Cobertura"
                      legendType="none"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="evidenceProjection" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      name="Projeção Evidências"
                      legendType="none"
                    />
                  </>
                )}

                {/* Annotation reference lines */}
                {showAnnotations && annotations.map(annotation => {
                  const annotationDateFormatted = format(parseISO(annotation.annotationDate), 'dd/MM', { locale: ptBR });
                  const existsInChart = overallChartData.some(d => d.dateFormatted === annotationDateFormatted);
                  if (!existsInChart) return null;
                  
                  return (
                    <ReferenceLine
                      key={annotation.id}
                      x={annotationDateFormatted}
                      stroke={annotation.color || '#3b82f6'}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      label={{
                        value: annotation.title,
                        position: 'top',
                        fill: annotation.color || '#3b82f6',
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Projection Summary Cards */}
          {showProjection && projectionData && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Projeção para {projectionData.days} dias</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Maturidade</div>
                  <div className="text-lg font-bold">{projectionData.score.projected}%</div>
                  <div className={cn(
                    "text-xs font-medium",
                    projectionData.score.change > 0 ? "text-green-600" : 
                    projectionData.score.change < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {projectionData.score.change > 0 ? '+' : ''}{projectionData.score.change}pp
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Cobertura</div>
                  <div className="text-lg font-bold">{projectionData.coverage.projected}%</div>
                  <div className={cn(
                    "text-xs font-medium",
                    projectionData.coverage.change > 0 ? "text-green-600" : 
                    projectionData.coverage.change < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {projectionData.coverage.change > 0 ? '+' : ''}{projectionData.coverage.change}pp
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Evidências</div>
                  <div className="text-lg font-bold">{projectionData.evidence.projected}%</div>
                  <div className={cn(
                    "text-xs font-medium",
                    projectionData.evidence.change > 0 ? "text-green-600" : 
                    projectionData.evidence.change < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {projectionData.evidence.change > 0 ? '+' : ''}{projectionData.evidence.change}pp
                  </div>
                </div>
              </div>
            </div>
          )}
          
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

          {/* Annotations Management */}
          <div className="mt-4 pt-4 border-t">
            <ChartAnnotations 
              onAnnotationsChange={(newAnnotations) => setAnnotations(newAnnotations)} 
            />
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                {periodComparison && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="capitalize">{periodComparison.currentPeriod.label}</span>
                      <span className="text-muted-foreground">({periodComparison.currentPeriod.dataPoints} pontos)</span>
                    </div>
                    <span className="text-muted-foreground">vs</span>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                      <span className="capitalize">{periodComparison.previousPeriod.label}</span>
                      <span className="text-muted-foreground">({periodComparison.previousPeriod.dataPoints} pontos)</span>
                    </div>
                  </div>
                )}
                {!periodComparison && <div />}
                <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipo de comparação" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="week">Semana atual vs anterior</SelectItem>
                    <SelectItem value="month">Mês atual vs anterior</SelectItem>
                    <SelectItem value="quarter">Trimestre vs anterior</SelectItem>
                    <SelectItem value="30days">Últimos 30 vs 30 anteriores</SelectItem>
                    <SelectItem value="90days">Últimos 90 vs 90 anteriores</SelectItem>
                    <SelectItem value="custom">Período customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Pickers */}
              {comparisonType === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
                  {/* Current Period */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Período Atual
                    </label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !customRange.currentStart && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customRange.currentStart ? format(customRange.currentStart, 'dd/MM/yyyy') : 'Início'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={customRange.currentStart}
                            onSelect={(date) => setCustomRange(prev => ({ ...prev, currentStart: date }))}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !customRange.currentEnd && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customRange.currentEnd ? format(customRange.currentEnd, 'dd/MM/yyyy') : 'Fim'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={customRange.currentEnd}
                            onSelect={(date) => setCustomRange(prev => ({ ...prev, currentEnd: date }))}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Previous Period */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                      Período Anterior (Comparação)
                    </label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !customRange.previousStart && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customRange.previousStart ? format(customRange.previousStart, 'dd/MM/yyyy') : 'Início'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={customRange.previousStart}
                            onSelect={(date) => setCustomRange(prev => ({ ...prev, previousStart: date }))}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !customRange.previousEnd && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customRange.previousEnd ? format(customRange.previousEnd, 'dd/MM/yyyy') : 'Fim'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={customRange.previousEnd}
                            onSelect={(date) => setCustomRange(prev => ({ ...prev, previousEnd: date }))}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {periodComparison ? (
              <>
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
                    <Bar dataKey="previous" name={periodComparison.previousPeriod.label} fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="current" name={periodComparison.currentPeriod.label} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
                    <span className="text-2xl font-bold">{periodComparison.currentPeriod.score}%</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousPeriod.score}%</span>
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
                    <span className="text-2xl font-bold">{periodComparison.currentPeriod.coverage}%</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousPeriod.coverage}%</span>
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
                    <span className="text-2xl font-bold">{periodComparison.currentPeriod.evidence}%</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousPeriod.evidence}%</span>
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
                    <span className="text-2xl font-bold">{periodComparison.currentPeriod.gaps}</span>
                    <span className="text-sm text-muted-foreground">vs {periodComparison.previousPeriod.gaps}</span>
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-muted-foreground mb-2">Dados insuficientes para comparação.</p>
                <p className="text-sm text-muted-foreground">
                  {comparisonType === 'custom' 
                    ? 'Selecione as datas de início e fim para ambos os períodos.'
                    : 'É necessário ter dados em pelo menos dois períodos para visualizar a comparação.'
                  }
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="domains">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart key={`${activeTab}-${daysBack}-${snapshots.length}`} data={domainChartData}>
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
              <LineChart key={`${activeTab}-${daysBack}-${snapshots.length}`} data={frameworkChartData}>
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
