import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import { SecurityDomain, getAllSecurityDomains, DOMAIN_COLORS } from '@/lib/securityDomains';
import { 
  validateBulkImportFile, 
  importBulkQuestions, 
  downloadImportTemplate,
  downloadQuestionsExcel,
  downloadQuestionsCSV,
  BulkImportValidation,
  ParsedQuestion,
  ExportableQuestion
} from '@/lib/questionBulkImport';
import {
  saveQuestionVersion,
  getQuestionVersions,
  getQuestionsVersionCounts,
  deleteQuestionVersions,
  compareVersions,
  QuestionVersion,
  VersionAnnotation,
  VersionDiff,
  CHANGE_TYPE_LABELS,
  formatVersionDate
} from '@/lib/questionVersioning';
import { VersionComparisonView } from './VersionComparisonView';
import { VersionAnnotations } from './VersionAnnotations';
import { VersionTags, VersionTagsBadges } from './VersionTags';
import { VersionFiltersBar, filterVersions, useVersionFilters, VersionFilters } from './VersionFilters';
import { supabase } from '@/integrations/supabase/client';
import { downloadVersionHistoryHtml, openVersionHistoryPrintView } from '@/lib/versionHistoryExport';
import { Brain, Cloud, Code, Shield, Lock, Database, Server, Key, Plus, Filter as FilterIcon, FolderTree, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, History, RotateCcw, Eye, GitCompare, MessageSquare, FileText, Printer, Tag, X } from 'lucide-react';
import { CardActionButtons, createEditAction, createDeleteAction, createDuplicateAction, createToggleAction, createHistoryAction } from './CardActionButtons';
import { CardLoadingOverlay } from './CardLoadingOverlay';

type CriticalityType = 'Low' | 'Medium' | 'High' | 'Critical';
type OwnershipType = 'Executive' | 'GRC' | 'Engineering';

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

interface TaxonomyDomain {
  domainId: string;
  domainName: string;
  securityDomainId: string;
}

