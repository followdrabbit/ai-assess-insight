import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { frameworks as defaultFrameworks, Framework } from '@/lib/frameworks';
import { 
  CustomFramework, 
  getAllCustomFrameworks, 
  createCustomFramework, 
  updateCustomFramework, 
  deleteCustomFramework,
  getDisabledFrameworks,
  disableDefaultFramework,
  enableDefaultFramework
} from '@/lib/database';
import { SecurityDomain, getAllSecurityDomains, DOMAIN_COLORS } from '@/lib/securityDomains';
import { Brain, Cloud, Code, Shield, Lock, Database, Server, Key, Plus, ExternalLink, Filter } from 'lucide-react';
import { CardActionButtons, createEditAction, createDeleteAction } from './CardActionButtons';
import { CardLoadingOverlay } from './CardLoadingOverlay';
import { FilterBar, createSecurityDomainBadges } from './FilterBar';

type AudienceType = 'Executive' | 'GRC' | 'Engineering';
type CategoryType = 'core' | 'high-value' | 'tech-focused' | 'custom';

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  cloud: Cloud,
  code: Code,
  shield: Shield,
  lock: Lock,
  database: Database,
  server: Server,
  key: Key
};

interface FrameworkFormData {
  frameworkId: string;
  frameworkName: string;
  shortName: string;
  description: string;
  targetAudience: AudienceType[];
  assessmentScope: string;
  defaultEnabled: boolean;
  version: string;
  category: CategoryType;
  references: string[];
  securityDomainId: string;
}

const emptyFormData: FrameworkFormData = {
  frameworkId: '',
  frameworkName: '',
  shortName: '',
  description: '',
  targetAudience: [],
  assessmentScope: '',
  defaultEnabled: false,
  version: '1.0.0',
  category: 'custom',
  references: [],
  securityDomainId: ''
};

