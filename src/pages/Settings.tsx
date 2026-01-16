import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { FrameworkManagement } from '@/components/settings/FrameworkManagement';
import { QuestionManagement } from '@/components/settings/QuestionManagement';
import { DomainManagement } from '@/components/settings/DomainManagement';
import { SettingsSearch } from '@/components/settings/SettingsSearch';
import { 
  Layers, 
  BookMarked, 
  ClipboardList, 
  Cog,
  Settings2, 
  FileDown, 
  Trash2, 
  RefreshCw, 
  Building2, 
  Shield, 
  Home, 
  ChevronRight,
  BookOpen,
  Database,
  Info,
  CheckCircle2
} from 'lucide-react';

// Tab configuration with clear labels
const TAB_CONFIG = {
  content: { 
    label: 'Conteúdo', 
    icon: BookMarked,
    description: 'Domínios, frameworks e perguntas'
  },
  assessment: { 
    label: 'Avaliação', 
    icon: ClipboardList,
    description: 'Configurar avaliação atual'
  },
  system: { 
    label: 'Geral', 
    icon: Cog,
    description: 'Exportação e configurações gerais'
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
  const [activeTab, setActiveTab] = useState('content');
  const [assessmentName, setAssessmentName] = useState('Avaliação de Maturidade em Segurança');
  const [organizationName, setOrganizationName] = useState('');
  const [reassessmentInterval, setReassessmentInterval] = useState('quarterly');
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Refs for scrolling to sections
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle search navigation
  const handleSearchNavigate = useCallback((tab: string, sectionId?: string) => {
    setActiveTab(tab);
    
    if (sectionId) {
      setHighlightedSection(sectionId);
      
      // Wait for tab change to render, then scroll
      setTimeout(() => {
        const element = sectionRefs.current[sectionId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Clear highlight after animation
        setTimeout(() => setHighlightedSection(null), 2000);
      }, 100);
    }
  }, []);

  // Helper to register section refs
  const setSectionRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

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

  const handleExportData = async () => {
    try {
      const blob = await exportAnswersToXLSX(answers);
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
            <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
              <Settings2 className="h-3.5 w-3.5" />
              Configurações
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-muted-foreground" />
              Configurações
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie a estrutura, biblioteca e configurações da plataforma
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SettingsSearch onNavigate={handleSearchNavigate} />
            {hasChanges && (
              <>
                <Button variant="ghost" size="sm" onClick={cancelChanges}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={saveChanges}>
                  Salvar Alterações
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
          {Object.entries(TAB_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger 
                key={key}
                value={key} 
                className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-background"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ========== CONTENT TAB ========== */}
        <TabsContent value="content" className="space-y-6">
          {/* Tab Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Gerenciar Conteúdo</h2>
              <p className="text-sm text-muted-foreground">
                Domínios de segurança, frameworks e perguntas
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Domínios</p>
                    <p className="text-xl font-bold">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Frameworks</p>
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
                    <p className="text-sm text-muted-foreground">Perguntas</p>
                    <p className="text-xl font-bold">{questions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Domain Management */}
          <div ref={setSectionRef('domains')}>
            <Card className={cn(
              "transition-all duration-500",
              highlightedSection === 'domains' && "ring-2 ring-primary ring-offset-2"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Domínios de Segurança
                </CardTitle>
                <CardDescription>
                  Criar, editar e gerenciar domínios de segurança
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DomainManagement />
              </CardContent>
            </Card>
          </div>

          {/* Framework Management */}
          <div ref={setSectionRef('frameworks-management')}>
            <Card className={cn(
              "transition-all duration-500",
              highlightedSection === 'frameworks-management' && "ring-2 ring-primary ring-offset-2"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Frameworks
                </CardTitle>
                <CardDescription>
                  Criar, editar e excluir frameworks de avaliação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FrameworkManagement />
              </CardContent>
            </Card>
          </div>

          {/* Question Management */}
          <div ref={setSectionRef('questions-management')}>
            <Card className={cn(
              "transition-all duration-500",
              highlightedSection === 'questions-management' && "ring-2 ring-primary ring-offset-2"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Perguntas
                </CardTitle>
                <CardDescription>
                  Criar, editar, importar e versionar perguntas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionManagement />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== ASSESSMENT TAB ========== */}
        <TabsContent value="assessment" className="space-y-6">
          {/* Tab Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/5 to-transparent rounded-lg border border-amber-500/10">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold">Configurar Avaliação</h2>
              <p className="text-sm text-muted-foreground">
                Selecione frameworks e configure a avaliação atual
              </p>
            </div>
          </div>

          {/* Current Assessment Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Frameworks Ativos</p>
                    <p className="text-3xl font-bold text-primary">{pendingFrameworks.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">de {frameworks.length} disponíveis</p>
                    <p className="text-sm font-medium text-primary mt-1">
                      {totalQuestions} perguntas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Respondidas</p>
                <p className="text-2xl font-bold">{totalAnswered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Última Atualização</p>
                <p className="text-sm font-medium">
                  {lastUpdated 
                    ? lastUpdated.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'N/A'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Assessment Info */}
          <div ref={setSectionRef('assessment-info')}>
            <Card className={cn(
              "transition-all duration-500",
              highlightedSection === 'assessment-info' && "ring-2 ring-primary ring-offset-2"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Informações da Avaliação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
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
                      placeholder="Nome da organização"
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Framework Selection */}
          <div ref={setSectionRef('framework-selection')}>
            <Card className={cn(
              "transition-all duration-500",
              highlightedSection === 'framework-selection' && "ring-2 ring-primary ring-offset-2"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Selecionar Frameworks para Avaliação
                    </CardTitle>
                    <CardDescription>
                      Escolha quais frameworks serão incluídos na avaliação
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>Todos</Button>
                    <Button variant="ghost" size="sm" onClick={selectDefaults}>Padrão</Button>
                    <Button variant="ghost" size="sm" onClick={selectNone}>Limpar</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {frameworks.map(fw => (
                    <FrameworkCard key={fw.frameworkId} fw={fw} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Como funciona:</p>
                  <ul className="space-y-1">
                    <li>• A seleção afeta quais perguntas aparecem na avaliação</li>
                    <li>• Os dashboards mostram métricas apenas dos frameworks selecionados</li>
                    <li>• Frameworks "Padrão" são recomendados para avaliações iniciais</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== SYSTEM TAB ========== */}
        <TabsContent value="system" className="space-y-6">
          {/* Tab Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-500/5 to-transparent rounded-lg border border-gray-500/10">
            <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
              <Cog className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold">Geral</h2>
              <p className="text-sm text-muted-foreground">
                Exportação de dados, backup e informações gerais
              </p>
            </div>
          </div>

          {/* System Stats */}
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

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Export */}
            <div ref={setSectionRef('export')}>
              <Card className={cn(
                "transition-all duration-500 h-full",
                highlightedSection === 'export' && "ring-2 ring-primary ring-offset-2"
              )}>
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
                  <Button variant="outline" onClick={handleExportData} className="w-full justify-start">
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar para Excel (.xlsx)
                  </Button>
                  <Separator />
                  <div ref={setSectionRef('demo-data')}>
                    <p className="text-sm text-muted-foreground mb-3">
                      Gere dados de exemplo para explorar os dashboards.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
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
            <div ref={setSectionRef('clear-answers')}>
              <Card className={cn(
                "transition-all duration-500 h-full",
                (highlightedSection === 'clear-answers' || highlightedSection === 'restore-defaults') && "ring-2 ring-primary ring-offset-2"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Zona de Perigo
                  </CardTitle>
                  <CardDescription>
                    Ações irreversíveis que afetam seus dados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium text-sm">Limpar Respostas</div>
                      <div className="text-xs text-muted-foreground">
                        Remove todas as {totalAnswered} respostas
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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

                  <div ref={setSectionRef('restore-defaults')} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium text-sm">Restaurar Padrões</div>
                      <div className="text-xs text-muted-foreground">
                        Reseta configurações e dados
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
                </CardContent>
              </Card>
            </div>
          </div>

          {/* About */}
          <div ref={setSectionRef('about')}>
            <Card className={cn(
              "transition-all duration-500",
              highlightedSection === 'about' && "ring-2 ring-primary ring-offset-2"
            )}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Sobre a Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Frameworks Suportados</h4>
                  <div className="flex flex-wrap gap-2">
                    {frameworks.map(fw => (
                      <Badge key={fw.frameworkId} variant="outline" className="text-xs">
                        {fw.shortName}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Metodologia de Avaliação</h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
                      <span>Avaliação baseada em frameworks reconhecidos internacionalmente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
                      <span>Scoring considera implementação de controles e prontidão de evidências</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span>
                      <span>Níveis: Inexistente → Inicial → Definido → Gerenciado</span>
                    </li>
                  </ul>
                </div>
                
                <Separator />
                
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