interface TaxonomySubcategory {
  subcatId: string;
  subcatName: string;
  domainId: string;
  securityDomainId: string;
  criticality?: string;
}

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
  securityDomainId?: string;
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
  criticality: 'Medium',
  securityDomainId: ''
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
  const [enabledFrameworkIds, setEnabledFrameworkIds] = useState<string[]>([]);
  const [securityDomains, setSecurityDomains] = useState<SecurityDomain[]>([]);
  const [taxonomyDomains, setTaxonomyDomains] = useState<TaxonomyDomain[]>([]);
  const [taxonomySubcategories, setTaxonomySubcategories] = useState<TaxonomySubcategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(emptyFormData);
  const [frameworksText, setFrameworksText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterSecurityDomain, setFilterSecurityDomain] = useState<string>('all');
  const [filterFramework, setFilterFramework] = useState<string>('all');
  const [operatingId, setOperatingId] = useState<string | null>(null);

  // Bulk import state
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [bulkImportValidation, setBulkImportValidation] = useState<BulkImportValidation | null>(null);
  const [bulkImportDomainId, setBulkImportDomainId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDomainId, setExportDomainId] = useState<string>('');

  // Versioning state
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versioningQuestionId, setVersioningQuestionId] = useState<string>('');
  const [versioningQuestionText, setVersioningQuestionText] = useState<string>('');
  const [versions, setVersions] = useState<QuestionVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<QuestionVersion | null>(null);
  const [versionCounts, setVersionCounts] = useState<Map<string, number>>(new Map());
  const [reverting, setReverting] = useState(false);
  const { filters: versionFilters, setFilters: setVersionFilters, resetFilters: resetVersionFilters } = useVersionFilters();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [questions, disabled, customFw, secDomains] = await Promise.all([
      getAllCustomQuestions(),
      getDisabledQuestions(),
      getAllCustomFrameworks(),
      getAllSecurityDomains()
    ]);
    setCustomQuestions(questions);
    setDisabledQuestionIds(disabled);
    setCustomFrameworksList(customFw.map(f => ({ frameworkId: f.frameworkId, shortName: f.shortName })));
    setSecurityDomains(secDomains);

    // Load enabled frameworks from assessment_meta
    const { data: metaData } = await supabase
      .from('assessment_meta')
      .select('enabled_frameworks')
      .eq('id', 'current')
      .single();
    
    if (metaData?.enabled_frameworks) {
      setEnabledFrameworkIds(metaData.enabled_frameworks);
    }

    // Load taxonomy domains and subcategories from database
    const { data: domainsData } = await supabase
      .from('domains')
      .select('domain_id, domain_name, security_domain_id')
      .order('display_order');
    
    const { data: subcatsData } = await supabase
      .from('subcategories')
      .select('subcat_id, subcat_name, domain_id, security_domain_id, criticality');

    if (domainsData) {
      setTaxonomyDomains(domainsData.map(d => ({
        domainId: d.domain_id,
        domainName: d.domain_name,
        securityDomainId: d.security_domain_id || ''
      })));
    }

    if (subcatsData) {
      setTaxonomySubcategories(subcatsData.map(s => ({
        subcatId: s.subcat_id,
        subcatName: s.subcat_name,
        domainId: s.domain_id,
        securityDomainId: s.security_domain_id || '',
        criticality: s.criticality
      })));
    }
  };

  // All available frameworks (for form selection)
  const allFrameworkOptions = useMemo(() => [
    ...defaultFrameworks.map(f => ({ frameworkId: f.frameworkId, shortName: f.shortName })),
    ...customFrameworksList
  ], [customFrameworksList]);

  // Enabled frameworks only (for filter dropdown)
  const enabledFrameworkOptions = useMemo(() => {
    return allFrameworkOptions.filter(fw => enabledFrameworkIds.includes(fw.frameworkId));
  }, [allFrameworkOptions, enabledFrameworkIds]);

  // Get domains for selected security domain in form
  const filteredTaxonomyDomains = useMemo(() => {
    if (!formData.securityDomainId) return taxonomyDomains;
    return taxonomyDomains.filter(d => d.securityDomainId === formData.securityDomainId);
  }, [taxonomyDomains, formData.securityDomainId]);

  // Get subcategories for selected taxonomy domain in form
  const filteredSubcategories = useMemo(() => {
    if (!formData.domainId) return [];
    return taxonomySubcategories.filter(s => s.domainId === formData.domainId);
  }, [taxonomySubcategories, formData.domainId]);

  // Combine default and custom questions with disabled status
  const allQuestions = useMemo(() => {
    const defaultWithStatus = defaultQuestions.map(q => ({
      ...q,
      criticality: 'Medium' as const,
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
      const matchesSecurityDomain = filterSecurityDomain === 'all' || 
        (q as any).securityDomainId === filterSecurityDomain ||
        taxonomyDomains.find(d => d.domainId === q.domainId)?.securityDomainId === filterSecurityDomain;
      const matchesFramework = filterFramework === 'all' || 
        q.frameworks.some(fw => fw.toLowerCase().includes(filterFramework.toLowerCase()));
      return matchesSearch && matchesDomain && matchesSecurityDomain && matchesFramework;
    });
  }, [allQuestions, searchQuery, filterDomain, filterSecurityDomain, filterFramework, taxonomyDomains]);

  const getSecurityDomainInfo = (domainId: string) => {
    const taxDomain = taxonomyDomains.find(d => d.domainId === domainId);
    if (!taxDomain) return null;
    return securityDomains.find(sd => sd.domainId === taxDomain.securityDomainId);
  };

  const openNewDialog = () => {
    setEditingQuestion(null);
    setIsEditingDefault(false);
    setFormData(emptyFormData);
    setFrameworksText('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (question: typeof allQuestions[0]) => {
    setEditingQuestion(question.isCustom ? (question as CustomQuestion) : null);
    
    // Find security domain from taxonomy
    const taxDomain = taxonomyDomains.find(d => d.domainId === question.domainId);
    
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
      criticality: question.criticality || 'Medium',
      securityDomainId: taxDomain?.securityDomainId || (question as any).securityDomainId || ''
    });
    setFrameworksText(question.frameworks.join('\n'));
    setIsDialogOpen(true);
    
    setIsEditingDefault(!question.isCustom);
  };

  const [isEditingDefault, setIsEditingDefault] = useState(false);

  const validateForm = (): boolean => {
    if (!formData.questionId.trim()) {
      toast.error('ID da pergunta é obrigatório');
      return false;
    }
    if (!formData.questionText.trim()) {
      toast.error('Texto da pergunta é obrigatório');
      return false;
    }
    if (!formData.domainId) {
      toast.error('Selecione um domínio de taxonomia');
      return false;
    }
    if (!formData.securityDomainId) {
      toast.error('Selecione um domínio de segurança');
      return false;
    }

    const existingCustomIds = customQuestions.map(q => q.questionId);
    if (!editingQuestion && !isEditingDefault && existingCustomIds.includes(formData.questionId)) {
      toast.error('Já existe uma pergunta personalizada com este ID');
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

    const frameworks = frameworksText.split('\n').filter(f => f.trim());

    try {
      const questionData = {
        ...formData,
        frameworks
      };

      if (editingQuestion) {
        // Save version before updating
        await saveQuestionVersion(
          editingQuestion.questionId,
          questionData,
          'update',
          'Atualização manual'
        );
        await updateCustomQuestion(editingQuestion.questionId, questionData);
        toast.success('Pergunta atualizada com sucesso');
      } else if (isEditingDefault) {
        await disableDefaultQuestion(formData.questionId);
        await createCustomQuestion({
          ...questionData,
          isDisabled: false
        });
        // Save initial version
        await saveQuestionVersion(
          formData.questionId,
          questionData,
          'create',
          'Substituição de pergunta padrão'
        );
        toast.success('Pergunta padrão substituída por versão personalizada');
      } else {
        await createCustomQuestion(questionData);
        // Save initial version
        await saveQuestionVersion(
          formData.questionId,
          questionData,
          'create',
          'Criação inicial'
        );
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
    setOperatingId(questionId);
    try {
      if (isCustom) {
        await deleteCustomQuestion(questionId);
        // Also delete version history
        await deleteQuestionVersions(questionId);
        toast.success('Pergunta personalizada removida com sucesso');
      } else {
        await disableDefaultQuestion(questionId);
        toast.success('Pergunta padrão desabilitada com sucesso');
      }
      await loadData();
    } catch (error) {
      toast.error('Erro ao remover pergunta');
      console.error(error);
    } finally {
      setOperatingId(null);
    }
  };

  // Version history handlers
  const openVersionHistory = async (questionId: string, questionText: string) => {
    setVersioningQuestionId(questionId);
    setVersioningQuestionText(questionText);
    setShowVersionDialog(true);
    setLoadingVersions(true);
    setSelectedVersion(null);

    try {
      const versionHistory = await getQuestionVersions(questionId);
      setVersions(versionHistory);
      resetVersionFilters(); // Reset filters when opening new question's history
    } catch (error) {
      console.error('Error loading versions:', error);
      toast.error('Erro ao carregar histórico de versões');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRevertToVersion = async (version: QuestionVersion) => {
    if (!version) return;

    setReverting(true);
    try {
      // Update the question with the version data
      await updateCustomQuestion(version.questionId, {
        questionText: version.questionText,
        domainId: version.domainId,
        subcatId: version.subcatId || '',
        criticality: version.criticality as CriticalityType | undefined,
        ownershipType: version.ownershipType as OwnershipType | undefined,
        riskSummary: version.riskSummary || '',
        expectedEvidence: version.expectedEvidence || '',
        imperativeChecks: version.imperativeChecks || '',
        frameworks: version.frameworks || [],
        securityDomainId: version.securityDomainId || undefined
      });

      // Save the revert as a new version
      await saveQuestionVersion(
        version.questionId,
        {
          questionText: version.questionText,
          domainId: version.domainId,
          subcatId: version.subcatId,
          criticality: version.criticality,
          ownershipType: version.ownershipType,
          riskSummary: version.riskSummary,
          expectedEvidence: version.expectedEvidence,
          imperativeChecks: version.imperativeChecks,
          frameworks: version.frameworks,
          securityDomainId: version.securityDomainId
        },
        'revert',
        `Revertido para versão ${version.versionNumber}`
      );

      toast.success(`Revertido para versão ${version.versionNumber}`);
      setShowVersionDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error reverting:', error);
      toast.error('Erro ao reverter versão');
    } finally {
      setReverting(false);
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

  // Bulk import handlers
  const handleBulkImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!bulkImportDomainId) {
      toast.error('Selecione um domínio de segurança primeiro');
      return;
    }

    const validation = await validateBulkImportFile(file, bulkImportDomainId);
    setBulkImportValidation(validation);

    if (validation.totalRows === 0) {
      toast.error(validation.errors[0] || 'Arquivo vazio ou inválido');
    }

    // Reset file input
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportValidation) return;

    const validQuestions = bulkImportValidation.questions.filter(q => q.isValid);
    if (validQuestions.length === 0) {
      toast.error('Nenhuma pergunta válida para importar');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const result = await importBulkQuestions(bulkImportValidation.questions, { skipInvalid: true });

      if (result.success) {
        toast.success(`${result.imported} perguntas importadas com sucesso!`);
        if (result.failed > 0) {
          toast.warning(`${result.failed} perguntas falharam na importação`);
        }
        setShowBulkImportDialog(false);
        setBulkImportValidation(null);
        await loadData();
      } else {
        toast.error('Erro ao importar perguntas');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Erro ao processar importação');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const resetBulkImportDialog = () => {
    setShowBulkImportDialog(false);
    setBulkImportValidation(null);
    setBulkImportDomainId('');
  };

  const handleDownloadTemplate = () => {
    if (!bulkImportDomainId) {
      toast.error('Selecione um domínio de segurança primeiro');
      return;
    }
    downloadImportTemplate(bulkImportDomainId);
    toast.success('Template baixado com sucesso');
  };

  // Export handlers
  const handleExportExcel = async () => {
    if (!exportDomainId) {
      toast.error('Selecione um domínio de segurança');
      return;
    }

    const domain = securityDomains.find(d => d.domainId === exportDomainId);
    if (!domain) return;

    // Get questions for this domain
    const questionsToExport = allQuestions.filter(q => {
      const taxDomain = taxonomyDomains.find(d => d.domainId === q.domainId);
      return taxDomain?.securityDomainId === exportDomainId || (q as any).securityDomainId === exportDomainId;
    });

    if (questionsToExport.length === 0) {
      toast.error('Nenhuma pergunta encontrada para este domínio');
      return;
    }

    setExporting(true);
    try {
      await downloadQuestionsExcel(
        questionsToExport as ExportableQuestion[],
        exportDomainId,
        domain.domainName
      );
      toast.success(`${questionsToExport.length} perguntas exportadas com sucesso`);
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar perguntas');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!exportDomainId) {
      toast.error('Selecione um domínio de segurança');
      return;
    }

    const domain = securityDomains.find(d => d.domainId === exportDomainId);
    if (!domain) return;

    // Get questions for this domain
    const questionsToExport = allQuestions.filter(q => {
      const taxDomain = taxonomyDomains.find(d => d.domainId === q.domainId);
      return taxDomain?.securityDomainId === exportDomainId || (q as any).securityDomainId === exportDomainId;
    });

    if (questionsToExport.length === 0) {
      toast.error('Nenhuma pergunta encontrada para este domínio');
      return;
    }

    setExporting(true);
    try {
      await downloadQuestionsCSV(
        questionsToExport as ExportableQuestion[],
        exportDomainId
      );
      toast.success(`${questionsToExport.length} perguntas exportadas com sucesso`);
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar perguntas');
    } finally {
      setExporting(false);
    }
  };

  const getExportQuestionCount = () => {
    if (!exportDomainId) return 0;
    return allQuestions.filter(q => {
      const taxDomain = taxonomyDomains.find(d => d.domainId === q.domainId);
      return taxDomain?.securityDomainId === exportDomainId || (q as any).securityDomainId === exportDomainId;
    }).length;
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowBulkImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Pergunta
          </Button>
        </div>
      </div>

      {/* Security Domain Filter */}
      <div className="flex items-center gap-3">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={filterSecurityDomain === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterSecurityDomain('all')}
          >
            Todos os Domínios
          </Badge>
          {securityDomains.filter(d => d.isEnabled).map(domain => {
            const IconComp = ICON_COMPONENTS[domain.icon] || Shield;
            const colorStyles = DOMAIN_COLORS[domain.color];
            return (
              <Badge
                key={domain.domainId}
                variant={filterSecurityDomain === domain.domainId ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer flex items-center gap-1",
                  filterSecurityDomain === domain.domainId && colorStyles?.bg,
                  filterSecurityDomain === domain.domainId && colorStyles?.text
                )}
                onClick={() => setFilterSecurityDomain(domain.domainId)}
              >
                <IconComp className="h-3 w-3" />
                {domain.shortName}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por texto ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterFramework} onValueChange={setFilterFramework}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os frameworks</SelectItem>
            {enabledFrameworkOptions.map(fw => (
              <SelectItem key={fw.frameworkId} value={fw.frameworkId}>
                {fw.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDomain} onValueChange={setFilterDomain}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {taxonomyDomains
              .filter(d => filterSecurityDomain === 'all' || d.securityDomainId === filterSecurityDomain)
              .map(d => (
                <SelectItem key={d.domainId} value={d.domainId}>
                  {d.domainName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {(searchQuery || filterFramework !== 'all' || filterDomain !== 'all' || filterSecurityDomain !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setFilterFramework('all');
              setFilterDomain('all');
              setFilterSecurityDomain('all');
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar filtros
          </Button>
        )}
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
            onViewHistory={openVersionHistory}
            operatingId={operatingId}
          />
        </TabsContent>

        <TabsContent value="default">
          <QuestionsList 
            questions={defaultQuestionsFiltered}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleDisable={handleToggleDisable}
            onDuplicate={handleDuplicate}
            onViewHistory={openVersionHistory}
            operatingId={operatingId}
          />
        </TabsContent>

        <TabsContent value="custom">
          <QuestionsList 
            questions={customQuestionsFiltered}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleDisable={handleToggleDisable}
            onDuplicate={handleDuplicate}
            onViewHistory={openVersionHistory}
            operatingId={operatingId}
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
            {/* Security Domain Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Domínio de Segurança *
              </Label>
              <Select
                value={formData.securityDomainId}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  securityDomainId: value,
                  domainId: '', // Reset taxonomy domain when security domain changes
                  subcatId: ''
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o domínio de segurança" />
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
            </div>

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
                <Label>Área de Taxonomia *</Label>
                <Select 
                  value={formData.domainId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domainId: value, subcatId: '' }))}
                  disabled={!formData.securityDomainId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.securityDomainId ? "Selecione a área" : "Selecione o domínio primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTaxonomyDomains.map(d => (
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
                  value={formData.subcatId}
                  onValueChange={(value) => {
                    const subcat = filteredSubcategories.find(s => s.subcatId === value);
                    setFormData(prev => ({ 
                      ...prev, 
                      subcatId: value,
                      criticality: subcat?.criticality as CriticalityType || prev.criticality
                    }));
                  }}
                  disabled={!formData.domainId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.domainId ? "Selecione" : "Selecione a área primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map(s => (
                      <SelectItem key={s.subcatId} value={s.subcatId}>
                        <div className="flex items-center gap-2">
                          {s.subcatName}
                          {s.criticality && (
                            <Badge variant="outline" className="text-[10px]">
                              {s.criticality}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSave}>
              {editingQuestion ? 'Salvar Alterações' : isEditingDefault ? 'Substituir Pergunta' : 'Criar Pergunta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Save */}
      <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingQuestion 
                ? 'Confirmar alterações?' 
                : isEditingDefault 
                  ? 'Substituir pergunta padrão?' 
                  : 'Criar nova pergunta?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editingQuestion 
                ? `Você deseja salvar as alterações na pergunta "${formData.questionId}"?`
                : isEditingDefault 
                  ? `Você deseja criar uma versão personalizada da pergunta "${formData.questionId}"? A pergunta padrão será desabilitada.`
                  : `Você deseja criar a nova pergunta "${formData.questionId}"?`}
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

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImportDialog} onOpenChange={(open) => { if (!open) resetBulkImportDialog(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Perguntas em Lote
            </DialogTitle>
            <DialogDescription>
              Importe múltiplas perguntas de um arquivo CSV ou Excel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>Domínio de Segurança *</Label>
              <Select value={bulkImportDomainId} onValueChange={setBulkImportDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o domínio de destino" />
                </SelectTrigger>
                <SelectContent>
                  {securityDomains.filter(d => d.isEnabled).map(domain => {
                    const IconComp = ICON_COMPONENTS[domain.icon] || Shield;
                    return (
                      <SelectItem key={domain.domainId} value={domain.domainId}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          {domain.domainName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Template Download */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Template de Importação</h4>
                  <p className="text-xs text-muted-foreground">
                    Baixe o template Excel com as colunas corretas
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadTemplate}
                  disabled={!bulkImportDomainId}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Arquivo de Perguntas</Label>
              <div className="flex gap-2">
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleBulkImportFileSelect}
                  className="hidden"
                  disabled={!bulkImportDomainId}
                />
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => importFileRef.current?.click()}
                  disabled={!bulkImportDomainId}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo CSV/Excel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos suportados: .csv, .xlsx, .xls
              </p>
            </div>

            {/* Validation Results */}
            {bulkImportValidation && (
              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xl font-bold">{bulkImportValidation.totalRows}</div>
                    <div className="text-xs text-muted-foreground">Linhas Total</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-xl font-bold text-green-600">{bulkImportValidation.validRows}</div>
                    <div className="text-xs text-muted-foreground">Válidas</div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-xl font-bold text-red-600">
                      {bulkImportValidation.totalRows - bulkImportValidation.validRows}
                    </div>
                    <div className="text-xs text-muted-foreground">Com Erros</div>
                  </div>
                </div>

                {/* Column Mapping */}
                {Object.keys(bulkImportValidation.columnMapping).length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Colunas Detectadas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(bulkImportValidation.columnMapping).map(([field, original]) => (
                        <Badge key={field} variant="secondary" className="text-xs">
                          {original} → {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {bulkImportValidation.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-2">
                      <XCircle className="h-4 w-4" />
                      Erros ({bulkImportValidation.errors.length})
                    </div>
                    <ScrollArea className="h-32">
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {bulkImportValidation.errors.slice(0, 20).map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                        {bulkImportValidation.errors.length > 20 && (
                          <li className="font-medium">... e mais {bulkImportValidation.errors.length - 20} erros</li>
                        )}
                      </ul>
                    </ScrollArea>
                  </div>
                )}

                {/* Warnings */}
                {bulkImportValidation.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-600 text-sm font-medium mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Avisos ({bulkImportValidation.warnings.length})
                    </div>
                    <ScrollArea className="h-24">
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {bulkImportValidation.warnings.slice(0, 10).map((warn, i) => (
                          <li key={i}>• {warn}</li>
                        ))}
                        {bulkImportValidation.warnings.length > 10 && (
                          <li className="font-medium">... e mais {bulkImportValidation.warnings.length - 10} avisos</li>
                        )}
                      </ul>
                    </ScrollArea>
                  </div>
                )}

                {/* Import Progress */}
                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-xs text-center text-muted-foreground">
                      Importando perguntas...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={resetBulkImportDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={!bulkImportValidation || bulkImportValidation.validRows === 0 || importing}
            >
              {importing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Importar {bulkImportValidation?.validRows || 0} Perguntas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Perguntas
            </DialogTitle>
            <DialogDescription>
              Exporte perguntas de um domínio de segurança para backup ou compartilhamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>Domínio de Segurança</Label>
              <Select value={exportDomainId} onValueChange={setExportDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o domínio" />
                </SelectTrigger>
                <SelectContent>
                  {securityDomains.filter(d => d.isEnabled).map(domain => {
                    const IconComp = ICON_COMPONENTS[domain.icon] || Shield;
                    const domainQuestionCount = allQuestions.filter(q => {
                      const taxDomain = taxonomyDomains.find(d => d.domainId === q.domainId);
                      return taxDomain?.securityDomainId === domain.domainId || 
                             (q as any).securityDomainId === domain.domainId;
                    }).length;
                    return (
                      <SelectItem key={domain.domainId} value={domain.domainId}>
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex items-center gap-2">
                            <IconComp className="h-4 w-4" />
                            {domain.domainName}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {domainQuestionCount} perguntas
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Stats Preview */}
            {exportDomainId && (
              <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <h4 className="font-medium text-sm">Resumo da Exportação</h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 rounded bg-background">
                    <div className="text-lg font-bold">{getExportQuestionCount()}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="p-2 rounded bg-background">
                    <div className="text-lg font-bold">
                      {allQuestions.filter(q => {
                        const taxDomain = taxonomyDomains.find(d => d.domainId === q.domainId);
                        return (taxDomain?.securityDomainId === exportDomainId || 
                               (q as any).securityDomainId === exportDomainId) && q.isCustom;
                      }).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Personalizadas</div>
                  </div>
                </div>
              </div>
            )}

            {/* Export Format */}
            <div className="space-y-2">
              <Label>Formato de Exportação</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={handleExportExcel}
                  disabled={!exportDomainId || exporting}
                >
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <span className="text-xs">Excel (.xlsx)</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={handleExportCSV}
                  disabled={!exportDomainId || exporting}
                >
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  <span className="text-xs">CSV (.csv)</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Excel inclui resumos e estatísticas adicionais. CSV é mais leve e compatível.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowExportDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {versioningQuestionText}
            </DialogDescription>
          </DialogHeader>

          {loadingVersions ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando versões...
            </div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhuma versão registrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                O histórico de versões começa a partir da próxima edição
              </p>
            </div>
          ) : (
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timeline" className="gap-2">
                  <History className="h-4 w-4" />
                  Linha do Tempo
                </TabsTrigger>
                <TabsTrigger value="compare" className="gap-2">
                  <GitCompare className="h-4 w-4" />
                  Comparar Versões
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-4 space-y-4">
                {/* Filters */}
                <VersionFiltersBar
                  filters={versionFilters}
                  onFiltersChange={setVersionFilters}
                  versions={versions}
                />
                
                {(() => {
                  const filteredVersions = filterVersions(versions, versionFilters);
                  
                  if (filteredVersions.length === 0) {
                    return (
                      <div className="py-8 text-center text-muted-foreground">
                        <FilterIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nenhuma versão encontrada com os filtros atuais</p>
                        <Button variant="link" size="sm" onClick={resetVersionFilters} className="mt-2">
                          Limpar filtros
                        </Button>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {versionFilters.searchText || versionFilters.dateFrom || versionFilters.dateTo || 
                       versionFilters.changeTypes.length > 0 || versionFilters.tags.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Mostrando {filteredVersions.length} de {versions.length} versões
                        </p>
                      ) : null}
                      <ScrollArea className="h-[350px]">
                        <div className="space-y-3 pr-4">
                          {filteredVersions.map((version, index) => (
                      <Card 
                        key={version.id} 
                        className={cn(
                          "card-interactive cursor-pointer",
                          selectedVersion?.id === version.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => setSelectedVersion(version)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  v{version.versionNumber}
                                </Badge>
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-xs",
                                    version.changeType === 'create' && "bg-green-500/10 text-green-600",
                                    version.changeType === 'update' && "bg-blue-500/10 text-blue-600",
                                    version.changeType === 'revert' && "bg-orange-500/10 text-orange-600"
                                  )}
                                >
                                  {CHANGE_TYPE_LABELS[version.changeType]}
                                </Badge>
                                {index === 0 && (
                                  <Badge variant="default" className="text-xs">
                                    Atual
                                  </Badge>
                                )}
                                {version.annotations && version.annotations.length > 0 && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {version.annotations.length}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm line-clamp-2 text-muted-foreground">
                                {version.questionText}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>{formatVersionDate(version.createdAt)}</span>
                                {version.changeSummary && (
                                  <span className="text-muted-foreground/70">• {version.changeSummary}</span>
                                )}
                              </div>
                              {/* Tags display */}
                              {version.tags && version.tags.length > 0 && (
                                <div className="mt-2">
                                  <VersionTagsBadges tags={version.tags} />
                                </div>
                              )}
                            </div>
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevertToVersion(version);
                                }}
                                disabled={reverting}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reverter
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                        </div>
                      </ScrollArea>
                    </>
                  );
                })()}

                {/* Version Details */}
                {selectedVersion && (
                  <div className="p-4 rounded-lg bg-muted/50 border space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Detalhes da Versão {selectedVersion.versionNumber}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVersion(null)}
                      >
                        Fechar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Área:</span>{' '}
                        {selectedVersion.domainId}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Criticidade:</span>{' '}
                        {selectedVersion.criticality || 'Não definida'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Responsável:</span>{' '}
                        {selectedVersion.ownershipType || 'Não definido'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Frameworks:</span>{' '}
                        {(selectedVersion.frameworks || []).join(', ') || 'Nenhum'}
                      </div>
                    </div>
                    {selectedVersion.expectedEvidence && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Evidência:</span>{' '}
                        <span className="line-clamp-2">{selectedVersion.expectedEvidence}</span>
                      </div>
                    )}
                    
                    {/* Tags Section */}
                    <div className="border-t pt-4">
                      <VersionTags
                        version={selectedVersion}
                        onTagsChange={(versionId, newTags) => {
                          setVersions(prev => prev.map(v => 
                            v.id === versionId ? { ...v, tags: newTags } : v
                          ));
                          if (selectedVersion.id === versionId) {
                            setSelectedVersion({ ...selectedVersion, tags: newTags });
                          }
                        }}
                      />
                    </div>

                    {/* Annotations Section */}
                    <div className="border-t pt-4">
                      <VersionAnnotations
                        version={selectedVersion}
                        onAnnotationsChange={(versionId, newAnnotations) => {
                          // Update both the selected version and the versions list
                          setVersions(prev => prev.map(v => 
                            v.id === versionId ? { ...v, annotations: newAnnotations } : v
                          ));
                          if (selectedVersion.id === versionId) {
                            setSelectedVersion({ ...selectedVersion, annotations: newAnnotations });
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="compare" className="mt-4">
                <VersionComparisonView
                  versions={versions}
                  onRevert={handleRevertToVersion}
                  reverting={reverting}
                />
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {versions.length > 0 && (
              <div className="flex gap-2 mr-auto">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => downloadVersionHistoryHtml({
                    questionId: versioningQuestionId,
                    questionText: versioningQuestionText,
                    versions
                  })}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar HTML
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => openVersionHistoryPrintView({
                    questionId: versioningQuestionId,
                    questionText: versioningQuestionText,
                    versions
                  })}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir/PDF
                </Button>
              </div>
            )}
            <Button variant="ghost" onClick={() => setShowVersionDialog(false)}>
              Fechar
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
  onViewHistory?: (questionId: string, questionText: string) => void;
  operatingId?: string | null;
}

function QuestionsList({ questions, onEdit, onDelete, onToggleDisable, onDuplicate, onViewHistory, operatingId }: QuestionsListProps) {
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
              "card-interactive relative",
              q.isDisabled && "opacity-50"
            )}
          >
            <CardLoadingOverlay 
              isLoading={operatingId === q.questionId} 
              loadingText="Processando..."
            />
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
                <CardActionButtons
                  withBorder={false}
                  actions={[
                    createHistoryAction(
                      () => onViewHistory?.(q.questionId, q.questionText),
                      { hidden: !q.isCustom || !onViewHistory }
                    ),
                    createDuplicateAction(() => onDuplicate(q)),
                    createToggleAction(
                      () => onToggleDisable(q.questionId, q.isDisabled, q.isCustom),
                      !q.isDisabled
                    ),
                    createEditAction(() => onEdit(q)),
                    createDeleteAction(
                      () => onDelete(q.questionId, q.isCustom),
                      {
                        isDefault: !q.isCustom,
                        confirmTitle: q.isCustom ? 'Excluir pergunta?' : 'Desabilitar pergunta padrão?',
                        confirmDescription: q.isCustom
                          ? 'Você deseja excluir permanentemente esta pergunta personalizada? Esta ação não pode ser desfeita.'
                          : 'Você deseja desabilitar esta pergunta padrão? Ela será removida da avaliação mas poderá ser restaurada posteriormente.',
                        confirmActionLabel: q.isCustom ? 'Sim, Excluir' : 'Sim, Desabilitar',
                      }
                    ),
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
