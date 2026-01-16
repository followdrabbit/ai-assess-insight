import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, generateRoadmap, ActiveQuestion, OverallMetrics, CriticalGap, FrameworkCoverage, RoadmapItem } from '@/lib/scoring';
import { questions as defaultQuestions } from '@/lib/dataset';
import { getAllCustomQuestions, getDisabledQuestions, getEnabledFrameworks, getSelectedFrameworks, setSelectedFrameworks, getAllCustomFrameworks, Answer } from '@/lib/database';
import { frameworks as defaultFrameworks, Framework, getQuestionFrameworkIds, getFrameworksBySecurityDomain } from '@/lib/frameworks';
import { getSecurityDomainById, DEFAULT_SECURITY_DOMAINS, SecurityDomain } from '@/lib/securityDomains';
import { useMaturitySnapshots } from '@/hooks/useMaturitySnapshots';

// Minimum interval between visibility-triggered reloads (30 seconds)
const MIN_RELOAD_INTERVAL = 30000;

export interface DashboardMetricsResult {
  // Loading states
  isLoading: boolean;
  questionsLoading: boolean;
  isTransitioning: boolean; // True during domain switch animation
  
  // Domain info
  currentDomainInfo: SecurityDomain | null;
  
  // Raw answers map (for detailed views that need to iterate)
  answers: Map<string, Answer>;
  
  // Frameworks
  enabledFrameworks: Framework[];
  enabledFrameworkIds: string[];
  selectedFrameworkIds: string[];
  
  // Questions
  allActiveQuestions: ActiveQuestion[];
  questionsFilteredByEnabledFrameworks: ActiveQuestion[];
  questionsForDashboard: ActiveQuestion[];
  
  // Calculated metrics (always derived from questionsForDashboard)
  metrics: OverallMetrics;
  criticalGaps: CriticalGap[];
  frameworkCoverage: FrameworkCoverage[];
  roadmap: RoadmapItem[];
  
  // Actions
  handleFrameworkSelectionChange: (frameworkIds: string[]) => Promise<void>;
  toggleFramework: (frameworkId: string) => void;
  clearFrameworkSelection: () => void;
  reloadData: () => Promise<void>;
}

/**
 * Centralized hook for loading dashboard data and calculating metrics.
 * This ensures all dashboards (Executive, GRC, Specialist) use the same
 * logic for data loading, filtering, and metric calculation.
 * 
 * Benefits:
 * - Consistent metric calculation across all dashboards
 * - Single source of truth for questions/frameworks loading
 * - Unified framework filtering logic
 * - Automatic visibility-based refresh with rate limiting
 */
