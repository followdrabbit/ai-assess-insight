import { useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  CheckCircle2,
  Activity,
  Server,
  Bot
} from 'lucide-react';
import { AuditLogsPanel } from '@/components/settings/AuditLogsPanel';
import { SIEMIntegrationsPanel } from '@/components/settings/SIEMIntegrationsPanel';
import { SIEMHealthPanel } from '@/components/settings/SIEMHealthPanel';
import { AIProvidersPanel } from '@/components/settings/AIProvidersPanel';

export default function Settings() {
  const { t } = useTranslation();
  
  // Tab configuration with clear labels
  const TAB_CONFIG = {
    content: { 
      label: t('settings.contentTab'), 
      icon: BookMarked,
      description: t('settings.manageContentDesc')
    },
    assessment: { 
      label: t('settings.assessmentTab'), 
      icon: ClipboardList,
      description: t('settings.configureAssessmentDesc')
    },
    system: { 
      label: t('settings.systemTab'), 
      icon: Cog,
      description: t('settings.exportAndGeneralDesc')
    },
    audit: {
      label: t('auditLogs.title'),
      icon: Activity,
      description: t('auditLogs.description')
    },
    siem: {
      label: t('siem.tabTitle'),
      icon: Server,
      description: t('siem.tabDescription')
    },
    ai: {
      label: t('aiProviders.tabTitle', 'Assistente IA'),
      icon: Bot,
      description: t('aiProviders.tabDescription', 'Configure provedores de IA')
    },
  };

  const audienceLabels: Record<string, string> = {
    Executive: t('dashboard.executive'),
    GRC: t('dashboard.grc'),
    Engineering: t('settings.engineering'),
  };
  const { enabledFrameworks, setEnabledFrameworks, answers, clearAnswers, generateDemoData } = useAnswersStore();
  const [pendingFrameworks, setPendingFrameworks] = useState<string[]>(enabledFrameworks);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [assessmentName, setAssessmentName] = useState(t('settings.defaultAssessmentName'));
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
      toast.error(t('settings.selectAtLeastOne'));
      return;
    }
    
    await setEnabledFrameworks(pendingFrameworks);
    setHasChanges(false);
    toast.success(t('settings.settingsSaved'));
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
      toast.success(t('settings.exportSuccess'));
    } catch (error) {
      toast.error(t('settings.exportError'));
      console.error(error);
    }
  };

  const handleClearAnswers = async () => {
    await clearAnswers();
    toast.success(t('settings.answersCleared'));
  };

  const handleGenerateDemo = async () => {
    await generateDemoData();
    toast.success(t('settings.demoGenerated'));
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
                    {t('common.default')}
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
            <span>{questionCount} {t('settings.questions').toLowerCase()}</span>
            {answeredCount > 0 && (
              <span className="text-primary">{answeredCount} {t('common.answered')}</span>
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
                {t('navigation.home')}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
              <Settings2 className="h-3.5 w-3.5" />
              {t('settings.title')}
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
              {t('settings.title')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('settings.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SettingsSearch onNavigate={handleSearchNavigate} />
            {hasChanges && (
              <>
                <Button variant="ghost" size="sm" onClick={cancelChanges}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={saveChanges}>
                  {t('common.saveChanges')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50">
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
              <h2 className="font-semibold">{t('settings.manageContent')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('settings.manageContentDesc')}
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
                    <p className="text-sm text-muted-foreground">{t('settings.domains')}</p>
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
                    <p className="text-sm text-muted-foreground">{t('settings.frameworks')}</p>
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
                    <p className="text-sm text-muted-foreground">{t('settings.questions')}</p>
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
                  {t('settings.securityDomains')}
                </CardTitle>
                <CardDescription>
                  {t('settings.createEditManage')}
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
                  {t('settings.frameworks')}
                </CardTitle>
                <CardDescription>
                  {t('settings.createEditDelete')}
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
                  {t('settings.questions')}
                </CardTitle>
                <CardDescription>
                  {t('settings.createEditImport')}
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
              <h2 className="font-semibold">{t('settings.configureAssessment')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('settings.configureAssessmentDesc')}
              </p>
            </div>
          </div>

          {/* Current Assessment Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('settings.activeFrameworks')}</p>
                    <p className="text-3xl font-bold text-primary">{pendingFrameworks.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('settings.ofAvailable', { count: frameworks.length })}</p>
                    <p className="text-sm font-medium text-primary mt-1">
                      {totalQuestions} {t('settings.questions').toLowerCase()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">{t('assessment.answered')}</p>
                <p className="text-2xl font-bold">{totalAnswered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">{t('settings.lastUpdate')}</p>
                <p className="text-sm font-medium">
                  {lastUpdated 
                    ? lastUpdated.toLocaleDateString()
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
                  {t('settings.assessmentInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="assessmentName">{t('settings.assessmentName')}</Label>
                    <Input
                      id="assessmentName"
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                      placeholder={t('settings.assessmentNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">{t('profile.organization')}</Label>
                    <Input
                      id="organizationName"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder={t('settings.organizationPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reassessmentInterval">{t('settings.reassessmentCadence')}</Label>
                    <Select value={reassessmentInterval} onValueChange={setReassessmentInterval}>
                      <SelectTrigger id="reassessmentInterval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">{t('settings.monthly')}</SelectItem>
                        <SelectItem value="quarterly">{t('settings.quarterly')}</SelectItem>
                        <SelectItem value="semiannual">{t('settings.semiannual')}</SelectItem>
                        <SelectItem value="annual">{t('settings.annual')}</SelectItem>
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
                      {t('settings.selectFrameworksForAssessment')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.chooseFrameworksDesc')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>{t('common.all')}</Button>
                    <Button variant="ghost" size="sm" onClick={selectDefaults}>{t('common.default')}</Button>
                    <Button variant="ghost" size="sm" onClick={selectNone}>{t('settings.clear')}</Button>
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
                  <p className="font-medium text-foreground mb-1">{t('settings.howItWorks')}:</p>
                  <ul className="space-y-1">
                    <li>• {t('settings.howItWorksItem1')}</li>
                    <li>• {t('settings.howItWorksItem2')}</li>
                    <li>• {t('settings.howItWorksItem3')}</li>
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
              <h2 className="font-semibold">{t('settings.systemTab')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('settings.exportAndGeneralDesc')}
              </p>
            </div>
          </div>

          {/* System Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">{t('settings.version')}</p>
                <p className="text-xl font-bold">2.0.0</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">{t('settings.frameworks')}</p>
                <p className="text-xl font-bold">{frameworks.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">{t('settings.questions')}</p>
                <p className="text-xl font-bold">{questions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-sm text-muted-foreground">{t('settings.update')}</p>
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
                  {t('settings.exportBackup')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('settings.exportDescription')}
                </p>
                <Button variant="outline" onClick={handleExportData} className="w-full justify-start">
                  <FileDown className="h-4 w-4 mr-2" />
                  {t('settings.exportToExcel')}
                </Button>
                <Separator />
                <div ref={setSectionRef('demo-data')}>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('settings.generateDemoDescription')}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('settings.generateDemoData')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.generateDemoTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settings.generateDemoDescription2')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGenerateDemo}>
                          {t('settings.generateData')}
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
                  {t('settings.dangerZone')}
                </CardTitle>
                <CardDescription>
                  {t('settings.dangerZoneDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <div className="font-medium text-sm">{t('settings.clearAnswers')}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('settings.removesAllAnswers', { count: totalAnswered })}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        {t('settings.clear')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.clearAllAnswersTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settings.clearAllAnswersDesc', { count: totalAnswered })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleClearAnswers}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('settings.clearAnswers')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div ref={setSectionRef('restore-defaults')} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <div className="font-medium text-sm">{t('settings.restoreDefaults')}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('settings.resetsSettingsAndData')}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        {t('settings.restore')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.restoreDefaultsTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settings.restoreDefaultsDesc')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={async () => {
                            await clearAnswers();
                            await setEnabledFrameworks(
                              frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId)
                            );
                            setPendingFrameworks(
                              frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId)
                            );
                            toast.success(t('settings.settingsRestored'));
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('settings.restoreDefaults')}
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
                  {t('settings.aboutPlatform')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">{t('settings.supportedFrameworks')}</h4>
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
                  <h4 className="font-medium text-sm mb-2">{t('settings.assessmentMethodology')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
                      <span>{t('settings.methodologyItem1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
                      <span>{t('settings.methodologyItem2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span>
                      <span>{t('settings.methodologyItem3')}</span>
                    </li>
                  </ul>
                </div>
                
                <Separator />
                
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 pb-4">
                    <h4 className="font-medium mb-2 text-sm">{t('settings.privacyStorage')}</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• {t('settings.privacyItem1')}</li>
                      <li>• {t('settings.privacyItem2')}</li>
                      <li>• {t('settings.privacyItem3')}</li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== AUDIT LOGS TAB ========== */}
        <TabsContent value="audit" className="space-y-6">
          {/* Tab Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{t('auditLogs.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('auditLogs.description')}
              </p>
            </div>
          </div>

          <AuditLogsPanel />
        </TabsContent>

        {/* ========== SIEM INTEGRATIONS TAB ========== */}
        <TabsContent value="siem" className="space-y-6">
          {/* Tab Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{t('siem.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('siem.description')}
              </p>
            </div>
          </div>

          <SIEMIntegrationsPanel />

          {/* Health Monitoring */}
          <SIEMHealthPanel />
        </TabsContent>

        {/* ========== AI PROVIDERS TAB ========== */}
        <TabsContent value="ai" className="space-y-6">
          {/* Tab Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{t('aiProviders.title', 'Provedores de IA')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('aiProviders.description', 'Configure diferentes provedores de IA para o assistente')}
              </p>
            </div>
          </div>

          <AIProvidersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
