import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { FrameworkManagement } from '@/components/settings/FrameworkManagement';
import { QuestionManagement } from '@/components/settings/QuestionManagement';
import { DomainManagement } from '@/components/settings/DomainManagement';
import { Layers, BookOpen, Database, Settings2, Info, FileDown, Trash2, RefreshCw, Building2, Calendar, Shield, ExternalLink, Home, ChevronRight } from 'lucide-react';

const TAB_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  taxonomy: { label: 'Taxonomia', icon: Layers },
  content: { label: 'Conteúdo', icon: BookOpen },
  data: { label: 'Dados', icon: Database },
  about: { label: 'Sobre', icon: Info },
};

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
  const [activeTab, setActiveTab] = useState('taxonomy');
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
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Home className="h-3.5 w-3.5" />
                Início
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink className="flex items-center gap-1.5 text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" />
              Configurações
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
              {(() => {
                const TabIcon = TAB_LABELS[activeTab]?.icon;
                return TabIcon ? <TabIcon className="h-3.5 w-3.5" /> : null;
              })()}
              {TAB_LABELS[activeTab]?.label || 'Taxonomia'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-muted-foreground" />
            Configurações
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie a taxonomia, conteúdo e dados da plataforma de governança
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          <TabsTrigger value="taxonomy" className="flex items-center gap-1.5 data-[state=active]:bg-background">
            <Layers className="h-3.5 w-3.5" />
            <span>Taxonomia</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-1.5 data-[state=active]:bg-background">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Conteúdo</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5 data-[state=active]:bg-background">
            <Database className="h-3.5 w-3.5" />
            <span>Dados</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-1.5 data-[state=active]:bg-background">
            <Info className="h-3.5 w-3.5" />
            <span>Sobre</span>
          </TabsTrigger>
        </TabsList>

        {/* ========== TAXONOMY TAB ========== */}
        <TabsContent value="taxonomy" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Domínios de Segurança</p>
                    <p className="text-xl font-bold">Estrutura Base</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">Frameworks Ativos</p>
                <p className="text-2xl font-bold text-primary">{pendingFrameworks.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">Perguntas Totais</p>
                <p className="text-2xl font-bold">{questions.length}</p>
              </CardContent>
            </Card>
          </div>

          <Accordion type="single" collapsible defaultValue="domains" className="space-y-4">
            <AccordionItem value="domains" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Domínios de Segurança</h3>
                    <p className="text-sm text-muted-foreground font-normal">AI Security, Cloud Security, DevSecOps e domínios personalizados</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <DomainManagement />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="frameworks-enable" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Seleção de Frameworks</h3>
                    <p className="text-sm text-muted-foreground font-normal">Ative ou desative frameworks na avaliação atual</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <FrameworkSelectionSection 
                  pendingFrameworks={pendingFrameworks}
                  totalQuestions={totalQuestions}
                  selectAll={selectAll}
                  selectDefaults={selectDefaults}
                  selectNone={selectNone}
                  frameworksByCategory={frameworksByCategory}
                  FrameworkCard={FrameworkCard}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ========== CONTENT TAB ========== */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Frameworks Cadastrados</p>
                    <p className="text-xl font-bold">{frameworks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Perguntas Cadastradas</p>
                    <p className="text-xl font-bold">{questions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Accordion type="single" collapsible defaultValue="frameworks-manage" className="space-y-4">
            <AccordionItem value="frameworks-manage" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Gerenciar Frameworks</h3>
                    <p className="text-sm text-muted-foreground font-normal">Criar, editar e excluir frameworks de avaliação</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <FrameworkManagement />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="questions-manage" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Gerenciar Perguntas</h3>
                    <p className="text-sm text-muted-foreground font-normal">Criar, editar, importar e versionar perguntas</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <QuestionManagement />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ========== DATA TAB ========== */}
        <TabsContent value="data" className="space-y-6">
          {/* Status Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{totalAnswered}</p>
                <p className="text-xs text-muted-foreground">Respostas Salvas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold">{enabledFrameworks.length}</p>
                <p className="text-xs text-muted-foreground">Frameworks Ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm font-medium">
                  {lastUpdated 
                    ? lastUpdated.toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric'
                      })
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Última Atualização</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium truncate">{organizationName || 'Não definido'}</p>
                <p className="text-xs text-muted-foreground">Organização</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Assessment Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Informações da Avaliação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="reassessmentInterval">Cadência de Reavaliação</Label>
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
                </div>
              </CardContent>
            </Card>

            {/* Export */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Exportar & Backup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Exporte as respostas e configurações para um arquivo Excel.
                </p>
                <Button onClick={handleExportData} className="w-full">
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar para Excel (.xlsx)
                </Button>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Gere dados de exemplo para explorar os dashboards.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Gerar Dados de Demonstração
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Gerar dados de demonstração?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação substituirá todas as respostas existentes por dados simulados.
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam seus dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div>
                    <div className="font-medium text-sm">Limpar Respostas</div>
                    <div className="text-xs text-muted-foreground">
                      Remove todas as respostas
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

                <div className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div>
                    <div className="font-medium text-sm">Restaurar Padrões</div>
                    <div className="text-xs text-muted-foreground">
                      Reseta tudo para o padrão
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

          {/* Privacy Notice */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 pb-4">
              <h4 className="font-medium mb-2 text-sm">Privacidade e Armazenamento</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Dados armazenados de forma segura na nuvem</li>
                <li>• Apenas usuários autorizados podem acessar</li>
                <li>• Exporte ou limpe seus dados a qualquer momento</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== ABOUT TAB ========== */}
        <TabsContent value="about" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">Versão</p>
                <p className="text-xl font-bold">2.0.0</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">Frameworks</p>
                <p className="text-xl font-bold">{frameworks.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">Perguntas</p>
                <p className="text-xl font-bold">{questions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">Atualização</p>
                <p className="text-xl font-bold">Jan/25</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frameworks Suportados</CardTitle>
              <CardDescription>
                Frameworks de segurança e compliance integrados na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {frameworks.map(fw => (
                  <Badge key={fw.frameworkId} variant="outline" className="text-xs">
                    {fw.shortName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Metodologia de Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
                  <span>Avaliação baseada em frameworks reconhecidos internacionalmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
                  <span>Scoring considera implementação de controles e prontidão de evidências</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span>
                  <span>Níveis: Inexistente (0) → Inicial (1) → Definido (2) → Gerenciado (3)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">4</span>
                  <span>Dashboards segmentados: Executivo, GRC e Especialista</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== Sub-component for Framework Selection ==========
interface FrameworkSelectionSectionProps {
  pendingFrameworks: string[];
  totalQuestions: number;
  selectAll: () => void;
  selectDefaults: () => void;
  selectNone: () => void;
  frameworksByCategory: Record<string, Framework[]>;
  FrameworkCard: React.ComponentType<{ fw: Framework }>;
}

function FrameworkSelectionSection({
  pendingFrameworks,
  totalQuestions,
  selectAll,
  selectDefaults,
  selectNone,
  frameworksByCategory,
  FrameworkCard
}: FrameworkSelectionSectionProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-primary">{pendingFrameworks.length}</div>
            <div className="text-xs text-muted-foreground">Frameworks ativos</div>
          </div>
          <div className="border-l border-border pl-6">
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <div className="text-xs text-muted-foreground">Perguntas</div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Todos
          </Button>
          <Button variant="outline" size="sm" onClick={selectDefaults}>
            Padrão
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Limpar
          </Button>
        </div>
      </div>

      {/* Frameworks by Category */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="core" className="text-xs">
            Core ({frameworksByCategory.core?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="high-value" className="text-xs">
            Alto Valor ({frameworksByCategory['high-value']?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="tech-focused" className="text-xs">
            Técnico ({frameworksByCategory['tech-focused']?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {Object.entries(frameworksByCategory).map(([category, fws]) => (
            <div key={category}>
              <div className="mb-3">
                <h4 className="font-semibold text-sm">{categoryLabels[category]?.label || category}</h4>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[category]?.description}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
              <h4 className="font-semibold text-sm">{categoryLabels[category]?.label || category}</h4>
              <p className="text-xs text-muted-foreground">
                {categoryLabels[category]?.description}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {fws.map(fw => (
                <FrameworkCard key={fw.frameworkId} fw={fw} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• A seleção afeta quais perguntas aparecem na avaliação</li>
            <li>• Os dashboards mostram métricas apenas dos frameworks selecionados</li>
            <li>• Frameworks "Core" são recomendados para avaliações iniciais</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
