import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, generateRoadmap, ActiveQuestion } from '@/lib/scoring';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { questions as defaultQuestions } from '@/lib/dataset';
import { getAllCustomQuestions, getDisabledQuestions, getEnabledFrameworks, getSelectedFrameworks, setSelectedFrameworks, getAllCustomFrameworks } from '@/lib/database';
import { frameworks as defaultFrameworks, Framework } from '@/lib/frameworks';

export default function DashboardExecutive() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();
  
  const [activeQuestions, setActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [enabledFrameworks, setEnabledFrameworks] = useState<Framework[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);

  // Load active questions and frameworks
  useEffect(() => {
    async function loadData() {
      try {
        const [customQuestions, disabledQuestionIds, enabledFrameworkIds, selectedIds, customFrameworks] = await Promise.all([
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

        setActiveQuestions(active);

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

        const enabledSet = new Set(enabledFrameworkIds);
        const enabled = allFrameworks.filter(f => enabledSet.has(f.frameworkId));
        setEnabledFrameworks(enabled);
        setSelectedFrameworkIds(selectedIds);

      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to default questions
        setActiveQuestions(defaultQuestions.map(q => ({
          questionId: q.questionId,
          questionText: q.questionText,
          subcatId: q.subcatId,
          domainId: q.domainId,
          ownershipType: q.ownershipType,
          frameworks: q.frameworks || []
        })));
        setEnabledFrameworks(defaultFrameworks.filter(f => f.defaultEnabled));
      } finally {
        setQuestionsLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle framework selection change
  const handleFrameworkSelectionChange = async (frameworkIds: string[]) => {
    setSelectedFrameworkIds(frameworkIds);
    try {
      await setSelectedFrameworks(frameworkIds);
    } catch (error) {
      console.error('Error saving framework selection:', error);
    }
  };

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers, 0.5, activeQuestions), [answers, activeQuestions]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers, activeQuestions), [answers, activeQuestions]);
  const roadmap = useMemo(() => generateRoadmap(answers, 10, activeQuestions), [answers, activeQuestions]);

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
        activeQuestions={activeQuestions}
      />
    </div>
  );
}
