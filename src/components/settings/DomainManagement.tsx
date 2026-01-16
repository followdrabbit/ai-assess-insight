import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { SecurityDomain, getAllSecurityDomains, DOMAIN_COLORS } from '@/lib/securityDomains';
import { 
  exportDomainConfig, 
  downloadDomainConfig, 
  validateImportFile, 
  importDomainConfig,
  DomainConfigExport,
  ValidationResult
} from '@/lib/domainConfigExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Brain, Cloud, Code, Shield, Lock, Database, Server, Key, Pencil, Save, Plus, Trash2, AlertTriangle, FolderTree, BookOpen, HelpCircle, Download, Upload, FileJson, CheckCircle2, XCircle, Search, X } from 'lucide-react';
import { questions } from '@/lib/dataset';
import { frameworks } from '@/lib/frameworks';
import { CardActionButtons, createEditAction, createDeleteAction, createExportAction } from './CardActionButtons';
import { CardLoadingOverlay } from './CardLoadingOverlay';
import { FilterBar } from './FilterBar';
import { StatsGrid, createTotalStat, createActiveStat } from './StatsGrid';

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

const getColorOptions = (t: (key: string) => string) => [
  { value: 'purple', label: t('settings.colorPurple') },
  { value: 'blue', label: t('settings.colorBlue') },
  { value: 'green', label: t('settings.colorGreen') },
  { value: 'orange', label: t('settings.colorOrange') },
  { value: 'red', label: t('settings.colorRed') },
  { value: 'yellow', label: t('settings.colorYellow') }
];

const getIconOptions = (t: (key: string) => string) => [
  { value: 'brain', label: t('settings.iconBrain') },
  { value: 'cloud', label: t('settings.iconCloud') },
  { value: 'code', label: t('settings.iconCode') },
  { value: 'shield', label: t('settings.iconShield') },
  { value: 'lock', label: t('settings.iconLock') },
  { value: 'database', label: t('settings.iconDatabase') },
  { value: 'server', label: t('settings.iconServer') },
  { value: 'key', label: t('settings.iconKey') }
];

// Interface for new domain creation with taxonomy
interface NewDomainData {
  domainName: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  taxonomyDomains: TaxonomyDomain[];
}

interface TaxonomyDomain {
  id: string;
  name: string;
  description: string;
  subcategories: TaxonomySubcategory[];
}

interface TaxonomySubcategory {
  id: string;
  name: string;
  definition: string;
  objective: string;
  criticality: string;
}

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

