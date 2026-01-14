import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { questions as defaultQuestions, domains, Question } from '@/lib/dataset';
import { frameworks as defaultFrameworks } from '@/lib/frameworks';
import { 
  CustomQuestion, 
  getAllCustomQuestions, 
  createCustomQuestion, 
  updateCustomQuestion, 
  deleteCustomQuestion,
  getDisabledQuestions,
  disableDefaultQuestion,
  enableDefaultQuestion,
  getAllCustomFrameworks
} from '@/lib/database';

type CriticalityType = 'Low' | 'Medium' | 'High' | 'Critical';
type OwnershipType = 'Executive' | 'GRC' | 'Engineering';

interface QuestionFormData {
  questionId: string;
  subcatId: string;
  domainId: string;
  questionText: string;
  expectedEvidence: string;
  imperativeChecks: string;
  riskSummary: string;
  frameworks: string[];
  ownershipType?: OwnershipType;
  criticality?: CriticalityType;
}

const emptyFormData: QuestionFormData = {
  questionId: '',
  subcatId: '',
  domainId: '',
  questionText: '',
  expectedEvidence: '',
  imperativeChecks: '',
  riskSummary: '',
  frameworks: [],
  ownershipType: undefined,
  criticality: 'Medium'
};

const criticalityLabels: Record<CriticalityType, string> = {
  Low: 'Baixa',
  Medium: 'Média',
  High: 'Alta',
  Critical: 'Crítica'
};

const ownershipLabels: Record<OwnershipType, string> = {
  Executive: 'Executivo',
  GRC: 'GRC',
  Engineering: 'Engenharia'
};

