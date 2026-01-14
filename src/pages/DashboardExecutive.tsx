import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, generateRoadmap, ActiveQuestion } from '@/lib/scoring';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { fetchQuestions } from '@/lib/datasetData';
import { getAllCustomQuestions, getDisabledQuestions, getEnabledFrameworks, getSelectedFrameworks, setSelectedFrameworks, getAllCustomFrameworks } from '@/lib/database';
import { fetchFrameworks, Framework, getQuestionFrameworkIds } from '@/lib/frameworksData';

export default function DashboardExecutive() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();
  
  const [allActiveQuestions, setAllActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [enabledFrameworks, setEnabledFrameworks] = useState<Framework[]>([]);
  const [enabledFrameworkIds, setEnabledFrameworkIds] = useState<string[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);

  // Load active questions and frameworks
  const loadData = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const [dbQuestions, customQuestions, disabledQuestionIds, enabledIds, selectedIds, customFrameworks, defaultFrameworks] = await Promise.all([
        fetchQuestions(),
        getAllCustomQuestions(),
        getDisabledQuestions(),
        getEnabledFrameworks(),
        getSelectedFrameworks(),
        getAllCustomFrameworks(),
        fetchFrameworks()
      ]);

      // Combine default and custom questions, excluding disabled ones
      const active: ActiveQuestion[] = [
        ...dbQuestions
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

      // If some selected frameworks are no longer enabled, drop them from selection
      const enabledIdSet = new Set(enabledIds);
      const sanitizedSelected = (selectedIds || []).filter(id => enabledIdSet.has(id));
      setSelectedFrameworkIds(sanitizedSelected);

    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to default questions
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

  // Refresh when the user comes back to the tab/window (covers enable/disable done elsewhere)
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

  // Filter questions by enabled frameworks - this is the base set
  const questionsFilteredByEnabledFrameworks = useMemo(() => {
    if (enabledFrameworkIds.length === 0) return allActiveQuestions;

    const enabledSet = new Set(enabledFrameworkIds);
    return allActiveQuestions.filter(q => {
      const questionFrameworkIds = getQuestionFrameworkIds(q.frameworks);
      // Include question if any of its frameworks is in the enabled set
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
  const handleFrameworkSelectionChange = async (frameworkIds: string[]) => {
    setSelectedFrameworkIds(frameworkIds);
    try {
      await setSelectedFrameworks(frameworkIds);
    } catch (error) {
      console.error('Error saving framework selection:', error);
    }
  };

  // Calculate metrics using questions filtered by enabled frameworks + user selection
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

  if (isLoading || questionsLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão estratégica para CISO e liderança de segurança
        </p>
      </div>

      {answers.size === 0 && (
        <div className="card-elevated p-6 text-center">
          <p className="text-muted-foreground">Nenhuma avaliação realizada ainda.</p>
        </div>
      )}

      <ExecutiveDashboard 
        metrics={metrics}
        criticalGaps={criticalGaps}
        roadmap={roadmap}
        frameworkCoverage={frameworkCoverage}
        enabledFrameworks={enabledFrameworks}
        selectedFrameworkIds={selectedFrameworkIds}
        onFrameworkSelectionChange={handleFrameworkSelectionChange}
        activeQuestions={questionsForDashboard}
      />
    </div>
  );
}
