import { useMemo, useState, useRef, useCallback } from 'react';
import { useAnswersStore, useNavigationStore } from '@/lib/stores';
import { domains, subcategories, questions, getSubcategoriesByDomain, getQuestionsBySubcategory, responseOptions, evidenceOptions } from '@/lib/dataset';
import { calculateOverallMetrics } from '@/lib/scoring';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { importAnswersFromXLSX } from '@/lib/xlsxImport';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Assessment() {
  const { answers, setAnswer, clearAnswers, importAnswers, generateDemoData, isLoading } = useAnswersStore();
  const { currentDomainId, currentSubcatId, setCurrentDomain, setCurrentSubcat, sidebarExpanded, toggleDomainExpanded } = useNavigationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);

  const currentQuestions = useMemo(() => {
    if (currentSubcatId) {
      return getQuestionsBySubcategory(currentSubcatId);
    }
    if (currentDomainId) {
      return questions.filter(q => q.domainId === currentDomainId);
    }
    return questions;
  }, [currentDomainId, currentSubcatId]);

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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 hidden lg:block">
        <div className="sticky top-24 space-y-2">
          <button
            onClick={() => { setCurrentDomain(null); setCurrentSubcat(null); }}
            className={cn("nav-item w-full text-left", !currentDomainId && "active")}
          >
            Todas as Perguntas ({questions.length})
          </button>
          
          {domains.map(domain => {
            const domainSubcats = getSubcategoriesByDomain(domain.domainId);
            const isExpanded = sidebarExpanded[domain.domainId];
            const domainMetrics = metrics.domainMetrics.find(d => d.domainId === domain.domainId);
            
            return (
              <div key={domain.domainId}>
                <button
                  onClick={() => {
                    setCurrentDomain(domain.domainId);
                    setCurrentSubcat(null);
                    toggleDomainExpanded(domain.domainId);
                  }}
                  className={cn("nav-item w-full text-left justify-between", currentDomainId === domain.domainId && !currentSubcatId && "active")}
                >
                  <span className="truncate">{domain.domainName}</span>
                  <span className="text-xs opacity-70">{Math.round((domainMetrics?.coverage || 0) * 100)}%</span>
                </button>
                
                {isExpanded && (
                  <div className="ml-2 space-y-1 mt-1">
                    {domainSubcats.map(subcat => {
                      const subcatMetrics = domainMetrics?.subcategoryMetrics.find(s => s.subcatId === subcat.subcatId);
                      return (
                        <button
                          key={subcat.subcatId}
                          onClick={() => setCurrentSubcat(subcat.subcatId)}
                          className={cn("nav-subitem w-full text-left", currentSubcatId === subcat.subcatId && "active")}
                        >
                          <span className="truncate flex-1">{subcat.subcatName}</span>
                          <span className={cn("criticality-badge ml-2", `criticality-${subcat.criticality.toLowerCase()}`)}>
                            {subcat.criticality[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Progress bar */}
        <div className="card-elevated p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso da Avaliação</span>
            <span className="text-sm text-muted-foreground">
              {metrics.answeredQuestions} / {metrics.totalQuestions} respondidas ({Math.round(metrics.coverage * 100)}%)
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill bg-primary" 
              style={{ width: `${metrics.coverage * 100}%` }} 
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={handleExport} variant="outline" size="sm">Exportar XLSX</Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">Importar XLSX</Button>
          <Button onClick={generateDemoData} variant="outline" size="sm">Dados Demo</Button>
          <Button onClick={handleClear} variant="outline" size="sm" className="text-destructive">Limpar</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {currentQuestions.map(q => {
            const answer = answers.get(q.questionId);
            const subcat = subcategories.find(s => s.subcatId === q.subcatId);
            const isExpanded = expandedQuestions.has(q.questionId);
            const answerStatus = answer?.response === 'Sim' ? 'answered' : answer?.response === 'Parcial' ? 'partial' : 'unanswered';

            return (
              <div key={q.questionId} className={cn("question-card", answerStatus)}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{q.questionId}</span>
                      {subcat && (
                        <span className={cn("criticality-badge", `criticality-${subcat.criticality.toLowerCase()}`)}>
                          {subcat.criticality}
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{q.questionText}</p>
                  </div>
                </div>

                {/* Response selector */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Resposta</label>
                  <div className="flex gap-2">
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
                    <div className="flex gap-2">
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
    </div>
  );
}
