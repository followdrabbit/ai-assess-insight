import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import {
  Activity,
  Clock,
  Filter,
  Globe,
  Monitor,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  User,
  FileText,
  Shield,
  Settings,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getDetailedAuditLogs, getAuditLogStats, type DetailedAuditLog } from '@/lib/auditLog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = {
  create: 'hsl(142, 76%, 36%)',
  update: 'hsl(217, 91%, 60%)',
  delete: 'hsl(0, 84%, 60%)',
  enable: 'hsl(142, 76%, 36%)',
  disable: 'hsl(45, 93%, 47%)',
};

const ENTITY_COLORS = {
  framework: 'hsl(262, 83%, 58%)',
  question: 'hsl(217, 91%, 60%)',
  setting: 'hsl(45, 93%, 47%)',
  answer: 'hsl(142, 76%, 36%)',
};

export function AuditLogsPanel() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<DetailedAuditLog[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAuditLogStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [statsPeriod, setStatsPeriod] = useState(30);

  const locale = i18n.language === 'pt-BR' ? ptBR : i18n.language === 'es-ES' ? es : enUS;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        getDetailedAuditLogs({
          limit: 200,
          entityType: filterEntity !== 'all' ? filterEntity : undefined,
          action: filterAction !== 'all' ? filterAction : undefined,
          startDate: dateRange.from,
          endDate: dateRange.to,
        }),
        getAuditLogStats(statsPeriod),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterAction, filterEntity, dateRange, statsPeriod]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDevice = filterDevice === 'all' || log.deviceType === filterDevice;
      
      return matchesSearch && matchesDevice;
    });
  }, [logs, searchTerm, filterDevice]);

  const actionChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byAction).map(([name, value]) => ({
      name: t(`auditLogs.action.${name}`, name),
      value,
      fill: COLORS[name as keyof typeof COLORS] || 'hsl(var(--muted))',
    }));
  }, [stats, t]);

  const entityChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byEntityType).map(([name, value]) => ({
      name: t(`auditLogs.entity.${name}`, name),
      value,
      fill: ENTITY_COLORS[name as keyof typeof ENTITY_COLORS] || 'hsl(var(--muted))',
    }));
  }, [stats, t]);

  const deviceChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byDevice).map(([name, value]) => ({
      name: name === 'unknown' ? t('common.unknown') : name,
      value,
    }));
  }, [stats, t]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="h-3.5 w-3.5" />;
      case 'update': return <Pencil className="h-3.5 w-3.5" />;
      case 'delete': return <Trash2 className="h-3.5 w-3.5" />;
      case 'enable': return <ToggleRight className="h-3.5 w-3.5" />;
      case 'disable': return <ToggleLeft className="h-3.5 w-3.5" />;
      default: return <Activity className="h-3.5 w-3.5" />;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'framework': return <Shield className="h-3.5 w-3.5" />;
      case 'question': return <MessageSquare className="h-3.5 w-3.5" />;
      case 'setting': return <Settings className="h-3.5 w-3.5" />;
      case 'answer': return <FileText className="h-3.5 w-3.5" />;
      default: return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const getDeviceIcon = (device: string | null) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'create':
      case 'enable':
        return 'default';
      case 'delete':
        return 'destructive';
      case 'disable':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Date', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Country', 'City', 'Device', 'Browser', 'OS'].join(','),
      ...filteredLogs.map(log => [
        log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
        log.action,
        log.entityType,
        `"${log.entityId}"`, // Quote to handle commas in IDs
        log.ipAddress || '',
        log.geoCountry || '',
        log.geoCity || '',
        log.deviceType || '',
        log.browserName || '',
        log.osName || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('auditLogs.totalEvents')}</p>
                <p className="text-xl font-bold">{stats?.totalLogs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('auditLogs.uniqueUsers')}</p>
                <p className="text-xl font-bold">{stats?.uniqueUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('auditLogs.uniqueIPs')}</p>
                <p className="text-xl font-bold">{stats?.uniqueIPs || 0}</p>
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
                <p className="text-sm text-muted-foreground">{t('auditLogs.period')}</p>
                <Select value={statsPeriod.toString()} onValueChange={(v) => setStatsPeriod(Number(v))}>
                  <SelectTrigger className="h-7 w-24 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 {t('common.days')}</SelectItem>
                    <SelectItem value="30">30 {t('common.days')}</SelectItem>
                    <SelectItem value="90">90 {t('common.days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('auditLogs.byAction')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {actionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {actionChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('auditLogs.byEntityType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={entityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {entityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {entityChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('auditLogs.byDevice')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceChartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {t('auditLogs.eventLog')}
              </CardTitle>
              <CardDescription>
                {t('auditLogs.showingEvents', { count: filteredLogs.length })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                {t('common.refresh')}
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-1" />
                {t('common.export')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('auditLogs.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('auditLogs.action.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auditLogs.action.all')}</SelectItem>
                <SelectItem value="create">{t('auditLogs.action.create')}</SelectItem>
                <SelectItem value="update">{t('auditLogs.action.update')}</SelectItem>
                <SelectItem value="delete">{t('auditLogs.action.delete')}</SelectItem>
                <SelectItem value="enable">{t('auditLogs.action.enable')}</SelectItem>
                <SelectItem value="disable">{t('auditLogs.action.disable')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('auditLogs.entity.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auditLogs.entity.all')}</SelectItem>
                <SelectItem value="framework">{t('auditLogs.entity.framework')}</SelectItem>
                <SelectItem value="question">{t('auditLogs.entity.question')}</SelectItem>
                <SelectItem value="setting">{t('auditLogs.entity.setting')}</SelectItem>
                <SelectItem value="answer">{t('auditLogs.entity.answer')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('auditLogs.device.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auditLogs.device.all')}</SelectItem>
                <SelectItem value="desktop">{t('auditLogs.device.desktop')}</SelectItem>
                <SelectItem value="mobile">{t('auditLogs.device.mobile')}</SelectItem>
                <SelectItem value="tablet">{t('auditLogs.device.tablet')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[140px]">{t('auditLogs.dateTime')}</TableHead>
                  <TableHead className="w-[90px]">{t('auditLogs.actionColumn')}</TableHead>
                  <TableHead className="w-[90px]">{t('auditLogs.entityColumn')}</TableHead>
                  <TableHead className="max-w-[150px]">{t('auditLogs.entityId')}</TableHead>
                  <TableHead className="w-[100px]">{t('auditLogs.ipAddress')}</TableHead>
                  <TableHead className="w-[130px]">{t('auditLogs.location')}</TableHead>
                  <TableHead className="w-[140px]">{t('auditLogs.deviceInfo')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('auditLogs.noEvents')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {log.createdAt ? format(new Date(log.createdAt), 'dd/MM/yy HH:mm', { locale }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)} className="gap-1 text-xs">
                          {getActionIcon(log.action)}
                          {t(`auditLogs.action.${log.action}`, log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          {getEntityIcon(log.entityType)}
                          <span className="capitalize">{t(`auditLogs.entity.${log.entityType}`, log.entityType)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate" title={log.entityId}>
                        {log.entityId}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ipAddress || '-'}
                      </TableCell>
                      <TableCell>
                        {log.geoCountry ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate" title={`${log.geoCity || ''}, ${log.geoCountry}`}>
                              {log.geoCity ? `${log.geoCity}, ` : ''}{log.geoCountry}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {getDeviceIcon(log.deviceType)}
                          <span>{log.browserName || '-'}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{log.osName || '-'}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
