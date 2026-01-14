import { useState, useEffect, useMemo } from 'react';
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

type AudienceType = 'Executive' | 'GRC' | 'Engineering';
type CategoryType = 'core' | 'high-value' | 'tech-focused' | 'custom';

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
  references: []
};

const categoryLabels: Record<CategoryType, string> = {
  core: 'Core',
  'high-value': 'Alto Valor',
  'tech-focused': 'Técnico',
  custom: 'Personalizado'
};

const audienceLabels: Record<AudienceType, string> = {
  Executive: 'Executivo',
  GRC: 'GRC',
  Engineering: 'Engenharia'
};

export function FrameworkManagement() {
  const [customFrameworks, setCustomFrameworks] = useState<CustomFramework[]>([]);
  const [disabledDefaultFrameworks, setDisabledDefaultFrameworks] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFramework, setEditingFramework] = useState<CustomFramework | null>(null);
  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [formData, setFormData] = useState<FrameworkFormData>(emptyFormData);
  const [referencesText, setReferencesText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [frameworks, disabledIds] = await Promise.all([
      getAllCustomFrameworks(),
      getDisabledFrameworks()
    ]);
    setCustomFrameworks(frameworks);
    // Track which default frameworks have custom overrides OR are disabled
    const overriddenIds = new Set([
      ...frameworks.map(f => f.frameworkId),
      ...disabledIds
    ]);
    setDisabledDefaultFrameworks(overriddenIds);
  };

  const allFrameworks = useMemo(() => [
    ...defaultFrameworks
      .filter(f => !disabledDefaultFrameworks.has(f.frameworkId))
      .map(f => ({ ...f, isCustom: false as const, isDisabled: false })),
    ...customFrameworks.map(f => ({ ...f, isDisabled: false }))
  ], [customFrameworks, disabledDefaultFrameworks]);

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
      references: framework.references
    });
    setReferencesText(framework.references.join('\n'));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.frameworkId.trim()) {
      toast.error('ID do framework é obrigatório');
      return;
    }
    if (!formData.frameworkName.trim()) {
      toast.error('Nome do framework é obrigatório');
      return;
    }
    if (!formData.shortName.trim()) {
      toast.error('Nome curto é obrigatório');
      return;
    }
    if (formData.targetAudience.length === 0) {
      toast.error('Selecione pelo menos um público-alvo');
      return;
    }

    // Check for duplicate ID only when creating completely new framework
    const customFrameworkIds = customFrameworks.map(f => f.frameworkId);
    if (!editingFramework && !isEditingDefault && customFrameworkIds.includes(formData.frameworkId)) {
      toast.error('Já existe um framework personalizado com este ID');
      return;
    }

    const references = referencesText.split('\n').filter(r => r.trim());

    try {
      if (editingFramework) {
        // Editing existing custom framework
        await updateCustomFramework(editingFramework.frameworkId, {
          ...formData,
          references
        });
        toast.success('Framework atualizado com sucesso');
      } else if (isEditingDefault) {
        // Creating custom override for default framework
        await createCustomFramework({
          ...formData,
          references
        });
        toast.success('Framework padrão substituído por versão personalizada');
      } else {
        // Creating new custom framework
        await createCustomFramework({
          ...formData,
          references
        });
        toast.success('Framework criado com sucesso');
      }
      await loadData();
      setIsDialogOpen(false);
      setIsEditingDefault(false);
    } catch (error) {
      toast.error('Erro ao salvar framework');
      console.error(error);
    }
  };

  const handleDelete = async (frameworkId: string, isCustom: boolean) => {
    try {
      if (isCustom) {
        await deleteCustomFramework(frameworkId);
        toast.success('Framework personalizado removido com sucesso');
      } else {
        await disableDefaultFramework(frameworkId);
        toast.success('Framework padrão desabilitado com sucesso');
      }
      await loadData();
    } catch (error) {
      toast.error('Erro ao remover framework');
      console.error(error);
    }
  };

  const handleRestore = async (frameworkId: string) => {
    try {
      await enableDefaultFramework(frameworkId);
      toast.success('Framework restaurado com sucesso');
      await loadData();
    } catch (error) {
      toast.error('Erro ao restaurar framework');
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
          <h3 className="text-lg font-semibold">Gerenciar Frameworks</h3>
          <p className="text-sm text-muted-foreground">
            Visualize, crie e edite frameworks de avaliação
          </p>
        </div>
        <Button onClick={openNewDialog}>Novo Framework</Button>
      </div>

      {/* All Frameworks */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Todos os Frameworks ({allFrameworks.length})
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          {allFrameworks.map(fw => (
            <Card key={fw.frameworkId} className={cn(!fw.isCustom && "opacity-90")}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {fw.shortName}
                      <Badge variant={fw.isCustom ? "secondary" : "outline"} className="text-[10px]">
                        {fw.isCustom ? 'Personalizado' : 'Padrão'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {fw.frameworkId} • v{fw.version}
                    </CardDescription>
                  </div>
                  <Badge className={cn(
                    "text-[10px]",
                    fw.category === 'core' && "bg-primary",
                    fw.category === 'high-value' && "bg-amber-500",
                    fw.category === 'tech-focused' && "bg-blue-500",
                    fw.category === 'custom' && "bg-purple-500"
                  )}>
                    {categoryLabels[fw.category as CategoryType]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {fw.description}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(fw)}>
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">Excluir</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {fw.isCustom ? 'Excluir framework?' : 'Desabilitar framework padrão?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {fw.isCustom ? (
                            <>
                              Você deseja excluir permanentemente o framework "{fw.shortName}"?
                              Esta ação não pode ser desfeita. Perguntas associadas não serão afetadas.
                              {defaultFrameworks.some(df => df.frameworkId === fw.frameworkId) && (
                                <span className="block mt-2 text-foreground">
                                  O framework padrão original será restaurado.
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              Você deseja desabilitar o framework padrão "{fw.shortName}"?
                              Ele será removido da avaliação mas poderá ser restaurado posteriormente.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(fw.frameworkId, fw.isCustom)}>
                          {fw.isCustom ? 'Sim, Excluir' : 'Sim, Desabilitar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingFramework ? 'Salvar Alterações' : 'Criar Framework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
