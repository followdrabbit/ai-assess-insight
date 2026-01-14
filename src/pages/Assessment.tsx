import { useMemo, useState, useRef, useEffect } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { 
  fetchDomains, 
  fetchSubcategories, 
  fetchQuestions,
  Domain,
  Subcategory,
  Question,
  responseOptions, 
  evidenceOptions 
} from '@/lib/datasetData';
import { questionBelongsToFrameworks, getFrameworkById } from '@/lib/frameworksData';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { importAnswersFromXLSX } from '@/lib/xlsxImport';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FrameworkSelector } from '@/components/FrameworkSelector';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function Assessment() {
  const { answers, setAnswer, clearAnswers, importAnswers, generateDemoData, isLoading, selectedFrameworks } = useAnswersStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(selectedFrameworks.length === 0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Database data state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedFrameworkNames, setSelectedFrameworkNames] = useState<string[]>([]);

  // Load data from database
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        const [domainsData, subcatsData, questionsData] = await Promise.all([
          fetchDomains(),
          fetchSubcategories(),
          fetchQuestions()
        ]);
        setDomains(domainsData);
        setSubcategories(subcatsData);
        setQuestions(questionsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  // Load framework names when selected frameworks change
  useEffect(() => {
    async function loadFrameworkNames() {
      const names: string[] = [];
      for (const id of selectedFrameworks) {
        const fw = await getFrameworkById(id);
        if (fw) names.push(fw.shortName);
      }
      setSelectedFrameworkNames(names);
    }
    loadFrameworkNames();
  }, [selectedFrameworks]);

  // Helper to get subcategories by domain
  const getSubcategoriesByDomain = (domainId: string) => {
    return subcategories.filter(s => s.domainId === domainId);
  };

  // Filter questions based on selected frameworks
  const filteredQuestions = useMemo(() => {
    if (selectedFrameworks.length === 0) return [];
    return questions.filter(q => questionBelongsToFrameworks(q.frameworks, selectedFrameworks));
  }, [selectedFrameworks, questions]);

  // Group filtered questions by domain and subcategory
  const groupedQuestions = useMemo(() => {
    const groups: {
      domain: Domain;
      answeredCount: number;
      totalCount: number;
      subcategories: {
        subcat: Subcategory;
        questions: Question[];
        answeredCount: number;
      }[];
    }[] = [];

    domains.forEach(domain => {
      const domainQuestions = filteredQuestions.filter(q => q.domainId === domain.domainId);
      if (domainQuestions.length === 0) return;

      const domainSubcats = getSubcategoriesByDomain(domain.domainId);
      const subcatGroups: typeof groups[0]['subcategories'] = [];
      let domainAnswered = 0;

      domainSubcats.forEach(subcat => {
        const subcatQuestions = domainQuestions.filter(q => q.subcatId === subcat.subcatId);
        if (subcatQuestions.length > 0) {
          const answered = subcatQuestions.filter(q => answers.has(q.questionId) && answers.get(q.questionId)?.response).length;
          domainAnswered += answered;
          subcatGroups.push({ subcat, questions: subcatQuestions, answeredCount: answered });
        }
      });

      if (subcatGroups.length > 0) {
        groups.push({ 
          domain, 
          subcategories: subcatGroups,
          answeredCount: domainAnswered,
          totalCount: domainQuestions.length
        });
      }
    });

    return groups;
  }, [filteredQuestions, answers, domains, subcategories]);

  // Calculate metrics based on filtered questions
  const metrics = useMemo(() => {
    const answered = filteredQuestions.filter(q => answers.has(q.questionId) && answers.get(q.questionId)?.response).length;
    return {
      totalQuestions: filteredQuestions.length,
      answeredQuestions: answered,
      coverage: filteredQuestions.length > 0 ? answered / filteredQuestions.length : 0,
    };
  }, [answers, filteredQuestions]);

  // Track scroll position for active section highlight
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-domain-id]');
      let current = '';
      
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 200) {
          current = section.getAttribute('data-domain-id') || '';
        }
      });
      
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const scrollToSection = (domainId: string) => {
    const element = document.querySelector(`[data-domain-id="${domainId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando avaliação...</p>
        </div>
      </div>
    );
  }

  // Show framework selector if no frameworks selected or user wants to change
  if (showFrameworkSelector) {
    return (
      <div className="max-w-4xl mx-auto py-8 animate-fade-in">
        <FrameworkSelector onStartAssessment={() => setShowFrameworkSelector(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b -mx-4 px-4 py-4 mb-6">
        <div className="max-w-5xl mx-auto">
          {/* Top row: Title and Actions */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold truncate">Avaliação de Segurança de IA</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {selectedFrameworkNames.map(name => (
                  <Badge key={name} variant="secondary" className="text-xs font-normal">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button onClick={() => setShowFrameworkSelector(true)} variant="outline" size="sm">
                Alterar
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm" className="hidden sm:inline-flex">
                Exportar
              </Button>
            </div>
          </div>

          {/* Progress bar with stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {metrics.answeredQuestions} de {metrics.totalQuestions} respondidas
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  metrics.coverage === 1 ? "bg-green-100 text-green-700" :
                  metrics.coverage >= 0.5 ? "bg-yellow-100 text-yellow-700" :
                  "bg-muted text-muted-foreground"
                )}>
                  {Math.round(metrics.coverage * 100)}%
                </span>
              </div>
            </div>
            <Progress value={metrics.coverage * 100} className="h-2" />
          </div>

          {/* Quick nav */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            {groupedQuestions.map(({ domain, answeredCount, totalCount }) => {
              const isComplete = answeredCount === totalCount;
              const isActive = activeSection === domain.domainId;
              return (
                <button
                  key={domain.domainId}
                  onClick={() => scrollToSection(domain.domainId)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted hover:bg-accent text-muted-foreground hover:text-foreground",
                    isComplete && !isActive && "bg-green-100 text-green-700 hover:bg-green-200"
                  )}
                >
                  <span className="truncate max-w-[120px]">{domain.domainName}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-primary-foreground/20" : "bg-background"
                  )}>
                    {answeredCount}/{totalCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary actions bar */}
      <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b">
        <span className="text-sm text-muted-foreground mr-2">Ações:</span>
        <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm">
          Importar XLSX
        </Button>
        <Button onClick={generateDemoData} variant="ghost" size="sm">
          Dados Demo
        </Button>
        <Button onClick={handleClear} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          Limpar Tudo
        </Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
      </div>

      {/* Questions grouped by Domain > Subcategory */}
      <div className="space-y-12">
        {groupedQuestions.map(({ domain, subcategories: subcatGroups, answeredCount, totalCount }) => (
          <section 
            key={domain.domainId} 
            data-domain-id={domain.domainId}
            className="scroll-mt-48 animate-fade-in"
          >
            {/* Domain Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{domain.domainName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{domain.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm flex-shrink-0">
                  <div className={cn(
                    "px-3 py-1 rounded-full font-medium",
                    answeredCount === totalCount 
                      ? "bg-green-100 text-green-700" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {answeredCount}/{totalCount}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Progress 
                  value={totalCount > 0 ? (answeredCount / totalCount) * 100 : 0} 
                  className="h-1" 
                />
              </div>
            </div>

            {/* Subcategories */}
            <div className="space-y-8">
              {subcatGroups.map(({ subcat, questions: subcatQuestions, answeredCount: subcatAnswered }) => (
                <div key={subcat.subcatId}>
                  {/* Subcategory Header */}
                  <div className="flex items-center gap-3 mb-4 pb-2 border-b border-dashed">
                    <h3 className="text-base font-medium">{subcat.subcatName}</h3>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] uppercase",
                        subcat.criticality === 'Critical' && "border-red-300 text-red-700 bg-red-50",
                        subcat.criticality === 'High' && "border-orange-300 text-orange-700 bg-orange-50",
                        subcat.criticality === 'Medium' && "border-blue-300 text-blue-700 bg-blue-50",
                        subcat.criticality === 'Low' && "border-gray-300 text-gray-600 bg-gray-50"
                      )}
                    >
                      {subcat.criticality}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {subcatAnswered}/{subcatQuestions.length} respondidas
                    </span>
                  </div>

                  {/* Questions */}
                  <div className="space-y-4">
                    {subcatQuestions.map((q, idx) => {
                      const answer = answers.get(q.questionId);
                      const isExpanded = expandedQuestions.has(q.questionId);
                      const hasResponse = !!answer?.response;
                      const answerStatus = answer?.response === 'Sim' ? 'answered' : 
                                          answer?.response === 'Parcial' ? 'partial' : 
                                          answer?.response === 'Não' ? 'negative' : 'unanswered';

                      return (
                        <div 
                          key={q.questionId} 
                          className={cn(
                            "group rounded-lg border bg-card transition-all duration-200",
                            "hover:shadow-md",
                            hasResponse ? "border-l-4" : "border-l-4 border-l-muted",
                            answerStatus === 'answered' && "border-l-green-500",
                            answerStatus === 'partial' && "border-l-yellow-500",
                            answerStatus === 'negative' && "border-l-red-400"
                          )}
                        >
                          <div className="p-5">
                            {/* Question header */}
                            <div className="flex items-start gap-4 mb-4">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                                hasResponse 
                                  ? answerStatus === 'answered' ? "bg-green-100 text-green-700" :
                                    answerStatus === 'partial' ? "bg-yellow-100 text-yellow-700" :
                                    answerStatus === 'negative' ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-600"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium leading-relaxed">{q.questionText}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {q.questionId}
                                  </span>
                                  <span className="text-muted-foreground">•</span>
                                  {q.frameworks.map((fw, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] font-normal">
                                      {fw}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Response selector */}
                            <div className="mb-4">
                              <div className="grid grid-cols-4 gap-2">
                                {responseOptions.map(opt => (
                                  <button
                                    key={opt.value}
                                    data-value={opt.value}
                                    onClick={() => setAnswer(q.questionId, { response: opt.value as any })}
                                    className={cn(
                                      "py-2.5 px-3 text-sm font-medium rounded-lg border-2 transition-all duration-150",
                                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                                      answer?.response === opt.value 
                                        ? opt.value === 'Sim' ? "border-green-500 bg-green-50 text-green-700" :
                                          opt.value === 'Parcial' ? "border-yellow-500 bg-yellow-50 text-yellow-700" :
                                          opt.value === 'Não' ? "border-red-500 bg-red-50 text-red-700" :
                                          "border-gray-400 bg-gray-100 text-gray-600"
                                        : "border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Evidence selector (only if response is not NA) */}
                            {answer?.response && answer.response !== 'NA' && (
                              <div className="mb-4">
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                  Evidência disponível?
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                  {evidenceOptions.map(opt => (
                                    <button
                                      key={opt.value}
                                      onClick={() => setAnswer(q.questionId, { evidenceOk: opt.value as any })}
                                      className={cn(
                                        "py-2 px-3 text-sm rounded-lg border transition-all duration-150",
                                        answer?.evidenceOk === opt.value 
                                          ? "border-primary bg-primary/10 text-primary font-medium"
                                          : "border-transparent bg-muted/50 text-muted-foreground hover:bg-accent"
                                      )}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Expandable details */}
                            <Collapsible open={isExpanded} onOpenChange={() => toggleQuestionExpanded(q.questionId)}>
                              <CollapsibleTrigger className="text-sm text-primary hover:underline">
                                {isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes e notas'}
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-4 space-y-4">
                                {/* Expected evidence */}
                                {q.expectedEvidence && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1">
                                      Evidência esperada
                                    </label>
                                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{q.expectedEvidence}</p>
                                  </div>
                                )}

                                {/* Imperative checks */}
                                {q.imperativeChecks && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1">
                                      Verificações imperativas
                                    </label>
                                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{q.imperativeChecks}</p>
                                  </div>
                                )}

                                {/* Risk summary */}
                                {q.riskSummary && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1">
                                      Resumo de risco
                                    </label>
                                    <p className="text-sm bg-amber-50 text-amber-900 p-3 rounded-lg">{q.riskSummary}</p>
                                  </div>
                                )}

                                {/* Notes */}
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                                    Notas / Observações
                                  </label>
                                  <Textarea 
                                    value={answer?.notes || ''}
                                    onChange={(e) => setAnswer(q.questionId, { notes: e.target.value })}
                                    placeholder="Adicione notas, justificativas ou observações..."
                                    className="min-h-[80px]"
                                  />
                                </div>

                                {/* Evidence links */}
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                                    Links de evidência
                                  </label>
                                  <Textarea 
                                    value={answer?.evidenceLinks?.join('\n') || ''}
                                    onChange={(e) => setAnswer(q.questionId, { 
                                      evidenceLinks: e.target.value.split('\n').filter(l => l.trim()) 
                                    })}
                                    placeholder="Cole links de evidência (um por linha)..."
                                    className="min-h-[60px] font-mono text-xs"
                                  />
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Empty state */}
      {groupedQuestions.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            Nenhuma pergunta encontrada para os frameworks selecionados.
          </p>
          <Button onClick={() => setShowFrameworkSelector(true)}>
            Alterar Frameworks
          </Button>
        </div>
      )}
    </div>
  );
}
