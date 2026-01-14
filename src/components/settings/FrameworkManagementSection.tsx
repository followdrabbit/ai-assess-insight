import { useState, useEffect, useMemo } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { 
  getAllFrameworks, 
  saveFramework, 
  deleteFramework, 
  toggleFrameworkStatus,
  CustomFramework,
} from '@/lib/settingsDatabase';
import { questions } from '@/lib/dataset';
import { getQuestionFrameworkIds } from '@/lib/frameworks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMPTY_FRAMEWORK: Partial<CustomFramework> = {
  frameworkId: '',
  frameworkName: '',
  shortName: '',
  description: '',
  targetAudience: [],
  assessmentScope: '',
  defaultEnabled: false,
  version: '1.0',
  category: 'custom',
  references: [],
  status: 'active',
  notes: '',
  isCustom: true,
};

export function FrameworkManagementSection() {
  const { answers } = useAnswersStore();
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  
  const [editingFramework, setEditingFramework] = useState<Partial<CustomFramework> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomFramework | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    loadFrameworks();
  }, []);
  
  const loadFrameworks = async () => {
    setIsLoading(true);
    try {
      const fws = await getAllFrameworks();
      setFrameworks(fws);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Question count by framework
  const questionCountByFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    frameworks.forEach(fw => {
      counts[fw.frameworkId] = 0;
    });
    
    questions.forEach(q => {
      const fwIds = getQuestionFrameworkIds(q.frameworks);
      fwIds.forEach(fwId => {
        if (counts[fwId] !== undefined) {
          counts[fwId]++;
        }
      });
    });
    
    return counts;
  }, [frameworks]);
  
  // Answer count by framework
  const answerCountByFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    frameworks.forEach(fw => {
      counts[fw.frameworkId] = 0;
    });
    
    answers.forEach((answer) => {
      if (answer.frameworkId && counts[answer.frameworkId] !== undefined) {
        counts[answer.frameworkId]++;
      }
    });
    
    return counts;
  }, [frameworks, answers]);
  
  const filteredFrameworks = useMemo(() => {
    return frameworks.filter(fw => {
      if (searchTerm && !fw.shortName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !fw.frameworkName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && fw.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [frameworks, searchTerm, statusFilter]);
  
  const handleToggleStatus = async (fw: CustomFramework) => {
    const newStatus = fw.status === 'active' ? 'disabled' : 'active';
    await toggleFrameworkStatus(fw.frameworkId, newStatus);
    await loadFrameworks();
    toast.success(`Framework ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
  };
  
  const handleOpenCreate = () => {
    setEditingFramework({ ...EMPTY_FRAMEWORK });
    setIsEditing(false);
  };
  
  const handleOpenEdit = (fw: CustomFramework) => {
    setEditingFramework({ ...fw });
    setIsEditing(true);
  };
  
  const handleSave = async () => {
    if (!editingFramework) return;
    
    // Validation
    if (!editingFramework.frameworkId?.trim()) {
      toast.error('ID do framework é obrigatório');
      return;
    }
    if (!editingFramework.shortName?.trim()) {
      toast.error('Nome curto é obrigatório');
      return;
    }
    if (!editingFramework.frameworkName?.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }
    
    // Check for duplicate ID on create
    if (!isEditing) {
      const existing = frameworks.find(f => f.frameworkId === editingFramework.frameworkId);
      if (existing) {
        toast.error('Já existe um framework com este ID');
        return;
      }
    }
    
    try {
      await saveFramework(editingFramework as CustomFramework);
      await loadFrameworks();
      setEditingFramework(null);
      toast.success(isEditing ? 'Framework atualizado' : 'Framework criado');
    } catch (error) {
      toast.error('Erro ao salvar framework');
    }
  };
  
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    const result = await deleteFramework(deleteConfirm.frameworkId);
    
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    
    await loadFrameworks();
    setDeleteConfirm(null);
    toast.success('Framework removido');
  };
  
  const handleAudienceToggle = (audience: 'Executive' | 'GRC' | 'Engineering') => {
    if (!editingFramework) return;
    
    const current = editingFramework.targetAudience || [];
    const newAudience = current.includes(audience)
      ? current.filter(a => a !== audience)
      : [...current, audience];
    
    setEditingFramework({ ...editingFramework, targetAudience: newAudience });
  };
  
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Frameworks Registrados</CardTitle>
              <CardDescription>
                Gerencie os frameworks disponíveis para avaliações
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              Adicionar Framework
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar frameworks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="disabled">Desativados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-muted-foreground mb-4">
            {filteredFrameworks.length} de {frameworks.length} frameworks
          </div>
        </CardContent>
      </Card>
      
      {/* Framework List */}
      <div className="space-y-3">
        {filteredFrameworks.map((fw) => (
          <Card 
            key={fw.frameworkId}
            className={cn(
              fw.status === 'disabled' && 'opacity-60'
            )}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{fw.shortName}</span>
                    <Badge variant="outline" className="text-xs">
                      v{fw.version}
                    </Badge>
                    <Badge 
                      variant={fw.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {fw.status === 'active' ? 'Ativo' : 'Desativado'}
                    </Badge>
                    {fw.isCustom && (
                      <Badge variant="outline" className="text-xs bg-primary/10">
                        Customizado
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {fw.category}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-1">
                    {fw.frameworkName}
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {fw.description}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Público: {fw.targetAudience?.join(', ') || 'Não definido'}</span>
                    <span>•</span>
                    <span>{questionCountByFramework[fw.frameworkId] || 0} perguntas</span>
                    <span>•</span>
                    <span>{answerCountByFramework[fw.frameworkId] || 0} respostas</span>
                  </div>
                  
                  {fw.notes && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      Notas: {fw.notes}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={fw.status === 'active'}
                    onCheckedChange={() => handleToggleStatus(fw)}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenEdit(fw)}
                  >
                    Editar
                  </Button>
                  {fw.isCustom && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(fw)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Regras de Gerenciamento</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Frameworks desativados não aparecem em novas avaliações</li>
            <li>• Respostas existentes de frameworks desativados são preservadas</li>
            <li>• Frameworks padrão (não customizados) não podem ser removidos, apenas desativados</li>
            <li>• A remoção de um framework customizado requer que não haja respostas associadas</li>
          </ul>
        </CardContent>
      </Card>
      
      {/* Edit/Create Dialog */}
      <Dialog open={!!editingFramework} onOpenChange={() => setEditingFramework(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Framework' : 'Novo Framework'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize os metadados do framework'
                : 'Preencha os dados para criar um novo framework'}
            </DialogDescription>
          </DialogHeader>
          
          {editingFramework && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>ID do Framework *</Label>
                  <Input
                    value={editingFramework.frameworkId || ''}
                    onChange={(e) => setEditingFramework({
                      ...editingFramework,
                      frameworkId: e.target.value.toUpperCase().replace(/\s+/g, '_')
                    })}
                    disabled={isEditing}
                    placeholder="EX: CUSTOM_FRAMEWORK_1"
                  />
                  <div className="text-xs text-muted-foreground">
                    Identificador único, imutável após criação
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Versão *</Label>
                  <Input
                    value={editingFramework.version || ''}
                    onChange={(e) => setEditingFramework({
                      ...editingFramework,
                      version: e.target.value
                    })}
                    placeholder="1.0"
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome Curto *</Label>
                  <Input
                    value={editingFramework.shortName || ''}
                    onChange={(e) => setEditingFramework({
                      ...editingFramework,
                      shortName: e.target.value
                    })}
                    placeholder="Custom FW"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={editingFramework.category || 'custom'}
                    onValueChange={(v: any) => setEditingFramework({
                      ...editingFramework,
                      category: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="high-value">Alto Valor</SelectItem>
                      <SelectItem value="tech-focused">Técnico</SelectItem>
                      <SelectItem value="custom">Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={editingFramework.frameworkName || ''}
                  onChange={(e) => setEditingFramework({
                    ...editingFramework,
                    frameworkName: e.target.value
                  })}
                  placeholder="Custom Security Framework"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editingFramework.description || ''}
                  onChange={(e) => setEditingFramework({
                    ...editingFramework,
                    description: e.target.value
                  })}
                  placeholder="Descrição detalhada do framework"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Escopo da Avaliação</Label>
                <Textarea
                  value={editingFramework.assessmentScope || ''}
                  onChange={(e) => setEditingFramework({
                    ...editingFramework,
                    assessmentScope: e.target.value
                  })}
                  placeholder="Áreas cobertas por este framework"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Público-Alvo</Label>
                <div className="flex items-center gap-4">
                  {(['Executive', 'GRC', 'Engineering'] as const).map((audience) => (
                    <label key={audience} className="flex items-center gap-2">
                      <Checkbox
                        checked={editingFramework.targetAudience?.includes(audience)}
                        onCheckedChange={() => handleAudienceToggle(audience)}
                      />
                      <span className="text-sm">{audience}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notas Internas</Label>
                <Textarea
                  value={editingFramework.notes || ''}
                  onChange={(e) => setEditingFramework({
                    ...editingFramework,
                    notes: e.target.value
                  })}
                  placeholder="Notas para administradores"
                  rows={2}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingFramework.defaultEnabled}
                  onCheckedChange={(checked) => setEditingFramework({
                    ...editingFramework,
                    defaultEnabled: checked
                  })}
                />
                <Label>Habilitado por padrão em novas avaliações</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFramework(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isEditing ? 'Salvar Alterações' : 'Criar Framework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Framework</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a remover o framework:</p>
              <p className="font-medium">{deleteConfirm?.shortName} ({deleteConfirm?.frameworkId})</p>
              <p className="mt-4">Esta ação irá:</p>
              <ul className="list-disc pl-4">
                <li>Remover o framework do sistema</li>
                <li>Perguntas associadas perderão a referência</li>
              </ul>
              <p className="mt-2 text-amber-600">
                Respostas existentes: {answerCountByFramework[deleteConfirm?.frameworkId || ''] || 0}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Remover Framework
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