export function useDashboardMetrics(): DashboardMetricsResult {
  const { answers, isLoading, selectedSecurityDomain } = useAnswersStore();
  
  // Initialize snapshot capturing
  useMaturitySnapshots();
  
  // State
  const [allActiveQuestions, setAllActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [enabledFrameworks, setEnabledFrameworks] = useState<Framework[]>([]);
  const [enabledFrameworkIds, setEnabledFrameworkIds] = useState<string[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);
  const [currentDomainInfo, setCurrentDomainInfo] = useState<SecurityDomain | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousDomainRef = useRef<string>(selectedSecurityDomain);

  // Load active questions and frameworks - filtered by security domain
  const loadData = useCallback(async () => {
    // Detect domain change for transition animation
    const isDomainChange = previousDomainRef.current !== selectedSecurityDomain;
    if (isDomainChange) {
      setIsTransitioning(true);
      previousDomainRef.current = selectedSecurityDomain;
    }
    
    setQuestionsLoading(true);
    try {
      // Load domain info
      const domainInfo = await getSecurityDomainById(selectedSecurityDomain);
      setCurrentDomainInfo(domainInfo || DEFAULT_SECURITY_DOMAINS.find(d => d.domainId === selectedSecurityDomain) || null);

      const [customQuestions, disabledQuestionIds, enabledIds, selectedIds, customFrameworks] = await Promise.all([
        getAllCustomQuestions(),
        getDisabledQuestions(),
        getEnabledFrameworks(),
        getSelectedFrameworks(),
        getAllCustomFrameworks()
      ]);

      // Get frameworks for the current security domain
      const domainFrameworkIds = new Set(
        getFrameworksBySecurityDomain(selectedSecurityDomain).map(f => f.frameworkId)
      );

      // Filter enabled frameworks to only those in the current domain
      const domainEnabledIds = enabledIds.filter(id => domainFrameworkIds.has(id));

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
      setEnabledFrameworkIds(domainEnabledIds);

      // Combine default and custom frameworks, filter by enabled AND domain
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

      const enabledSet = new Set(domainEnabledIds);
      const enabled = allFrameworks.filter(f => enabledSet.has(f.frameworkId));
      setEnabledFrameworks(enabled);

      // Sanitize selected frameworks - only keep those in current domain
      const sanitizedSelected = (selectedIds || []).filter(id => enabledSet.has(id));
      setSelectedFrameworkIds(sanitizedSelected);

    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback
      const domainFrameworkIds = getFrameworksBySecurityDomain(selectedSecurityDomain).map(f => f.frameworkId);
      const defaultEnabledIds = domainFrameworkIds.filter(id => 
        ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD', 'CSA_CCM', 'NIST_SSDF'].includes(id)
      );
      setAllActiveQuestions(defaultQuestions.map(q => ({
        questionId: q.questionId,
        questionText: q.questionText,
        subcatId: q.subcatId,
        domainId: q.domainId,
        ownershipType: q.ownershipType,
        frameworks: q.frameworks || []
      })));
      setEnabledFrameworkIds(defaultEnabledIds);
      setEnabledFrameworks(defaultFrameworks.filter(f => defaultEnabledIds.includes(f.frameworkId)));
    } finally {
      setQuestionsLoading(false);
      // End transition animation after a short delay for smooth effect
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [selectedSecurityDomain]);

  // Reload when security domain changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh on visibility (with rate limiting)
  useEffect(() => {
    let lastLoadTime = Date.now();

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

  // Filter questions by enabled frameworks - this is the base set
  const questionsFilteredByEnabledFrameworks = useMemo(() => {
    if (enabledFrameworkIds.length === 0) return allActiveQuestions;

    const enabledSet = new Set(enabledFrameworkIds);
    return allActiveQuestions.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      return questionFrameworkIds.some(id => enabledSet.has(id));
    });
  }, [allActiveQuestions, enabledFrameworkIds]);

  // Apply user selection (subset) on top of enabled frameworks.
  // When no framework is selected, treat as "all enabled".
  const questionsForDashboard = useMemo(() => {
    if (selectedFrameworkIds.length === 0) return questionsFilteredByEnabledFrameworks;

    const selectedSet = new Set(selectedFrameworkIds);
    return questionsFilteredByEnabledFrameworks.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      return questionFrameworkIds.some(id => selectedSet.has(id));
    });
  }, [questionsFilteredByEnabledFrameworks, selectedFrameworkIds]);

  // Handle framework selection change
  const handleFrameworkSelectionChange = useCallback(async (frameworkIds: string[]) => {
    setSelectedFrameworkIds(frameworkIds);
    try {
      await setSelectedFrameworks(frameworkIds);
    } catch (error) {
      console.error('Error saving framework selection:', error);
    }
  }, []);

  // Toggle framework selection
  const toggleFramework = useCallback((frameworkId: string) => {
    const newSelection = selectedFrameworkIds.includes(frameworkId)
      ? selectedFrameworkIds.filter(id => id !== frameworkId)
      : [...selectedFrameworkIds, frameworkId];
    handleFrameworkSelectionChange(newSelection);
  }, [selectedFrameworkIds, handleFrameworkSelectionChange]);

  // Clear framework selection
  const clearFrameworkSelection = useCallback(() => {
    handleFrameworkSelectionChange([]);
  }, [handleFrameworkSelectionChange]);

  // ============================================
  // CENTRAL METRIC CALCULATIONS
  // All dashboards MUST use these - single source of truth
  // ============================================
  
  const metrics = useMemo(
    () => calculateOverallMetrics(answers, questionsForDashboard),
    [answers, questionsForDashboard]
  );
  
  const criticalGaps = useMemo(
    () => getCriticalGaps(answers, 0.5, questionsForDashboard),
    [answers, questionsForDashboard]
  );
  
  const frameworkCoverage = useMemo(
    () => getFrameworkCoverage(answers, questionsForDashboard),
    [answers, questionsForDashboard]
  );
  
  const roadmap = useMemo(
    () => generateRoadmap(answers, 10, questionsForDashboard),
    [answers, questionsForDashboard]
  );

  return {
    // Loading states
    isLoading,
    questionsLoading,
    isTransitioning,
    
    // Domain info
    currentDomainInfo,
    
    // Raw answers map
    answers,
    
    // Frameworks
    enabledFrameworks,
    enabledFrameworkIds,
    selectedFrameworkIds,
    
    // Questions
    allActiveQuestions,
    questionsFilteredByEnabledFrameworks,
    questionsForDashboard,
    
    // Calculated metrics
    metrics,
    criticalGaps,
    frameworkCoverage,
    roadmap,
    
    // Actions
    handleFrameworkSelectionChange,
    toggleFramework,
    clearFrameworkSelection,
    reloadData: loadData,
  };
}

// Re-export types for convenience
export type { ActiveQuestion, OverallMetrics, CriticalGap, FrameworkCoverage, RoadmapItem } from '@/lib/scoring';
export type { Framework } from '@/lib/frameworks';
export type { SecurityDomain } from '@/lib/securityDomains';
