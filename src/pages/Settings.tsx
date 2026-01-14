import { useState, useMemo } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { frameworks, Framework } from '@/lib/frameworks';
import { questions } from '@/lib/dataset';
import { getQuestionFrameworkIds } from '@/lib/frameworks';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { FrameworkManagement } from '@/components/settings/FrameworkManagement';
import { QuestionManagement } from '@/components/settings/QuestionManagement';

const categoryLabels: Record<string, { label: string; description: string }> = {
  core: { 
    label: 'Core', 
    description: 'Frameworks essenciais habilitados por padrão' 
  },
  'high-value': { 
    label: 'Alto Valor', 
    description: 'Frameworks complementares de alto impacto' 
  },
  'tech-focused': { 
    label: 'Técnico', 
    description: 'Frameworks com foco técnico/engenharia' 
  },
};

const audienceLabels: Record<string, string> = {
  Executive: 'Executivo',
  GRC: 'GRC',
  Engineering: 'Engenharia',
};

export default function Settings() {
  const { enabledFrameworks, setEnabledFrameworks, answers, clearAnswers, generateDemoData } = useAnswersStore();
  const [pendingFrameworks, setPendingFrameworks] = useState<string[]>(enabledFrameworks);
  const [hasChanges, setHasChanges] = useState(false);
  const [assessmentName, setAssessmentName] = useState('Avaliação de Maturidade em Segurança de IA');
  const [organizationName, setOrganizationName] = useState('');
  const [reassessmentInterval, setReassessmentInterval] = useState('quarterly');

  // Count questions per framework
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
  }, []);

  // Count answered questions per framework
  const answeredCountByFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    frameworks.forEach(fw => {
      counts[fw.frameworkId] = 0;
    });
    
    answers.forEach((answer, questionId) => {
      const question = questions.find(q => q.questionId === questionId);
      if (question && answer.response) {
        const fwIds = getQuestionFrameworkIds(question.frameworks);
        fwIds.forEach(fwId => {
          if (counts[fwId] !== undefined) {
            counts[fwId]++;
          }
        });
      }
    });
    
    return counts;
  }, [answers]);

  // Group frameworks by category
  const frameworksByCategory = useMemo(() => {
    const grouped: Record<string, Framework[]> = {
      core: [],
      'high-value': [],
      'tech-focused': [],
    };
    
    frameworks.forEach(fw => {
      if (grouped[fw.category]) {
        grouped[fw.category].push(fw);
      }
    });
    
    return grouped;
  }, []);

  const toggleFramework = (frameworkId: string) => {
    setPendingFrameworks(prev => {
      const isEnabled = prev.includes(frameworkId);
      const newList = isEnabled
        ? prev.filter(id => id !== frameworkId)
        : [...prev, frameworkId];
      setHasChanges(true);
      return newList;
    });
  };

  const selectAll = () => {
    setPendingFrameworks(frameworks.map(f => f.frameworkId));
    setHasChanges(true);
  };

  const selectDefaults = () => {
    setPendingFrameworks(frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId));
    setHasChanges(true);
  };

  const selectNone = () => {
    setPendingFrameworks([]);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (pendingFrameworks.length === 0) {
      toast.error('Selecione pelo menos um framework');
      return;
    }
    
    await setEnabledFrameworks(pendingFrameworks);
    setHasChanges(false);
    toast.success('Configurações salvas com sucesso');
  };

  const cancelChanges = () => {
    setPendingFrameworks(enabledFrameworks);
    setHasChanges(false);
  };

  const totalQuestions = useMemo(() => {
    const uniqueQuestions = new Set<string>();
    questions.forEach(q => {
      const fwIds = getQuestionFrameworkIds(q.frameworks);
      if (fwIds.some(id => pendingFrameworks.includes(id))) {
        uniqueQuestions.add(q.questionId);
      }
    });
    return uniqueQuestions.size;
  }, [pendingFrameworks]);

  const totalAnswered = answers.size;
  const lastUpdated = answers.size > 0 
    ? Array.from(answers.values()).reduce((latest, answer) => {
        const answerDate = new Date(answer.updatedAt);
        return answerDate > latest ? answerDate : latest;
      }, new Date(0))
    : null;

  const handleExportData = () => {
    try {
      const blob = exportAnswersToXLSX(answers);
      const filename = generateExportFilename();
      downloadXLSX(blob, filename);
      toast.success('Dados exportados com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar dados');
      console.error(error);
    }
  };

  const handleClearAnswers = async () => {
    await clearAnswers();
    toast.success('Respostas removidas com sucesso');
  };

  const handleGenerateDemo = async () => {
    await generateDemoData();
    toast.success('Dados de demonstração gerados');
  };

  const FrameworkCard = ({ fw }: { fw: Framework }) => {
    const isEnabled = pendingFrameworks.includes(fw.frameworkId);
    const questionCount = questionCountByFramework[fw.frameworkId] || 0;
    const answeredCount = answeredCountByFramework[fw.frameworkId] || 0;
    
    return (
      <Card 
        className={cn(
          "transition-all cursor-pointer",
          isEnabled 
            ? "border-primary bg-primary/5" 
            : "border-border opacity-60 hover:opacity-100"
        )}
        onClick={() => toggleFramework(fw.frameworkId)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {fw.shortName}
                {fw.defaultEnabled && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Padrão
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                v{fw.version}
              </CardDescription>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={() => toggleFramework(fw.frameworkId)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {fw.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {fw.targetAudience.map(audience => (
              <Badge key={audience} variant="outline" className="text-xs">
                {audienceLabels[audience] || audience}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{questionCount} perguntas</span>
            {answeredCount > 0 && (
              <span className="text-primary">{answeredCount} respondidas</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie frameworks, dados e preferências da avaliação
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cancelChanges}>
              Cancelar
            </Button>
            <Button size="sm" onClick={saveChanges}>
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="frameworks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
          <TabsTrigger value="frameworks">Habilitar</TabsTrigger>
          <TabsTrigger value="manage-frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="manage-questions">Perguntas</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="about">Sobre</TabsTrigger>
        </TabsList>

        {/* FRAMEWORKS TAB */}
        <TabsContent value="frameworks" className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-bold">{pendingFrameworks.length}</div>
                    <div className="text-sm text-muted-foreground">Frameworks selecionados</div>
                  </div>
                  <div className="border-l border-border pl-6">
                    <div className="text-2xl font-bold">{totalQuestions}</div>
                    <div className="text-sm text-muted-foreground">Perguntas na avaliação</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Selecionar Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectDefaults}>
                    Restaurar Padrão
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>
                    Limpar Seleção
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Frameworks by Category */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="core">
                Core ({frameworksByCategory.core.length})
              </TabsTrigger>
              <TabsTrigger value="high-value">
                Alto Valor ({frameworksByCategory['high-value'].length})
              </TabsTrigger>
              <TabsTrigger value="tech-focused">
                Técnico ({frameworksByCategory['tech-focused'].length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {Object.entries(frameworksByCategory).map(([category, fws]) => (
                <div key={category}>
                  <div className="mb-3">
                    <h3 className="font-semibold">{categoryLabels[category]?.label || category}</h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryLabels[category]?.description}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {fws.map(fw => (
                      <FrameworkCard key={fw.frameworkId} fw={fw} />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {Object.entries(frameworksByCategory).map(([category, fws]) => (
              <TabsContent key={category} value={category}>
                <div className="mb-3">
                  <h3 className="font-semibold">{categoryLabels[category]?.label || category}</h3>
                  <p className="text-sm text-muted-foreground">
                    {categoryLabels[category]?.description}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {fws.map(fw => (
                    <FrameworkCard key={fw.frameworkId} fw={fw} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Info about framework selection */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">Sobre a seleção de frameworks</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• A seleção de frameworks afeta quais perguntas aparecem na avaliação</li>
                <li>• Os dashboards mostrarão métricas apenas dos frameworks selecionados</li>
                <li>• Algumas perguntas podem pertencer a múltiplos frameworks</li>
                <li>• Frameworks "Core" são recomendados para avaliações iniciais</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANAGE FRAMEWORKS TAB */}
        <TabsContent value="manage-frameworks" className="space-y-6">
          <FrameworkManagement />
        </TabsContent>

        {/* MANAGE QUESTIONS TAB */}
        <TabsContent value="manage-questions" className="space-y-6">
          <QuestionManagement />
        </TabsContent>

        {/* DATA TAB */}
        <TabsContent value="data" className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status da Avaliação</CardTitle>
              <CardDescription>
                Resumo dos dados armazenados localmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{totalAnswered}</div>
                  <div className="text-sm text-muted-foreground">Respostas salvas</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{enabledFrameworks.length}</div>
                  <div className="text-sm text-muted-foreground">Frameworks ativos</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-medium">
                    {lastUpdated 
                      ? lastUpdated.toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Nenhuma resposta'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Última atualização</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export / Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exportar Dados</CardTitle>
              <CardDescription>
                Faça backup das respostas e configurações da avaliação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exporte todos os dados da avaliação para um arquivo Excel. O arquivo incluirá
                respostas, notas, links de evidências e configurações de frameworks.
              </p>
              <Button onClick={handleExportData}>
                Exportar para Excel (.xlsx)
              </Button>
            </CardContent>
          </Card>

          {/* Demo Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados de Demonstração</CardTitle>
              <CardDescription>
                Gere dados de exemplo para explorar os dashboards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preencha a avaliação com respostas simuladas para visualizar como os 
                dashboards e relatórios funcionam. Útil para demonstrações e testes.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Gerar Dados de Demo</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar dados de demonstração?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação substituirá todas as respostas existentes por dados simulados.
                      Você perderá qualquer resposta atual.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateDemo}>
                      Gerar Dados
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Reset Data */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Limpar Dados</CardTitle>
              <CardDescription>
                Remova respostas ou restaure configurações padrão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Limpar Respostas</div>
                    <div className="text-xs text-muted-foreground">
                      Remove todas as respostas, mantém configurações de frameworks
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Limpar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar todas as respostas?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Todas as {totalAnswered} respostas 
                          serão permanentemente removidas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleClearAnswers}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Limpar Respostas
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Restaurar Padrões</div>
                    <div className="text-xs text-muted-foreground">
                      Restaura frameworks padrão e limpa todas as respostas
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Restaurar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restaurar configurações padrão?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação restaurará os frameworks padrão e removerá todas as respostas.
                          Esta operação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={async () => {
                            await clearAnswers();
                            await setEnabledFrameworks(
                              frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId)
                            );
                            setPendingFrameworks(
                              frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId)
                            );
                            toast.success('Configurações restauradas');
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Restaurar Padrões
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="space-y-6">
          {/* Assessment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Avaliação</CardTitle>
              <CardDescription>
                Personalize os dados da avaliação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assessmentName">Nome da Avaliação</Label>
                  <Input
                    id="assessmentName"
                    value={assessmentName}
                    onChange={(e) => setAssessmentName(e.target.value)}
                    placeholder="Nome da avaliação"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organização</Label>
                  <Input
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Nome da organização (opcional)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reassessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cadência de Reavaliação</CardTitle>
              <CardDescription>
                Defina o intervalo recomendado para reassessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-2">
                <Label htmlFor="reassessmentInterval">Intervalo de Reavaliação</Label>
                <Select value={reassessmentInterval} onValueChange={setReassessmentInterval}>
                  <SelectTrigger id="reassessmentInterval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="semiannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Usado apenas como referência nos dashboards
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Privacidade e Armazenamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>Armazenamento Local:</strong> Todos os dados são armazenados apenas no seu navegador (IndexedDB)</li>
                <li>• <strong>Sem Transmissão:</strong> Nenhum dado é enviado para servidores externos</li>
                <li>• <strong>Seu Controle:</strong> Você pode exportar ou limpar seus dados a qualquer momento</li>
                <li>• <strong>Persistência:</strong> Os dados permanecem após fechar o navegador, mas podem ser perdidos ao limpar dados do navegador</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABOUT TAB */}
        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sobre a Plataforma</CardTitle>
              <CardDescription>
                Avaliação de Maturidade em Segurança de IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Versão da Plataforma</div>
                  <div className="font-medium">2.0.0</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Frameworks Disponíveis</div>
                  <div className="font-medium">{frameworks.length}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total de Perguntas</div>
                  <div className="font-medium">{questions.length}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Última Atualização</div>
                  <div className="font-medium">Janeiro 2025</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frameworks Suportados</CardTitle>
              <CardDescription>
                Frameworks de segurança e compliance integrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {frameworks.map(fw => (
                  <Badge key={fw.frameworkId} variant="outline">
                    {fw.shortName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Metodologia</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Avaliação baseada em frameworks reconhecidos internacionalmente</li>
                <li>• Scoring considera implementação de controles e prontidão de evidências</li>
                <li>• Níveis de maturidade: Inexistente (0) → Inicial (1) → Definido (2) → Gerenciado (3)</li>
                <li>• Dashboards segmentados por audiência: Executivo, GRC e Especialista</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