export function DomainManagement() {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<SecurityDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<SecurityDomain | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState<'basics' | 'taxonomy' | 'review'>('basics');
  const [deletingDomain, setDeletingDomain] = useState<SecurityDomain | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import/Export state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [importConfig, setImportConfig] = useState<DomainConfigExport | null>(null);
  const [importOptions, setImportOptions] = useState({
    newDomainId: '',
    newDomainName: '',
    importFrameworks: true,
    importQuestions: true
  });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  
  const [editFormData, setEditFormData] = useState({
    domainName: '',
    shortName: '',
    description: '',
    color: 'blue',
    icon: 'shield'
  });

  const [newDomainData, setNewDomainData] = useState<NewDomainData>({
    domainName: '',
    shortName: '',
    description: '',
    color: 'blue',
    icon: 'shield',
    taxonomyDomains: []
  });

  const [currentTaxonomyDomain, setCurrentTaxonomyDomain] = useState<TaxonomyDomain>({
    id: '',
    name: '',
    description: '',
    subcategories: []
  });

  const [currentSubcategory, setCurrentSubcategory] = useState<TaxonomySubcategory>({
    id: '',
    name: '',
    definition: '',
    objective: '',
    criticality: 'medium'
  });

  const COLOR_OPTIONS = getColorOptions(t);
  const ICON_OPTIONS = getIconOptions(t);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const data = await getAllSecurityDomains();
      setDomains(data);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const getQuestionCount = (domainId: string): number => {
    return questions.filter(q => q.securityDomainId === domainId).length;
  };

  const getFrameworkCount = (domainId: string): number => {
    return frameworks.filter(f => f.securityDomainId === domainId).length;
  };

  const toggleDomainEnabled = async (domain: SecurityDomain) => {
    // Prevent disabling if it's the last enabled domain
    const enabledCount = domains.filter(d => d.isEnabled).length;
    if (domain.isEnabled && enabledCount <= 1) {
      toast.error(t('settings.atLeastOneDomain'));
      return;
    }

    setOperatingId(domain.domainId);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_domains')
        .update({ is_enabled: !domain.isEnabled, updated_at: new Date().toISOString() })
        .eq('domain_id', domain.domainId);

      if (error) throw error;

      setDomains(prev => prev.map(d => 
        d.domainId === domain.domainId 
          ? { ...d, isEnabled: !d.isEnabled }
          : d
      ));

      toast.success(!domain.isEnabled ? t('settings.domainEnabled') : t('settings.domainDisabled'));
    } catch (error) {
      console.error('Error toggling domain:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
      setOperatingId(null);
    }
  };

  const openEditDialog = (domain: SecurityDomain) => {
    setEditingDomain(domain);
    setEditFormData({
      domainName: domain.domainName,
      shortName: domain.shortName,
      description: domain.description,
      color: domain.color,
      icon: domain.icon
    });
  };

  const resetCreateDialog = () => {
    setNewDomainData({
      domainName: '',
      shortName: '',
      description: '',
      color: 'blue',
      icon: 'shield',
      taxonomyDomains: []
    });
    setCurrentTaxonomyDomain({ id: '', name: '', description: '', subcategories: [] });
    setCurrentSubcategory({ id: '', name: '', definition: '', objective: '', criticality: 'medium' });
    setCreateStep('basics');
  };

  const openCreateDialog = () => {
    resetCreateDialog();
    setShowCreateDialog(true);
  };

  const addTaxonomyDomain = () => {
    if (!currentTaxonomyDomain.name.trim()) {
      toast.error(t('settings.taxonomyDomainRequired'));
      return;
    }

    const newDomain: TaxonomyDomain = {
      ...currentTaxonomyDomain,
      id: generateId('DOM')
    };

    setNewDomainData(prev => ({
      ...prev,
      taxonomyDomains: [...prev.taxonomyDomains, newDomain]
    }));

    setCurrentTaxonomyDomain({ id: '', name: '', description: '', subcategories: [] });
    toast.success(t('settings.taxonomyDomainAdded'));
  };

  const removeTaxonomyDomain = (domainId: string) => {
    setNewDomainData(prev => ({
      ...prev,
      taxonomyDomains: prev.taxonomyDomains.filter(d => d.id !== domainId)
    }));
  };

  const addSubcategoryToTaxonomyDomain = (taxonomyDomainId: string) => {
    if (!currentSubcategory.name.trim()) {
      toast.error(t('settings.subcategoryRequired'));
      return;
    }

    const newSubcat: TaxonomySubcategory = {
      ...currentSubcategory,
      id: generateId('SUB')
    };

    setNewDomainData(prev => ({
      ...prev,
      taxonomyDomains: prev.taxonomyDomains.map(d => 
        d.id === taxonomyDomainId 
          ? { ...d, subcategories: [...d.subcategories, newSubcat] }
          : d
      )
    }));

    setCurrentSubcategory({ id: '', name: '', definition: '', objective: '', criticality: 'medium' });
    toast.success(t('settings.subcategoryAdded'));
  };

  const removeSubcategory = (taxonomyDomainId: string, subcatId: string) => {
    setNewDomainData(prev => ({
      ...prev,
      taxonomyDomains: prev.taxonomyDomains.map(d => 
        d.id === taxonomyDomainId 
          ? { ...d, subcategories: d.subcategories.filter(s => s.id !== subcatId) }
          : d
      )
    }));
  };

  const validateBasics = () => {
    if (!newDomainData.domainName.trim()) {
      toast.error(t('settings.domainNameRequired'));
      return false;
    }
    if (!newDomainData.shortName.trim()) {
      toast.error(t('settings.shortNameRequired'));
      return false;
    }
    const proposedId = newDomainData.shortName.toUpperCase().replace(/\s+/g, '_');
    if (domains.some(d => d.domainId === proposedId)) {
      toast.error(t('settings.duplicateFrameworkId'));
      return false;
    }
    return true;
  };

  const createNewDomain = async () => {
    if (!validateBasics()) return;

    setSaving(true);
    try {
      const domainId = newDomainData.shortName.toUpperCase().replace(/\s+/g, '_');
      const maxOrder = Math.max(...domains.map(d => d.displayOrder), 0);

      const { error: domainError } = await supabase
        .from('security_domains')
        .insert({
          domain_id: domainId,
          domain_name: newDomainData.domainName.trim(),
          short_name: newDomainData.shortName.trim(),
          description: newDomainData.description.trim(),
          color: newDomainData.color,
          icon: newDomainData.icon,
          display_order: maxOrder + 1,
          is_enabled: true
        });

      if (domainError) throw domainError;

      for (const taxDomain of newDomainData.taxonomyDomains) {
        const { error: taxDomainError } = await supabase
          .from('domains')
          .insert({
            domain_id: taxDomain.id,
            domain_name: taxDomain.name,
            description: taxDomain.description,
            security_domain_id: domainId,
            display_order: newDomainData.taxonomyDomains.indexOf(taxDomain) + 1
          });

        if (taxDomainError) {
          console.error('Error creating taxonomy domain:', taxDomainError);
          continue;
        }

        for (const subcat of taxDomain.subcategories) {
          const { error: subcatError } = await supabase
            .from('subcategories')
            .insert({
              subcat_id: subcat.id,
              subcat_name: subcat.name,
              definition: subcat.definition,
              objective: subcat.objective,
              criticality: subcat.criticality,
              domain_id: taxDomain.id,
              security_domain_id: domainId
            });

          if (subcatError) {
            console.error('Error creating subcategory:', subcatError);
          }
        }
      }

      toast.success(t('settings.domainCreated'));
      setShowCreateDialog(false);
      resetCreateDialog();
      await loadDomains();
    } catch (error) {
      console.error('Error creating domain:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteDomain = async (domain: SecurityDomain) => {
    const coreDomains = ['AI_SECURITY', 'CLOUD_SECURITY', 'DEVSECOPS'];
    if (coreDomains.includes(domain.domainId)) {
      toast.error(t('settings.coreDomainCannotDelete'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_domains')
        .delete()
        .eq('domain_id', domain.domainId);

      if (error) throw error;

      toast.success(t('settings.domainDeleted'));
      setDeletingDomain(null);
      await loadDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const isCoreDomain = (domainId: string) => {
    return ['AI_SECURITY', 'CLOUD_SECURITY', 'DEVSECOPS'].includes(domainId);
  };

  // Export domain configuration
  const handleExportDomain = async (domain: SecurityDomain) => {
    setExporting(domain.domainId);
    try {
      const config = await exportDomainConfig(domain.domainId);
      if (config) {
        downloadDomainConfig(config);
        toast.success(t('settings.exportSuccess'));
      } else {
        toast.error(t('settings.exportError'));
      }
    } catch (error) {
      console.error('Error exporting domain:', error);
      toast.error(t('settings.exportError'));
    } finally {
      setExporting(null);
    }
  };

  // Handle import file selection
  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateImportFile(file);
    setImportValidation(validation);

    if (validation.isValid && validation.config) {
      setImportConfig(validation.config);
      setImportOptions({
        newDomainId: '',
        newDomainName: validation.config.securityDomain.domainName + ` (${t('common.import')})`,
        importFrameworks: true,
        importQuestions: true
      });
      setShowImportDialog(true);
    } else {
      toast.error(validation.errors[0] || t('settings.invalidFile'));
    }

    // Reset file input
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  // Execute import
  const handleImport = async () => {
    if (!importConfig) return;

    setImporting(true);
    try {
      const result = await importDomainConfig(importConfig, {
        newDomainId: importOptions.newDomainId || undefined,
        newDomainName: importOptions.newDomainName || undefined,
        importFrameworks: importOptions.importFrameworks,
        importQuestions: importOptions.importQuestions
      });

      if (result.success) {
        toast.success(t('settings.importSuccess'));
        setShowImportDialog(false);
        setImportConfig(null);
        setImportValidation(null);
        await loadDomains();
      } else {
        toast.error(result.errors[0] || t('common.error'));
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w));
      }
    } catch (error) {
      console.error('Error importing domain:', error);
      toast.error(t('common.error'));
    } finally {
      setImporting(false);
    }
  };

  const resetImportDialog = () => {
    setShowImportDialog(false);
    setImportConfig(null);
    setImportValidation(null);
    setImportOptions({
      newDomainId: '',
      newDomainName: '',
      importFrameworks: true,
      importQuestions: true
    });
  };

  const saveEditedDomain = async () => {
    if (!editingDomain) return;

    if (!editFormData.domainName.trim() || !editFormData.shortName.trim()) {
      toast.error(t('settings.domainNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_domains')
        .update({
          domain_name: editFormData.domainName.trim(),
          short_name: editFormData.shortName.trim(),
          description: editFormData.description.trim(),
          color: editFormData.color,
          icon: editFormData.icon,
          updated_at: new Date().toISOString()
        })
        .eq('domain_id', editingDomain.domainId);

      if (error) throw error;

      setDomains(prev => prev.map(d => 
        d.domainId === editingDomain.domainId 
          ? { 
              ...d, 
              domainName: editFormData.domainName.trim(),
              shortName: editFormData.shortName.trim(),
              description: editFormData.description.trim(),
              color: editFormData.color,
              icon: editFormData.icon
            }
          : d
      ));

      setEditingDomain(null);
      toast.success(t('settings.domainUpdated'));
    } catch (error) {
      console.error('Error saving domain:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const DomainCard = ({ domain }: { domain: SecurityDomain }) => {
    const IconComponent = ICON_COMPONENTS[domain.icon] || Shield;
    const colorStyles = DOMAIN_COLORS[domain.color] || DOMAIN_COLORS.blue;
    const questionCount = getQuestionCount(domain.domainId);
    const frameworkCount = getFrameworkCount(domain.domainId);
    const isCore = isCoreDomain(domain.domainId);

    return (
      <Card className={cn(
        "card-interactive h-full flex flex-col relative",
        domain.isEnabled 
          ? "border-primary/50" 
          : "opacity-60 border-muted"
      )}>
        <CardLoadingOverlay 
          isLoading={operatingId === domain.domainId} 
          loadingText={t('settings.processing')}
        />
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                colorStyles.bg
              )}>
                <IconComponent className={cn("h-4 w-4", colorStyles.text)} />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm flex items-center gap-1.5 flex-wrap">
                  <span className="truncate">{domain.domainName}</span>
                  {isCore && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                      {t('settings.main')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {domain.shortName}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Switch
                checked={domain.isEnabled}
                onCheckedChange={() => toggleDomainEnabled(domain)}
                disabled={saving}
                className="scale-90"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1 flex flex-col">
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
            {domain.description || t('settings.noDescription')}
          </p>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
            <Badge variant="outline" className={cn("font-normal text-[10px]", colorStyles.border)}>
              {frameworkCount} frameworks
            </Badge>
            <Badge variant="outline" className="font-normal text-[10px]">
              {questionCount} {t('settings.questions').toLowerCase()}
            </Badge>
          </div>

          <CardActionButtons
            actions={[
              createExportAction(
                () => handleExportDomain(domain),
                exporting === domain.domainId
              ),
              createEditAction(() => openEditDialog(domain)),
              createDeleteAction(
                () => setDeletingDomain(domain),
                {
                  hidden: isCore,
                  itemName: domain.domainName,
                  requiresConfirmation: false,
                  className: 'ml-auto',
                }
              ),
            ]}
          />
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Domínios de Segurança</CardTitle>
              <CardDescription>
                Gerencie os domínios de governança de segurança disponíveis na plataforma
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                onChange={handleImportFileSelect}
                className="hidden"
              />
              <Button variant="ghost" size="sm" onClick={() => importFileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button variant="outline" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Domínio
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StatsGrid
            stats={[
              createTotalStat(domains.length, 'Domínios totais'),
              createActiveStat(domains.filter(d => d.isEnabled).length, 'Domínios ativos'),
              createTotalStat(questions.length, 'Perguntas totais'),
            ]}
            variant="inline"
            className="mb-6"
          />

          {/* Search Filter */}
          {domains.length > 3 && (
            <FilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar domínios por nome ou descrição..."
              showClearButton={false}
              className="mb-4"
            />
          )}

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {domains
              .filter(domain => {
                if (!searchTerm.trim()) return true;
                const term = searchTerm.toLowerCase();
                return (
                  domain.domainName.toLowerCase().includes(term) ||
                  domain.shortName.toLowerCase().includes(term) ||
                  domain.description.toLowerCase().includes(term)
                );
              })
              .map(domain => (
                <DomainCard key={domain.domainId} domain={domain} />
              ))}
          </div>
          
          {searchTerm && domains.filter(d => 
            d.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.description.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum domínio encontrado para "{searchTerm}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Sobre os Domínios de Segurança</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Cada domínio representa uma área principal de governança de segurança</li>
            <li>• Frameworks e perguntas são associados a domínios específicos</li>
            <li>• Desabilitar um domínio oculta seus dados dos dashboards</li>
            <li>• Pelo menos um domínio deve estar sempre habilitado</li>
            <li>• Domínios personalizados podem ser criados com taxonomia própria</li>
          </ul>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDomain} onOpenChange={(open) => !open && setDeletingDomain(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Domínio de Segurança
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o domínio "{deletingDomain?.domainName}"? 
              Esta ação irá remover o domínio, mas os dados de avaliação associados serão mantidos para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDomain && deleteDomain(deletingDomain)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Domain Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetCreateDialog(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Novo Domínio de Segurança
            </DialogTitle>
            <DialogDescription>
              Configure um novo domínio com sua própria taxonomia de áreas e subcategorias
            </DialogDescription>
          </DialogHeader>

          <Tabs value={createStep} onValueChange={(v) => setCreateStep(v as typeof createStep)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basics" className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                Básico
              </TabsTrigger>
              <TabsTrigger value="taxonomy" className="flex items-center gap-1.5" disabled={!newDomainData.domainName}>
                <FolderTree className="h-4 w-4" />
                Taxonomia
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-1.5" disabled={!newDomainData.domainName}>
                <BookOpen className="h-4 w-4" />
                Revisar
              </TabsTrigger>
            </TabsList>

            {/* Step 1: Basic Info */}
            <TabsContent value="basics" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="newDomainName">Nome do Domínio *</Label>
                <Input
                  id="newDomainName"
                  value={newDomainData.domainName}
                  onChange={(e) => setNewDomainData(prev => ({ ...prev, domainName: e.target.value }))}
                  placeholder="Ex: Data Privacy Security"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newShortName">Nome Curto *</Label>
                <Input
                  id="newShortName"
                  value={newDomainData.shortName}
                  onChange={(e) => setNewDomainData(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="Ex: Data Privacy"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  ID gerado: {newDomainData.shortName ? newDomainData.shortName.toUpperCase().replace(/\s+/g, '_') : '...'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newDescription">Descrição</Label>
                <Textarea
                  id="newDescription"
                  value={newDomainData.description}
                  onChange={(e) => setNewDomainData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição das áreas de governança cobertas por este domínio..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Select
                    value={newDomainData.color}
                    onValueChange={(value) => setNewDomainData(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(option => {
                        const colorStyle = DOMAIN_COLORS[option.value];
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-3 h-3 rounded-full", colorStyle?.bg)} />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select
                    value={newDomainData.icon}
                    onValueChange={(value) => setNewDomainData(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(option => {
                        const IconComp = ICON_COMPONENTS[option.value];
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              {IconComp && <IconComp className="h-4 w-4" />}
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2 pt-2">
                <Label>Visualização</Label>
                <div className={cn(
                  "p-3 rounded-lg border flex items-center gap-3",
                  DOMAIN_COLORS[newDomainData.color]?.bg || 'bg-muted'
                )}>
                  {(() => {
                    const IconComp = ICON_COMPONENTS[newDomainData.icon] || Shield;
                    const textColor = DOMAIN_COLORS[newDomainData.color]?.text || 'text-foreground';
                    return <IconComp className={cn("h-5 w-5", textColor)} />;
                  })()}
                  <div>
                    <div className={cn("font-medium text-sm", DOMAIN_COLORS[newDomainData.color]?.text)}>
                      {newDomainData.domainName || 'Nome do Domínio'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {newDomainData.shortName || 'Nome Curto'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => validateBasics() && setCreateStep('taxonomy')}>
                  Próximo: Taxonomia
                </Button>
              </div>
            </TabsContent>

            {/* Step 2: Taxonomy */}
            <TabsContent value="taxonomy" className="space-y-4 pt-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Defina a estrutura de áreas (domínios) e subcategorias para este domínio de segurança. 
                  Você pode adicionar perguntas e frameworks depois na gestão de conteúdo.
                </p>
              </div>

              {/* Add Taxonomy Domain */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderTree className="h-4 w-4" />
                    Adicionar Área de Taxonomia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label>Nome da Área *</Label>
                      <Input
                        value={currentTaxonomyDomain.name}
                        onChange={(e) => setCurrentTaxonomyDomain(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Data Classification"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        value={currentTaxonomyDomain.description}
                        onChange={(e) => setCurrentTaxonomyDomain(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrição da área..."
                      />
                    </div>
                  </div>
                  <Button variant="outline" onClick={addTaxonomyDomain} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Área
                  </Button>
                </CardContent>
              </Card>

              {/* List of Taxonomy Domains */}
              {newDomainData.taxonomyDomains.length > 0 && (
                <div className="space-y-3">
                  <Label>Áreas Adicionadas ({newDomainData.taxonomyDomains.length})</Label>
                  {newDomainData.taxonomyDomains.map((taxDomain) => (
                    <Card key={taxDomain.id} className="border-primary/30">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm">{taxDomain.name}</CardTitle>
                            {taxDomain.description && (
                              <CardDescription className="text-xs">{taxDomain.description}</CardDescription>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeTaxonomyDomain(taxDomain.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Subcategories for this domain */}
                        {taxDomain.subcategories.length > 0 && (
                          <div className="space-y-2 pl-3 border-l-2 border-muted">
                            {taxDomain.subcategories.map((subcat) => (
                              <div key={subcat.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                <div>
                                  <span className="font-medium">{subcat.name}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {subcat.criticality}
                                  </Badge>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeSubcategory(taxDomain.id, subcat.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add subcategory form */}
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-xs">Adicionar Subcategoria</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={currentSubcategory.name}
                              onChange={(e) => setCurrentSubcategory(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Nome da subcategoria"
                              className="text-sm"
                            />
                            <Select
                              value={currentSubcategory.criticality}
                              onValueChange={(value) => setCurrentSubcategory(prev => ({ ...prev, criticality: value }))}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Criticidade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="critical">Crítico</SelectItem>
                                <SelectItem value="high">Alto</SelectItem>
                                <SelectItem value="medium">Médio</SelectItem>
                                <SelectItem value="low">Baixo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Input
                            value={currentSubcategory.definition}
                            onChange={(e) => setCurrentSubcategory(prev => ({ ...prev, definition: e.target.value }))}
                            placeholder="Definição (opcional)"
                            className="text-sm"
                          />
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => addSubcategoryToTaxonomyDomain(taxDomain.id)}
                            className="w-full"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar Subcategoria
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCreateStep('basics')}>
                  Voltar
                </Button>
                <Button onClick={() => setCreateStep('review')}>
                  Próximo: Revisar
                </Button>
              </div>
            </TabsContent>

            {/* Step 3: Review */}
            <TabsContent value="review" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {(() => {
                      const IconComp = ICON_COMPONENTS[newDomainData.icon] || Shield;
                      const colorStyles = DOMAIN_COLORS[newDomainData.color];
                      return (
                        <div className={cn("p-2 rounded-lg", colorStyles?.bg)}>
                          <IconComp className={cn("h-4 w-4", colorStyles?.text)} />
                        </div>
                      );
                    })()}
                    {newDomainData.domainName}
                  </CardTitle>
                  <CardDescription>
                    {newDomainData.shortName} • ID: {newDomainData.shortName.toUpperCase().replace(/\s+/g, '_')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {newDomainData.description && (
                    <p className="text-sm text-muted-foreground mb-4">{newDomainData.description}</p>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Estrutura de Taxonomia</Label>
                    {newDomainData.taxonomyDomains.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhuma área de taxonomia definida. Você pode adicionar depois.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {newDomainData.taxonomyDomains.map((taxDomain) => (
                          <div key={taxDomain.id} className="p-3 border rounded-lg">
                            <div className="font-medium text-sm">{taxDomain.name}</div>
                            {taxDomain.subcategories.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-muted space-y-1">
                                {taxDomain.subcategories.map((subcat) => (
                                  <div key={subcat.id} className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{subcat.name}</span>
                                    <Badge variant="outline" className="text-[10px]">{subcat.criticality}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Após criar o domínio, você poderá adicionar frameworks e perguntas 
                        nas seções de gerenciamento de frameworks e perguntas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCreateStep('taxonomy')}>
                  Voltar
                </Button>
                <Button onClick={createNewDomain} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Criando...' : 'Criar Domínio'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDomain} onOpenChange={(open) => !open && setEditingDomain(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Domínio</DialogTitle>
            <DialogDescription>
              Personalize as informações de exibição do domínio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domainName">Nome do Domínio</Label>
              <Input
                id="domainName"
                value={editFormData.domainName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, domainName: e.target.value }))}
                placeholder="Ex: AI Security"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortName">Nome Curto</Label>
              <Input
                id="shortName"
                value={editFormData.shortName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, shortName: e.target.value }))}
                placeholder="Ex: AI Sec"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">Usado em badges e espaços compactos</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do domínio de segurança..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor</Label>
                <Select
                  value={editFormData.color}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(option => {
                      const colorStyle = DOMAIN_COLORS[option.value];
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", colorStyle?.bg)} />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select
                  value={editFormData.icon}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(option => {
                      const IconComp = ICON_COMPONENTS[option.value];
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {IconComp && <IconComp className="h-4 w-4" />}
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2 pt-2">
              <Label>Visualização</Label>
              <div className={cn(
                "p-3 rounded-lg border flex items-center gap-3",
                DOMAIN_COLORS[editFormData.color]?.bg || 'bg-muted'
              )}>
                {(() => {
                  const IconComp = ICON_COMPONENTS[editFormData.icon] || Shield;
                  const textColor = DOMAIN_COLORS[editFormData.color]?.text || 'text-foreground';
                  return <IconComp className={cn("h-5 w-5", textColor)} />;
                })()}
                <div>
                  <div className={cn("font-medium text-sm", DOMAIN_COLORS[editFormData.color]?.text)}>
                    {editFormData.domainName || 'Nome do Domínio'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {editFormData.shortName || 'Nome Curto'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDomain(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEditedDomain} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Domain Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { if (!open) resetImportDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Importar Configuração de Domínio
            </DialogTitle>
            <DialogDescription>
              Configure as opções de importação para o domínio selecionado
            </DialogDescription>
          </DialogHeader>

          {importConfig && (
            <div className="space-y-4">
              {/* Source Info */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Arquivo de Origem</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Domínio:</span>{' '}
                    {importConfig.metadata.sourceDomainName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exportado:</span>{' '}
                    {new Date(importConfig.metadata.exportedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-lg font-bold">{importConfig.taxonomy?.domains?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Áreas</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-lg font-bold">{importConfig.taxonomy?.subcategories?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Subcategorias</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-lg font-bold">{importConfig.frameworks?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Frameworks</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-lg font-bold">{importConfig.questions?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Perguntas</div>
                </div>
              </div>

              {/* Warnings */}
              {importValidation?.warnings && importValidation.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Avisos
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {importValidation.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              {/* Import Options */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="newDomainName">Nome do Novo Domínio</Label>
                  <Input
                    id="newDomainName"
                    value={importOptions.newDomainName}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, newDomainName: e.target.value }))}
                    placeholder="Nome do domínio importado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newDomainId">ID do Domínio (opcional)</Label>
                  <Input
                    id="newDomainId"
                    value={importOptions.newDomainId}
                    onChange={(e) => setImportOptions(prev => ({ 
                      ...prev, 
                      newDomainId: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') 
                    }))}
                    placeholder="Deixe em branco para gerar automaticamente"
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas letras maiúsculas, números e underscores
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="importFrameworks"
                      checked={importOptions.importFrameworks}
                      onCheckedChange={(checked) => setImportOptions(prev => ({ 
                        ...prev, 
                        importFrameworks: checked === true 
                      }))}
                    />
                    <Label htmlFor="importFrameworks" className="text-sm font-normal cursor-pointer">
                      Importar Frameworks ({importConfig.frameworks?.length || 0})
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="importQuestions"
                      checked={importOptions.importQuestions}
                      onCheckedChange={(checked) => setImportOptions(prev => ({ 
                        ...prev, 
                        importQuestions: checked === true 
                      }))}
                    />
                    <Label htmlFor="importQuestions" className="text-sm font-normal cursor-pointer">
                      Importar Perguntas ({importConfig.questions?.length || 0})
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetImportDialog}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing || !importOptions.newDomainName.trim()}>
              {importing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Importar Domínio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
