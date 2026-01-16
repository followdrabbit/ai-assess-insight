import { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMaturitySnapshots, MaturitySnapshot } from '@/lib/database';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DomainIndicatorsTrendChartProps {
  securityDomainId: string;
  className?: string;
}

// Indicator configurations per domain
const domainIndicatorConfig: Record<string, { 
  indicators: { id: string; label: string; color: string; keywords: string[] }[];
  title: string;
}> = {
  CLOUD_SECURITY: {
    title: 'Tendência Cloud Security',
    indicators: [
      { 
        id: 'csp', 
        label: 'CSPs', 
        color: 'hsl(199, 89%, 48%)', 
        keywords: ['aws', 'azure', 'gcp', 'google cloud', 'multi-cloud', 'cloud provider', 'csp', 'iaas', 'paas', 'saas']
      },
      { 
        id: 'identity', 
        label: 'Identidade', 
        color: 'hsl(263, 70%, 50%)', 
        keywords: ['identity', 'iam', 'access', 'authentication', 'authorization', 'rbac', 'privilege']
      },
      { 
        id: 'data', 
        label: 'Dados', 
        color: 'hsl(160, 60%, 45%)', 
        keywords: ['encryption', 'data protection', 'data loss', 'dlp', 'key management', 'kms', 'secrets']
      },
      { 
        id: 'network', 
        label: 'Rede', 
        color: 'hsl(45, 93%, 47%)', 
        keywords: ['network', 'firewall', 'waf', 'vpn', 'segmentation', 'zero trust', 'perimeter']
      }
    ]
  },
  AI_SECURITY: {
    title: 'Tendência AI Security',
    indicators: [
      { 
        id: 'model', 
        label: 'Modelo', 
        color: 'hsl(280, 65%, 60%)', 
        keywords: ['model', 'ml', 'machine learning', 'training', 'inference', 'bias', 'drift', 'adversarial', 'prompt injection', 'hallucination', 'llm']
      },
      { 
        id: 'data', 
        label: 'Dados', 
        color: 'hsl(221, 83%, 53%)', 
        keywords: ['training data', 'dataset', 'data quality', 'data governance']
      },
      { 
        id: 'adversarial', 
        label: 'Adversarial', 
        color: 'hsl(0, 72%, 51%)', 
        keywords: ['adversarial', 'attack', 'injection', 'jailbreak', 'prompt']
      },
      { 
        id: 'ethics', 
        label: 'Ética', 
        color: 'hsl(142, 71%, 45%)', 
        keywords: ['bias', 'fairness', 'discrimination', 'ethics', 'explainability']
      }
    ]
  },
  DEVSECOPS: {
    title: 'Tendência DevSecOps',
    indicators: [
      { 
        id: 'pipeline', 
        label: 'Pipeline', 
        color: 'hsl(25, 95%, 53%)', 
        keywords: ['pipeline', 'ci/cd', 'cicd', 'build', 'deploy', 'artifact', 'container', 'registry', 'sast', 'dast', 'sca', 'sbom']
      },
      { 
        id: 'code', 
        label: 'Código', 
        color: 'hsl(221, 83%, 53%)', 
        keywords: ['code review', 'static analysis', 'sast', 'code scanning', 'secure coding']
      },
      { 
        id: 'deps', 
        label: 'Dependências', 
        color: 'hsl(173, 80%, 40%)', 
        keywords: ['dependency', 'sca', 'sbom', 'vulnerability', 'cve', 'third-party']
      },
      { 
        id: 'container', 
        label: 'Containers', 
        color: 'hsl(188, 78%, 41%)', 
        keywords: ['container', 'docker', 'kubernetes', 'k8s', 'image', 'registry']
      }
    ]
  }
};

// Calculate indicator value from domain metrics
function calculateIndicatorFromDomainMetrics(
  domainMetrics: { domainId: string; domainName: string; score: number }[],
  keywords: string[]
): number {
  // Match domains by name containing keywords
  const matchingDomains = domainMetrics.filter(dm => 
    keywords.some(kw => dm.domainName.toLowerCase().includes(kw.toLowerCase()))
  );
  
  if (matchingDomains.length === 0) {
    // Fallback: use overall average if no specific match
    const allScores = domainMetrics.map(dm => dm.score);
    return allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  }
  
  const avgScore = matchingDomains.reduce((sum, dm) => sum + dm.score, 0) / matchingDomains.length;
  return avgScore;
}

