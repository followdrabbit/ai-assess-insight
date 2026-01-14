import { useMemo, useState, useRef } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { domains, subcategories, questions, getSubcategoriesByDomain, responseOptions, evidenceOptions } from '@/lib/dataset';
import { calculateOverallMetrics } from '@/lib/scoring';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { importAnswersFromXLSX } from '@/lib/xlsxImport';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FrameworkSelector } from '@/components/FrameworkSelector';
import { questionBelongsToFrameworks, getFrameworkById } from '@/lib/frameworks';
import { Progress } from '@/components/ui/progress';

export default function Assessment() {
  const { answers, setAnswer, clearAnswers, importAnswers, generateDemoData, isLoading, selectedFrameworks } = useAnswersStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(selectedFrameworks.length === 0);

  // Filter questions based on selected frameworks
  const filteredQuestions = useMemo(() => {
    if (selectedFrameworks.length === 0) return [];
    return questions.filter(q => questionBelongsToFrameworks(q.frameworks, selectedFrameworks));
  }, [selectedFrameworks]);

  // Group filtered questions by domain and subcategory
  const groupedQuestions = useMemo(() => {
    const groups: {
      domain: typeof domains[0];
      subcategories: {
        subcat: typeof subcategories[0];
        questions: typeof questions;
      }[];
    }[] = [];

    domains.forEach(domain => {
      const domainQuestions = filteredQuestions.filter(q => q.domainId === domain.domainId);
      if (domainQuestions.length === 0) return;

      const domainSubcats = getSubcategoriesByDomain(domain.domainId);
      const subcatGroups: typeof groups[0]['subcategories'] = [];

      domainSubcats.forEach(subcat => {
        const subcatQuestions = domainQuestions.filter(q => q.subcatId === subcat.subcatId);
        if (subcatQuestions.length > 0) {
          subcatGroups.push({ subcat, questions: subcatQuestions });
        }
      });

      if (subcatGroups.length > 0) {
        groups.push({ domain, subcategories: subcatGroups });
      }
    });

    return groups;
  }, [filteredQuestions]);

  // Calculate metrics based on filtered questions
  const metrics = useMemo(() => {
    const answered = filteredQuestions.filter(q => answers.has(q.questionId) && answers.get(q.questionId)?.response).length;
    return {
      totalQuestions: filteredQuestions.length,
      answeredQuestions: answered,
      coverage: filteredQuestions.length > 0 ? answered / filteredQuestions.length : 0,
    };
  }, [answers, filteredQuestions]);

  const handleExport = () => {
    const blob = exportAnswersToXLSX(answers);
    downloadXLSX(blob, generateExportFilename());
    toast.success('Respostas exportadas com sucesso');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importAnswersFromXLSX(file);
    if (result.success) {
      await importAnswers(result.answers);
      toast.success(`${result.answers.length} respostas importadas`);
      if (result.warnings.length > 0) {
        toast.warning(`${result.warnings.length} avisos durante importação`);
      }
    } else {
      toast.error(result.errors.join(', '));
    }
    e.target.value = '';
  };

  const handleClear = async () => {
    if (confirm('Tem certeza que deseja limpar todas as respostas?')) {
      await clearAnswers();
      toast.success('Respostas limpas');
    }
  };

  const toggleQuestionExpanded = (qId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Get framework names for display
  const selectedFrameworkNames = selectedFrameworks
    .map(id => getFrameworkById(id)?.shortName)
    .filter(Boolean)
    .join(', ');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  // Show framework selector if no frameworks selected or user wants to change
  if (showFrameworkSelector) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <FrameworkSelector onStartAssessment={() => setShowFrameworkSelector(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with progress and actions */}
      <div className="card-elevated p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Avaliação de Segurança de IA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedFrameworkNames}
            </p>
          </div>
          <Button onClick={() => setShowFrameworkSelector(true)} variant="outline" size="sm">
            Alterar Frameworks
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {metrics.answeredQuestions} / {metrics.totalQuestions} ({Math.round(metrics.coverage * 100)}%)
            </span>
          </div>
          <Progress value={metrics.coverage * 100} className="h-2" />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button onClick={handleExport} variant="outline" size="sm">Exportar XLSX</Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">Importar XLSX</Button>
          <Button onClick={generateDemoData} variant="outline" size="sm">Dados Demo</Button>
          <Button onClick={handleClear} variant="outline" size="sm" className="text-destructive">Limpar</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Questions grouped by Domain > Subcategory */}
      {groupedQuestions.map(({ domain, subcategories: subcatGroups }) => (
        <section key={domain.domainId} className="space-y-6">
          {/* Domain Header */}
          <div className="border-b pb-2">
            <h2 className="text-lg font-semibold">{domain.domainName}</h2>
            <p className="text-sm text-muted-foreground">{domain.description}</p>
          </div>

          {/* Subcategories */}
          {subcatGroups.map(({ subcat, questions: subcatQuestions }) => (
            <div key={subcat.subcatId} className="space-y-4">
              {/* Subcategory Header */}
              <div className="flex items-center gap-3">
                <h3 className="text-base font-medium">{subcat.subcatName}</h3>
                <span className={cn("criticality-badge", `criticality-${subcat.criticality.toLowerCase()}`)}>
                  {subcat.criticality}
                </span>
                <span className="text-xs text-muted-foreground">
                  {subcatQuestions.length} pergunta{subcatQuestions.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Questions */}
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                {subcatQuestions.map(q => {
                  const answer = answers.get(q.questionId);
                  const isExpanded = expandedQuestions.has(q.questionId);
                  const answerStatus = answer?.response === 'Sim' ? 'answered' : answer?.response === 'Parcial' ? 'partial' : 'unanswered';

                  return (
                    <div key={q.questionId} className={cn("question-card", answerStatus)}>
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{q.questionId}</span>
                        </div>
                        <p className="font-medium">{q.questionText}</p>
                      </div>

                      {/* Response selector */}
                      <div className="mb-4">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Resposta</label>
                        <div className="flex flex-wrap gap-2">
                          {responseOptions.map(opt => (
                            <button
                              key={opt.value}
                              data-value={opt.value}
                              onClick={() => setAnswer(q.questionId, { response: opt.value as any })}
                              className={cn("response-option", answer?.response === opt.value && "selected")}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Evidence selector */}
                      {answer?.response && answer.response !== 'NA' && (
                        <div className="mb-4">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Evidência disponível?</label>
                          <div className="flex flex-wrap gap-2">
                            {evidenceOptions.map(opt => (
                              <button
                                key={opt.value}
                                data-value={opt.value}
                                onClick={() => setAnswer(q.questionId, { evidenceOk: opt.value as any })}
                                className={cn("response-option", answer?.evidenceOk === opt.value && "selected")}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable details */}
                      <Collapsible open={isExpanded} onOpenChange={() => toggleQuestionExpanded(q.questionId)}>
                        <CollapsibleTrigger className="collapsible-trigger">
                          <span>{isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
                          <span className="text-xs">{isExpanded ? '−' : '+'}</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 mt-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evidências esperadas</label>
                            <p className="text-sm mt-1">{q.expectedEvidence}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verificações</label>
                            <p className="text-sm mt-1">{q.imperativeChecks}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Riscos</label>
                            <p className="text-sm mt-1">{q.riskSummary}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frameworks</label>
                            <p className="text-sm mt-1">{q.frameworks.join(', ')}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</label>
                            <Textarea
                              value={answer?.notes || ''}
                              onChange={e => setAnswer(q.questionId, { notes: e.target.value })}
                              placeholder="Adicione observações..."
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}

      {/* Empty state */}
      {groupedQuestions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhuma pergunta encontrada para os frameworks selecionados.</p>
          <Button onClick={() => setShowFrameworkSelector(true)} variant="outline" className="mt-4">
            Selecionar Frameworks
          </Button>
        </div>
      )}
    </div>
  );
}
