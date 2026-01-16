import { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAnswersStore } from '@/lib/stores';
import { domains, subcategories, questions, getSubcategoriesByDomain, responseOptions, evidenceOptions } from '@/lib/dataset';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { importAnswersFromXLSX } from '@/lib/xlsxImport';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FrameworkSelector } from '@/components/FrameworkSelector';
import { SecurityDomainSelector } from '@/components/SecurityDomainSelector';
import { DomainSwitcher } from '@/components/DomainSwitcher';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { questionBelongsToFrameworks, getFrameworkById } from '@/lib/frameworks';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getSecurityDomainById, DEFAULT_SECURITY_DOMAINS, SecurityDomain } from '@/lib/securityDomains';
import { ClipboardCheck } from 'lucide-react';

type AssessmentStep = 'domain' | 'framework' | 'questions';

export default function Assessment() {
  const { t } = useTranslation();
  const { answers, setAnswer, clearAnswers, importAnswers, generateDemoData, isLoading, selectedFrameworks, selectedSecurityDomain } = useAnswersStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  
  // Determine initial step based on current state
  const getInitialStep = (): AssessmentStep => {
    if (selectedFrameworks.length > 0) return 'questions';
    if (selectedSecurityDomain) return 'framework';
    return 'domain';
  };
  
  const [currentStep, setCurrentStep] = useState<AssessmentStep>(getInitialStep);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const [currentDomainInfo, setCurrentDomainInfo] = useState<SecurityDomain | null>(null);

  // Track previous domain to detect changes
  const [prevDomain, setPrevDomain] = useState<string>(selectedSecurityDomain);

  // Load domain info and handle domain changes
  useEffect(() => {
    const loadDomainInfo = async () => {
      const domainInfo = await getSecurityDomainById(selectedSecurityDomain);
      setCurrentDomainInfo(domainInfo || DEFAULT_SECURITY_DOMAINS.find(d => d.domainId === selectedSecurityDomain) || null);
    };
    loadDomainInfo();

    // If domain changed while on questions step, go back to framework selection
    if (prevDomain !== selectedSecurityDomain && currentStep === 'questions') {
      setCurrentStep('framework');
    }
    setPrevDomain(selectedSecurityDomain);
  }, [selectedSecurityDomain, prevDomain, currentStep]);

  // Filter questions based on selected frameworks AND security domain
  const filteredQuestions = useMemo(() => {
    if (selectedFrameworks.length === 0) return [];
    return questions.filter(q => {
      // Check if question belongs to selected frameworks
      const belongsToFramework = questionBelongsToFrameworks(q.frameworks, selectedFrameworks);
      // Check if question belongs to selected security domain (if set)
      const belongsToDomain = !selectedSecurityDomain || q.securityDomainId === selectedSecurityDomain;
      return belongsToFramework && belongsToDomain;
    });
  }, [selectedFrameworks, selectedSecurityDomain]);

  // Group filtered questions by domain and subcategory
  const groupedQuestions = useMemo(() => {
    const groups: {
      domain: typeof domains[0];
      answeredCount: number;
      totalCount: number;
      subcategories: {
        subcat: typeof subcategories[0];
        questions: typeof questions;
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
  }, [filteredQuestions, answers]);

  // Calculate metrics based on filtered questions
  const metrics = useMemo(() => {
    const answered = filteredQuestions.filter(q => answers.has(q.questionId) && answers.get(q.questionId)?.response).length;
    return {
      totalQuestions: filteredQuestions.length,
      answeredQuestions: answered,
      coverage: filteredQuestions.length > 0 ? answered / filteredQuestions.length : 0,
    };
  }, [answers, filteredQuestions]);

  // Handle deep link to specific question via URL param
  useEffect(() => {
    const questionId = searchParams.get('questionId');
    if (questionId && !isLoading && filteredQuestions.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.getElementById(`question-${questionId}`);
        if (element) {
          // Expand the question details
          setExpandedQuestions(prev => new Set(prev).add(questionId));
          // Highlight the question
          setHighlightedQuestionId(questionId);
          // Scroll to the question
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Clear the URL param after navigation
          setSearchParams({}, { replace: true });
          // Remove highlight after animation
          setTimeout(() => setHighlightedQuestionId(null), 3000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isLoading, filteredQuestions, setSearchParams]);

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

  const handleExport = async () => {
    const blob = await exportAnswersToXLSX(answers);
    downloadXLSX(blob, generateExportFilename());
    toast.success(t('assessment.exportSuccess'));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importAnswersFromXLSX(file);
    if (result.success) {
      await importAnswers(result.answers);
      toast.success(`${result.answers.length} ${t('assessment.importSuccess')}`);
      if (result.warnings.length > 0) {
        toast.warning(`${result.warnings.length} ${t('assessment.importWarnings')}`);
      }
    } else {
      toast.error(result.errors.join(', '));
    }
    e.target.value = '';
  };

  const handleClear = async () => {
    if (confirm(t('assessment.clearConfirm'))) {
      await clearAnswers();
      toast.success(t('assessment.clearSuccess'));
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

  // Get framework names for display
  const selectedFrameworkNames = selectedFrameworks
    .map(id => getFrameworkById(id)?.shortName)
    .filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">{t('assessment.loading')}</p>
        </div>
      </div>
    );
  }

  // Show domain selector first
  if (currentStep === 'domain') {
    return (
      <div className="max-w-4xl mx-auto py-8 animate-fade-in">
        <SecurityDomainSelector onDomainSelected={() => setCurrentStep('framework')} />
      </div>
    );
  }

  // Show framework selector after domain is selected
  if (currentStep === 'framework') {
    return (
      <div className="max-w-4xl mx-auto py-8 animate-fade-in">
        <FrameworkSelector 
          onStartAssessment={() => setCurrentStep('questions')} 
          onBackToDomainSelector={() => setCurrentStep('domain')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb 
        items={[
          { label: t('navigation.assessment'), icon: ClipboardCheck }
        ]} 
        className="mb-4"
      />

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b -mx-4 px-4 py-4 mb-6">
        <div className="max-w-5xl mx-auto">
          {/* Top row: Title and Actions */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold truncate">
                  {t('navigation.assessment')}: {currentDomainInfo?.domainName || t('assessment.security')}
                </h1>
                <DomainSwitcher variant="badge" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {selectedFrameworkNames.map(name => (
                  <Badge key={name} variant="secondary" className="text-xs font-normal">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button onClick={() => setCurrentStep('framework')} variant="outline" size="sm">
                {t('common.changeFrameworks')}
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm" className="hidden sm:inline-flex">
                {t('common.export')}
              </Button>
            </div>
          </div>

          {/* Progress bar with stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {metrics.answeredQuestions} {t('common.of')} {metrics.totalQuestions} {t('common.answered')}
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
        <span className="text-sm text-muted-foreground mr-2">{t('common.actions')}:</span>
        <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm">
          {t('common.importXLSX')}
        </Button>
        <Button onClick={generateDemoData} variant="ghost" size="sm">
          {t('common.demoData')}
        </Button>
        <Button onClick={handleClear} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          {t('common.clearAll')}
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
                        subcat.criticality === 'Critical' && "border-red-300 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300",
                        subcat.criticality === 'High' && "border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950 dark:text-orange-300",
                        subcat.criticality === 'Medium' && "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300",
                        subcat.criticality === 'Low' && "border-gray-300 text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-300"
                      )}
                    >
                      {subcat.criticality === 'Critical' ? t('assessment.critical') :
                       subcat.criticality === 'High' ? t('assessment.high') :
                       subcat.criticality === 'Medium' ? t('assessment.medium') :
                       subcat.criticality === 'Low' ? t('assessment.low') : subcat.criticality}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {subcatAnswered}/{subcatQuestions.length} {t('common.answered')}
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
                          id={`question-${q.questionId}`}
                          className={cn(
                            "group rounded-lg border bg-card transition-all duration-200",
                            "hover:shadow-md scroll-mt-52",
                            hasResponse ? "border-l-4" : "border-l-4 border-l-muted",
                            answerStatus === 'answered' && "border-l-green-500",
                            answerStatus === 'partial' && "border-l-yellow-500",
                            answerStatus === 'negative' && "border-l-red-400",
                            highlightedQuestionId === q.questionId && "ring-2 ring-primary ring-offset-2 animate-pulse"
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
                                {responseOptions.map(opt => {
                                  const labelMap: Record<string, string> = {
                                    'Sim': t('assessment.responseYes'),
                                    'Parcial': t('assessment.responsePartial'),
                                    'Não': t('assessment.responseNo'),
                                    'NA': t('assessment.responseNA')
                                  };
                                  return (
                                    <button
                                      key={opt.value}
                                      data-value={opt.value}
                                      onClick={() => setAnswer(q.questionId, { response: opt.value as any })}
                                      className={cn(
                                        "py-2.5 px-3 text-sm font-medium rounded-lg border-2 transition-all duration-150",
                                        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                                        answer?.response === opt.value 
                                          ? opt.value === 'Sim' ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" :
                                            opt.value === 'Parcial' ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" :
                                            opt.value === 'Não' ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" :
                                            "border-gray-400 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                          : "border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                                      )}
                                    >
                                      {labelMap[opt.value] || opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Evidence selector - only show if response is not NA */}
                             {answer?.response && answer.response !== 'NA' && (
                              <div className="mb-4 pt-4 border-t border-dashed animate-fade-in">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                                  {t('assessment.evidenceAvailable')}
                                </label>
                                <div className="flex gap-2">
                                  {evidenceOptions.filter(opt => opt.value !== 'NA').map(opt => {
                                    const labelMap: Record<string, string> = {
                                      'Sim': t('assessment.responseYes'),
                                      'Parcial': t('assessment.responsePartial'),
                                      'Não': t('assessment.responseNo')
                                    };
                                    return (
                                      <button
                                        key={opt.value}
                                        data-value={opt.value}
                                        onClick={() => setAnswer(q.questionId, { evidenceOk: opt.value as any })}
                                        className={cn(
                                          "flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-all",
                                          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                                          answer?.evidenceOk === opt.value 
                                            ? opt.value === 'Sim' ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" :
                                              opt.value === 'Parcial' ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" :
                                              "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                            : "border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                                        )}
                                      >
                                        {labelMap[opt.value] || opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Expandable details */}
                            <Collapsible open={isExpanded} onOpenChange={() => toggleQuestionExpanded(q.questionId)}>
                              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 w-full">
                                <span className="h-px flex-1 bg-border" />
                                <span className="flex items-center gap-1.5 px-2">
                                  {isExpanded ? t('assessment.hideDetails') : t('assessment.viewDetails')}
                                  <span className="text-lg leading-none">{isExpanded ? '−' : '+'}</span>
                                </span>
                                <span className="h-px flex-1 bg-border" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="animate-slide-up">
                                <div className="grid gap-4 pt-4">
                                  <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        {t('assessment.expectedEvidence')}
                                      </label>
                                      <p className="text-sm leading-relaxed bg-muted/50 rounded-lg p-3">
                                        {q.expectedEvidence}
                                      </p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        {t('assessment.verifications')}
                                      </label>
                                      <p className="text-sm leading-relaxed bg-muted/50 rounded-lg p-3">
                                        {q.imperativeChecks}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                      {t('assessment.risks')}
                                    </label>
                                    <p className="text-sm leading-relaxed bg-red-50 text-red-900 rounded-lg p-3 border border-red-100">
                                      {q.riskSummary}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                      {t('assessment.relatedFrameworks')}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {q.frameworks.map(fw => (
                                        <Badge key={fw} variant="outline" className="text-xs font-normal">
                                          {fw}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                      {t('assessment.notes')}
                                    </label>
                                    <Textarea
                                      value={answer?.notes || ''}
                                      onChange={e => setAnswer(q.questionId, { notes: e.target.value })}
                                      placeholder={t('assessment.notesPlaceholder')}
                                      className="min-h-[80px] resize-y"
                                    />
                                  </div>
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
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-lg font-medium mb-2">{t('assessment.noQuestionsFound')}</h3>
          <p className="text-muted-foreground mb-6">
            {t('assessment.selectFrameworksHint')}
          </p>
          <Button onClick={() => setCurrentStep('framework')}>
            {t('home.selectFrameworks')}
          </Button>
        </div>
      )}

      {/* Scroll to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        aria-label={t('assessment.backToTop')}
      >
        ↑
      </button>
    </div>
  );
}
