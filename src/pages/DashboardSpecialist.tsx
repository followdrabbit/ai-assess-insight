import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { domains, maturityLevels, FrameworkCategoryId } from '@/lib/dataset';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, ActiveQuestion } from '@/lib/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { useMaturitySnapshots } from '@/hooks/useMaturitySnapshots';
import MaturityTrendChart from '@/components/MaturityTrendChart';
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
import { questions as defaultQuestions } from '@/lib/dataset';
import { getAllCustomQuestions, getDisabledQuestions, getEnabledFrameworks, getSelectedFrameworks, setSelectedFrameworks, getAllCustomFrameworks } from '@/lib/database';
import { frameworks as defaultFrameworks, Framework, getQuestionFrameworkIds } from '@/lib/frameworks';
import { downloadHtmlReport } from '@/lib/htmlReportExport';

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

type CriticalityFilter = 'all' | 'Critical' | 'High' | 'Medium' | 'Low';
type ResponseFilter = 'all' | 'Não' | 'Parcial' | 'Não respondido';
type SortField = 'criticality' | 'score' | 'subcategory' | 'domain';
type SortOrder = 'asc' | 'desc';

const criticalityOrder: Record<string, number> = {
  'Critical': 4,
  'High': 3,
  'Medium': 2,
  'Low': 1,
};

