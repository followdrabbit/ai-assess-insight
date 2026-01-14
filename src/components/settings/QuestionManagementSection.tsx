import { useState, useEffect, useMemo } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { 
  getAllCustomQuestions, 
  saveQuestion, 
  deleteQuestion, 
  toggleQuestionStatus,
  getAllFrameworks,
  CustomQuestion,
  CustomFramework,
} from '@/lib/settingsDatabase';
import { questions as defaultQuestions, domains, subcategories } from '@/lib/dataset';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMPTY_QUESTION: Partial<CustomQuestion> = {
  questionId: '',
  subcatId: '',
  domainId: '',
  questionText: '',
  expectedEvidence: '',
  imperativeChecks: '',
  riskSummary: '',
  frameworks: [],
  frameworkId: '',
  ownershipType: 'GRC',
  criticality: 'Medium',
  weight: 1,
  status: 'active',
  isCustom: true,
};

export function QuestionManagementSection() {
  const { answers } = useAnswersStore();
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  
  const [editingQuestion, setEditingQuestion] = useState<Partial<CustomQuestion> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomQuestion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [questions, fws] = await Promise.all([
        getAllCustomQuestions(),
        getAllFrameworks(),
      ]);
      setCustomQuestions(questions);
      setFrameworks(fws);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Merge default questions with custom questions
  const allQuestions = useMemo(() => {
    const merged: Array<{
      questionId: string;
      subcatId: string;
      domainId: string;
      questionText: string;
      expectedEvidence: string;
      imperativeChecks: string;
      riskSummary: string;
      frameworks: string[];
      frameworkId: string;
      ownershipType: 'Executive' | 'GRC' | 'Engineering';
      criticality: 'Low' | 'Medium' | 'High' | 'Critical';
      weight: number;
      status: 'active' | 'disabled';
      isCustom: boolean;
      createdAt: string;
      updatedAt: string;
    }> = defaultQuestions.map(q => ({
      ...q,
      frameworkId: q.frameworkId || '',
      ownershipType: (q.ownershipType || 'GRC') as 'Executive' | 'GRC' | 'Engineering',
      criticality: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
      status: 'active' as 'active' | 'disabled',
      isCustom: false,
      weight: 1,
      createdAt: '',
      updatedAt: '',
    }));
    
    // Override with custom status/data
    customQuestions.forEach(cq => {
      const idx = merged.findIndex(m => m.questionId === cq.questionId);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...cq };
      } else {
        merged.push(cq);
      }
    });
    
    return merged;
  }, [customQuestions]);
  
  // Filter questions
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!q.questionText.toLowerCase().includes(search) &&
            !q.questionId.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (domainFilter !== 'all' && q.domainId !== domainFilter) {
        return false;
      }
      if (frameworkFilter !== 'all' && q.frameworkId !== frameworkFilter) {
        return false;
      }
      return true;
    });
  }, [allQuestions, searchTerm, domainFilter, frameworkFilter]);
  
  // Group by domain
  const questionsByDomain = useMemo(() => {
    const grouped: Record<string, typeof filteredQuestions> = {};
    
    filteredQuestions.forEach(q => {
      if (!grouped[q.domainId]) {
        grouped[q.domainId] = [];
      }
      grouped[q.domainId].push(q);
    });
    
    return grouped;
  }, [filteredQuestions]);
  
  const handleOpenCreate = () => {
    setEditingQuestion({ ...EMPTY_QUESTION });
    setIsEditing(false);
  };
  
  const handleOpenEdit = (q: typeof allQuestions[0]) => {
    setEditingQuestion({ ...q });
    setIsEditing(true);
  };
  
  const handleDuplicate = (q: typeof allQuestions[0]) => {
    setEditingQuestion({
      ...q,
      questionId: `${q.questionId}_COPY`,
      isCustom: true,
      createdAt: '',
      updatedAt: '',
    });
    setIsEditing(false);
  };
  
  const handleSave = async () => {
    if (!editingQuestion) return;
    
    // Validation
    if (!editingQuestion.questionId?.trim()) {
      toast.error('ID da pergunta é obrigatório');
      return;
    }
    if (!editingQuestion.questionText?.trim()) {
      toast.error('Texto da pergunta é obrigatório');
      return;
    }
    if (!editingQuestion.domainId) {
      toast.error('Domínio é obrigatório');
      return;
    }
    if (!editingQuestion.frameworkId) {
      toast.error('Framework é obrigatório');
      return;
    }
    
    // Check framework is active
    const fw = frameworks.find(f => f.frameworkId === editingQuestion.frameworkId);
    if (!fw || fw.status !== 'active') {
      toast.error('O framework selecionado deve estar ativo');
      return;
    }
    
    // Check for duplicate ID on create
    if (!isEditing) {
      const existing = allQuestions.find(q => q.questionId === editingQuestion.questionId);
      if (existing) {
        toast.error('Já existe uma pergunta com este ID');
        return;
      }
    }
    
    try {
      await saveQuestion(editingQuestion as CustomQuestion);
      await loadData();
      setEditingQuestion(null);
      toast.success(isEditing ? 'Pergunta atualizada' : 'Pergunta criada');
    } catch (error) {
      toast.error('Erro ao salvar pergunta');
    }
  };
  
  const handleToggleStatus = async (q: typeof allQuestions[0]) => {
    const newStatus = q.status === 'active' ? 'disabled' : 'active';
    
    // For default questions, we need to create a custom entry
    if (!q.isCustom) {
      await saveQuestion({
        ...q,
        status: newStatus,
        isCustom: false,
      } as CustomQuestion);
    } else {
      await toggleQuestionStatus(q.questionId, newStatus);
    }
    
    await loadData();
    toast.success(`Pergunta ${newStatus === 'active' ? 'ativada' : 'desativada'}`);
  };
  
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    const result = await deleteQuestion(deleteConfirm.questionId);
    
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    
    await loadData();
    setDeleteConfirm(null);
    toast.success('Pergunta removida');
  };
  
  const toggleDomainExpanded = (domainId: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };
  
  const activeFrameworks = frameworks.filter(f => f.status === 'active');
  
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
              <CardTitle className="text-base">Banco de Perguntas</CardTitle>
              <CardDescription>
                {allQuestions.length} perguntas • {customQuestions.filter(q => q.isCustom).length} customizadas
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              Adicionar Pergunta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="flex-1 w-full sm:w-auto">
              <Input
                placeholder="Buscar perguntas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Domínio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Domínios</SelectItem>
                {domains.map(d => (
                  <SelectItem key={d.domainId} value={d.domainId}>
                    {d.domainName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Frameworks</SelectItem>
                {frameworks.map(f => (
                  <SelectItem key={f.frameworkId} value={f.frameworkId}>
                    {f.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredQuestions.length} de {allQuestions.length} perguntas
          </div>
        </CardContent>
      </Card>
      
      {/* Questions by Domain */}
      <div className="space-y-3">
        {Object.entries(questionsByDomain).map(([domainId, domainQuestions]) => {
          const domain = domains.find(d => d.domainId === domainId);
          const isExpanded = expandedDomains.has(domainId);
          
          return (
            <Collapsible 
              key={domainId}
              open={isExpanded}
              onOpenChange={() => toggleDomainExpanded(domainId)}
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <CardTitle className="text-base">{domain?.domainName || domainId}</CardTitle>
                        <CardDescription>
                          {domainQuestions.length} perguntas • {domainQuestions.filter(q => q.status === 'disabled').length} desativadas
                        </CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {domainQuestions.map((q) => (
                        <div 
                          key={q.questionId}
                          className={cn(
                            "p-3 border rounded-lg",
                            q.status === 'disabled' && "opacity-60 bg-muted/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {q.questionId}
                                </span>
                                <Badge 
                                  variant={q.criticality === 'Critical' ? 'destructive' : 'outline'}
                                  className="text-xs"
                                >
                                  {q.criticality}
                                </Badge>
                                {q.isCustom && (
                                  <Badge variant="outline" className="text-xs bg-primary/10">
                                    Custom
                                  </Badge>
                                )}
                                {q.status === 'disabled' && (
                                  <Badge variant="secondary" className="text-xs">
                                    Desativada
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm line-clamp-2">{q.questionText}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{q.ownershipType}</span>
                                <span>•</span>
                                <span>{q.frameworkId}</span>
                                {answers.has(q.questionId) && (
                                  <>
                                    <span>•</span>
                                    <span className="text-primary">Respondida</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={q.status === 'active'}
                                onCheckedChange={() => handleToggleStatus(q)}
                              />
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleOpenEdit(q)}
                              >
                                Editar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDuplicate(q)}
                              >
                                Duplicar
                              </Button>
                              {q.isCustom && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirm(q as CustomQuestion)}
                                >
                                  Remover
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
      
      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Regras de Gerenciamento</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Perguntas desativadas não aparecem em novas avaliações</li>
            <li>• Respostas existentes são preservadas mesmo se a pergunta for desativada</li>
            <li>• Perguntas padrão podem ser editadas mas não removidas</li>
            <li>• A remoção de uma pergunta customizada requer que não haja resposta associada</li>
          </ul>
        </CardContent>
      </Card>
      
      {/* Edit/Create Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Pergunta' : 'Nova Pergunta'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize os dados da pergunta'
                : 'Preencha os dados para criar uma nova pergunta'}
            </DialogDescription>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>ID da Pergunta *</Label>
                  <Input
                    value={editingQuestion.questionId || ''}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      questionId: e.target.value
                    })}
                    disabled={isEditing && !editingQuestion.isCustom}
                    placeholder="Q_CUSTOM_001"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Framework *</Label>
                  <Select
                    value={editingQuestion.frameworkId || ''}
                    onValueChange={(v) => setEditingQuestion({
                      ...editingQuestion,
                      frameworkId: v,
                      frameworks: [v]
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFrameworks.map(f => (
                        <SelectItem key={f.frameworkId} value={f.frameworkId}>
                          {f.shortName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Domínio *</Label>
                  <Select
                    value={editingQuestion.domainId || ''}
                    onValueChange={(v) => setEditingQuestion({
                      ...editingQuestion,
                      domainId: v,
                      subcatId: '' // Reset subcategory
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map(d => (
                        <SelectItem key={d.domainId} value={d.domainId}>
                          {d.domainName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Subcategoria</Label>
                  <Select
                    value={editingQuestion.subcatId || ''}
                    onValueChange={(v) => setEditingQuestion({
                      ...editingQuestion,
                      subcatId: v
                    })}
                    disabled={!editingQuestion.domainId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories
                        .filter(s => s.domainId === editingQuestion.domainId)
                        .map(s => (
                          <SelectItem key={s.subcatId} value={s.subcatId}>
                            {s.subcatName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Texto da Pergunta *</Label>
                <Textarea
                  value={editingQuestion.questionText || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    questionText: e.target.value
                  })}
                  placeholder="Descreva a pergunta de avaliação"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Evidência Esperada</Label>
                <Textarea
                  value={editingQuestion.expectedEvidence || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    expectedEvidence: e.target.value
                  })}
                  placeholder="Que evidências validam uma resposta positiva?"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Risco Endereçado</Label>
                <Textarea
                  value={editingQuestion.riskSummary || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    riskSummary: e.target.value
                  })}
                  placeholder="Qual risco esta pergunta ajuda a mitigar?"
                  rows={2}
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Criticidade</Label>
                  <Select
                    value={editingQuestion.criticality || 'Medium'}
                    onValueChange={(v: any) => setEditingQuestion({
                      ...editingQuestion,
                      criticality: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Baixa</SelectItem>
                      <SelectItem value="Medium">Média</SelectItem>
                      <SelectItem value="High">Alta</SelectItem>
                      <SelectItem value="Critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select
                    value={editingQuestion.ownershipType || 'GRC'}
                    onValueChange={(v: any) => setEditingQuestion({
                      ...editingQuestion,
                      ownershipType: v
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executive">Executivo</SelectItem>
                      <SelectItem value="GRC">GRC</SelectItem>
                      <SelectItem value="Engineering">Engenharia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Peso</Label>
                  <Input
                    type="number"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={editingQuestion.weight || 1}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      weight: parseFloat(e.target.value) || 1
                    })}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isEditing ? 'Salvar Alterações' : 'Criar Pergunta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Pergunta</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a remover a pergunta:</p>
              <p className="font-mono text-sm">{deleteConfirm?.questionId}</p>
              <p className="mt-2">{deleteConfirm?.questionText}</p>
              {answers.has(deleteConfirm?.questionId || '') && (
                <p className="mt-4 text-amber-600 font-medium">
                  Atenção: Existe uma resposta para esta pergunta. A remoção não será permitida.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Remover Pergunta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
