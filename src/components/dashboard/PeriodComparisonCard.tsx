import { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend
} from 'recharts';
import { format, parseISO, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, Minus, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMaturitySnapshots, MaturitySnapshot } from '@/lib/database';
import { cn } from '@/lib/utils';
import { useAnswersStore } from '@/lib/stores';

interface PeriodComparisonCardProps {
  className?: string;
  securityDomainId?: string;
}

type ComparisonPreset = '7days' | '30days' | '90days' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

interface PeriodMetrics {
  label: string;
  score: number;
  coverage: number;
  evidence: number;
  gaps: number;
  dataPoints: number;
}

export function PeriodComparisonCard({ className, securityDomainId: propDomainId }: PeriodComparisonCardProps) {
  const { selectedSecurityDomain } = useAnswersStore();
  const effectiveDomainId = propDomainId || selectedSecurityDomain || undefined;
  
  const [snapshots, setSnapshots] = useState<MaturitySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<ComparisonPreset>('30days');
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  
  // Custom date ranges
  const [currentRange, setCurrentRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [previousRange, setPreviousRange] = useState<DateRange>({
    start: subDays(new Date(), 60),
    end: subDays(new Date(), 31)
  });

  // Load snapshots (180 days to cover comparison periods)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getMaturitySnapshots(180, effectiveDomainId);
        setSnapshots(data);
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [effectiveDomainId]);

  // Update ranges based on preset
  useEffect(() => {
    const now = new Date();
    switch (preset) {
      case '7days':
        setCurrentRange({ start: subDays(now, 7), end: now });
        setPreviousRange({ start: subDays(now, 14), end: subDays(now, 8) });
        break;
      case '30days':
        setCurrentRange({ start: subDays(now, 30), end: now });
        setPreviousRange({ start: subDays(now, 60), end: subDays(now, 31) });
        break;
      case '90days':
        setCurrentRange({ start: subDays(now, 90), end: now });
        setPreviousRange({ start: subDays(now, 180), end: subDays(now, 91) });
        break;
      // custom - don't change
    }
  }, [preset]);

  // Calculate metrics for each period
  const { currentPeriod, previousPeriod, variation, barData, radarData } = useMemo(() => {
    if (snapshots.length === 0) {
      return { currentPeriod: null, previousPeriod: null, variation: null, barData: [], radarData: [] };
    }

    const getMetrics = (range: DateRange, label: string): PeriodMetrics => {
      const filtered = snapshots.filter(s => {
        const date = parseISO(s.snapshotDate);
        return isWithinInterval(date, { start: range.start, end: range.end });
      });

      if (filtered.length === 0) {
        return { label, score: 0, coverage: 0, evidence: 0, gaps: 0, dataPoints: 0 };
      }

      const avg = (key: keyof MaturitySnapshot) => {
        const values = filtered.map(s => Number(s[key]) || 0);
        return values.reduce((a, b) => a + b, 0) / values.length;
      };

      return {
        label,
        score: Math.round(avg('overallScore') * 100),
        coverage: Math.round(avg('overallCoverage') * 100),
        evidence: Math.round(avg('evidenceReadiness') * 100),
        gaps: Math.round(avg('criticalGaps')),
        dataPoints: filtered.length
      };
    };

    const currentLabel = preset === 'custom' 
      ? `${format(currentRange.start, 'dd/MM', { locale: ptBR })} - ${format(currentRange.end, 'dd/MM', { locale: ptBR })}`
      : preset === '7days' ? 'Últimos 7 dias' : preset === '30days' ? 'Últimos 30 dias' : 'Últimos 90 dias';
    
    const previousLabel = preset === 'custom'
      ? `${format(previousRange.start, 'dd/MM', { locale: ptBR })} - ${format(previousRange.end, 'dd/MM', { locale: ptBR })}`
      : preset === '7days' ? '7 dias anteriores' : preset === '30days' ? '30 dias anteriores' : '90 dias anteriores';

    const current = getMetrics(currentRange, currentLabel);
    const previous = getMetrics(previousRange, previousLabel);

    const var_ = {
      score: current.score - previous.score,
      coverage: current.coverage - previous.coverage,
      evidence: current.evidence - previous.evidence,
      gaps: current.gaps - previous.gaps
    };

    const barData = [
      { metric: 'Maturidade', current: current.score, previous: previous.score },
      { metric: 'Cobertura', current: current.coverage, previous: previous.coverage },
      { metric: 'Evidências', current: current.evidence, previous: previous.evidence }
    ];

    const radarData = [
      { metric: 'Maturidade', current: current.score, previous: previous.score, fullMark: 100 },
      { metric: 'Cobertura', current: current.coverage, previous: previous.coverage, fullMark: 100 },
      { metric: 'Evidências', current: current.evidence, previous: previous.evidence, fullMark: 100 },
      { metric: 'Sem Gaps', current: Math.max(0, 100 - current.gaps * 10), previous: Math.max(0, 100 - previous.gaps * 10), fullMark: 100 }
    ];

    return { currentPeriod: current, previousPeriod: previous, variation: var_, barData, radarData };
  }, [snapshots, currentRange, previousRange, preset]);

  // Trend indicator component
  const TrendIndicator = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    if (value === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return isPositive ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Carregando comparação...</p>
        </div>
      </Card>
    );
  }

  if (snapshots.length === 0 || !currentPeriod || !previousPeriod) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">Dados insuficientes para comparação</p>
          <p className="text-sm text-muted-foreground">
            São necessários snapshots históricos para visualizar a evolução.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Comparação de Períodos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize a evolução entre dois períodos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={preset} onValueChange={(v) => setPreset(v as ComparisonPreset)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="30days">30 dias</SelectItem>
              <SelectItem value="90days">90 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="rounded-none"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'radar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('radar')}
              className="rounded-none"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {preset === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-lg border bg-muted/30">
          {/* Current Period */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Período Atual
            </label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(currentRange.start, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={currentRange.start}
                    onSelect={(date) => date && setCurrentRange(prev => ({ ...prev, start: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(currentRange.end, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={currentRange.end}
                    onSelect={(date) => date && setCurrentRange(prev => ({ ...prev, end: date }))}
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
              Período Anterior
            </label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(previousRange.start, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={previousRange.start}
                    onSelect={(date) => date && setPreviousRange(prev => ({ ...prev, start: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(previousRange.end, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={previousRange.end}
                    onSelect={(date) => date && setPreviousRange(prev => ({ ...prev, end: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}

      {/* Period Labels */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>{currentPeriod.label}</span>
          <span className="text-muted-foreground">({currentPeriod.dataPoints} pontos)</span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
          <span>{previousPeriod.label}</span>
          <span className="text-muted-foreground">({previousPeriod.dataPoints} pontos)</span>
        </div>
      </div>

      {/* Charts */}
      <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'bar' | 'radar')} className="hidden">
        <TabsList><TabsTrigger value="bar">Bar</TabsTrigger><TabsTrigger value="radar">Radar</TabsTrigger></TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-[220px]">
          {chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal vertical={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="metric" tick={{ fontSize: 11 }} width={75} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`]}
                />
                <Legend />
                <Bar dataKey="previous" name={previousPeriod.label} fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[0, 4, 4, 0]} />
                <Bar dataKey="current" name={currentPeriod.label} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name={previousPeriod.label} dataKey="previous" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
                <Radar name={currentPeriod.label} dataKey="current" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Score */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Maturidade</span>
              <TrendIndicator value={variation?.score || 0} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{currentPeriod.score}%</span>
              <span className="text-xs text-muted-foreground">vs {previousPeriod.score}%</span>
            </div>
            <div className={cn(
              "text-sm font-medium mt-1",
              (variation?.score || 0) > 0 ? "text-green-600" : (variation?.score || 0) < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {(variation?.score || 0) > 0 ? '+' : ''}{variation?.score || 0}pp
            </div>
          </div>

          {/* Coverage */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Cobertura</span>
              <TrendIndicator value={variation?.coverage || 0} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{currentPeriod.coverage}%</span>
              <span className="text-xs text-muted-foreground">vs {previousPeriod.coverage}%</span>
            </div>
            <div className={cn(
              "text-sm font-medium mt-1",
              (variation?.coverage || 0) > 0 ? "text-green-600" : (variation?.coverage || 0) < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {(variation?.coverage || 0) > 0 ? '+' : ''}{variation?.coverage || 0}pp
            </div>
          </div>

          {/* Evidence */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Evidências</span>
              <TrendIndicator value={variation?.evidence || 0} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{currentPeriod.evidence}%</span>
              <span className="text-xs text-muted-foreground">vs {previousPeriod.evidence}%</span>
            </div>
            <div className={cn(
              "text-sm font-medium mt-1",
              (variation?.evidence || 0) > 0 ? "text-green-600" : (variation?.evidence || 0) < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {(variation?.evidence || 0) > 0 ? '+' : ''}{variation?.evidence || 0}pp
            </div>
          </div>

          {/* Gaps */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Gaps Críticos</span>
              <TrendIndicator value={variation?.gaps || 0} inverted />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{currentPeriod.gaps}</span>
              <span className="text-xs text-muted-foreground">vs {previousPeriod.gaps}</span>
            </div>
            <div className={cn(
              "text-sm font-medium mt-1",
              (variation?.gaps || 0) < 0 ? "text-green-600" : (variation?.gaps || 0) > 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {(variation?.gaps || 0) > 0 ? '+' : ''}{variation?.gaps || 0}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default PeriodComparisonCard;