export function DomainIndicatorsTrendChart({ securityDomainId, className }: DomainIndicatorsTrendChartProps) {
  const [snapshots, setSnapshots] = useState<MaturitySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState<string>('90');

  useEffect(() => {
    const loadSnapshots = async () => {
      setLoading(true);
      try {
        const data = await getMaturitySnapshots(parseInt(daysBack), securityDomainId);
        setSnapshots(data);
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSnapshots();
  }, [daysBack, securityDomainId]);

  const config = domainIndicatorConfig[securityDomainId] || domainIndicatorConfig.AI_SECURITY;

  // Transform snapshots to chart data
  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];

    return snapshots.map(snapshot => {
      const entry: Record<string, any> = {
        date: snapshot.snapshotDate,
        dateFormatted: format(parseISO(snapshot.snapshotDate), 'dd/MM', { locale: ptBR }),
      };

      // Calculate each indicator value from domain metrics
      config.indicators.forEach(indicator => {
        const value = calculateIndicatorFromDomainMetrics(
          snapshot.domainMetrics,
          indicator.keywords
        );
        entry[indicator.id] = Math.round(value * 100);
      });

      return entry;
    });
  }, [snapshots, config.indicators]);

  // Calculate trend for each indicator
  const trends = useMemo(() => {
    if (chartData.length < 2) return {};
    
    const result: Record<string, { change: number; direction: 'up' | 'down' | 'stable' }> = {};
    
    config.indicators.forEach(indicator => {
      const firstValue = chartData[0][indicator.id] || 0;
      const lastValue = chartData[chartData.length - 1][indicator.id] || 0;
      const change = lastValue - firstValue;
      
      result[indicator.id] = {
        change,
        direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable'
      };
    });
    
    return result;
  }, [chartData, config.indicators]);

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Carregando tendências...</p>
        </div>
      </Card>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <p className="text-muted-foreground mb-2">Sem dados históricos disponíveis.</p>
          <p className="text-xs text-muted-foreground">
            Os dados são coletados automaticamente conforme você responde as perguntas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <p className="text-xs text-muted-foreground">
            Evolução dos indicadores específicos do domínio
          </p>
        </div>
        <Select value={daysBack} onValueChange={setDaysBack}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="180">6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              {config.indicators.map(indicator => (
                <linearGradient key={indicator.id} id={`gradient-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={indicator.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={indicator.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
            <XAxis 
              dataKey="dateFormatted" 
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
              className="text-muted-foreground"
              width={35}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => `Data: ${label}`}
              formatter={(value: number, name: string) => {
                const indicator = config.indicators.find(i => i.id === name);
                return [`${value}%`, indicator?.label || name];
              }}
            />
            <Legend 
              iconSize={8}
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => {
                const indicator = config.indicators.find(i => i.id === value);
                return indicator?.label || value;
              }}
            />
            {config.indicators.map(indicator => (
              <Area
                key={indicator.id}
                type="monotone"
                dataKey={indicator.id}
                stroke={indicator.color}
                strokeWidth={2}
                fill={`url(#gradient-${indicator.id})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trend summary */}
      {chartData.length >= 2 && (
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t">
          {config.indicators.map(indicator => {
            const trend = trends[indicator.id];
            if (!trend) return null;
            
            return (
              <div key={indicator.id} className="text-center">
                <div className="text-[10px] text-muted-foreground truncate">{indicator.label}</div>
                <div className={cn(
                  "text-sm font-semibold flex items-center justify-center gap-1",
                  trend.direction === 'up' && "text-green-600",
                  trend.direction === 'down' && "text-red-600",
                  trend.direction === 'stable' && "text-muted-foreground"
                )}>
                  {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                  {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                  {trend.direction === 'stable' && <Minus className="h-3 w-3" />}
                  {trend.change >= 0 ? '+' : ''}{trend.change}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