export function QuestionManagement() {
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [disabledQuestionIds, setDisabledQuestionIds] = useState<string[]>([]);
  const [customFrameworksList, setCustomFrameworksList] = useState<{ frameworkId: string; shortName: string }[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(emptyFormData);
  const [frameworksText, setFrameworksText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [questions, disabled, customFw] = await Promise.all([
      getAllCustomQuestions(),
      getDisabledQuestions(),
      getAllCustomFrameworks()
    ]);
    setCustomQuestions(questions);
    setDisabledQuestionIds(disabled);
    setCustomFrameworksList(customFw.map(f => ({ frameworkId: f.frameworkId, shortName: f.shortName })));
  };

  const allFrameworkOptions = useMemo(() => [
    ...defaultFrameworks.map(f => ({ frameworkId: f.frameworkId, shortName: f.shortName })),
    ...customFrameworksList
  ], [customFrameworksList]);

  // Combine default and custom questions with disabled status
  const allQuestions = useMemo(() => {
    const defaultWithStatus = defaultQuestions.map(q => ({
      ...q,
      criticality: 'Medium' as const, // Default questions don't have criticality, use default
      isCustom: false as const,
      isDisabled: disabledQuestionIds.includes(q.questionId)
    }));
    const customWithStatus = customQuestions.map(q => ({
      ...q,
      criticality: q.criticality || ('Medium' as const),
      isCustom: true as const,
      isDisabled: q.isDisabled || false
    }));
    return [...defaultWithStatus, ...customWithStatus];
  }, [customQuestions, disabledQuestionIds]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const matchesSearch = searchQuery === '' || 
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.questionId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = filterDomain === 'all' || q.domainId === filterDomain;
      return matchesSearch && matchesDomain;
    });
  }, [allQuestions, searchQuery, filterDomain]);

  const openNewDialog = () => {
    setEditingQuestion(null);
    setIsEditingDefault(false);
    setFormData(emptyFormData);
    setFrameworksText('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (question: typeof allQuestions[0]) => {
    // For both custom and default questions, we can edit
    // For default questions, this will create a custom override
    setEditingQuestion(question.isCustom ? (question as CustomQuestion) : null);
    setFormData({
      questionId: question.questionId,
      subcatId: question.subcatId,
      domainId: question.domainId,
      questionText: question.questionText,
      expectedEvidence: question.expectedEvidence,
      imperativeChecks: question.imperativeChecks,
      riskSummary: question.riskSummary,
      frameworks: question.frameworks,
      ownershipType: question.ownershipType,
      criticality: question.criticality || 'Medium'
    });
    setFrameworksText(question.frameworks.join('\n'));
    setIsDialogOpen(true);
    
    // Store if we're editing a default question (to create override)
    setIsEditingDefault(!question.isCustom);
  };

  const [isEditingDefault, setIsEditingDefault] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!formData.questionId.trim()) {
      toast.error('ID da pergunta é obrigatório');
      return;
    }
    if (!formData.questionText.trim()) {
      toast.error('Texto da pergunta é obrigatório');
      return;
    }
    if (!formData.domainId) {
      toast.error('Selecione um domínio');
      return;
    }

    // Check for duplicate ID only when creating new (not editing)
    const existingCustomIds = customQuestions.map(q => q.questionId);
    if (!editingQuestion && !isEditingDefault && existingCustomIds.includes(formData.questionId)) {
      toast.error('Já existe uma pergunta personalizada com este ID');
      return;
    }

    const frameworks = frameworksText.split('\n').filter(f => f.trim());

    try {
      if (editingQuestion) {
        // Editing existing custom question
        await updateCustomQuestion(editingQuestion.questionId, {
          ...formData,
          frameworks
        });
        toast.success('Pergunta atualizada com sucesso');
      } else if (isEditingDefault) {
        // Creating custom override for default question
        // First disable the default question
        await disableDefaultQuestion(formData.questionId);
        // Then create a custom version with same ID
        await createCustomQuestion({
          ...formData,
          frameworks,
          isDisabled: false
        });
        toast.success('Pergunta padrão substituída por versão personalizada');
      } else {
        // Creating new custom question
        await createCustomQuestion({
          ...formData,
          frameworks
        });
        toast.success('Pergunta criada com sucesso');
      }
      await loadData();
      setIsDialogOpen(false);
      setIsEditingDefault(false);
    } catch (error) {
      toast.error('Erro ao salvar pergunta');
      console.error(error);
    }
  };

  const handleDelete = async (questionId: string, isCustom: boolean) => {
    try {
      if (isCustom) {
        await deleteCustomQuestion(questionId);
        toast.success('Pergunta personalizada removida com sucesso');
      } else {
        await disableDefaultQuestion(questionId);
        toast.success('Pergunta padrão desabilitada com sucesso');
      }
      await loadData();
    } catch (error) {
      toast.error('Erro ao remover pergunta');
      console.error(error);
    }
  };

  const handleToggleDisable = async (questionId: string, isDisabled: boolean, isCustom: boolean) => {
    try {
      if (isCustom) {
        await updateCustomQuestion(questionId, { isDisabled: !isDisabled });
      } else {
        if (isDisabled) {
          await enableDefaultQuestion(questionId);
        } else {
          await disableDefaultQuestion(questionId);
        }
      }
      toast.success(isDisabled ? 'Pergunta habilitada' : 'Pergunta desabilitada');
      await loadData();
    } catch (error) {
      toast.error('Erro ao alterar status');
      console.error(error);
    }
  };

  const handleDuplicate = (question: typeof allQuestions[0]) => {
    const baseId = question.questionId.replace(/-COPY\d*$/, '');
    const copyCount = allQuestions.filter(q => 
      q.questionId.startsWith(baseId + '-COPY')
    ).length;
    const newId = `${baseId}-COPY${copyCount + 1}`;
    
    setEditingQuestion(null);
    setFormData({
      questionId: newId,
      subcatId: question.subcatId,
      domainId: question.domainId,
      questionText: question.questionText,
      expectedEvidence: question.expectedEvidence,
      imperativeChecks: question.imperativeChecks,
      riskSummary: question.riskSummary,
      frameworks: question.frameworks,
      ownershipType: question.ownershipType,
      criticality: (question as any).criticality || 'Medium'
    });
    setFrameworksText(question.frameworks.join('\n'));
    setIsDialogOpen(true);
  };

  const defaultQuestionsFiltered = filteredQuestions.filter(q => !q.isCustom);
  const customQuestionsFiltered = filteredQuestions.filter(q => q.isCustom);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gerenciar Perguntas</h3>
          <p className="text-sm text-muted-foreground">
            Visualize, crie e edite perguntas da avaliação
          </p>
        </div>
        <Button onClick={openNewDialog}>Nova Pergunta</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por texto ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterDomain} onValueChange={setFilterDomain}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por domínio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os domínios</SelectItem>
            {domains.map(d => (
              <SelectItem key={d.domainId} value={d.domainId}>
                {d.domainName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{defaultQuestions.length}</div>
            <div className="text-xs text-muted-foreground">Perguntas Padrão</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{customQuestions.length}</div>
            <div className="text-xs text-muted-foreground">Personalizadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{disabledQuestionIds.length}</div>
            <div className="text-xs text-muted-foreground">Desabilitadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{filteredQuestions.length}</div>
            <div className="text-xs text-muted-foreground">Exibindo</div>
          </CardContent>
        </Card>
      </div>

      {/* Questions Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({filteredQuestions.length})</TabsTrigger>
          <TabsTrigger value="default">Padrão ({defaultQuestionsFiltered.length})</TabsTrigger>
          <TabsTrigger value="custom">Personalizadas ({customQuestionsFiltered.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <QuestionsList 
            questions={filteredQuestions}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleDisable={handleToggleDisable}
            onDuplicate={handleDuplicate}
          />
        </TabsContent>

        <TabsContent value="default">
          <QuestionsList 
            questions={defaultQuestionsFiltered}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleDisable={handleToggleDisable}
            onDuplicate={handleDuplicate}
          />
        </TabsContent>

        <TabsContent value="custom">
          <QuestionsList 
            questions={customQuestionsFiltered}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleDisable={handleToggleDisable}
            onDuplicate={handleDuplicate}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Editar Pergunta' : isEditingDefault ? 'Editar Pergunta Padrão' : 'Nova Pergunta'}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion 
                ? 'Atualize as informações da pergunta.'
                : isEditingDefault
                  ? 'Crie uma versão personalizada da pergunta padrão. A original será desabilitada e substituída.'
                  : 'Crie uma nova pergunta personalizada para a avaliação.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="questionId">ID da Pergunta *</Label>
                <Input
                  id="questionId"
                  value={formData.questionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, questionId: e.target.value.toUpperCase().replace(/\s/g, '-') }))}
                  placeholder="CUSTOM-01-Q01"
                  disabled={!!editingQuestion || isEditingDefault}
                />
                {isEditingDefault && (
                  <p className="text-xs text-muted-foreground">
                    ID mantido para substituir a pergunta padrão
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Domínio *</Label>
                <Select 
                  value={formData.domainId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domainId: value }))}
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
                <Label htmlFor="subcatId">ID Subcategoria</Label>
                <Input
                  id="subcatId"
                  value={formData.subcatId}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcatId: e.target.value }))}
                  placeholder="GOVERN-01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionText">Texto da Pergunta *</Label>
              <Textarea
                id="questionText"
                value={formData.questionText}
                onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
                placeholder="Digite a pergunta..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedEvidence">Evidência Esperada</Label>
              <Textarea
                id="expectedEvidence"
                value={formData.expectedEvidence}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedEvidence: e.target.value }))}
                placeholder="Descreva qual evidência é esperada para esta pergunta..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imperativeChecks">Verificações Obrigatórias</Label>
              <Textarea
                id="imperativeChecks"
                value={formData.imperativeChecks}
                onChange={(e) => setFormData(prev => ({ ...prev, imperativeChecks: e.target.value }))}
                placeholder="O que deve ser verificado..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskSummary">Resumo do Risco</Label>
              <Textarea
                id="riskSummary"
                value={formData.riskSummary}
                onChange={(e) => setFormData(prev => ({ ...prev, riskSummary: e.target.value }))}
                placeholder="Qual risco esta pergunta endereça..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Criticidade</Label>
                <Select 
                  value={formData.criticality || 'Medium'} 
                  onValueChange={(value: CriticalityType) => setFormData(prev => ({ ...prev, criticality: value }))}
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
                  value={formData.ownershipType || ''} 
                  onValueChange={(value: OwnershipType) => setFormData(prev => ({ ...prev, ownershipType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Executive">Executivo</SelectItem>
                    <SelectItem value="GRC">GRC</SelectItem>
                    <SelectItem value="Engineering">Engenharia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frameworks">Frameworks Relacionados (um por linha)</Label>
              <Textarea
                id="frameworks"
                value={frameworksText}
                onChange={(e) => setFrameworksText(e.target.value)}
                placeholder="NIST AI RMF GOVERN 1.1&#10;ISO 27001 A.5.1"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Frameworks disponíveis: {allFrameworkOptions.map(f => f.shortName).join(', ')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingQuestion ? 'Salvar Alterações' : 'Criar Pergunta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface QuestionsListProps {
  questions: Array<{
    questionId: string;
    questionText: string;
    domainId: string;
    subcatId: string;
    expectedEvidence: string;
    imperativeChecks: string;
    riskSummary: string;
    frameworks: string[];
    ownershipType?: 'Executive' | 'GRC' | 'Engineering';
    criticality?: 'Low' | 'Medium' | 'High' | 'Critical';
    isCustom: boolean;
    isDisabled: boolean;
  }>;
  onEdit: (question: QuestionsListProps['questions'][0]) => void;
  onDelete: (questionId: string, isCustom: boolean) => void;
  onToggleDisable: (questionId: string, isDisabled: boolean, isCustom: boolean) => void;
  onDuplicate: (question: QuestionsListProps['questions'][0]) => void;
}

function QuestionsList({ questions, onEdit, onDelete, onToggleDisable, onDuplicate }: QuestionsListProps) {
  if (questions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma pergunta encontrada com os filtros atuais.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 pr-4">
        {questions.map(q => (
          <Card 
            key={q.questionId} 
            className={cn(
              "transition-opacity",
              q.isDisabled && "opacity-50"
            )}
          >
            <CardContent className="py-3">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {q.questionId}
                    </span>
                    {q.isCustom && (
                      <Badge variant="secondary" className="text-[10px]">Personalizada</Badge>
                    )}
                    {q.isDisabled && (
                      <Badge variant="outline" className="text-[10px] text-destructive">Desabilitada</Badge>
                    )}
                  </div>
                  <p className="text-sm line-clamp-2">{q.questionText}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {q.frameworks.slice(0, 3).map((fw, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {fw.length > 30 ? fw.substring(0, 30) + '...' : fw}
                      </Badge>
                    ))}
                    {q.frameworks.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{q.frameworks.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onDuplicate(q)}
                  >
                    Duplicar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onToggleDisable(q.questionId, q.isDisabled, q.isCustom)}
                  >
                    {q.isDisabled ? 'Habilitar' : 'Desabilitar'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit(q)}
                  >
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {q.isCustom ? 'Excluir pergunta?' : 'Desabilitar pergunta padrão?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {q.isCustom ? (
                            'Você deseja excluir permanentemente esta pergunta personalizada? Esta ação não pode ser desfeita.'
                          ) : (
                            'Você deseja desabilitar esta pergunta padrão? Ela será removida da avaliação mas poderá ser restaurada posteriormente.'
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(q.questionId, q.isCustom)}>
                          {q.isCustom ? 'Sim, Excluir' : 'Sim, Desabilitar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
