import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, generateRoadmap, ActiveQuestion } from '@/lib/scoring';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { questions as defaultQuestions } from '@/lib/dataset';
import { getAllCustomQuestions, getDisabledQuestions } from '@/lib/database';

export default function DashboardExecutive() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();
  
  const [activeQuestions, setActiveQuestions] = useState<ActiveQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Load active questions (default + custom, excluding disabled)
  useEffect(() => {
    async function loadActiveQuestions() {
      try {
        const [customQuestions, disabledQuestionIds] = await Promise.all([
          getAllCustomQuestions(),
          getDisabledQuestions()
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
      } catch (error) {
        console.error('Error loading active questions:', error);
        // Fallback to default questions
        setActiveQuestions(defaultQuestions.map(q => ({
          questionId: q.questionId,
          questionText: q.questionText,
          subcatId: q.subcatId,
          domainId: q.domainId,
          ownershipType: q.ownershipType,
          frameworks: q.frameworks || []
        })));
      } finally {
        setQuestionsLoading(false);
      }
    }

    loadActiveQuestions();
  }, []);

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
      />
    </div>
  );
}