export function FrameworkManagement() {
  const { t } = useTranslation();

  const categoryLabels: Record<CategoryType, string> = {
    core: t('settings.categoryCore'),
    'high-value': t('settings.categoryHighValue'),
    'tech-focused': t('settings.categoryTechFocused'),
    custom: t('settings.categoryCustom')
  };

  const audienceLabels: Record<AudienceType, string> = {
    Executive: t('settings.audienceExecutive'),
    GRC: t('settings.audienceGRC'),
    Engineering: t('settings.audienceEngineering')
  };

  const [customFrameworks, setCustomFrameworks] = useState<CustomFramework[]>([]);
  const [disabledDefaultFrameworks, setDisabledDefaultFrameworks] = useState<Set<string>>(new Set());
  const [securityDomains, setSecurityDomains] = useState<SecurityDomain[]>([]);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [editingFramework, setEditingFramework] = useState<CustomFramework | null>(null);
  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [formData, setFormData] = useState<FrameworkFormData>(emptyFormData);
  const [referencesText, setReferencesText] = useState('');
  const [operatingId, setOperatingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [frameworks, disabledIds, domains] = await Promise.all([
      getAllCustomFrameworks(),
      getDisabledFrameworks(),
      getAllSecurityDomains()
    ]);
    setCustomFrameworks(frameworks);
    setSecurityDomains(domains);
    // Track which default frameworks have custom overrides OR are disabled
    const overriddenIds = new Set([
      ...frameworks.map(f => f.frameworkId),
      ...disabledIds
    ]);
    setDisabledDefaultFrameworks(overriddenIds);
  };

  const allFrameworks = useMemo(() => {
    const combined = [
      ...defaultFrameworks
        .filter(f => !disabledDefaultFrameworks.has(f.frameworkId))
        .map(f => ({ ...f, isCustom: false as const, isDisabled: false })),
      ...customFrameworks.map(f => ({ ...f, isDisabled: false }))
    ];
    
    if (selectedDomainFilter === 'all') return combined;
    return combined.filter(f => f.securityDomainId === selectedDomainFilter);
  }, [customFrameworks, disabledDefaultFrameworks, selectedDomainFilter]);

  const getSecurityDomainInfo = (domainId?: string) => {
    if (!domainId) return null;
    return securityDomains.find(d => d.domainId === domainId);
  };

  const openNewDialog = () => {
    setEditingFramework(null);
    setIsEditingDefault(false);
    setFormData(emptyFormData);
    setReferencesText('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (framework: typeof allFrameworks[0]) => {
    setEditingFramework(framework.isCustom ? (framework as CustomFramework) : null);
    setIsEditingDefault(!framework.isCustom);
    setFormData({
      frameworkId: framework.frameworkId,
      frameworkName: framework.frameworkName,
      shortName: framework.shortName,
      description: framework.description,
      targetAudience: framework.targetAudience,
      assessmentScope: framework.assessmentScope,
      defaultEnabled: framework.defaultEnabled,
      version: framework.version,
      category: framework.category as CategoryType,
      references: framework.references,
      securityDomainId: framework.securityDomainId || ''
    });
    setReferencesText(framework.references.join('\n'));
    setIsDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formData.frameworkId.trim()) {
      toast.error(t('settings.frameworkIdRequired'));
      return false;
    }
    if (!formData.frameworkName.trim()) {
      toast.error(t('settings.frameworkNameRequired'));
      return false;
    }
    if (!formData.shortName.trim()) {
      toast.error(t('settings.shortNameRequired'));
      return false;
    }
    if (formData.targetAudience.length === 0) {
      toast.error(t('settings.selectAudience'));
      return false;
    }
    if (!formData.securityDomainId) {
      toast.error(t('settings.selectSecurityDomain'));
      return false;
    }

    // Check for duplicate ID only when creating completely new framework
    const customFrameworkIds = customFrameworks.map(f => f.frameworkId);
    if (!editingFramework && !isEditingDefault && customFrameworkIds.includes(formData.frameworkId)) {
      toast.error(t('settings.duplicateFrameworkId'));
      return false;
    }
    return true;
  };

  const handleConfirmSave = () => {
    if (validateForm()) {
      setIsConfirmSaveOpen(true);
    }
  };

  const handleSave = async () => {
    setIsConfirmSaveOpen(false);
    
    const references = referencesText.split('\n').filter(r => r.trim());

    try {
      const frameworkData = {
        ...formData,
        references
      };

      if (editingFramework) {
        // Editing existing custom framework
        await updateCustomFramework(editingFramework.frameworkId, frameworkData);
        toast.success(t('settings.frameworkUpdated'));
      } else if (isEditingDefault) {
        // Creating custom override for default framework
        await createCustomFramework(frameworkData);
        toast.success(t('settings.defaultOverridden'));
      } else {
        // Creating new custom framework
        await createCustomFramework(frameworkData);
        toast.success(t('settings.frameworkCreated'));
      }
      await loadData();
      setIsDialogOpen(false);
      setIsEditingDefault(false);
    } catch (error) {
      toast.error(t('errors.generic'));
      console.error(error);
    }
  };

  const handleDelete = async (frameworkId: string, isCustom: boolean) => {
    setOperatingId(frameworkId);
    try {
      if (isCustom) {
        await deleteCustomFramework(frameworkId);
        toast.success(t('settings.frameworkDeleted'));
      } else {
        await disableDefaultFramework(frameworkId);
        toast.success(t('settings.frameworkDisabled'));
      }
      await loadData();
    } catch (error) {
      toast.error(t('errors.generic'));
      console.error(error);
    } finally {
      setOperatingId(null);
    }
  };

  const handleRestore = async (frameworkId: string) => {
    try {
      await enableDefaultFramework(frameworkId);
      toast.success(t('settings.frameworkRestored'));
      await loadData();
    } catch (error) {
      toast.error(t('errors.generic'));
      console.error(error);
    }
  };

  const toggleAudience = (audience: AudienceType) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: prev.targetAudience.includes(audience)
        ? prev.targetAudience.filter(a => a !== audience)
        : [...prev.targetAudience, audience]
    }));
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('settings.manageFrameworks')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('settings.manageFrameworksDesc')}
          </p>
        </div>
        <Button variant="outline" onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('settings.newFramework')}
        </Button>
      </div>

      <FilterBar
        showSearch={false}
        domainBadges={{
          value: selectedDomainFilter,
          onChange: setSelectedDomainFilter,
          options: createSecurityDomainBadges(
            securityDomains,
            ICON_COMPONENTS,
            DOMAIN_COLORS,
            (domainId) => [...defaultFrameworks, ...customFrameworks].filter(f => f.securityDomainId === domainId).length
          ),
          allLabel: t('settings.all'),
          showAllCount: true,
          allCount: defaultFrameworks.length + customFrameworks.length,
        }}
      />

      {/* All Frameworks */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {t('settings.frameworks')} {selectedDomainFilter !== 'all' && `- ${getSecurityDomainInfo(selectedDomainFilter)?.shortName}`} ({allFrameworks.length})
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          {allFrameworks.map(fw => {
            const domainInfo = getSecurityDomainInfo(fw.securityDomainId);
            const IconComp = domainInfo ? ICON_COMPONENTS[domainInfo.icon] || Shield : null;
            const colorStyles = domainInfo ? DOMAIN_COLORS[domainInfo.color] : null;
            
            return (
              <Card key={fw.frameworkId} className={cn("card-interactive relative", !fw.isCustom && "opacity-90")}>
                <CardLoadingOverlay 
                  isLoading={operatingId === fw.frameworkId} 
                  loadingText={t('settings.processing')}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {fw.shortName}
                        <Badge variant={fw.isCustom ? "secondary" : "outline"} className="text-[10px]">
                          {fw.isCustom ? t('settings.custom') : t('settings.standard')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {fw.frameworkId} • v{fw.version}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={cn(
                        "text-[10px]",
                        fw.category === 'core' && "bg-primary",
                        fw.category === 'high-value' && "bg-amber-500",
                        fw.category === 'tech-focused' && "bg-blue-500",
                        fw.category === 'custom' && "bg-purple-500"
                      )}>
                        {categoryLabels[fw.category as CategoryType]}
                      </Badge>
                      {domainInfo && (
                        <Badge variant="outline" className={cn("text-[10px] flex items-center gap-1", colorStyles?.border)}>
                          {IconComp && <IconComp className={cn("h-3 w-3", colorStyles?.text)} />}
                          {domainInfo.shortName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {fw.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {fw.targetAudience.map(aud => (
                      <Badge key={aud} variant="outline" className="text-[10px]">
                        {audienceLabels[aud]}
                      </Badge>
                    ))}
                  </div>
                  <CardActionButtons
                    withBorder={false}
                    actions={[
                      createEditAction(() => openEditDialog(fw)),
                      createDeleteAction(
                        () => handleDelete(fw.frameworkId, fw.isCustom),
                        {
                          itemName: fw.shortName,
                          isDefault: !fw.isCustom,
                          confirmTitle: fw.isCustom ? t('settings.deleteFrameworkTitle') : t('settings.disableFrameworkTitle'),
                          confirmDescription: fw.isCustom 
                            ? t('settings.deleteFrameworkConfirm', { name: fw.shortName })
                            : t('settings.disableFrameworkConfirm', { name: fw.shortName }),
                          confirmActionLabel: fw.isCustom ? t('settings.deleteConfirm') : t('settings.disableConfirm'),
                        }
                      ),
                    ]}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>


      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFramework ? 'Editar Framework' : isEditingDefault ? 'Editar Framework Padrão' : 'Novo Framework'}
            </DialogTitle>
            <DialogDescription>
              {editingFramework 
                ? 'Atualize as informações do framework personalizado.'
                : isEditingDefault
                  ? 'Crie uma versão personalizada do framework padrão. O original será substituído.'
                  : 'Crie um novo framework personalizado para sua avaliação.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frameworkId">ID do Framework *</Label>
                <Input
                  id="frameworkId"
                  value={formData.frameworkId}
                  onChange={(e) => setFormData(prev => ({ ...prev, frameworkId: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
                  placeholder="MEU_FRAMEWORK"
                  disabled={!!editingFramework || isEditingDefault}
                />
                <p className="text-xs text-muted-foreground">
                  {isEditingDefault ? 'ID mantido para substituir o framework padrão' : 'Identificador único (não pode ser alterado depois)'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Versão</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frameworkName">Nome Completo *</Label>
                <Input
                  id="frameworkName"
                  value={formData.frameworkName}
                  onChange={(e) => setFormData(prev => ({ ...prev, frameworkName: e.target.value }))}
                  placeholder="Meu Framework de Segurança"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Nome Curto *</Label>
                <Input
                  id="shortName"
                  value={formData.shortName}
                  onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="MEU FW"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito e escopo do framework..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessmentScope">Escopo de Avaliação</Label>
              <Input
                id="assessmentScope"
                value={formData.assessmentScope}
                onChange={(e) => setFormData(prev => ({ ...prev, assessmentScope: e.target.value }))}
                placeholder="Ex: Segurança de aplicações de IA"
              />
            </div>

            {/* Security Domain Selector */}
            <div className="space-y-2">
              <Label>Domínio de Segurança *</Label>
              <Select
                value={formData.securityDomainId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, securityDomainId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um domínio" />
                </SelectTrigger>
                <SelectContent>
                  {securityDomains.filter(d => d.isEnabled).map(domain => {
                    const IconComp = ICON_COMPONENTS[domain.icon] || Shield;
                    const colorStyles = DOMAIN_COLORS[domain.color];
                    return (
                      <SelectItem key={domain.domainId} value={domain.domainId}>
                        <div className="flex items-center gap-2">
                          <IconComp className={cn("h-4 w-4", colorStyles?.text)} />
                          {domain.domainName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Associe este framework a um domínio de segurança específico
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: CategoryType) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="high-value">Alto Valor</SelectItem>
                    <SelectItem value="tech-focused">Técnico</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Habilitado por Padrão</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={formData.defaultEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, defaultEnabled: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.defaultEnabled ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Público-Alvo *</Label>
              <div className="flex gap-4">
                {(['Executive', 'GRC', 'Engineering'] as AudienceType[]).map(audience => (
                  <div key={audience} className="flex items-center gap-2">
                    <Checkbox
                      id={`audience-${audience}`}
                      checked={formData.targetAudience.includes(audience)}
                      onCheckedChange={() => toggleAudience(audience)}
                    />
                    <Label htmlFor={`audience-${audience}`} className="text-sm font-normal">
                      {audienceLabels[audience]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="references">Referências (uma por linha)</Label>
              <Textarea
                id="references"
                value={referencesText}
                onChange={(e) => setReferencesText(e.target.value)}
                placeholder="https://exemplo.com/framework-doc&#10;https://outro-link.com"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSave}>
              {editingFramework ? 'Salvar Alterações' : isEditingDefault ? 'Substituir Framework' : 'Criar Framework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Save */}
      <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingFramework 
                ? 'Confirmar alterações?' 
                : isEditingDefault 
                  ? 'Substituir framework padrão?' 
                  : 'Criar novo framework?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editingFramework 
                ? `Você deseja salvar as alterações no framework "${formData.shortName}"?`
                : isEditingDefault 
                  ? `Você deseja criar uma versão personalizada do framework "${formData.shortName}"? O framework padrão será substituído.`
                  : `Você deseja criar o novo framework "${formData.shortName}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>
              Sim, Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
