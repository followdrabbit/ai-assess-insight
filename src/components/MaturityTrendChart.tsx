import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
