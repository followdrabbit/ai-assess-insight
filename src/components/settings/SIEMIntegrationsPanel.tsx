import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Key,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Shield,
  Trash2,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SIEMSkeleton } from '@/components/settings/AnimatedSkeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getSIEMIntegrations,
  getSIEMStats,
  createSIEMIntegration,
  updateSIEMIntegration,
  deleteSIEMIntegration,
  toggleSIEMIntegration,
  testSIEMIntegration,
  type SIEMIntegration,
  type CreateSIEMIntegrationInput,
} from '@/lib/siemIntegration';

const FORMAT_INFO = {
  json: { name: 'JSON', description: 'Standard JSON format, widely supported' },
  cef: { name: 'CEF', description: 'Common Event Format (ArcSight, Splunk)' },
  leef: { name: 'LEEF', description: 'Log Event Extended Format (IBM QRadar)' },
  syslog: { name: 'Syslog', description: 'RFC 5424 Syslog format' },
};

const AUTH_TYPES = {
  none: 'No Authentication',
  bearer: 'Bearer Token',
  basic: 'Basic Auth',
  api_key: 'API Key',
};

const ENTITY_TYPES = ['framework', 'question', 'setting', 'answer'];
const ACTION_TYPES = ['create', 'update', 'delete', 'enable', 'disable'];