export default function DashboardSpecialist() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  // Initialize snapshot capturing
  useMaturitySnapshots();

  // Framework states
  const [allActiveQuestions, setAllActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [enabledFrameworks, setEnabledFrameworks] = useState<Framework[]>([]);
  const [enabledFrameworkIds, setEnabledFrameworkIds] = useState<string[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState<CriticalityFilter>('all');
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('criticality');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedHeatmapDomain, setSelectedHeatmapDomain] = useState<string>('all');
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set());
  const [selectedResponseType, setSelectedResponseType] = useState<string | null>(null);
  const [selectedCriticality, setSelectedCriticality] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedFrameworkCategory, setSelectedFrameworkCategory] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

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

  // Refresh on visibility (with rate limiting)
  useEffect(() => {
    let lastLoadTime = Date.now();
    const MIN_RELOAD_INTERVAL = 30000; // 30 seconds minimum between reloads

    const shouldReload = () => {
      const now = Date.now();
      if (now - lastLoadTime >= MIN_RELOAD_INTERVAL) {
        lastLoadTime = now;
        return true;
      }
      return false;
    };

    const onVisibility = () => {
      if (!document.hidden && shouldReload()) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
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
  const allCriticalGaps = useMemo(() => getCriticalGaps(answers, 0.5, questionsForDashboard), [answers, questionsForDashboard]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers, questionsForDashboard), [answers, questionsForDashboard]);

  // Response distribution for pie chart
  const responseDistribution = useMemo(() => {
    const dist = { Sim: 0, Parcial: 0, Não: 0, NA: 0, 'Não respondido': 0 };
    const allQuestions = metrics.totalQuestions;
    
    answers.forEach(a => {
      if (a.response && dist[a.response as keyof typeof dist] !== undefined) {
        dist[a.response as keyof typeof dist]++;
      }
    });
    dist['Não respondido'] = allQuestions - answers.size;

    return [
      { name: 'Sim', value: dist.Sim, color: 'hsl(142, 71%, 45%)', responseKey: 'Sim' },
      { name: 'Parcial', value: dist.Parcial, color: 'hsl(45, 93%, 47%)', responseKey: 'Parcial' },
      { name: 'Não', value: dist.Não, color: 'hsl(0, 72%, 51%)', responseKey: 'Não' },
      { name: 'N/A', value: dist.NA, color: 'hsl(220, 9%, 46%)', responseKey: 'NA' },
      { name: 'Pendente', value: dist['Não respondido'], color: 'hsl(220, 15%, 80%)', responseKey: 'Não respondido' },
    ].filter(d => d.value > 0);
  }, [answers, metrics.totalQuestions]);

  // Selected response type details for modal
  const selectedResponseDetails = useMemo(() => {
    if (!selectedResponseType) return null;

    const responseInfo = responseDistribution.find(r => r.responseKey === selectedResponseType);
    if (!responseInfo) return null;

    // Get questions matching this response type
    const matchingQuestions = questionsForDashboard.map(q => {
      const answer = answers.get(q.questionId);
      const response = answer?.response || 'Não respondido';
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        subcatId: q.subcatId,
        domainId: q.domainId,
        ownershipType: q.ownershipType,
        response,
        evidenceOk: answer?.evidenceOk || null,
        notes: answer?.notes || null,
      };
    }).filter(q => q.response === selectedResponseType);

    // Group by domain
    const byDomain: Record<string, typeof matchingQuestions> = {};
    matchingQuestions.forEach(q => {
      const domainData = domains.find(d => d.domainId === q.domainId);
      const domainName = domainData?.domainName || q.domainId;
      if (!byDomain[domainName]) byDomain[domainName] = [];
      byDomain[domainName].push(q);
    });

    // Group by criticality (from gaps if available)
    const criticalityBreakdown = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    matchingQuestions.forEach(q => {
      const gap = allCriticalGaps.find(g => g.questionId === q.questionId);
      if (gap) {
        criticalityBreakdown[gap.criticality as keyof typeof criticalityBreakdown]++;
      }
    });

    return {
      name: responseInfo.name,
      responseKey: responseInfo.responseKey,
      color: responseInfo.color,
      count: responseInfo.value,
      percent: metrics.totalQuestions > 0 ? (responseInfo.value / metrics.totalQuestions) * 100 : 0,
      questions: matchingQuestions,
      byDomain,
      criticalityBreakdown,
    };
  }, [selectedResponseType, responseDistribution, questionsForDashboard, answers, domains, allCriticalGaps, metrics.totalQuestions]);

  // Selected criticality details for modal
  const selectedCriticalityDetails = useMemo(() => {
    if (!selectedCriticality) return null;

    const criticalityGaps = allCriticalGaps.filter(g => g.criticality === selectedCriticality);
    if (criticalityGaps.length === 0) return null;

    // Group by domain
    const byDomain: Record<string, typeof criticalityGaps> = {};
    criticalityGaps.forEach(g => {
      const domainData = domains.find(d => d.domainId === g.domainId);
      const domainName = domainData?.domainName || g.domainId;
      if (!byDomain[domainName]) byDomain[domainName] = [];
      byDomain[domainName].push(g);
    });

    // Group by response
    const byResponse = {
      'Não': criticalityGaps.filter(g => g.response === 'Não').length,
      'Parcial': criticalityGaps.filter(g => g.response === 'Parcial').length,
      'Não respondido': criticalityGaps.filter(g => g.response === 'Não respondido').length,
    };

    // Get color
    const colorMap: Record<string, string> = {
      'Critical': 'hsl(0, 72%, 51%)',
      'High': 'hsl(25, 95%, 53%)',
      'Medium': 'hsl(217, 91%, 60%)',
      'Low': 'hsl(220, 9%, 46%)',
    };

    return {
      criticality: selectedCriticality,
      color: colorMap[selectedCriticality] || 'hsl(220, 9%, 46%)',
      count: criticalityGaps.length,
      percent: allCriticalGaps.length > 0 ? (criticalityGaps.length / allCriticalGaps.length) * 100 : 0,
      gaps: criticalityGaps,
      byDomain,
      byResponse,
      domainsCount: Object.keys(byDomain).length,
    };
  }, [selectedCriticality, allCriticalGaps, domains]);

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
        evidenceOk: answer?.evidenceOk || null,
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
    const domainGaps = allCriticalGaps.filter(g => g.domainId === selectedDomain);

    // Group gaps by criticality
    const gapsByCriticality = {
      Critical: domainGaps.filter(g => g.criticality === 'Critical').length,
      High: domainGaps.filter(g => g.criticality === 'High').length,
      Medium: domainGaps.filter(g => g.criticality === 'Medium').length,
      Low: domainGaps.filter(g => g.criticality === 'Low').length,
    };

    // Group by subcategory
    const bySubcategory: Record<string, typeof domainGaps> = {};
    domainGaps.forEach(g => {
      const subcatName = g.subcatName || g.subcatId;
      if (!bySubcategory[subcatName]) bySubcategory[subcatName] = [];
      bySubcategory[subcatName].push(g);
    });

    return {
      ...domainMetrics,
      description: domainData?.description || '',
      bankingRelevance: domainData?.bankingRelevance || '',
      strategicQuestion: domainData?.strategicQuestion || '',
      questions: questionDetails,
      responseBreakdown,
      gaps: domainGaps,
      gapsByCriticality,
      bySubcategory,
    };
  }, [selectedDomain, metrics.domainMetrics, domains, questionsForDashboard, answers, allCriticalGaps]);
  // Unique domains for filter - only from filtered questions
  const domainOptions = useMemo(() => {
    const domainIds = new Set(questionsForDashboard.map(q => q.domainId));
    return domains.filter(d => domainIds.has(d.domainId)).map(d => ({ id: d.domainId, name: d.domainName }));
  }, [questionsForDashboard]);

  // Filtered and sorted gaps
  const filteredGaps = useMemo(() => {
    let filtered = allCriticalGaps.filter(gap => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!gap.questionText.toLowerCase().includes(search) &&
            !gap.subcatName.toLowerCase().includes(search) &&
            !gap.questionId.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Criticality filter
      if (criticalityFilter !== 'all' && gap.criticality !== criticalityFilter) {
        return false;
      }

      // Response filter
      if (responseFilter !== 'all' && gap.response !== responseFilter) {
        return false;
      }

      // Domain filter
      if (domainFilter !== 'all' && gap.domainId !== domainFilter) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'criticality':
          comparison = (criticalityOrder[a.criticality] || 0) - (criticalityOrder[b.criticality] || 0);
          break;
        case 'score':
          comparison = a.effectiveScore - b.effectiveScore;
          break;
        case 'subcategory':
          comparison = a.subcatName.localeCompare(b.subcatName);
          break;
        case 'domain':
          comparison = a.domainId.localeCompare(b.domainId);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allCriticalGaps, searchTerm, criticalityFilter, responseFilter, domainFilter, sortField, sortOrder]);

  // Filtered heatmap data
  const heatmapData = useMemo(() => {
    if (selectedHeatmapDomain === 'all') {
      return metrics.domainMetrics.flatMap(dm => dm.subcategoryMetrics);
    }
    const domain = metrics.domainMetrics.find(dm => dm.domainId === selectedHeatmapDomain);
    return domain ? domain.subcategoryMetrics : [];
  }, [metrics.domainMetrics, selectedHeatmapDomain]);

  // Selected subcategory details for modal
  const selectedSubcategoryDetails = useMemo(() => {
    if (!selectedSubcategory) return null;

    // Find subcategory metrics
    const subcatMetrics = metrics.domainMetrics
      .flatMap(dm => dm.subcategoryMetrics)
      .find(sm => sm.subcatId === selectedSubcategory);

    if (!subcatMetrics) return null;

    // Find domain for this subcategory
    const domainData = metrics.domainMetrics.find(dm => 
      dm.subcategoryMetrics.some(sm => sm.subcatId === selectedSubcategory)
    );

    // Get all questions for this subcategory
    const subcatQuestions = questionsForDashboard.filter(q => q.subcatId === selectedSubcategory);

    // Calculate question-level details
    const questionDetails = subcatQuestions.map(q => {
      const answer = answers.get(q.questionId);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        response: answer?.response || 'Não respondido',
        evidenceOk: answer?.evidenceOk || null,
        notes: answer?.notes || null,
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

    // Get gaps (questions with score < 0.5)
    const gaps = allCriticalGaps.filter(g => g.subcatId === selectedSubcategory);

    return {
      ...subcatMetrics,
      domainId: domainData?.domainId || '',
      domainName: domainData?.domainName || '',
      nistFunction: domainData?.nistFunction || '',
      questions: questionDetails,
      responseBreakdown,
      gaps,
      coverage: subcatMetrics.totalQuestions > 0 
        ? subcatMetrics.answeredQuestions / subcatMetrics.totalQuestions 
        : 0,
    };
  }, [selectedSubcategory, metrics.domainMetrics, questionsForDashboard, answers, allCriticalGaps]);

  // Quick stats
  const quickStats = useMemo(() => ({
    totalGaps: allCriticalGaps.length,
    criticalCount: allCriticalGaps.filter(g => g.criticality === 'Critical').length,
    highCount: allCriticalGaps.filter(g => g.criticality === 'High').length,
    notRespondedCount: allCriticalGaps.filter(g => g.response === 'Não respondido').length,
    noCount: allCriticalGaps.filter(g => g.response === 'Não').length,
    partialCount: allCriticalGaps.filter(g => g.response === 'Parcial').length,
  }), [allCriticalGaps]);

  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName.length > 15 ? dm.domainName.slice(0, 13) + '...' : dm.domainName,
    fullName: dm.domainName,
    score: Math.round(dm.score * 100),
    coverage: Math.round(dm.coverage * 100),
    level: dm.maturityLevel.level,
    color: dm.maturityLevel.color,
    nistFunction: dm.nistFunction,
  }));

  // Map framework IDs to their category IDs for filtering
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

  // Filter framework coverage by selected frameworks
  const filteredFrameworkCoverage = useMemo(() => {
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
    
    const effectiveFrameworkIds = selectedFrameworkIds.length > 0 
      ? selectedFrameworkIds 
      : enabledFrameworks.map(f => f.frameworkId);
    
    const selectedFrameworkNames = new Set(
      effectiveFrameworkIds.map(id => frameworkIdToName[id]).filter(Boolean)
    );
    
    return frameworkCoverage.filter(fw => 
      selectedFrameworkNames.has(fw.framework)
    );
  }, [frameworkCoverage, selectedFrameworkIds, enabledFrameworks]);

  // Group filtered frameworks by category for better navigation
  const groupedFrameworks = useMemo(() => {
    const groups: Record<string, typeof filteredFrameworkCoverage> = {};
    filteredFrameworkCoverage.forEach(fw => {
      const category = fw.framework.split(' ')[0] || 'Outros';
      if (!groups[category]) groups[category] = [];
      groups[category].push(fw);
    });
    return groups;
  }, [filteredFrameworkCoverage]);

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
        subcatId: q.subcatId,
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

    // Get gaps for this category
    const categoryGaps = allCriticalGaps.filter(g => {
      const question = questionsForDashboard.find(q => q.questionId === g.questionId);
      if (!question) return false;
      const questionFrameworkIds = getQuestionFrameworkIds(question.frameworks);
      return questionFrameworkIds.some(fwId => {
        const catId = frameworkIdToCategoryId[fwId];
        return catId === selectedFrameworkCategory;
      });
    });

    // Group gaps by criticality
    const gapsByCriticality = {
      Critical: categoryGaps.filter(g => g.criticality === 'Critical').length,
      High: categoryGaps.filter(g => g.criticality === 'High').length,
      Medium: categoryGaps.filter(g => g.criticality === 'Medium').length,
      Low: categoryGaps.filter(g => g.criticality === 'Low').length,
    };

    return {
      ...categoryData,
      questions: questionDetails,
      responseBreakdown,
      gaps: categoryGaps,
      gapsByCriticality,
    };
  }, [selectedFrameworkCategory, frameworkCategoryData, questionsForDashboard, answers, allCriticalGaps, frameworkIdToCategoryId]);

  // Selected individual framework details for modal
  const selectedFrameworkDetails = useMemo(() => {
    if (!selectedFramework) return null;

    const fwCoverage = filteredFrameworkCoverage.find(fw => fw.framework === selectedFramework);
    if (!fwCoverage) return null;

    // Get questions for this framework
    const frameworkQuestions = questionsForDashboard.filter(q => {
      // Match by framework name or ID
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
        subcatId: q.subcatId,
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
    const frameworkGaps = allCriticalGaps.filter(g => {
      const question = questionsForDashboard.find(q => q.questionId === g.questionId);
      if (!question) return false;
      return question.frameworks?.some(f => 
        f === selectedFramework || 
        selectedFramework.includes(f) || 
        f.includes(selectedFramework.split(' ')[0])
      );
    });

    // Group by domain
    const byDomain: Record<string, typeof frameworkGaps> = {};
    frameworkGaps.forEach(g => {
      const domainData = domains.find(d => d.domainId === g.domainId);
      const domainName = domainData?.domainName || g.domainId;
      if (!byDomain[domainName]) byDomain[domainName] = [];
      byDomain[domainName].push(g);
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
      byDomain,
    };
  }, [selectedFramework, filteredFrameworkCoverage, questionsForDashboard, answers, allCriticalGaps, domains]);

  const clearFilters = () => {
    setSearchTerm('');
    setCriticalityFilter('all');
    setResponseFilter('all');
    setDomainFilter('all');
    setSortField('criticality');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || criticalityFilter !== 'all' || responseFilter !== 'all' || domainFilter !== 'all';

  const toggleFrameworkExpanded = (category: string) => {
    setExpandedFrameworks(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Export report handler
  const handleExportReport = () => {
    // Filter enabled frameworks by selected IDs (or use all enabled if none selected)
    const effectiveIds = selectedFrameworkIds.length > 0 ? selectedFrameworkIds : enabledFrameworks.map(f => f.frameworkId);
    const selectedFrameworks = enabledFrameworks.filter(f => effectiveIds.includes(f.frameworkId));
    
    downloadHtmlReport({
      dashboardType: 'specialist',
      metrics,
      criticalGaps: filteredGaps,
      selectedFrameworks,
      frameworkCoverage,
      frameworkCategoryData,
      generatedAt: new Date(),
      responseDistribution,
      heatmapData,
      quickStats,
    });
  };

  if (isLoading || questionsLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Framework Selector */}
      <div className="card-elevated p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-primary">Dashboard Especialista - Detalhes Técnicos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Arquiteto / Engenheiro - Implementação e gaps técnicos
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportReport}
              >
                Exportar Relatório
              </Button>
            </div>
          </div>

          {/* Framework Selector */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">Frameworks em Análise</span>
              <span className="text-xs text-muted-foreground">
                ({selectedFrameworkIds.length === 0 ? 'Todos' : `${selectedFrameworkIds.length} selecionados`})
              </span>
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
                      "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md",
                      isSelected 
                        ? "bg-primary hover:bg-primary/90" 
                        : "opacity-50 hover:opacity-100 hover:border-primary/50"
                    )}
                    onClick={() => toggleFramework(fw.frameworkId)}
                  >
                    {fw.shortName}
                  </Badge>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Clique nos frameworks acima para filtrar os dados exibidos.
              {selectedFrameworkIds.length > 0 && ` (${selectedFrameworkIds.length} selecionados)`}
            </p>
          </div>
        </div>
      </div>


      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={criticalityFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setCriticalityFilter('all')}
        >
          Todos Gaps ({quickStats.totalGaps})
        </Badge>
        <Badge 
          variant={criticalityFilter === 'Critical' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            criticalityFilter !== 'Critical' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
          )}
          onClick={() => setCriticalityFilter('Critical')}
        >
          Críticos ({quickStats.criticalCount})
        </Badge>
        <Badge 
          variant={criticalityFilter === 'High' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            criticalityFilter !== 'High' && "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-300"
          )}
          onClick={() => setCriticalityFilter('High')}
        >
          Alto ({quickStats.highCount})
        </Badge>
        <span className="border-l border-border mx-2" />
        <Badge 
          variant={responseFilter === 'Não respondido' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            responseFilter !== 'Não respondido' && "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300"
          )}
          onClick={() => setResponseFilter(responseFilter === 'Não respondido' ? 'all' : 'Não respondido')}
        >
          Pendentes ({quickStats.notRespondedCount})
        </Badge>
        <Badge 
          variant={responseFilter === 'Não' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            responseFilter !== 'Não' && "bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
          )}
          onClick={() => setResponseFilter(responseFilter === 'Não' ? 'all' : 'Não')}
        >
          Ausentes ({quickStats.noCount})
        </Badge>
        <Badge 
          variant={responseFilter === 'Parcial' ? 'default' : 'outline'}
          className={cn(
            "cursor-pointer",
            responseFilter !== 'Parcial' && "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300"
          )}
          onClick={() => setResponseFilter(responseFilter === 'Parcial' ? 'all' : 'Parcial')}
        >
          Parciais ({quickStats.partialCount})
        </Badge>
      </div>

      {/* Specialist KPIs */}
      <div className="stats-grid">
        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
          <div className="kpi-label">Total de Perguntas</div>
          <div className="kpi-value">{metrics.totalQuestions}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Em {metrics.domainMetrics.length} domínios
          </div>
        </div>

        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <div className="kpi-label">Respondidas</div>
          <div className="kpi-value">{metrics.answeredQuestions}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {Math.round(metrics.coverage * 100)}% de cobertura
          </div>
        </div>

        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <div className="kpi-label">Controles Ausentes</div>
          <div className="kpi-value text-destructive">
            {quickStats.noCount + quickStats.notRespondedCount}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Resposta "Não" ou pendente
          </div>
        </div>

        <div className="kpi-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
          <div className="kpi-label">Controles Parciais</div>
          <div className="kpi-value text-amber-600">
            {quickStats.partialCount}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Implementação incompleta
          </div>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="gaps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gaps">Gaps Técnicos</TabsTrigger>
          <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="domains">Por Domínio</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
        </TabsList>

        {/* Technical Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por ID, texto ou subcategoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full font-mono"
              />
            </div>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Domínio" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos Domínios</SelectItem>
                {domainOptions.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="criticality">Criticidade</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="subcategory">Subcategoria</SelectItem>
                <SelectItem value="domain">Domínio</SelectItem>
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
                Limpar
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredGaps.length} de {allCriticalGaps.length} gaps
          </div>

          {/* Gaps Table */}
          {filteredGaps.length > 0 ? (
            <div className="card-elevated overflow-hidden animate-in fade-in-0 duration-500">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-[100px]">ID</th>
                      <th>Subcategoria</th>
                      <th className="max-w-md">Pergunta</th>
                      <th className="w-[100px]">Status</th>
                      <th className="w-[100px]">Criticidade</th>
                      <th className="w-[80px]">Score</th>
                      <th className="w-[80px]">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGaps.slice(0, 50).map((gap, idx) => (
                      <tr 
                        key={gap.questionId} 
                        className="group animate-in fade-in-0 slide-in-from-left-2 duration-300"
                        style={{ animationDelay: `${idx * 20}ms`, animationFillMode: 'backwards' }}
                      >
                        <td className="font-mono text-xs whitespace-nowrap">{gap.questionId}</td>
                        <td className="whitespace-nowrap text-sm">{gap.subcatName}</td>
                        <td className="max-w-md">
                          <p className="text-sm line-clamp-2" title={gap.questionText}>
                            {gap.questionText}
                          </p>
                        </td>
                        <td>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded whitespace-nowrap",
                            gap.response === 'Não respondido' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            gap.response === 'Não' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          )}>
                            {gap.response}
                          </span>
                        </td>
                        <td>
                          <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                            {gap.criticality}
                          </span>
                        </td>
                        <td className="font-mono text-sm">{Math.round(gap.effectiveScore * 100)}%</td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => navigate(`/assessment?questionId=${gap.questionId}`)}
                          >
                            Ir →
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredGaps.length > 50 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
                  Mostrando 50 de {filteredGaps.length} gaps. Use os filtros para refinar a busca.
                </div>
              )}
            </div>
          ) : (
            <div className="card-elevated p-8 text-center text-muted-foreground">
              {hasActiveFilters 
                ? 'Nenhum gap encontrado com os filtros aplicados.' 
                : 'Nenhum gap técnico identificado ainda.'}
            </div>
          )}
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={selectedHeatmapDomain} onValueChange={setSelectedHeatmapDomain}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por domínio" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos os Domínios</SelectItem>
                {domainOptions.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4 text-xs">
              {maturityLevels.map(level => (
                <div key={level.level} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: level.color }} />
                  <span>{level.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-6 animate-in fade-in-0 zoom-in-95 duration-500">
            <h3 className="font-semibold mb-4">
              Mapa de Calor por Subcategoria
              {selectedHeatmapDomain !== 'all' && (
                <span className="font-normal text-muted-foreground ml-2">
                  ({heatmapData.length} subcategorias)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1">
              {heatmapData.map((sm, idx) => (
                <div
                  key={sm.subcatId}
                  className="heatmap-cell aspect-square flex items-center justify-center text-xs font-medium text-white cursor-pointer hover:opacity-80 hover:scale-105 transition-all relative group animate-in fade-in-0 zoom-in-90 duration-300"
                  style={{ 
                    backgroundColor: sm.maturityLevel.color,
                    animationDelay: `${idx * 15}ms`,
                    animationFillMode: 'backwards'
                  }}
                  onClick={() => setSelectedSubcategory(sm.subcatId)}
                >
                  {Math.round(sm.score * 100)}
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                    <div className="font-medium">{sm.subcatName}</div>
                    <div className="text-muted-foreground">
                      {sm.criticality} · {sm.answeredQuestions}/{sm.totalQuestions} resp.
                    </div>
                    <div className="text-xs text-primary mt-1">Clique para detalhes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-elevated p-6 animate-in fade-in-0 slide-in-from-left-4 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
              <h3 className="font-semibold mb-4">Distribuição de Respostas</h3>
              <p className="text-xs text-muted-foreground mb-2">Clique em uma fatia para ver detalhes</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={responseDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      onClick={(data) => setSelectedResponseType(data.responseKey)}
                      className="cursor-pointer"
                    >
                      {responseDistribution.map((entry, index) => (
                        <Cell 
                          key={index} 
                          fill={entry.color} 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Legend 
                      onClick={(e) => {
                        const item = responseDistribution.find(r => r.name === e.value);
                        if (item) setSelectedResponseType(item.responseKey);
                      }}
                      className="cursor-pointer"
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-elevated p-6 animate-in fade-in-0 slide-in-from-right-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
              <h3 className="font-semibold mb-4">Resumo por Criticidade</h3>
              <p className="text-xs text-muted-foreground mb-3">Clique para ver detalhes</p>
              <div className="space-y-4">
                {['Critical', 'High', 'Medium', 'Low'].map((crit, idx) => {
                  const count = allCriticalGaps.filter(g => g.criticality === crit).length;
                  const percent = allCriticalGaps.length > 0 ? (count / allCriticalGaps.length) * 100 : 0;
                  return (
                    <div 
                      key={crit}
                      className="animate-in fade-in-0 slide-in-from-right-2 duration-300 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ animationDelay: `${400 + idx * 100}ms`, animationFillMode: 'backwards' }}
                      onClick={() => count > 0 && setSelectedCriticality(crit)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("criticality-badge", `criticality-${crit.toLowerCase()}`)}>
                          {crit}
                        </span>
                        <span className="font-mono text-sm">{count} gaps</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            crit === 'Critical' ? 'bg-red-500' :
                            crit === 'High' ? 'bg-orange-500' :
                            crit === 'Medium' ? 'bg-blue-500' :
                            'bg-gray-400'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <div className="card-elevated p-6 animate-in fade-in-0 zoom-in-95 duration-500">
            <h3 className="font-semibold mb-4">Detalhamento por Domínio</h3>
            <p className="text-xs text-muted-foreground mb-3">Clique nas barras para ver detalhes</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={domainChartData} 
                  layout="vertical" 
                  margin={{ left: 20, right: 20 }}
                  onClick={(data) => {
                    if (data?.activePayload?.[0]?.payload) {
                      const domainName = data.activePayload[0].payload.fullName;
                      const domainData = metrics.domainMetrics.find(dm => dm.domainName === domainName);
                      if (domainData) setSelectedDomain(domainData.domainId);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value}%`, 
                      name === 'score' ? 'Maturidade' : 'Cobertura'
                    ]}
                    labelFormatter={(label) => domainChartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="score" name="score" radius={[0, 4, 4, 0]}>
                    {domainChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} className="cursor-pointer hover:opacity-80 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Domain Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.domainMetrics.map((dm, idx) => (
              <div 
                key={dm.domainId}
                className="card-elevated p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all animate-in fade-in-0 slide-in-from-bottom-4 duration-400"
                style={{ animationDelay: `${200 + idx * 50}ms`, animationFillMode: 'backwards' }}
                onClick={() => setSelectedDomain(dm.domainId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{dm.domainName}</h4>
                  <span 
                    className="text-lg font-bold"
                    style={{ color: dm.maturityLevel.color }}
                  >
                    {Math.round(dm.score * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {dm.nistFunction && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">
                      {dm.nistFunction}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {dm.criticalGaps} gaps
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all" 
                    style={{ 
                      width: `${dm.score * 100}%`,
                      backgroundColor: dm.maturityLevel.color 
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{dm.answeredQuestions}/{dm.totalQuestions} perguntas</span>
                  <span>{Math.round(dm.coverage * 100)}% cobertura</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4">
          {/* Framework Categories */}
          <div className="card-elevated p-6 animate-in fade-in-0 zoom-in-95 duration-500">
            <h3 className="font-semibold mb-4">Maturidade por Categoria de Framework</h3>
            <p className="text-xs text-muted-foreground mb-3">Clique para ver detalhes</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworkCategoryData.map((fc, idx) => (
                <div 
                  key={fc.categoryId} 
                  className="p-4 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300 cursor-pointer hover:bg-muted/70 hover:shadow-md transition-all"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
                  onClick={() => setSelectedFrameworkCategory(fc.categoryId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{fc.name}</span>
                    <span 
                      className="text-lg font-bold"
                      style={{ color: fc.maturityLevel.color }}
                    >
                      {fc.score}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full transition-all" 
                      style={{ 
                        width: `${fc.score}%`,
                        backgroundColor: fc.maturityLevel.color 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fc.answeredQuestions}/{fc.totalQuestions} perguntas</span>
                    <span>{fc.coverage}% cobertura</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grouped Framework Coverage */}
          <div className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
            <h3 className="font-semibold mb-4">Cobertura Detalhada por Framework ({filteredFrameworkCoverage.length})</h3>
            <div className="space-y-2">
              {Object.entries(groupedFrameworks).map(([category, frameworks], catIdx) => (
                <Collapsible
                  key={category}
                  open={expandedFrameworks.has(category)}
                  onOpenChange={() => toggleFrameworkExpanded(category)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors animate-in fade-in-0 slide-in-from-left-2 duration-300"
                      style={{ animationDelay: `${300 + catIdx * 100}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{category}</span>
                        <span className="text-xs text-muted-foreground">
                          {frameworks.length} frameworks
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm">
                          {Math.round(frameworks.reduce((acc, fw) => acc + fw.averageScore, 0) / frameworks.length * 100)}% média
                        </span>
                        <span className="text-muted-foreground">
                          {expandedFrameworks.has(category) ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                      {frameworks.map((fw, fwIdx) => (
                        <div 
                          key={fw.framework} 
                          className="p-3 bg-background rounded-lg border border-border animate-in fade-in-0 zoom-in-95 duration-300 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                          style={{ animationDelay: `${fwIdx * 50}ms`, animationFillMode: 'backwards' }}
                          onClick={() => setSelectedFramework(fw.framework)}
                        >
                          <div className="font-medium text-sm truncate" title={fw.framework}>
                            {fw.framework}
                          </div>
                          <div className="text-xl font-bold mt-1">{Math.round(fw.averageScore * 100)}%</div>
                          <div className="text-xs text-muted-foreground">
                            {fw.answeredQuestions}/{fw.totalQuestions} perguntas
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${fw.coverage * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Subcategory Details Modal */}
      <Dialog open={!!selectedSubcategory} onOpenChange={(open) => !open && setSelectedSubcategory(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSubcategoryDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedSubcategoryDetails.maturityLevel.color }}
                  >
                    {Math.round(selectedSubcategoryDetails.score * 100)}
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedSubcategoryDetails.subcatName}</DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedSubcategoryDetails.domainName} · {selectedSubcategoryDetails.nistFunction}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold" style={{ color: selectedSubcategoryDetails.maturityLevel.color }}>
                    {selectedSubcategoryDetails.maturityLevel.name}
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{Math.round(selectedSubcategoryDetails.coverage * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedSubcategoryDetails.answeredQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold text-amber-600">{selectedSubcategoryDetails.totalQuestions - selectedSubcategoryDetails.answeredQuestions}</div>
                  <div className="text-xs text-muted-foreground">Pendentes</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso da Avaliação</span>
                  <span className="font-medium">{selectedSubcategoryDetails.answeredQuestions} de {selectedSubcategoryDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedSubcategoryDetails.coverage * 100} className="h-2" />
              </div>

              {/* Response Breakdown */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
                <h4 className="font-medium text-sm mb-2">Distribuição de Respostas</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedSubcategoryDetails.responseBreakdown).map(([key, value]) => (
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

              {/* Gaps */}
              {selectedSubcategoryDetails.gaps.length > 0 && (
                <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                  <h4 className="font-medium text-sm mb-2">
                    Gaps Identificados ({selectedSubcategoryDetails.gaps.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedSubcategoryDetails.gaps.map((gap, idx) => (
                      <div 
                        key={gap.questionId} 
                        className="p-3 bg-muted/30 rounded-lg flex items-start justify-between gap-3 animate-in fade-in-0 slide-in-from-left-2 duration-200"
                        style={{ animationDelay: `${450 + idx * 50}ms`, animationFillMode: 'backwards' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              gap.response === 'Não' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                              gap.response === 'Parcial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            )}>
                              {gap.response}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{gap.questionText}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedSubcategory(null);
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

              {/* All Questions List */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <h4 className="font-medium text-sm mb-2">
                  Todas as Perguntas ({selectedSubcategoryDetails.questions.length})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedSubcategoryDetails.questions.map((q, idx) => (
                    <div 
                      key={q.questionId} 
                      className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors animate-in fade-in-0 slide-in-from-left-2 duration-200"
                      style={{ animationDelay: `${550 + idx * 30}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{q.questionId}</span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            q.response === 'Sim' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                            q.response === 'Parcial' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                            q.response === 'Não' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                            q.response === 'NA' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                            q.response === 'Não respondido' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}>
                            {q.response}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{q.questionText}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          setSelectedSubcategory(null);
                          navigate(`/assessment?questionId=${q.questionId}`);
                        }}
                      >
                        Ir →
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedSubcategory(null)}
                >
                  Fechar
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedSubcategory(null);
                    // Navigate to assessment filtered by this subcategory's first question
                    if (selectedSubcategoryDetails.questions.length > 0) {
                      navigate(`/assessment?questionId=${selectedSubcategoryDetails.questions[0].questionId}`);
                    }
                  }}
                >
                  Avaliar Subcategoria
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Type Details Modal */}
      <Dialog open={!!selectedResponseType} onOpenChange={(open) => !open && setSelectedResponseType(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedResponseDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedResponseDetails.color }}
                  >
                    {selectedResponseDetails.count}
                  </div>
                  <div>
                    <DialogTitle className="text-left">Respostas: {selectedResponseDetails.name}</DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedResponseDetails.count} perguntas ({selectedResponseDetails.percent.toFixed(1)}% do total)
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedResponseDetails.count}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{Object.keys(selectedResponseDetails.byDomain).length}</div>
                  <div className="text-xs text-muted-foreground">Domínios</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold" style={{ color: selectedResponseDetails.color }}>
                    {selectedResponseDetails.percent.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">do Total</div>
                </div>
              </div>

              {/* Criticality breakdown for non-compliant responses */}
              {(selectedResponseDetails.responseKey === 'Não' || 
                selectedResponseDetails.responseKey === 'Parcial' || 
                selectedResponseDetails.responseKey === 'Não respondido') && (
                <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
                  <h4 className="font-medium text-sm mb-2">Por Criticidade</h4>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(selectedResponseDetails.criticalityBreakdown).map(([key, value]) => (
                      value > 0 && (
                        <div 
                          key={key} 
                          className={cn("criticality-badge", `criticality-${key.toLowerCase()}`)}
                        >
                          {key}: {value}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Questions by Domain */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <h4 className="font-medium text-sm mb-2">
                  Perguntas por Domínio ({selectedResponseDetails.questions.length})
                </h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {Object.entries(selectedResponseDetails.byDomain).map(([domainName, questions], domainIdx) => (
                    <Collapsible 
                      key={domainName}
                      defaultOpen={domainIdx === 0}
                      className="animate-in fade-in-0 slide-in-from-left-2 duration-200"
                      style={{ animationDelay: `${350 + domainIdx * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      <CollapsibleTrigger className="w-full p-3 bg-muted/30 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <span className="font-medium text-sm">{domainName}</span>
                        <span className="text-xs text-muted-foreground">{questions.length} perguntas</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 mt-2 pl-2">
                          {questions.map((q, qIdx) => (
                            <div 
                              key={q.questionId} 
                              className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs text-muted-foreground">{q.questionId}</span>
                                  {q.ownershipType && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                      {q.ownershipType}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm line-clamp-2">{q.questionText}</p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="shrink-0"
                                onClick={() => {
                                  setSelectedResponseType(null);
                                  navigate(`/assessment?questionId=${q.questionId}`);
                                }}
                              >
                                {selectedResponseDetails.responseKey === 'Não respondido' ? 'Responder' : 'Revisar'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedResponseType(null)}
                >
                  Fechar
                </Button>
                {selectedResponseDetails.questions.length > 0 && (
                  <Button 
                    onClick={() => {
                      setSelectedResponseType(null);
                      navigate(`/assessment?questionId=${selectedResponseDetails.questions[0].questionId}`);
                    }}
                  >
                    {selectedResponseDetails.responseKey === 'Não respondido' ? 'Iniciar Avaliação' : 'Revisar Primeira'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Criticality Details Modal */}
      <Dialog open={!!selectedCriticality} onOpenChange={(open) => !open && setSelectedCriticality(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCriticalityDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedCriticalityDetails.color }}
                  >
                    {selectedCriticalityDetails.count}
                  </div>
                  <div>
                    <DialogTitle className="text-left">
                      Gaps de Criticidade: {selectedCriticalityDetails.criticality}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedCriticalityDetails.count} gaps ({selectedCriticalityDetails.percent.toFixed(1)}% do total)
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold" style={{ color: selectedCriticalityDetails.color }}>
                    {selectedCriticalityDetails.count}
                  </div>
                  <div className="text-xs text-muted-foreground">Total de Gaps</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedCriticalityDetails.domainsCount}</div>
                  <div className="text-xs text-muted-foreground">Domínios Afetados</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedCriticalityDetails.percent.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">do Total</div>
                </div>
              </div>

              {/* Response breakdown */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
                <h4 className="font-medium text-sm mb-2">Por Status de Resposta</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedCriticalityDetails.byResponse).map(([key, value]) => (
                    value > 0 && (
                      <div 
                        key={key} 
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          key === 'Não' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          key === 'Parcial' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          key === 'Não respondido' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {key}: {value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Gaps by Domain */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <h4 className="font-medium text-sm mb-2">
                  Gaps por Domínio ({selectedCriticalityDetails.gaps.length})
                </h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {Object.entries(selectedCriticalityDetails.byDomain).map(([domainName, gaps], domainIdx) => (
                    <Collapsible 
                      key={domainName}
                      defaultOpen={domainIdx === 0}
                      className="animate-in fade-in-0 slide-in-from-left-2 duration-200"
                      style={{ animationDelay: `${350 + domainIdx * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      <CollapsibleTrigger className="w-full p-3 bg-muted/30 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <span className="font-medium text-sm">{domainName}</span>
                        <span className="text-xs text-muted-foreground">{gaps.length} gaps</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 mt-2 pl-2">
                          {gaps.map((gap) => (
                            <div 
                              key={gap.questionId} 
                              className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded",
                                    gap.response === 'Não' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                    gap.response === 'Parcial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                  )}>
                                    {gap.response}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">{gap.subcatName}</p>
                                <p className="text-sm line-clamp-2">{gap.questionText}</p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="shrink-0"
                                onClick={() => {
                                  setSelectedCriticality(null);
                                  navigate(`/assessment?questionId=${gap.questionId}`);
                                }}
                              >
                                Revisar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCriticality(null)}
                >
                  Fechar
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedCriticality(null);
                    setCriticalityFilter(selectedCriticalityDetails.criticality as CriticalityFilter);
                  }}
                >
                  Filtrar por Esta Criticidade
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Domain Details Modal */}
      <Dialog open={!!selectedDomain} onOpenChange={(open) => !open && setSelectedDomain(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedDomainDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedDomainDetails.maturityLevel.color }}
                  >
                    {Math.round(selectedDomainDetails.score * 100)}%
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedDomainDetails.domainName}</DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedDomainDetails.nistFunction && `${selectedDomainDetails.nistFunction} · `}
                      {selectedDomainDetails.maturityLevel.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold" style={{ color: selectedDomainDetails.maturityLevel.color }}>
                    {Math.round(selectedDomainDetails.score * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{Math.round(selectedDomainDetails.coverage * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedDomainDetails.answeredQuestions}/{selectedDomainDetails.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold text-destructive">{selectedDomainDetails.gaps.length}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso da Avaliação</span>
                  <span className="font-medium">{selectedDomainDetails.answeredQuestions} de {selectedDomainDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedDomainDetails.coverage * 100} className="h-2" />
              </div>

              {/* Response Breakdown */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
                <h4 className="font-medium text-sm mb-2">Distribuição de Respostas</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedDomainDetails.responseBreakdown).map(([key, value]) => (
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

              {/* Gaps by Criticality */}
              {selectedDomainDetails.gaps.length > 0 && (
                <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                  <h4 className="font-medium text-sm mb-2">Gaps por Criticidade</h4>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(selectedDomainDetails.gapsByCriticality).map(([key, value]) => (
                      value > 0 && (
                        <div 
                          key={key} 
                          className={cn("criticality-badge", `criticality-${key.toLowerCase()}`)}
                        >
                          {key}: {value}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps by Subcategory */}
              {selectedDomainDetails.gaps.length > 0 && (
                <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}>
                  <h4 className="font-medium text-sm mb-2">
                    Gaps por Subcategoria ({selectedDomainDetails.gaps.length})
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(selectedDomainDetails.bySubcategory).map(([subcatName, gaps], subcatIdx) => (
                      <Collapsible 
                        key={subcatName}
                        defaultOpen={subcatIdx === 0}
                        className="animate-in fade-in-0 slide-in-from-left-2 duration-200"
                        style={{ animationDelay: `${500 + subcatIdx * 50}ms`, animationFillMode: 'backwards' }}
                      >
                        <CollapsibleTrigger className="w-full p-3 bg-muted/30 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <span className="font-medium text-sm">{subcatName}</span>
                          <span className="text-xs text-muted-foreground">{gaps.length} gaps</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 mt-2 pl-2">
                            {gaps.map((gap) => (
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
                                    <span className={cn(
                                      "text-xs px-2 py-0.5 rounded",
                                      gap.response === 'Não' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                      gap.response === 'Parcial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    )}>
                                      {gap.response}
                                    </span>
                                  </div>
                                  <p className="text-sm line-clamp-2">{gap.questionText}</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() => {
                                    setSelectedDomain(null);
                                    navigate(`/assessment?questionId=${gap.questionId}`);
                                  }}
                                >
                                  Revisar
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              )}

              {/* Subcategories Summary */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '550ms', animationFillMode: 'backwards' }}>
                <h4 className="font-medium text-sm mb-2">
                  Subcategorias ({selectedDomainDetails.subcategoryMetrics.length})
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {selectedDomainDetails.subcategoryMetrics.map((sm, idx) => (
                    <div 
                      key={sm.subcatId}
                      className="p-2 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => {
                        setSelectedDomain(null);
                        setSelectedSubcategory(sm.subcatId);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate" title={sm.subcatName}>{sm.subcatName}</span>
                        <span 
                          className="text-xs font-bold"
                          style={{ color: sm.maturityLevel.color }}
                        >
                          {Math.round(sm.score * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full" 
                          style={{ 
                            width: `${sm.score * 100}%`,
                            backgroundColor: sm.maturityLevel.color 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDomain(null)}
                >
                  Fechar
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedDomain(null);
                    setDomainFilter(selectedDomainDetails.domainId);
                  }}
                >
                  Filtrar por Este Domínio
                </Button>
              </div>
            </>
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
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold" style={{ color: selectedFrameworkCategoryDetails.color }}>
                    {selectedFrameworkCategoryDetails.score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedFrameworkCategoryDetails.coverage}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedFrameworkCategoryDetails.answeredQuestions}/{selectedFrameworkCategoryDetails.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold text-destructive">{selectedFrameworkCategoryDetails.gaps.length}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Response Breakdown */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
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

              {/* Gaps by Criticality */}
              {selectedFrameworkCategoryDetails.gaps.length > 0 && (
                <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
                  <h4 className="font-medium text-sm mb-2">Gaps por Criticidade</h4>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(selectedFrameworkCategoryDetails.gapsByCriticality).map(([key, value]) => (
                      value > 0 && (
                        <div 
                          key={key} 
                          className={cn("criticality-badge", `criticality-${key.toLowerCase()}`)}
                        >
                          {key}: {value}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps List */}
              {selectedFrameworkCategoryDetails.gaps.length > 0 && (
                <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                  <h4 className="font-medium text-sm mb-2">
                    Gaps Identificados ({selectedFrameworkCategoryDetails.gaps.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFrameworkCategoryDetails.gaps.slice(0, 20).map((gap, idx) => (
                      <div 
                        key={gap.questionId} 
                        className="p-3 bg-muted/20 rounded-lg flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors animate-in fade-in-0 slide-in-from-left-2 duration-200"
                        style={{ animationDelay: `${450 + idx * 30}ms`, animationFillMode: 'backwards' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{gap.questionId}</span>
                            <span className={cn("criticality-badge text-xs", `criticality-${gap.criticality.toLowerCase()}`)}>
                              {gap.criticality}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              gap.response === 'Não' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                              gap.response === 'Parcial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            )}>
                              {gap.response}
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
                    {selectedFrameworkCategoryDetails.gaps.length > 20 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Mostrando 20 de {selectedFrameworkCategoryDetails.gaps.length} gaps
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFrameworkCategory(null)}
                >
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
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold bg-primary"
                  >
                    {Math.round(selectedFrameworkDetails.score * 100)}%
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedFrameworkDetails.name}</DialogTitle>
                    <DialogDescription className="text-left">
                      Framework · {selectedFrameworkDetails.answeredQuestions} de {selectedFrameworkDetails.totalQuestions} perguntas
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(selectedFrameworkDetails.score * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maturidade</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{Math.round(selectedFrameworkDetails.coverage * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold">{selectedFrameworkDetails.answeredQuestions}/{selectedFrameworkDetails.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">Respondidas</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
                  <div className="text-2xl font-bold text-destructive">{selectedFrameworkDetails.gaps.length}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso da Avaliação</span>
                  <span className="font-medium">{selectedFrameworkDetails.answeredQuestions} de {selectedFrameworkDetails.totalQuestions}</span>
                </div>
                <Progress value={selectedFrameworkDetails.coverage * 100} className="h-2" />
              </div>

              {/* Response Breakdown */}
              <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
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

              {/* Gaps by Domain */}
              {selectedFrameworkDetails.gaps.length > 0 && (
                <div className="mt-4 animate-in fade-in-0 duration-300" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                  <h4 className="font-medium text-sm mb-2">
                    Gaps por Domínio ({selectedFrameworkDetails.gaps.length})
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(selectedFrameworkDetails.byDomain).map(([domainName, gaps], domainIdx) => (
                      <Collapsible 
                        key={domainName}
                        defaultOpen={domainIdx === 0}
                        className="animate-in fade-in-0 slide-in-from-left-2 duration-200"
                        style={{ animationDelay: `${450 + domainIdx * 50}ms`, animationFillMode: 'backwards' }}
                      >
                        <CollapsibleTrigger className="w-full p-3 bg-muted/30 rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <span className="font-medium text-sm">{domainName}</span>
                          <span className="text-xs text-muted-foreground">{gaps.length} gaps</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 mt-2 pl-2">
                            {gaps.map((gap) => (
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
                                    <span className={cn(
                                      "text-xs px-2 py-0.5 rounded",
                                      gap.response === 'Não' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                      gap.response === 'Parcial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    )}>
                                      {gap.response}
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
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end gap-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFramework(null)}
                >
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

      {/* Maturity Trend Chart */}
      <MaturityTrendChart className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" />
    </div>
  );
}
