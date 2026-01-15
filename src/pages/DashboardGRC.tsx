import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, ActiveQuestion } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import { 
  MaturityScoreHelp, 
  CoverageHelp, 
  EvidenceReadinessHelp 
} from '@/components/HelpTooltip';
import { FrameworkCategoryId } from '@/lib/dataset';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { domains } from '@/lib/dataset';
import { questions as defaultQuestions } from '@/lib/dataset';
import { getAllCustomQuestions, getDisabledQuestions, getEnabledFrameworks, getSelectedFrameworks, setSelectedFrameworks, getAllCustomFrameworks } from '@/lib/database';
import { frameworks as defaultFrameworks, Framework, getQuestionFrameworkIds } from '@/lib/frameworks';

// Rationalized Framework Categories - Authoritative Set Only
const frameworkCategoryLabels: Record<FrameworkCategoryId, string> = {
  NIST_AI_RMF: 'NIST AI RMF',
  SECURITY_BASELINE: 'ISO 27001/27002',
  AI_RISK_MGMT: 'ISO 23894 / Gestão de Riscos',
  SECURE_DEVELOPMENT: 'NIST SSDF / CSA',
  PRIVACY_LGPD: 'LGPD / Privacidade',
  THREAT_EXPOSURE: 'OWASP LLM + API',
};

const frameworkCategoryColors: Record<FrameworkCategoryId, string> = {
  NIST_AI_RMF: 'hsl(var(--chart-1))',
  SECURITY_BASELINE: 'hsl(var(--chart-2))',
  AI_RISK_MGMT: 'hsl(var(--chart-3))',
  SECURE_DEVELOPMENT: 'hsl(var(--chart-4))',
  PRIVACY_LGPD: 'hsl(var(--chart-5))',
  THREAT_EXPOSURE: 'hsl(221, 83%, 53%)',
};

type StatusFilter = 'all' | 'incomplete' | 'at-risk' | 'on-track';
type SortField = 'name' | 'coverage' | 'maturity' | 'gaps';
type SortOrder = 'asc' | 'desc';