export function SIEMIntegrationsPanel() {
  const { t, i18n } = useTranslation();
  const [integrations, setIntegrations] = useState<SIEMIntegration[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getSIEMStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<SIEMIntegration | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const locale = i18n.language === 'pt-BR' ? ptBR : i18n.language === 'es-ES' ? es : enUS;

  // Form state
  const [formData, setFormData] = useState<CreateSIEMIntegrationInput>({
    name: '',
    endpointUrl: '',
    format: 'json',
    authType: 'none',
    authHeader: '',
    authValue: '',
    includeIp: true,
    includeGeo: true,
    includeDevice: true,
    entityFilter: [],
    actionFilter: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [intData, statsData] = await Promise.all([
        getSIEMIntegrations(),
        getSIEMStats(),
      ]);
      setIntegrations(intData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch SIEM data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      endpointUrl: '',
      format: 'json',
      authType: 'none',
      authHeader: '',
      authValue: '',
      includeIp: true,
      includeGeo: true,
      includeDevice: true,
      entityFilter: [],
      actionFilter: [],
    });
    setSelectedIntegration(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (integration: SIEMIntegration) => {
    setSelectedIntegration(integration);
    setFormData({
      name: integration.name,
      endpointUrl: integration.endpointUrl,
      format: integration.format,
      authType: integration.authType,
      authHeader: integration.authHeader || '',
      authValue: '', // Don't show existing value
      includeIp: integration.includeIp,
      includeGeo: integration.includeGeo,
      includeDevice: integration.includeDevice,
      entityFilter: integration.entityFilter || [],
      actionFilter: integration.actionFilter || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.endpointUrl) {
      toast.error(t('siem.validation.required'));
      return;
    }

    try {
      if (selectedIntegration) {
        const result = await updateSIEMIntegration(selectedIntegration.id, formData);
        if (result.success) {
          toast.success(t('siem.updateSuccess'));
          setDialogOpen(false);
          fetchData();
        } else {
          toast.error(result.error || t('siem.updateError'));
        }
      } else {
        const result = await createSIEMIntegration(formData);
        if (result.success) {
          toast.success(t('siem.createSuccess'));
          setDialogOpen(false);
          fetchData();
        } else {
          toast.error(result.error || t('siem.createError'));
        }
      }
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    if (!selectedIntegration) return;

    const result = await deleteSIEMIntegration(selectedIntegration.id);
    if (result.success) {
      toast.success(t('siem.deleteSuccess'));
      setDeleteDialogOpen(false);
      setSelectedIntegration(null);
      fetchData();
    } else {
      toast.error(result.error || t('siem.deleteError'));
    }
  };

  const handleToggle = async (integration: SIEMIntegration) => {
    const result = await toggleSIEMIntegration(integration.id, !integration.isEnabled);
    if (result.success) {
      toast.success(integration.isEnabled ? t('siem.disabled') : t('siem.enabled'));
      fetchData();
    } else {
      toast.error(result.error || t('common.error'));
    }
  };

  const handleTest = async (integration: SIEMIntegration) => {
    setTesting(integration.id);
    try {
      const result = await testSIEMIntegration(integration.id);
      if (result.success) {
        toast.success(t('siem.testSuccess'));
      } else {
        toast.error(result.error || t('siem.testError'));
      }
    } finally {
      setTesting(null);
    }
  };

  const toggleEntityFilter = (entity: string) => {
    setFormData(prev => ({
      ...prev,
      entityFilter: prev.entityFilter?.includes(entity)
        ? prev.entityFilter.filter(e => e !== entity)
        : [...(prev.entityFilter || []), entity],
    }));
  };

  const toggleActionFilter = (action: string) => {
    setFormData(prev => ({
      ...prev,
      actionFilter: prev.actionFilter?.includes(action)
        ? prev.actionFilter.filter(a => a !== action)
        : [...(prev.actionFilter || []), action],
    }));
  };

  if (loading && integrations.length === 0) {
    return <SIEMSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siem.totalIntegrations')}</p>
                <p className="text-xl font-bold">{stats?.totalIntegrations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siem.activeIntegrations')}</p>
                <p className="text-xl font-bold">{stats?.activeIntegrations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siem.eventsSent')}</p>
                <p className="text-xl font-bold">{stats?.totalEventsSent?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('siem.lastActivity')}</p>
                <p className="text-sm font-medium">
                  {stats?.lastActivityAt
                    ? format(new Date(stats.lastActivityAt), 'dd/MM HH:mm', { locale })
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('siem.title')}
              </CardTitle>
              <CardDescription>{t('siem.description')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                {t('common.refresh')}
              </Button>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-1" />
                {t('siem.addIntegration')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('siem.noIntegrations')}</p>
              <p className="text-sm">{t('siem.noIntegrationsDescription')}</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t('siem.addFirst')}
              </Button>
            </div>
          ) : (
            integrations.map((integration) => (
              <Collapsible
                key={integration.id}
                open={expandedId === integration.id}
                onOpenChange={(open) => setExpandedId(open ? integration.id : null)}
              >
                <div className={cn(
                  "border rounded-lg p-4 transition-colors",
                  integration.isEnabled ? "bg-background" : "bg-muted/30"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={integration.isEnabled}
                        onCheckedChange={() => handleToggle(integration)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{integration.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {FORMAT_INFO[integration.format].name}
                          </Badge>
                          {integration.lastErrorAt && !integration.lastSuccessAt && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {t('siem.error')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {integration.endpointUrl}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {integration.eventsSent.toLocaleString()} {t('siem.events')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(integration)}
                        disabled={testing === integration.id || !integration.isEnabled}
                      >
                        <Play className={cn("h-4 w-4", testing === integration.id && "animate-pulse")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(integration)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedId === integration.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="pt-4 mt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('siem.format')}</p>
                        <p className="font-medium">{FORMAT_INFO[integration.format].name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('siem.auth')}</p>
                        <p className="font-medium">{AUTH_TYPES[integration.authType]}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('siem.lastSuccess')}</p>
                        <p className="font-medium">
                          {integration.lastSuccessAt
                            ? format(new Date(integration.lastSuccessAt), 'dd/MM HH:mm', { locale })
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('siem.lastError')}</p>
                        <p className={cn("font-medium", integration.lastErrorAt && "text-destructive")}>
                          {integration.lastErrorAt
                            ? format(new Date(integration.lastErrorAt), 'dd/MM HH:mm', { locale })
                            : '-'}
                        </p>
                      </div>
                    </div>
                    {integration.lastErrorMessage && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        {integration.lastErrorMessage}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">{t('siem.includes')}:</span>
                      {integration.includeIp && <Badge variant="secondary" className="text-xs">IP</Badge>}
                      {integration.includeGeo && <Badge variant="secondary" className="text-xs">Geo</Badge>}
                      {integration.includeDevice && <Badge variant="secondary" className="text-xs">Device</Badge>}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration ? t('siem.editIntegration') : t('siem.addIntegration')}
            </DialogTitle>
            <DialogDescription>
              {t('siem.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('siem.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Splunk Production"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">{t('siem.format')} *</Label>
                <Select
                  value={formData.format}
                  onValueChange={(v) => setFormData({ ...formData, format: v as CreateSIEMIntegrationInput['format'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAT_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{info.name}</span>
                          <span className="text-xs text-muted-foreground">{info.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint">{t('siem.endpoint')} *</Label>
              <Input
                id="endpoint"
                value={formData.endpointUrl}
                onChange={(e) => setFormData({ ...formData, endpointUrl: e.target.value })}
                placeholder="https://your-siem.example.com/api/events"
              />
            </div>

            {/* Authentication */}
            <div className="space-y-4">
              <Label>{t('siem.authentication')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formData.authType}
                  onValueChange={(v) => setFormData({ ...formData, authType: v as CreateSIEMIntegrationInput['authType'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUTH_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.authType === 'api_key' && (
                  <Input
                    placeholder={t('siem.headerName')}
                    value={formData.authHeader}
                    onChange={(e) => setFormData({ ...formData, authHeader: e.target.value })}
                  />
                )}
              </div>

              {formData.authType !== 'none' && (
                <Input
                  type="password"
                  placeholder={formData.authType === 'basic' ? 'base64(user:pass)' : t('siem.tokenValue')}
                  value={formData.authValue}
                  onChange={(e) => setFormData({ ...formData, authValue: e.target.value })}
                />
              )}
            </div>

            {/* Data Options */}
            <div className="space-y-3">
              <Label>{t('siem.dataToInclude')}</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.includeIp}
                    onCheckedChange={(c) => setFormData({ ...formData, includeIp: !!c })}
                  />
                  <span className="text-sm">{t('siem.includeIp')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.includeGeo}
                    onCheckedChange={(c) => setFormData({ ...formData, includeGeo: !!c })}
                  />
                  <span className="text-sm">{t('siem.includeGeo')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.includeDevice}
                    onCheckedChange={(c) => setFormData({ ...formData, includeDevice: !!c })}
                  />
                  <span className="text-sm">{t('siem.includeDevice')}</span>
                </label>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <Label>{t('siem.entityFilter')}</Label>
              <p className="text-xs text-muted-foreground">{t('siem.filterDescription')}</p>
              <div className="flex flex-wrap gap-2">
                {ENTITY_TYPES.map((entity) => (
                  <Badge
                    key={entity}
                    variant={formData.entityFilter?.includes(entity) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleEntityFilter(entity)}
                  >
                    {t(`auditLogs.entity.${entity}`, entity)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t('siem.actionFilter')}</Label>
              <div className="flex flex-wrap gap-2">
                {ACTION_TYPES.map((action) => (
                  <Badge
                    key={action}
                    variant={formData.actionFilter?.includes(action) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleActionFilter(action)}
                  >
                    {t(`auditLogs.action.${action}`, action)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit}>
              {selectedIntegration ? t('common.save') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('siem.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('siem.deleteDescription', { name: selectedIntegration?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
