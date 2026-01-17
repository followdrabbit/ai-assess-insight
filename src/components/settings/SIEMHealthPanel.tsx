import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Server,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SIEMSkeleton } from '@/components/settings/AnimatedSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';

interface SIEMIntegrationHealth {
  id: string;
  name: string;
  endpointUrl: string;
  isEnabled: boolean;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  avgLatencyMs: number | null;
  successRate: number | null;
  totalFailures: number | null;
  consecutiveFailures: number | null;
  eventsSent: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

interface SIEMMetric {
  timestamp: string;
  latencyMs: number;
  success: boolean;
  integrationId: string;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  latency: number;
  successRate: number;
  events: number;
}

const HEALTH_STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'healthy',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'degraded',
  },
  unhealthy: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'unhealthy',
  },
  unknown: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
    label: 'unknown',
  },
};

export function SIEMHealthPanel() {
  const { t, i18n } = useTranslation();
  const [integrations, setIntegrations] = useState<SIEMIntegrationHealth[]>([]);
  const [metrics, setMetrics] = useState<SIEMMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [selectedIntegration, setSelectedIntegration] = useState<string>('all');

  const locale = i18n.language === 'pt-BR' ? ptBR : i18n.language === 'es-ES' ? es : enUS;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch integrations with health data
      const { data: intData, error: intError } = await supabase
        .from('siem_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (intError) throw intError;

      // Calculate time range
      const now = new Date();
      let startDate = new Date();
      switch (timeRange) {
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '6h':
          startDate.setHours(now.getHours() - 6);
          break;
        case '24h':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
      }

      // Fetch metrics
      let metricsQuery = supabase
        .from('siem_metrics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (selectedIntegration !== 'all') {
        metricsQuery = metricsQuery.eq('integration_id', selectedIntegration);
      }

      const { data: metricsData, error: metricsError } = await metricsQuery;

      if (metricsError) throw metricsError;

      setIntegrations((intData || []).map(row => ({
        id: row.id,
        name: row.name,
        endpointUrl: row.endpoint_url,
        isEnabled: row.is_enabled,
        healthStatus: (row.health_status || 'unknown') as SIEMIntegrationHealth['healthStatus'],
        avgLatencyMs: row.avg_latency_ms,
        successRate: row.success_rate ? Number(row.success_rate) : null,
        totalFailures: row.total_failures,
        consecutiveFailures: row.consecutive_failures,
        eventsSent: row.events_sent,
        lastSuccessAt: row.last_success_at,
        lastErrorAt: row.last_error_at,
        lastErrorMessage: row.last_error_message,
      })));

      setMetrics((metricsData || []).map(row => ({
        timestamp: row.timestamp,
        latencyMs: row.latency_ms,
        success: row.success,
        integrationId: row.integration_id,
      })));
    } catch (error) {
      console.error('Failed to fetch SIEM health data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, selectedIntegration]);

  // Calculate aggregated stats
  const stats = useMemo(() => {
    if (metrics.length === 0) {
      return {
        totalEvents: 0,
        successRate: 0,
        avgLatency: 0,
        p95Latency: 0,
        healthyCount: 0,
        degradedCount: 0,
        unhealthyCount: 0,
      };
    }

    const successCount = metrics.filter(m => m.success).length;
    const latencies = metrics.map(m => m.latencyMs).sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);

    return {
      totalEvents: metrics.length,
      successRate: (successCount / metrics.length) * 100,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p95Latency: latencies[p95Index] || 0,
      healthyCount: integrations.filter(i => i.healthStatus === 'healthy').length,
      degradedCount: integrations.filter(i => i.healthStatus === 'degraded').length,
      unhealthyCount: integrations.filter(i => i.healthStatus === 'unhealthy').length,
    };
  }, [metrics, integrations]);

  // Prepare chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (metrics.length === 0) return [];

    // Group by time buckets
    const bucketSize = timeRange === '1h' ? 5 : timeRange === '6h' ? 15 : timeRange === '24h' ? 60 : 360; // minutes
    const buckets = new Map<number, { latencies: number[]; successes: number; total: number }>();

    metrics.forEach(m => {
      const ts = new Date(m.timestamp).getTime();
      const bucketKey = Math.floor(ts / (bucketSize * 60 * 1000)) * (bucketSize * 60 * 1000);

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { latencies: [], successes: 0, total: 0 });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.latencies.push(m.latencyMs);
      bucket.total++;
      if (m.success) bucket.successes++;
    });

    return Array.from(buckets.entries())
      .map(([ts, data]) => ({
        time: format(new Date(ts), timeRange === '7d' ? 'dd/MM' : 'HH:mm', { locale }),
        timestamp: ts,
        latency: Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length),
        successRate: Math.round((data.successes / data.total) * 100),
        events: data.total,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [metrics, timeRange, locale]);

  if (loading && integrations.length === 0) {
    return <SIEMSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('siemHealth.title')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('siemHealth.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('siemHealth.allIntegrations')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('siemHealth.allIntegrations')}</SelectItem>
              {integrations.map(int => (
                <SelectItem key={int.id} value={int.id}>{int.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">{t('siemHealth.lastHour')}</SelectItem>
              <SelectItem value="6h">{t('siemHealth.last6Hours')}</SelectItem>
              <SelectItem value="24h">{t('siemHealth.last24Hours')}</SelectItem>
              <SelectItem value="7d">{t('siemHealth.last7Days')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siemHealth.totalEvents')}</p>
                <p className="text-xl font-bold">{stats.totalEvents.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                stats.successRate >= 95 ? "bg-green-500/10" : stats.successRate >= 80 ? "bg-amber-500/10" : "bg-red-500/10"
              )}>
                {stats.successRate >= 95 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : stats.successRate >= 80 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siemHealth.successRate')}</p>
                <p className="text-xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siemHealth.avgLatency')}</p>
                <p className="text-xl font-bold">{Math.round(stats.avgLatency)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siemHealth.p95Latency')}</p>
                <p className="text-xl font-bold">{Math.round(stats.p95Latency)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('siemHealth.latencyTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}ms`, t('siemHealth.latency')]}
                    />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      stroke="hsl(var(--primary))"
                      fill="url(#latencyGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {t('siemHealth.noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('siemHealth.successRateTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, t('siemHealth.successRate')]}
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {t('siemHealth.noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Health Cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            {t('siemHealth.integrationStatus')}
          </CardTitle>
          <CardDescription>
            {t('siemHealth.integrationStatusDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('siem.noIntegrations')}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {integrations.map(integration => {
                const statusConfig = HEALTH_STATUS_CONFIG[integration.healthStatus];
                const StatusIcon = statusConfig.icon;

                return (
                  <Card
                    key={integration.id}
                    className={cn(
                      "transition-all",
                      statusConfig.borderColor,
                      !integration.isEnabled && "opacity-50"
                    )}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {integration.endpointUrl}
                          </p>
                        </div>
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          statusConfig.bgColor
                        )}>
                          <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Success Rate */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{t('siemHealth.successRate')}</span>
                            <span className="font-medium">
                              {integration.successRate !== null ? `${integration.successRate.toFixed(1)}%` : '-'}
                            </span>
                          </div>
                          <Progress
                            value={integration.successRate || 0}
                            className="h-1.5"
                          />
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-muted-foreground">{t('siemHealth.latency')}</p>
                            <p className="font-medium">
                              {integration.avgLatencyMs !== null ? `${integration.avgLatencyMs}ms` : '-'}
                            </p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-muted-foreground">{t('siemHealth.sent')}</p>
                            <p className="font-medium">{integration.eventsSent.toLocaleString()}</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-muted-foreground">{t('siemHealth.failures')}</p>
                            <p className={cn(
                              "font-medium",
                              (integration.consecutiveFailures || 0) > 0 && "text-red-600"
                            )}>
                              {integration.consecutiveFailures || 0}
                            </p>
                          </div>
                        </div>

                        {/* Last Activity */}
                        {integration.lastSuccessAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            {t('siemHealth.lastSuccess')}: {format(new Date(integration.lastSuccessAt), 'dd/MM HH:mm', { locale })}
                          </p>
                        )}

                        {/* Error Message */}
                        {integration.lastErrorMessage && integration.consecutiveFailures && integration.consecutiveFailures > 0 && (
                          <div className="p-2 rounded bg-red-500/10 text-xs text-red-600">
                            {integration.lastErrorMessage}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