export default function DashboardGRC() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  // Framework states
  const [allActiveQuestions, setAllActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [enabledFrameworks, setEnabledFrameworks] = useState<Framework[]>([]);
  const [enabledFrameworkIds, setEnabledFrameworkIds] = useState<string[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('gaps');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [selectedOwnership, setSelectedOwnership] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedFrameworkCategory, setSelectedFrameworkCategory] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  // Load active questions and frameworks
  const loadData = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const [customQuestions, disabledQuestionIds, enabledIds, selectedIds, customFrameworks] = await Promise.all([
        getAllCustomQuestions(),
        getDisabledQuestions(),
        getEnabledFrameworks(),
        getSelectedFrameworks(),
        getAllCustomFrameworks()
      ]);

      // Combine default and custom questions, excluding disabled ones
      const active: ActiveQuestion[] = [
        ...defaultQuestions
          .filter(q => !disabledQuestionIds.includes(q.questionId))
          .map(q => ({
            questionId: q.questionId,
            questionText: q.questionText,
            subcatId: q.subcatId,
            domainId: q.domainId,
            ownershipType: q.ownershipType,
            frameworks: q.frameworks || []
          })),
        ...customQuestions
          .filter(q => !q.isDisabled)
          .map(q => ({
            questionId: q.questionId,
            questionText: q.questionText,
            subcatId: q.subcatId || '',
            domainId: q.domainId,
            ownershipType: q.ownershipType,
            frameworks: q.frameworks || []
          }))
      ];

      setAllActiveQuestions(active);
      setEnabledFrameworkIds(enabledIds);

      // Combine default and custom frameworks, filter by enabled
      const allFrameworks: Framework[] = [
        ...defaultFrameworks,
        ...customFrameworks.map(cf => ({
          frameworkId: cf.frameworkId,
          frameworkName: cf.frameworkName,
          shortName: cf.shortName,
          description: cf.description,
          targetAudience: cf.targetAudience,
          assessmentScope: cf.assessmentScope,
          defaultEnabled: cf.defaultEnabled,
          version: cf.version,
          category: cf.category as 'core' | 'high-value' | 'tech-focused',
          references: cf.references
        }))
      ];

      const enabledSet = new Set(enabledIds);
      const enabled = allFrameworks.filter(f => enabledSet.has(f.frameworkId));
      setEnabledFrameworks(enabled);

      // Sanitize selected frameworks
      const enabledIdSet = new Set(enabledIds);
      const sanitizedSelected = (selectedIds || []).filter(id => enabledIdSet.has(id));
      setSelectedFrameworkIds(sanitizedSelected);

    } catch (error) {
      console.error('Error loading data:', error);
      const defaultEnabledIds = ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'];
      setAllActiveQuestions(defaultQuestions.map(q => ({
        questionId: q.questionId,
        questionText: q.questionText,
        subcatId: q.subcatId,
        domainId: q.domainId,
        ownershipType: q.ownershipType,
        frameworks: q.frameworks || []
      })));
      setEnabledFrameworkIds(defaultEnabledIds);
      setEnabledFrameworks(defaultFrameworks.filter(f => f.defaultEnabled));
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh on focus/visibility
  useEffect(() => {
    const onFocus = () => loadData();
    const onVisibility = () => {
      if (!document.hidden) loadData();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadData]);

  // Filter questions by enabled frameworks
  const questionsFilteredByEnabledFrameworks = useMemo(() => {
    if (enabledFrameworkIds.length === 0) return allActiveQuestions;

    const enabledSet = new Set(enabledFrameworkIds);
    return allActiveQuestions.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      return questionFrameworkIds.some(id => enabledSet.has(id));
    });
  }, [allActiveQuestions, enabledFrameworkIds]);

  // Apply user selection on top of enabled frameworks
  const questionsForDashboard = useMemo(() => {
    if (selectedFrameworkIds.length === 0) return questionsFilteredByEnabledFrameworks;

    const selectedSet = new Set(selectedFrameworkIds);
    return questionsFilteredByEnabledFrameworks.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      return questionFrameworkIds.some(id => selectedSet.has(id));
    });
  }, [questionsFilteredByEnabledFrameworks, selectedFrameworkIds]);

  // Handle framework selection change
  const handleFrameworkSelectionChange = async (frameworkIds: string[]) => {
    setSelectedFrameworkIds(frameworkIds);
    try {
      await setSelectedFrameworks(frameworkIds);
    } catch (error) {
      console.error('Error saving framework selection:', error);
    }
  };

  // Toggle framework selection
  const toggleFramework = (frameworkId: string) => {
    const newSelection = selectedFrameworkIds.includes(frameworkId)
      ? selectedFrameworkIds.filter(id => id !== frameworkId)
      : [...selectedFrameworkIds, frameworkId];
    handleFrameworkSelectionChange(newSelection);
  };

  // Clear framework selection
  const clearFrameworkSelection = () => {
    handleFrameworkSelectionChange([]);
  };

  // Group frameworks by category
  const frameworksByCategory = useMemo(() => {
    const groups: Record<string, Framework[]> = {
      'core': [],
      'high-value': [],
      'tech-focused': []
    };
    enabledFrameworks.forEach(fw => {
      const cat = fw.category || 'core';
      if (groups[cat]) groups[cat].push(fw);
    });
    return groups;
  }, [enabledFrameworks]);

  const categoryLabels: Record<string, string> = {
    'core': 'Frameworks Principais',
    'high-value': 'Alto Valor',
    'tech-focused': 'Foco Técnico'
  };

  // Calculate metrics using filtered questions
  const metrics = useMemo(() => calculateOverallMetrics(answers, questionsForDashboard), [answers, questionsForDashboard]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers, questionsForDashboard), [answers, questionsForDashboard]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers, 0.5, questionsForDashboard), [answers, questionsForDashboard]);

  // Unique ownership types for filter
  const ownershipTypes = useMemo(() => {
    const types = new Set<string>();
    metrics.domainMetrics.forEach(dm => {
      dm.subcategoryMetrics.forEach(sm => {
        if (sm.ownershipType) types.add(sm.ownershipType);
      });
    });
    return Array.from(types).sort();
  }, [metrics]);

  // Helper function to determine status
  const getStatus = (coverage: number, score: number) => {
    if (coverage < 0.5) return 'incomplete';
    if (score < 0.5) return 'at-risk';
    return 'on-track';
  };

  // Filtered and sorted domain metrics
  const filteredDomainMetrics = useMemo(() => {
    let filtered = metrics.domainMetrics.filter(dm => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesDomain = dm.domainName.toLowerCase().includes(search);
        const matchesSubcat = dm.subcategoryMetrics.some(sm => 
          sm.subcatName.toLowerCase().includes(search)
        );
        if (!matchesDomain && !matchesSubcat) return false;
      }

      if (statusFilter !== 'all') {
        const status = getStatus(dm.coverage, dm.score);
        if (status !== statusFilter) return false;
      }

      if (ownershipFilter !== 'all') {
        const hasOwnership = dm.subcategoryMetrics.some(sm => 
          sm.ownershipType === ownershipFilter
        );
        if (!hasOwnership) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.domainName.localeCompare(b.domainName);
          break;
        case 'coverage':
          comparison = a.coverage - b.coverage;
          break;
        case 'maturity':
          comparison = a.score - b.score;
          break;
        case 'gaps':
          comparison = a.criticalGaps - b.criticalGaps;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [metrics.domainMetrics, searchTerm, statusFilter, ownershipFilter, sortField, sortOrder]);

  // Framework coverage filtered by selected frameworks
  const filteredFrameworkCoverage = useMemo(() => {
    // Map framework IDs to display names
    const frameworkIdToName: Record<string, string> = {
      'NIST_AI_RMF': 'NIST AI RMF',
      'ISO_27001_27002': 'ISO/IEC 27001 / 27002',
      'ISO_23894': 'ISO/IEC 23894',
      'LGPD': 'LGPD',
      'NIST_SSDF': 'NIST SSDF',
      'CSA_CCM': 'CSA AI Security',
      'CSA_AI': 'CSA AI Security',
      'OWASP_LLM': 'OWASP Top 10 for LLM Applications',
      'OWASP_API': 'OWASP API Security Top 10'
    };
    
    // Use enabled frameworks as default when no specific selection
    const effectiveFrameworkIds = selectedFrameworkIds.length > 0 
      ? selectedFrameworkIds 
      : enabledFrameworks.map(f => f.frameworkId);
    
    // Get the display names for selected/enabled frameworks
    const selectedFrameworkNames = new Set(
      effectiveFrameworkIds.map(id => frameworkIdToName[id]).filter(Boolean)
    );
    
    // Filter by selected frameworks
    let filtered = frameworkCoverage.filter(fw => 
      selectedFrameworkNames.has(fw.framework)
    );
    
    // Also apply search term if present
    if (searchTerm) {
      filtered = filtered.filter(fw => 
        fw.framework.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [frameworkCoverage, searchTerm, selectedFrameworkIds, enabledFrameworks]);

  // Summary stats for quick view
  const quickStats = useMemo(() => ({
    totalDomains: metrics.domainMetrics.length,
    incompleteCount: metrics.domainMetrics.filter(dm => getStatus(dm.coverage, dm.score) === 'incomplete').length,
    atRiskCount: metrics.domainMetrics.filter(dm => getStatus(dm.coverage, dm.score) === 'at-risk').length,
    onTrackCount: metrics.domainMetrics.filter(dm => getStatus(dm.coverage, dm.score) === 'on-track').length,
    criticalGapsCount: criticalGaps.length,
    frameworksCount: frameworkCoverage.length,
  }), [metrics.domainMetrics, criticalGaps, frameworkCoverage]);

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

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOwnershipFilter('all');
    setSortField('gaps');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || ownershipFilter !== 'all';

  const ownershipData = metrics.ownershipMetrics.map(om => ({
    name: om.ownershipType,
    score: Math.round(om.score * 100),
    coverage: Math.round(om.coverage * 100),
    total: om.totalQuestions,
    answered: om.answeredQuestions,
  }));

  // Get detailed ownership info for selected owner
  const selectedOwnershipDetails = useMemo(() => {
    if (!selectedOwnership) return null;
    
    const ownerMetric = metrics.ownershipMetrics.find(om => om.ownershipType === selectedOwnership);
    if (!ownerMetric) return null;

    // Get all subcategories for this owner
    const subcategories = metrics.domainMetrics
      .flatMap(dm => dm.subcategoryMetrics.map(sm => ({ ...sm, domainName: dm.domainName })))
      .filter(sm => sm.ownershipType === selectedOwnership);

    // Get gaps for this owner
    const gaps = criticalGaps.filter(g => g.ownershipType === selectedOwnership);

    // Get domains with this ownership
    const domains = metrics.domainMetrics.filter(dm => 
      dm.subcategoryMetrics.some(sm => sm.ownershipType === selectedOwnership)
    );

    // Calculate additional metrics
    const criticalCount = gaps.filter(g => g.criticality === 'Critical').length;
    const highCount = gaps.filter(g => g.criticality === 'High').length;
    const pendingQuestions = ownerMetric.totalQuestions - ownerMetric.answeredQuestions;

    return {
      name: selectedOwnership,
      score: Math.round(ownerMetric.score * 100),
      coverage: Math.round(ownerMetric.coverage * 100),
      totalQuestions: ownerMetric.totalQuestions,
      answeredQuestions: ownerMetric.answeredQuestions,
      pendingQuestions,
      totalGaps: gaps.length,
      criticalCount,
      highCount,
      subcategories: subcategories.sort((a, b) => a.score - b.score),
      gaps: gaps.slice(0, 10),
      domains,
    };
  }, [selectedOwnership, metrics, criticalGaps]);

  // Map framework IDs to their category IDs
  const frameworkIdToCategoryId: Record<string, FrameworkCategoryId> = {
    'NIST_AI_RMF': 'NIST_AI_RMF',
    'ISO_27001_27002': 'SECURITY_BASELINE',
    'ISO_23894': 'AI_RISK_MGMT',
    'LGPD': 'PRIVACY_LGPD',
    'NIST_SSDF': 'SECURE_DEVELOPMENT',
    'CSA_CCM': 'SECURE_DEVELOPMENT',
    'CSA_AI': 'SECURE_DEVELOPMENT',
    'OWASP_LLM': 'THREAT_EXPOSURE',
    'OWASP_API': 'THREAT_EXPOSURE'
  };

  // Get selected category IDs based on selected frameworks
  const selectedCategoryIds = useMemo(() => {
    const effectiveFrameworkIds = selectedFrameworkIds.length > 0 
      ? selectedFrameworkIds 
      : enabledFrameworks.map(f => f.frameworkId);
    
    const categoryIds = new Set<FrameworkCategoryId>();
    effectiveFrameworkIds.forEach(fwId => {
      const categoryId = frameworkIdToCategoryId[fwId];
      if (categoryId) categoryIds.add(categoryId);
    });
    return categoryIds;
  }, [selectedFrameworkIds, enabledFrameworks]);

  const frameworkCategoryData = metrics.frameworkCategoryMetrics
    .filter(fc => fc.totalQuestions > 0 && selectedCategoryIds.has(fc.categoryId))
    .map(fc => ({
      categoryId: fc.categoryId,
      name: frameworkCategoryLabels[fc.categoryId] || fc.categoryId,
      score: Math.round(fc.score * 100),
      coverage: Math.round(fc.coverage * 100),
      totalQuestions: fc.totalQuestions,
      answeredQuestions: fc.answeredQuestions,
      color: frameworkCategoryColors[fc.categoryId] || 'hsl(var(--primary))',
      maturityLevel: fc.maturityLevel,
    }));

  // Selected domain details for modal
  const selectedDomainDetails = useMemo(() => {
    if (!selectedDomain) return null;

    const domainMetrics = metrics.domainMetrics.find(dm => dm.domainId === selectedDomain);
    if (!domainMetrics) return null;

    const domainData = domains.find(d => d.domainId === selectedDomain);

    // Get all questions for this domain
    const domainQuestions = questionsForDashboard.filter(q => q.domainId === selectedDomain);

    // Calculate question-level details
    const questionDetails = domainQuestions.map(q => {
      const answer = answers.get(q.questionId);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        subcatId: q.subcatId,
        ownershipType: q.ownershipType,
        response: answer?.response || 'Não respondido',
      };
    });

    // Calculate response breakdown
    const responseBreakdown = {
      Sim: questionDetails.filter(q => q.response === 'Sim').length,
      Parcial: questionDetails.filter(q => q.response === 'Parcial').length,
      Não: questionDetails.filter(q => q.response === 'Não').length,
      NA: questionDetails.filter(q => q.response === 'NA').length,
      'Não respondido': questionDetails.filter(q => q.response === 'Não respondido').length,
    };

    // Get gaps for this domain
    const domainGaps = criticalGaps.filter(g => g.domainId === selectedDomain);

    // Group gaps by criticality
    const gapsByCriticality = {
      Critical: domainGaps.filter(g => g.criticality === 'Critical').length,
      High: domainGaps.filter(g => g.criticality === 'High').length,
      Medium: domainGaps.filter(g => g.criticality === 'Medium').length,
      Low: domainGaps.filter(g => g.criticality === 'Low').length,
    };

    return {
      ...domainMetrics,
      description: domainData?.description || '',
      questions: questionDetails,
      responseBreakdown,
      gaps: domainGaps,
      gapsByCriticality,
    };
  }, [selectedDomain, metrics.domainMetrics, domains, questionsForDashboard, answers, criticalGaps]);

  // Selected framework category details for modal
  const selectedFrameworkCategoryDetails = useMemo(() => {
    if (!selectedFrameworkCategory) return null;

    const categoryData = frameworkCategoryData.find(fc => fc.categoryId === selectedFrameworkCategory);
    if (!categoryData) return null;

    // Get questions for this category
    const categoryQuestions = questionsForDashboard.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      return questionFrameworkIds.some(fwId => {
        const catId = frameworkIdToCategoryId[fwId];
        return catId === selectedFrameworkCategory;
      });
    });

    // Calculate question details
    const questionDetails = categoryQuestions.map(q => {
      const answer = answers.get(q.questionId);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        response: answer?.response || 'Não respondido',
      };
    });

    // Response breakdown
    const responseBreakdown = {
      Sim: questionDetails.filter(q => q.response === 'Sim').length,
      Parcial: questionDetails.filter(q => q.response === 'Parcial').length,
      Não: questionDetails.filter(q => q.response === 'Não').length,
      NA: questionDetails.filter(q => q.response === 'NA').length,
      'Não respondido': questionDetails.filter(q => q.response === 'Não respondido').length,
    };

    // Get gaps for this category
    const categoryGaps = criticalGaps.filter(g => {
      const question = questionsForDashboard.find(q => q.questionId === g.questionId);
      if (!question) return false;
      const questionFrameworkIds = getQuestionFrameworkIds(question.frameworks);
      return questionFrameworkIds.some(fwId => {
        const catId = frameworkIdToCategoryId[fwId];
        return catId === selectedFrameworkCategory;
      });
    });

    return {
      ...categoryData,
      questions: questionDetails,
      responseBreakdown,
      gaps: categoryGaps,
    };
  }, [selectedFrameworkCategory, frameworkCategoryData, questionsForDashboard, answers, criticalGaps, frameworkIdToCategoryId]);

  // Selected individual framework details for modal
  const selectedFrameworkDetails = useMemo(() => {
    if (!selectedFramework) return null;

    const fwCoverage = filteredFrameworkCoverage.find(fw => fw.framework === selectedFramework);
    if (!fwCoverage) return null;

    // Get questions for this framework
    const frameworkQuestions = questionsForDashboard.filter(q => {
      return q.frameworks?.some(f => 
        f === selectedFramework || 
        selectedFramework.includes(f) || 
        f.includes(selectedFramework.split(' ')[0])
      );
    });

    // Calculate question details
    const questionDetails = frameworkQuestions.map(q => {
      const answer = answers.get(q.questionId);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        domainId: q.domainId,
        response: answer?.response || 'Não respondido',
      };
    });

    // Response breakdown
    const responseBreakdown = {
      Sim: questionDetails.filter(q => q.response === 'Sim').length,
      Parcial: questionDetails.filter(q => q.response === 'Parcial').length,
      Não: questionDetails.filter(q => q.response === 'Não').length,
      NA: questionDetails.filter(q => q.response === 'NA').length,
      'Não respondido': questionDetails.filter(q => q.response === 'Não respondido').length,
    };

    // Get gaps
    const frameworkGaps = criticalGaps.filter(g => {
      const question = questionsForDashboard.find(q => q.questionId === g.questionId);
      if (!question) return false;
      return question.frameworks?.some(f => 
        f === selectedFramework || 
        selectedFramework.includes(f) || 
        f.includes(selectedFramework.split(' ')[0])
      );
    });

    return {
      name: selectedFramework,
      score: fwCoverage.averageScore,
      coverage: fwCoverage.coverage,
      totalQuestions: fwCoverage.totalQuestions,
      answeredQuestions: fwCoverage.answeredQuestions,
      questions: questionDetails,
      responseBreakdown,
      gaps: frameworkGaps,
    };
  }, [selectedFramework, filteredFrameworkCoverage, questionsForDashboard, answers, criticalGaps]);

  if (isLoading || questionsLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard GRC</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Governança, Riscos e Compliance - Foco em cobertura e evidências
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reports')}
          >
            Exportar Relatório
          </Button>
        </div>
      </div>

      {answers.size === 0 && (
        <div className="card-elevated p-6 text-center">
          <p className="text-muted-foreground">Nenhuma avaliação realizada ainda.</p>
        </div>
      )}

      {/* Framework Selection Section */}
      <div className="card-elevated p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-medium text-sm">Escopo da Análise</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedFrameworkIds.length === 0 
                ? `Todos os ${enabledFrameworks.length} frameworks habilitados`
                : `${selectedFrameworkIds.length} de ${enabledFrameworks.length} frameworks selecionados`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={clearFrameworkSelection}
              disabled={selectedFrameworkIds.length === 0}
            >
              Limpar Seleção
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Selecionar Frameworks
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-popover" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Frameworks Habilitados</h4>
                    <span className="text-xs text-muted-foreground">
                      {enabledFrameworks.length} disponíveis
                    </span>
                  </div>
                  
                  {Object.entries(frameworksByCategory).map(([category, frameworks]) => (
                    frameworks.length > 0 && (
                      <div key={category}>
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">
                          {categoryLabels[category]}
                        </h5>
                        <div className="space-y-2">
                          {frameworks.map(fw => (
                            <div 
                              key={fw.frameworkId}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                id={`grc-${fw.frameworkId}`}
                                checked={selectedFrameworkIds.includes(fw.frameworkId)}
                                onCheckedChange={() => toggleFramework(fw.frameworkId)}
                              />
                              <label 
                                htmlFor={`grc-${fw.frameworkId}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {fw.shortName}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Framework Pills */}
        <div className="flex flex-wrap gap-2">
          {enabledFrameworks.map(fw => {
            const isSelected = selectedFrameworkIds.length === 0 || selectedFrameworkIds.includes(fw.frameworkId);
            return (
              <Badge
                key={fw.frameworkId}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all text-xs",
                  !isSelected && "opacity-50 hover:opacity-75"
                )}
                onClick={() => toggleFramework(fw.frameworkId)}
              >
                {fw.shortName}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Quick Status Pills */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setStatusFilter('all')}
        >
          Todos ({quickStats.totalDomains})
        </Badge>
        <Badge 
          variant={statusFilter === 'incomplete' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            statusFilter !== 'incomplete' && "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          )}
          onClick={() => setStatusFilter('incomplete')}
        >
          Incompletos ({quickStats.incompleteCount})
        </Badge>
        <Badge 
          variant={statusFilter === 'at-risk' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            statusFilter !== 'at-risk' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
          )}
          onClick={() => setStatusFilter('at-risk')}
        >
          Em Risco ({quickStats.atRiskCount})
        </Badge>
        <Badge 
          variant={statusFilter === 'on-track' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            statusFilter !== 'on-track' && "bg-green-50 text-green-700 hover:bg-green-100 border-green-300"
          )}
          onClick={() => setStatusFilter('on-track')}
        >
          Adequados ({quickStats.onTrackCount})
        </Badge>
      </div>

      {/* GRC KPI Cards */}
      <div className="stats-grid">
        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Cobertura Geral</div>
            <CoverageHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.coverage * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            {metrics.answeredQuestions} de {metrics.totalQuestions}
          </div>
        </div>

        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Prontidão de Evidências</div>
            <EvidenceReadinessHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.evidenceReadiness * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            Para auditoria
          </div>
        </div>

        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Score Geral</div>
            <MaturityScoreHelp />
          </div>
          <div className="kpi-value" style={{ color: metrics.maturityLevel.color }}>
            {Math.round(metrics.overallScore * 100)}%
          </div>
          <div className={cn("maturity-badge mt-2", `maturity-${metrics.maturityLevel.level}`)}>
            {metrics.maturityLevel.name}
          </div>
        </div>

        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
          <div className="kpi-label">Gaps Críticos</div>
          <div className="kpi-value text-destructive">
            {quickStats.criticalGapsCount}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Requerem ação imediata
          </div>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">Por Domínio</TabsTrigger>
          <TabsTrigger value="frameworks">Por Framework</TabsTrigger>
          <TabsTrigger value="gaps">Gaps Críticos</TabsTrigger>
          <TabsTrigger value="ownership">Por Responsável</TabsTrigger>
        </TabsList>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar domínios ou subcategorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos Responsáveis</SelectItem>
                {ownershipTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="gaps">Gaps</SelectItem>
                <SelectItem value="coverage">Cobertura</SelectItem>
                <SelectItem value="maturity">Maturidade</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredDomainMetrics.length} de {metrics.domainMetrics.length} domínios
          </div>

          {/* Domain Cards with Expandable Subcategories */}
          <div className="space-y-3">
            {filteredDomainMetrics.map((dm, idx) => {
              const status = getStatus(dm.coverage, dm.score);
              const isExpanded = expandedDomains.has(dm.domainId);
              
              // Filter subcategories based on ownership if filter is active
              const filteredSubcats = ownershipFilter !== 'all'
                ? dm.subcategoryMetrics.filter(sm => sm.ownershipType === ownershipFilter)
                : dm.subcategoryMetrics;

              return (
                <Collapsible 
                  key={dm.domainId}
                  open={isExpanded}
                  onOpenChange={() => toggleDomainExpanded(dm.domainId)}
                >
                  <div 
                    className="card-elevated overflow-hidden animate-in fade-in-0 slide-in-from-left-4 duration-400"
                    style={{ animationDelay: `${500 + idx * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-left">
                            <h4 className="font-medium">{dm.domainName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                {dm.nistFunction || '-'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {dm.totalQuestions} perguntas
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          {/* Coverage */}
                          <div className="text-center min-w-[80px]">
                            <div className="text-xs text-muted-foreground mb-1">Cobertura</div>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500" 
                                  style={{ width: `${dm.coverage * 100}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs">{Math.round(dm.coverage * 100)}%</span>
                            </div>
                          </div>

                          {/* Maturity */}
                          <div className="text-center min-w-[80px]">
                            <div className="text-xs text-muted-foreground mb-1">Maturidade</div>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full" 
                                  style={{ 
                                    width: `${dm.score * 100}%`,
                                    backgroundColor: dm.maturityLevel.color 
                                  }}
                                />
                              </div>
                              <span className="font-mono text-xs">{Math.round(dm.score * 100)}%</span>
                            </div>
                          </div>

                          {/* Gaps */}
                          <div className="text-center min-w-[60px]">
                            <div className="text-xs text-muted-foreground mb-1">Gaps</div>
                            <span className={cn(
                              "font-mono text-sm font-medium",
                              dm.criticalGaps > 0 ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {dm.criticalGaps}
                            </span>
                          </div>

                          {/* Status */}
                          <span className={cn(
                            "text-xs px-2 py-1 rounded min-w-[80px] text-center",
                            status === 'incomplete' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            status === 'at-risk' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          )}>
                            {status === 'incomplete' ? 'Incompleto' :
                             status === 'at-risk' ? 'Em Risco' : 'Adequado'}
                          </span>

                          {/* Expand indicator */}
                          <span className="text-muted-foreground">
                            {isExpanded ? '−' : '+'}
                          </span>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-border bg-muted/30 p-4">
                        <div className="grid gap-2">
                          {filteredSubcats.map(sm => (
                            <div 
                              key={sm.subcatId}
                              className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{sm.subcatName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {sm.ownershipType || 'GRC'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    · {sm.answeredQuestions}/{sm.totalQuestions} perguntas
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={cn("criticality-badge", `criticality-${sm.criticality.toLowerCase()}`)}>
                                  {sm.criticality}
                                </span>
                                <span 
                                  className="font-mono text-sm min-w-[40px] text-right"
                                  style={{ color: sm.maturityLevel.color }}
                                >
                                  {Math.round(sm.score * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </TabsContent>

        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4">
          <div className="filter-bar">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar frameworks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Framework Categories */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Maturidade por Categoria</h3>
              <p className="text-xs text-muted-foreground mb-3">Clique para ver detalhes</p>
              <div className="space-y-4">
                {frameworkCategoryData.map((fc, idx) => {
                  const status = fc.coverage < 50 ? 'incomplete' : 
                                 fc.score < 50 ? 'at-risk' : 'on-track';
                  return (
                    <div 
                      key={fc.categoryId} 
                      className="p-3 border border-border rounded-lg animate-in fade-in-0 slide-in-from-right-4 duration-400 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                      style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                      onClick={() => setSelectedFrameworkCategory(fc.categoryId)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{fc.name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          status === 'incomplete' ? 'bg-gray-100 text-gray-700' :
                          status === 'at-risk' ? 'bg-red-100 text-red-700' :
                          'bg-green-100 text-green-700'
                        )}>
                          {status === 'incomplete' ? 'Incompleto' :
                           status === 'at-risk' ? 'Em Risco' : 'Adequado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">Cobertura</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${fc.coverage}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs w-10">{fc.coverage}%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">Maturidade</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full" 
                                style={{ 
                                  width: `${fc.score}%`,
                                  backgroundColor: fc.maturityLevel.color 
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-10">{fc.score}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {fc.answeredQuestions}/{fc.totalQuestions} perguntas respondidas
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Frameworks */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Cobertura por Framework ({filteredFrameworkCoverage.length})</h3>
              <p className="text-xs text-muted-foreground mb-3">Clique para ver detalhes</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredFrameworkCoverage.map((fw, idx) => (
                  <div 
                    key={fw.framework} 
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded transition-colors animate-in fade-in-0 duration-300 cursor-pointer"
                    style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'backwards' }}
                    onClick={() => setSelectedFramework(fw.framework)}
                  >
                    <span className="text-sm truncate flex-1 mr-2" title={fw.framework}>
                      {fw.framework}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {fw.answeredQuestions}/{fw.totalQuestions}
                      </span>
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${fw.averageScore * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm w-10 text-right">
                        {Math.round(fw.averageScore * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Critical Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Gaps Críticos que Requerem Ação</h3>
              <span className="text-sm text-muted-foreground">
                {criticalGaps.length} itens identificados
              </span>
            </div>
            
            {criticalGaps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum gap crítico identificado. Continue o assessment para uma análise completa.
              </div>
            ) : (
              <div className="space-y-3">
                {criticalGaps.slice(0, 20).map((gap, index) => (
                  <div 
                    key={gap.questionId}
                    className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            #{index + 1}
                          </span>
                          <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                            {gap.criticality}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{gap.questionText}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{gap.subcatName}</span>
                          <span>·</span>
                          <span>{gap.ownershipType}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/assessment?questionId=${gap.questionId}`)}
                      >
                        Revisar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Ownership Tab */}
        <TabsContent value="ownership" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Maturidade por Responsável</h3>
              <p className="text-xs text-muted-foreground mb-4">Clique para ver detalhes</p>
              <div className="space-y-4">
                {ownershipData.map((od, idx) => (
                  <div 
                    key={od.name}
                    className="p-3 border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors animate-in fade-in-0 slide-in-from-left-4 duration-400"
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                    onClick={() => setSelectedOwnership(od.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{od.name}</span>
                      <span className="font-mono text-sm">{od.score}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${od.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-24">
                        {od.answered}/{od.total} resp.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Subcategorias com Baixa Prontidão</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {metrics.domainMetrics
                  .flatMap(dm => dm.subcategoryMetrics)
                  .filter(sm => sm.answeredQuestions > 0 && sm.score < 0.7)
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 15)
                  .map((sm, idx) => (
                    <div 
                      key={sm.subcatId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg animate-in fade-in-0 duration-300"
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sm.subcatName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sm.ownershipType || 'GRC'} · {sm.answeredQuestions}/{sm.totalQuestions} perguntas
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("criticality-badge", `criticality-${sm.criticality.toLowerCase()}`)}>
                          {sm.criticality}
                        </span>
                        <span 
                          className="font-mono text-sm"
                          style={{ color: sm.maturityLevel.color }}
                        >
                          {Math.round(sm.score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Ownership Details Dialog */}
      <Dialog open={!!selectedOwnership} onOpenChange={(open) => !open && setSelectedOwnership(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Detalhes: {selectedOwnershipDetails?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedOwnershipDetails && (
            <div className="space-y-6 mt-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold" style={{ color: selectedOwnershipDetails.score >= 70 ? 'hsl(var(--chart-2))' : selectedOwnershipDetails.score >= 50 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))' }}>
                    {selectedOwnershipDetails.score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedOwnershipDetails.coverage}%
                  </div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold">
                    {selectedOwnershipDetails.answeredQuestions}
                  </div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {selectedOwnershipDetails.pendingQuestions}
                  </div>
                  <div className="text-xs text-muted-foreground">Pendentes</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progresso do Assessment</span>
                  <span className="font-mono">{selectedOwnershipDetails.answeredQuestions}/{selectedOwnershipDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedOwnershipDetails.coverage} className="h-2" />
              </div>

              {/* Gaps Summary */}
              {selectedOwnershipDetails.totalGaps > 0 && (
                <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                  <h4 className="font-medium mb-3">Gaps Identificados ({selectedOwnershipDetails.totalGaps})</h4>
                  <div className="flex items-center gap-4 mb-4">
                    {selectedOwnershipDetails.criticalCount > 0 && (
                      <Badge variant="destructive">{selectedOwnershipDetails.criticalCount} Críticos</Badge>
                    )}
                    {selectedOwnershipDetails.highCount > 0 && (
                      <Badge className="bg-orange-500">{selectedOwnershipDetails.highCount} Altos</Badge>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedOwnershipDetails.gaps.map((gap, idx) => (
                      <div 
                        key={gap.questionId}
                        className="flex items-start justify-between gap-2 p-2 bg-background rounded border border-border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                          </div>
                          <p className="text-sm">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedOwnership(null);
                            navigate(`/assessment?questionId=${gap.questionId}`);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subcategories */}
              <div>
                <h4 className="font-medium mb-3">Subcategorias ({selectedOwnershipDetails.subcategories.length})</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {selectedOwnershipDetails.subcategories.map(sm => (
                    <div 
                      key={sm.subcatId}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{sm.subcatName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sm.domainName} · {sm.answeredQuestions}/{sm.totalQuestions} perguntas
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("criticality-badge", `criticality-${sm.criticality.toLowerCase()}`)}>
                          {sm.criticality}
                        </span>
                        <span 
                          className="font-mono text-sm min-w-[40px] text-right"
                          style={{ color: sm.maturityLevel.color }}
                        >
                          {Math.round(sm.score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setOwnershipFilter(selectedOwnershipDetails.name);
                    setSelectedOwnership(null);
                  }}
                >
                  Filtrar Dashboard por {selectedOwnershipDetails.name}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Framework Category Details Modal */}
      <Dialog open={!!selectedFrameworkCategory} onOpenChange={(open) => !open && setSelectedFrameworkCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedFrameworkCategoryDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedFrameworkCategoryDetails.color }}
                  >
                    {selectedFrameworkCategoryDetails.score}%
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedFrameworkCategoryDetails.name}</DialogTitle>
                    <DialogDescription className="text-left">
                      Categoria de Framework · {selectedFrameworkCategoryDetails.maturityLevel.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: selectedFrameworkCategoryDetails.color }}>
                    {selectedFrameworkCategoryDetails.score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{selectedFrameworkCategoryDetails.coverage}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{selectedFrameworkCategoryDetails.answeredQuestions}/{selectedFrameworkCategoryDetails.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{selectedFrameworkCategoryDetails.gaps.length}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Response Breakdown */}
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Distribuição de Respostas</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedFrameworkCategoryDetails.responseBreakdown).map(([key, value]) => (
                    value > 0 && (
                      <div 
                        key={key} 
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          key === 'Sim' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          key === 'Parcial' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          key === 'Não' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          key === 'NA' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          key === 'Não respondido' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {key}: {value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Gaps List */}
              {selectedFrameworkCategoryDetails.gaps.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">
                    Gaps Identificados ({selectedFrameworkCategoryDetails.gaps.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFrameworkCategoryDetails.gaps.slice(0, 15).map((gap) => (
                      <div 
                        key={gap.questionId} 
                        className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedFrameworkCategory(null);
                            navigate(`/assessment?questionId=${gap.questionId}`);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedFrameworkCategory(null)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual Framework Details Modal */}
      <Dialog open={!!selectedFramework} onOpenChange={(open) => !open && setSelectedFramework(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedFrameworkDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold bg-primary">
                    {Math.round(selectedFrameworkDetails.score * 100)}%
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedFrameworkDetails.name}</DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedFrameworkDetails.answeredQuestions} de {selectedFrameworkDetails.totalQuestions} perguntas
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(selectedFrameworkDetails.score * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{Math.round(selectedFrameworkDetails.coverage * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{selectedFrameworkDetails.answeredQuestions}/{selectedFrameworkDetails.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{selectedFrameworkDetails.gaps.length}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso da Avaliação</span>
                  <span className="font-medium">{selectedFrameworkDetails.answeredQuestions} de {selectedFrameworkDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedFrameworkDetails.coverage * 100} className="h-2" />
              </div>

              {/* Response Breakdown */}
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Distribuição de Respostas</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedFrameworkDetails.responseBreakdown).map(([key, value]) => (
                    value > 0 && (
                      <div 
                        key={key} 
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          key === 'Sim' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          key === 'Parcial' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          key === 'Não' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          key === 'NA' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          key === 'Não respondido' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {key}: {value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Gaps List */}
              {selectedFrameworkDetails.gaps.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">
                    Gaps Identificados ({selectedFrameworkDetails.gaps.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFrameworkDetails.gaps.slice(0, 15).map((gap) => (
                      <div 
                        key={gap.questionId} 
                        className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedFramework(null);
                            navigate(`/assessment?questionId=${gap.questionId}`);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedFramework(null)}>
                  Fechar
                </Button>
                {selectedFrameworkDetails.questions.length > 0 && (
                  <Button 
                    onClick={() => {
                      setSelectedFramework(null);
                      navigate(`/assessment?questionId=${selectedFrameworkDetails.questions[0].questionId}`);
                    }}
                  >
                    Iniciar Avaliação
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
