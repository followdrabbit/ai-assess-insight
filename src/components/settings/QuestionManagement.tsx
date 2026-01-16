import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { frameworks as defaultFrameworks, mapQuestionFrameworkToId } from '@/lib/frameworks';
import { 
  CustomQuestion, 
  getAllCustomQuestions, 
  createCustomQuestion, 
  updateCustomQuestion, 
  deleteCustomQuestion,
  getDisabledQuestions,
  disableDefaultQuestion,
  enableDefaultQuestion,
  getAllCustomFrameworks,
  getEnabledFrameworks
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
import { FilterBar, createSecurityDomainBadges } from './FilterBar';
import { StatsGrid, createTotalStat, createCustomStat, createDisabledStat, createFilteredStat } from './StatsGrid';

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
  const { t } = useTranslation();
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

    // Load enabled frameworks (with safe fallback)
    const enabledFwIds = await getEnabledFrameworks();
    setEnabledFrameworkIds(enabledFwIds);

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

  // Frameworks that have at least one question (for filter dropdown)
  // Uses mapQuestionFrameworkToId to properly map question framework strings to framework IDs
  const frameworksWithQuestions = useMemo(() => {
    const allQs = [...defaultQuestions, ...customQuestions];
    const fwIdSet = new Set<string>();
    allQs.forEach(q => {
      q.frameworks.forEach(fwString => {
        // Map the question framework string to a framework ID
        const mappedId = mapQuestionFrameworkToId(fwString);
        if (mappedId) {
          fwIdSet.add(mappedId);
        }
        // Also add the raw string in case it matches a custom framework ID directly
        fwIdSet.add(fwString);
        fwIdSet.add(fwString.toUpperCase());
      });
    });
    return fwIdSet;
  }, [customQuestions]);

  // Enabled frameworks only, filtered to those with questions
  const enabledFrameworkOptions = useMemo(() => {
    return allFrameworkOptions.filter(fw => 
      enabledFrameworkIds.includes(fw.frameworkId) && 
      (frameworksWithQuestions.has(fw.frameworkId) || frameworksWithQuestions.has(fw.frameworkId.toUpperCase()))
    );
  }, [allFrameworkOptions, enabledFrameworkIds, frameworksWithQuestions]);

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
    // Normalize selected framework value in case it is a display string
    const normalizedFrameworkFilter =
      filterFramework === 'all'
        ? 'all'
        : (mapQuestionFrameworkToId(filterFramework) || filterFramework);

    return allQuestions.filter(q => {
      const matchesSearch = searchQuery === '' || 
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.questionId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = filterDomain === 'all' || q.domainId === filterDomain;
      const matchesSecurityDomain = filterSecurityDomain === 'all' || 
        (q as any).securityDomainId === filterSecurityDomain ||
        taxonomyDomains.find(d => d.domainId === q.domainId)?.securityDomainId === filterSecurityDomain;
      const matchesFramework = normalizedFrameworkFilter === 'all' || q.frameworks.some(fwString => {
        const mappedId = mapQuestionFrameworkToId(fwString);
        return (
          mappedId === normalizedFrameworkFilter ||
          fwString === normalizedFrameworkFilter ||
          fwString.toUpperCase() === normalizedFrameworkFilter.toUpperCase()
        );
      });
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
      toast.error(t('settings.questions.validation.questionIdRequired'));
      return false;
    }
    if (!formData.questionText.trim()) {
      toast.error(t('settings.questions.validation.questionTextRequired'));
      return false;
    }
    if (!formData.domainId) {
      toast.error(t('settings.questions.validation.taxonomyDomainRequired'));
      return false;
    }
    if (!formData.securityDomainId) {
      toast.error(t('settings.questions.validation.securityDomainRequired'));
      return false;
    }

    const existingCustomIds = customQuestions.map(q => q.questionId);
    if (!editingQuestion && !isEditingDefault && existingCustomIds.includes(formData.questionId)) {
      toast.error(t('settings.questions.validation.duplicateId'));
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
          t('settings.questions.version.manualUpdate')
        );
        await updateCustomQuestion(editingQuestion.questionId, questionData);
        toast.success(t('settings.questions.toast.updateSuccess'));
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
          t('settings.questions.version.defaultReplacement')
        );
        toast.success(t('settings.questions.toast.replaceSuccess'));
      } else {
        await createCustomQuestion(questionData);
        // Save initial version
        await saveQuestionVersion(
          formData.questionId,
          questionData,
          'create',
          t('settings.questions.version.initialCreation')
        );
        toast.success(t('settings.questions.toast.createSuccess'));
      }
      await loadData();
      setIsDialogOpen(false);
      setIsEditingDefault(false);
    } catch (error) {
      toast.error(t('settings.questions.toast.saveError'));
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
        toast.success(t('settings.questions.toast.deleteSuccess'));
      } else {
        await disableDefaultQuestion(questionId);
        toast.success(t('settings.questions.toast.disableSuccess'));
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

      toast.success(t('settings.questions.toast.revertSuccess', { version: version.versionNumber }));
      setShowVersionDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error reverting:', error);
      toast.error(t('settings.questions.toast.revertError'));
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
      toast.success(isDisabled ? t('settings.questions.toast.enableSuccess') : t('settings.questions.toast.disableSuccess'));
      await loadData();
    } catch (error) {
      toast.error(t('settings.questions.toast.statusError'));
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
      toast.error(t('settings.questions.import.selectDomainFirst'));
      return;
    }

    const validation = await validateBulkImportFile(file, bulkImportDomainId);
    setBulkImportValidation(validation);

    if (validation.totalRows === 0) {
      toast.error(validation.errors[0] || t('settings.questions.import.emptyOrInvalid'));
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
      toast.error(t('settings.questions.import.noValidQuestions'));
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const result = await importBulkQuestions(bulkImportValidation.questions, { skipInvalid: true });

      if (result.success) {
        toast.success(t('settings.questions.import.importSuccess', { count: result.imported }));
        if (result.failed > 0) {
          toast.warning(t('settings.questions.import.importPartialFail', { count: result.failed }));
        }
        setShowBulkImportDialog(false);
        setBulkImportValidation(null);
        await loadData();
      } else {
        toast.error(t('settings.questions.import.importError'));
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error(t('settings.questions.import.processError'));
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
      toast.error(t('settings.questions.import.selectDomainFirst'));
      return;
    }
    downloadImportTemplate(bulkImportDomainId);
    toast.success(t('settings.questions.import.templateDownloaded'));
  };

  // Export handlers
  const handleExportExcel = async () => {
    if (!exportDomainId) {
      toast.error(t('settings.questions.export.selectDomain'));
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
      toast.error(t('settings.questions.export.noQuestions'));
      return;
    }

    setExporting(true);
    try {
      await downloadQuestionsExcel(
        questionsToExport as ExportableQuestion[],
        exportDomainId,
        domain.domainName
      );
      toast.success(t('settings.questions.export.exportSuccess', { count: questionsToExport.length }));
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('settings.questions.export.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!exportDomainId) {
      toast.error(t('settings.questions.export.selectDomain'));
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
      toast.error(t('settings.questions.export.noQuestions'));
      return;
    }

    setExporting(true);
    try {
      await downloadQuestionsCSV(
        questionsToExport as ExportableQuestion[],
        exportDomainId
      );
      toast.success(t('settings.questions.export.exportSuccess', { count: questionsToExport.length }));
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('settings.questions.export.exportError'));
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
          <h3 className="text-lg font-semibold">{t('settings.questions.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('settings.questions.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            {t('settings.questions.export.button')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowBulkImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('settings.questions.import.button')}
          </Button>
          <Button variant="outline" onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('settings.questions.newQuestion')}
          </Button>
        </div>
      </div>

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('settings.questions.searchPlaceholder')}
        domainBadges={{
          value: filterSecurityDomain,
          onChange: setFilterSecurityDomain,
          options: createSecurityDomainBadges(
            securityDomains,
            ICON_COMPONENTS,
            DOMAIN_COLORS
          ),
          allLabel: t('settings.questions.allDomains'),
        }}
        selectFilters={[
          {
            id: 'framework',
            value: filterFramework,
            onChange: setFilterFramework,
            placeholder: t('settings.questions.filterByFramework'),
            allLabel: t('settings.questions.allFrameworks'),
            options: enabledFrameworkOptions.map(fw => ({
              value: fw.frameworkId,
              label: fw.shortName,
            })),
          },
          {
            id: 'domain',
            value: filterDomain,
            onChange: setFilterDomain,
            placeholder: t('settings.questions.filterByArea'),
            allLabel: t('settings.questions.allAreas'),
            options: taxonomyDomains
              .filter(d => filterSecurityDomain === 'all' || d.securityDomainId === filterSecurityDomain)
              .map(d => ({
                value: d.domainId,
                label: d.domainName,
              })),
          },
        ]}
        onClearAll={() => {
          setSearchQuery('');
          setFilterFramework('all');
          setFilterDomain('all');
          setFilterSecurityDomain('all');
        }}
      />

      {/* Stats */}
      <StatsGrid
        stats={[
          createTotalStat(defaultQuestions.length, t('settings.questions.stats.defaultQuestions')),
          createCustomStat(customQuestions.length, t('settings.questions.stats.custom')),
          createDisabledStat(disabledQuestionIds.length, t('settings.questions.stats.disabled')),
          createFilteredStat(filteredQuestions.length, t('settings.questions.stats.showing')),
        ]}
        columns={4}
      />

      {/* Questions Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t('settings.questions.tabs.all')} ({filteredQuestions.length})</TabsTrigger>
          <TabsTrigger value="default">{t('settings.questions.tabs.default')} ({defaultQuestionsFiltered.length})</TabsTrigger>
          <TabsTrigger value="custom">{t('settings.questions.tabs.custom')} ({customQuestionsFiltered.length})</TabsTrigger>
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
              {editingQuestion ? t('settings.questions.dialog.editTitle') : isEditingDefault ? t('settings.questions.dialog.editDefaultTitle') : t('settings.questions.dialog.newTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion 
                ? t('settings.questions.dialog.editDescription')
                : isEditingDefault
                  ? t('settings.questions.dialog.editDefaultDescription')
                  : t('settings.questions.dialog.newDescription')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Security Domain Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                {t('settings.questions.form.securityDomain')} *
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
                  <SelectValue placeholder={t('settings.questions.form.selectSecurityDomain')} />
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
                <Label htmlFor="questionId">{t('settings.questions.form.questionId')} *</Label>
                <Input
                  id="questionId"
                  value={formData.questionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, questionId: e.target.value.toUpperCase().replace(/\s/g, '-') }))}
                  placeholder="CUSTOM-01-Q01"
                  disabled={!!editingQuestion || isEditingDefault}
                />
                {isEditingDefault && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.questions.form.idKeptForReplacement')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('settings.questions.form.taxonomyArea')} *</Label>
                <Select 
                  value={formData.domainId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domainId: value, subcatId: '' }))}
                  disabled={!formData.securityDomainId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.securityDomainId ? t('settings.questions.form.selectArea') : t('settings.questions.form.selectDomainFirst')} />
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
                <Label>{t('settings.questions.form.subcategory')}</Label>
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
                    <SelectValue placeholder={formData.domainId ? t('settings.questions.form.select') : t('settings.questions.form.selectAreaFirst')} />
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
              <Label htmlFor="questionText">{t('settings.questions.form.questionText')} *</Label>
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
              {t('settings.questions.import.title')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.questions.import.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>{t('settings.questions.form.securityDomain')} *</Label>
              <Select value={bulkImportDomainId} onValueChange={setBulkImportDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.questions.import.selectDestinationDomain')} />
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
                  <h4 className="font-medium text-sm">{t('settings.questions.import.templateTitle')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.questions.import.templateDescription')}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadTemplate}
                  disabled={!bulkImportDomainId}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('settings.questions.import.downloadTemplate')}
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{t('settings.questions.import.questionFile')}</Label>
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
                  {t('settings.questions.import.selectFile')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.questions.import.supportedFormats')}
              </p>
            </div>

            {/* Validation Results */}
            {bulkImportValidation && (
              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xl font-bold">{bulkImportValidation.totalRows}</div>
                    <div className="text-xs text-muted-foreground">{t('settings.questions.import.totalRows')}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-xl font-bold text-green-600">{bulkImportValidation.validRows}</div>
                    <div className="text-xs text-muted-foreground">{t('settings.questions.import.validRows')}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-xl font-bold text-red-600">
                      {bulkImportValidation.totalRows - bulkImportValidation.validRows}
                    </div>
                    <div className="text-xs text-muted-foreground">{t('settings.questions.import.withErrors')}</div>
                  </div>
                </div>

                {/* Column Mapping */}
                {Object.keys(bulkImportValidation.columnMapping).length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {t('settings.questions.import.detectedColumns')}
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
                      {t('settings.questions.import.errors')} ({bulkImportValidation.errors.length})
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
                      {t('settings.questions.import.warnings')} ({bulkImportValidation.warnings.length})
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
                      {t('settings.questions.import.importing')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={resetBulkImportDialog}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={!bulkImportValidation || bulkImportValidation.validRows === 0 || importing}
            >
              {importing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t('settings.questions.import.importingProgress')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('settings.questions.import.importCount', { count: bulkImportValidation?.validRows || 0 })}
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
              {t('settings.questions.export.title')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.questions.export.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Domain Selection */}
            <div className="space-y-2">
              <Label>{t('settings.questions.form.securityDomain')}</Label>
              <Select value={exportDomainId} onValueChange={setExportDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.questions.export.selectDomain')} />
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
                            {domainQuestionCount} {t('settings.questions.export.questionsCount')}
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
                                    {t('settings.questions.version.current')}
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
                                {t('settings.questions.version.revert')}
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
                      <h4 className="font-medium text-sm">{t('settings.questions.version.detailsTitle', { version: selectedVersion.versionNumber })}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVersion(null)}
                      >
                        {t('common.close')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('settings.questions.version.area')}:</span>{' '}
                        {selectedVersion.domainId}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.questions.version.criticality')}:</span>{' '}
                        {selectedVersion.criticality || t('settings.questions.version.notDefined')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.questions.version.owner')}:</span>{' '}
                        {selectedVersion.ownershipType || t('settings.questions.version.notDefined')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('settings.questions.version.frameworks')}:</span>{' '}
                        {(selectedVersion.frameworks || []).join(', ') || t('settings.questions.version.none')}
                      </div>
                    </div>
                    {selectedVersion.expectedEvidence && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t('settings.questions.version.evidence')}:</span>{' '}
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
                  {t('settings.questions.version.exportHTML')}
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
                  {t('settings.questions.version.printPDF')}
                </Button>
              </div>
            )}
            <Button variant="ghost" onClick={() => setShowVersionDialog(false)}>
              {t('common.close')}
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
  const { t } = useTranslation();
  
  if (questions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('settings.questions.noQuestionsFound')}
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
              loadingText={t('common.processing')}
            />
            <CardContent className="py-3">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {q.questionId}
                    </span>
                    {q.isCustom && (
                      <Badge variant="secondary" className="text-[10px]">{t('settings.questions.badge.custom')}</Badge>
                    )}
                    {q.isDisabled && (
                      <Badge variant="outline" className="text-[10px] text-destructive">{t('settings.questions.badge.disabled')}</Badge>
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
                        confirmTitle: q.isCustom ? t('settings.questions.delete.customTitle') : t('settings.questions.delete.defaultTitle'),
                        confirmDescription: q.isCustom
                          ? t('settings.questions.delete.customDescription')
                          : t('settings.questions.delete.defaultDescription'),
                        confirmActionLabel: q.isCustom ? t('settings.questions.delete.confirmDelete') : t('settings.questions.delete.confirmDisable'),
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
