import { Answer } from './database';
import {
  domains,
  subcategories,
  questions,
  getSubcategoriesByDomain,
  getQuestionsBySubcategory,
  getQuestionsByDomain,
  getResponseScore,
  getEvidenceMultiplier,
  getMaturityLevel,
  MaturityLevel,
  NistAiRmfFunction,
  nistAiRmfFunctions,
  OwnershipType,
  ownershipTypes,
  FrameworkCategoryId,
  frameworkCategoryIds,
  getFrameworkCategory,
  frameworkCategories,
} from './dataset';

// Combine framework tags from question-level mapping and subcategory references.
// This ensures regulatory references (e.g., BACEN/CMN) defined at subcategory level
// are reflected consistently in analytics without duplicating them across all questions.
function getFrameworkTagsForQuestion(q: { questionId: string; subcatId: string; frameworks: string[] }): string[] {
  const subcat = subcategories.find(s => s.subcatId === q.subcatId);
  const combined = new Set<string>();

  (q.frameworks || []).forEach(fw => fw && combined.add(fw));
  (subcat?.frameworkRefs || []).forEach(fw => fw && combined.add(fw));

  return Array.from(combined);
}

export interface QuestionScore {

  questionId: string;
  responseScore: number | null;
  evidenceMultiplier: number | null;
  effectiveScore: number | null;
  isApplicable: boolean;
}

export interface SubcategoryMetrics {
  subcatId: string;
  subcatName: string;
  domainId: string;
  score: number;
  maturityLevel: MaturityLevel;
  totalQuestions: number;
  answeredQuestions: number;
  applicableQuestions: number;
  coverage: number;
  criticality: string;
  weight: number;
  criticalGaps: number;
  ownershipType?: string;
}

export interface DomainMetrics {
  domainId: string;
  domainName: string;
  nistFunction?: string;
  score: number;
  maturityLevel: MaturityLevel;
  totalQuestions: number;
  answeredQuestions: number;
  applicableQuestions: number;
  coverage: number;
  subcategoryMetrics: SubcategoryMetrics[];
  criticalGaps: number;
}

export interface NistFunctionMetrics {
  function: NistAiRmfFunction;
  score: number;
  maturityLevel: MaturityLevel;
  totalQuestions: number;
  answeredQuestions: number;
  coverage: number;
  domainCount: number;
}

export interface OwnershipMetrics {
  ownershipType: OwnershipType;
  score: number;
  maturityLevel: MaturityLevel;
  totalQuestions: number;
  answeredQuestions: number;
  coverage: number;
}

export interface FrameworkCategoryMetrics {
  categoryId: FrameworkCategoryId;
  categoryName: string;
  score: number;
  maturityLevel: MaturityLevel;
  totalQuestions: number;
  answeredQuestions: number;
  coverage: number;
}

export interface OverallMetrics {
  overallScore: number;
  maturityLevel: MaturityLevel;
  totalQuestions: number;
  answeredQuestions: number;
  applicableQuestions: number;
  coverage: number;
  evidenceReadiness: number;
  criticalGaps: number;
  domainMetrics: DomainMetrics[];
  nistFunctionMetrics: NistFunctionMetrics[];
  ownershipMetrics: OwnershipMetrics[];
  frameworkCategoryMetrics: FrameworkCategoryMetrics[];
}

// Calculate effective score for a single question
export function calculateQuestionScore(answer: Answer | undefined): QuestionScore {
  if (!answer || !answer.response) {
    return {
      questionId: answer?.questionId || '',
      responseScore: null,
      evidenceMultiplier: null,
      effectiveScore: null,
      isApplicable: true,
    };
  }

  const responseScore = getResponseScore(answer.response);
  const evidenceMultiplier = getEvidenceMultiplier(answer.evidenceOk || 'NA');
  
  // NA response means not applicable
  if (answer.response === 'NA') {
    return {
      questionId: answer.questionId,
      responseScore: null,
      evidenceMultiplier: null,
      effectiveScore: null,
      isApplicable: false,
    };
  }

  // If evidence is NA, treat as if evidence was "Não" (0.7 multiplier)
  const effectiveMultiplier = evidenceMultiplier ?? 0.7;
  const effectiveScore = responseScore !== null ? responseScore * effectiveMultiplier : null;

  return {
    questionId: answer.questionId,
    responseScore,
    evidenceMultiplier: effectiveMultiplier,
    effectiveScore,
    isApplicable: true,
  };
}

// Calculate metrics for a subcategory
export function calculateSubcategoryMetrics(
  subcatId: string,
  answersMap: Map<string, Answer>
): SubcategoryMetrics {
  const subcat = subcategories.find(s => s.subcatId === subcatId);
  const subcatQuestions = getQuestionsBySubcategory(subcatId);
  
  if (!subcat) {
    throw new Error(`Subcategory not found: ${subcatId}`);
  }

  let totalEffectiveScore = 0;
  let applicableCount = 0;
  let answeredCount = 0;
  let criticalGaps = 0;

  subcatQuestions.forEach(q => {
    const answer = answersMap.get(q.questionId);
    const scoreData = calculateQuestionScore(answer);

    if (answer?.response) {
      answeredCount++;
    }

    if (scoreData.isApplicable) {
      applicableCount++;
      if (scoreData.effectiveScore !== null) {
        totalEffectiveScore += scoreData.effectiveScore;
        
        // Count critical gaps (low score in high/critical subcategory)
        if (scoreData.effectiveScore < 0.5 && 
            (subcat.criticality === 'High' || subcat.criticality === 'Critical')) {
          criticalGaps++;
        }
      }
    }
  });

  const score = applicableCount > 0 && answeredCount > 0
    ? totalEffectiveScore / applicableCount
    : 0;

  const coverage = applicableCount > 0
    ? answeredCount / applicableCount
    : 0;

  return {
    subcatId,
    subcatName: subcat.subcatName,
    domainId: subcat.domainId,
    score,
    maturityLevel: getMaturityLevel(score),
    totalQuestions: subcatQuestions.length,
    answeredQuestions: answeredCount,
    applicableQuestions: applicableCount,
    coverage,
    criticality: subcat.criticality,
    weight: subcat.weight,
    criticalGaps,
    ownershipType: subcat.ownershipType,
  };
}

// Calculate metrics for a domain
export function calculateDomainMetrics(
  domainId: string,
  answersMap: Map<string, Answer>
): DomainMetrics {
  const domain = domains.find(d => d.domainId === domainId);
  const domainSubcats = getSubcategoriesByDomain(domainId);
  const domainQuestions = getQuestionsByDomain(domainId);
  
  if (!domain) {
    throw new Error(`Domain not found: ${domainId}`);
  }

  const subcategoryMetrics = domainSubcats.map(s => 
    calculateSubcategoryMetrics(s.subcatId, answersMap)
  );

  // Weighted average across subcategories
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalAnswered = 0;
  let totalApplicable = 0;
  let totalCriticalGaps = 0;

  subcategoryMetrics.forEach(sm => {
    if (sm.applicableQuestions > 0 && sm.answeredQuestions > 0) {
      totalWeightedScore += sm.score * sm.weight;
      totalWeight += sm.weight;
    }
    totalAnswered += sm.answeredQuestions;
    totalApplicable += sm.applicableQuestions;
    totalCriticalGaps += sm.criticalGaps;
  });

  const score = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const coverage = totalApplicable > 0 ? totalAnswered / totalApplicable : 0;

  return {
    domainId,
    domainName: domain.domainName,
    nistFunction: domain.nistAiRmfFunction,
    score,
    maturityLevel: getMaturityLevel(score),
    totalQuestions: domainQuestions.length,
    answeredQuestions: totalAnswered,
    applicableQuestions: totalApplicable,
    coverage,
    subcategoryMetrics,
    criticalGaps: totalCriticalGaps,
  };
}

// Calculate NIST function metrics
export function calculateNistFunctionMetrics(
  answersMap: Map<string, Answer>,
  domainMetrics: DomainMetrics[]
): NistFunctionMetrics[] {
  return nistAiRmfFunctions.map(func => {
    const funcDomains = domainMetrics.filter(d => d.nistFunction === func);
    
    let totalScore = 0;
    let totalAnswered = 0;
    let totalQuestions = 0;
    let count = 0;

    funcDomains.forEach(dm => {
      if (dm.answeredQuestions > 0) {
        totalScore += dm.score;
        count++;
      }
      totalAnswered += dm.answeredQuestions;
      totalQuestions += dm.totalQuestions;
    });

    const score = count > 0 ? totalScore / count : 0;
    const coverage = totalQuestions > 0 ? totalAnswered / totalQuestions : 0;

    return {
      function: func,
      score,
      maturityLevel: getMaturityLevel(score),
      totalQuestions,
      answeredQuestions: totalAnswered,
      coverage,
      domainCount: funcDomains.length,
    };
  });
}

// Calculate ownership type metrics
export function calculateOwnershipMetrics(
  answersMap: Map<string, Answer>
): OwnershipMetrics[] {
  return ownershipTypes.map(ownerType => {
    const ownerQuestions = questions.filter(q => q.ownershipType === ownerType);
    
    let totalScore = 0;
    let answeredCount = 0;
    let applicableCount = 0;

    ownerQuestions.forEach(q => {
      const answer = answersMap.get(q.questionId);
      const scoreData = calculateQuestionScore(answer);
      
      if (scoreData.isApplicable) {
        applicableCount++;
        if (scoreData.effectiveScore !== null) {
          totalScore += scoreData.effectiveScore;
          answeredCount++;
        }
      }
    });

    const score = answeredCount > 0 ? totalScore / answeredCount : 0;
    const coverage = applicableCount > 0 ? answeredCount / applicableCount : 0;

    return {
      ownershipType: ownerType,
      score,
      maturityLevel: getMaturityLevel(score),
      totalQuestions: ownerQuestions.length,
      answeredQuestions: answeredCount,
      coverage,
    };
  });
}

// Calculate framework category metrics
export function calculateFrameworkCategoryMetrics(
  answersMap: Map<string, Answer>
): FrameworkCategoryMetrics[] {
  return frameworkCategoryIds.map(categoryId => {
    const categoryQuestions = questions.filter(q =>
      getFrameworkTagsForQuestion(q).some(fw => getFrameworkCategory(fw) === categoryId)
    );

    let totalScore = 0;
    let answeredCount = 0;
    let applicableCount = 0;

    categoryQuestions.forEach(q => {
      const answer = answersMap.get(q.questionId);
      const scoreData = calculateQuestionScore(answer);

      if (scoreData.isApplicable) {
        applicableCount++;
        if (scoreData.effectiveScore !== null) {
          totalScore += scoreData.effectiveScore;
          answeredCount++;
        }
      }
    });

    const score = answeredCount > 0 ? totalScore / answeredCount : 0;
    const coverage = applicableCount > 0 ? answeredCount / applicableCount : 0;
    const categoryInfo = frameworkCategories[categoryId];

    return {
      categoryId,
      categoryName: categoryInfo?.name || categoryId,
      score,
      maturityLevel: getMaturityLevel(score),
      totalQuestions: categoryQuestions.length,
      answeredQuestions: answeredCount,
      coverage,
    };
  });
}

// Calculate overall metrics
export function calculateOverallMetrics(
  answersMap: Map<string, Answer>,
  activeQuestionsCount?: number
): OverallMetrics {
  const domainMetrics = domains.map(d => 
    calculateDomainMetrics(d.domainId, answersMap)
  );

  const nistFunctionMetrics = calculateNistFunctionMetrics(answersMap, domainMetrics);
  const ownershipMetrics = calculateOwnershipMetrics(answersMap);
  const frameworkCategoryMetrics = calculateFrameworkCategoryMetrics(answersMap);

  // Weighted average across domains (using average subcategory weight per domain)
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalAnswered = 0;
  let totalApplicable = 0;
  let totalCriticalGaps = 0;
  let totalEvidenceScore = 0;
  let evidenceCount = 0;

  domainMetrics.forEach(dm => {
    const avgWeight = dm.subcategoryMetrics.reduce((sum, sm) => sum + sm.weight, 0) / 
                      (dm.subcategoryMetrics.length || 1);
    
    if (dm.applicableQuestions > 0 && dm.answeredQuestions > 0) {
      totalWeightedScore += dm.score * avgWeight;
      totalWeight += avgWeight;
    }
    totalAnswered += dm.answeredQuestions;
    totalApplicable += dm.applicableQuestions;
    totalCriticalGaps += dm.criticalGaps;
  });

  // Calculate evidence readiness
  answersMap.forEach(answer => {
    if (answer.response && answer.response !== 'NA') {
      const multiplier = getEvidenceMultiplier(answer.evidenceOk || 'Não');
      if (multiplier !== null) {
        totalEvidenceScore += multiplier;
        evidenceCount++;
      }
    }
  });

  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  // Use the provided active questions count if available, otherwise fall back to total applicable
  const totalQuestionsForCoverage = activeQuestionsCount ?? totalApplicable;
  const coverage = totalQuestionsForCoverage > 0 ? totalAnswered / totalQuestionsForCoverage : 0;
  const evidenceReadiness = evidenceCount > 0 ? totalEvidenceScore / evidenceCount : 0;

  return {
    overallScore,
    maturityLevel: getMaturityLevel(overallScore),
    totalQuestions: activeQuestionsCount ?? questions.length,
    answeredQuestions: totalAnswered,
    applicableQuestions: totalApplicable,
    coverage: Math.min(coverage, 1), // Cap at 100%
    evidenceReadiness,
    criticalGaps: totalCriticalGaps,
    domainMetrics,
    nistFunctionMetrics,
    ownershipMetrics,
    frameworkCategoryMetrics,
  };
}

// Question type for active questions (can be default or custom)
export interface ActiveQuestion {
  questionId: string;
  questionText: string;
  subcatId: string;
  domainId: string;
  ownershipType?: string;
  frameworks: string[];
}

// Get critical gaps (questions with low score in high/critical subcategories)
export interface CriticalGap {
  questionId: string;
  questionText: string;
  subcatId: string;
  subcatName: string;
  domainId: string;
  domainName: string;
  criticality: string;
  effectiveScore: number;
  response: string;
  evidenceOk: string;
  ownershipType?: string;
  nistFunction?: string;
}

export function getCriticalGaps(
  answersMap: Map<string, Answer>,
  threshold: number = 0.5,
  activeQuestions?: ActiveQuestion[]
): CriticalGap[] {
  const gaps: CriticalGap[] = [];

  // Use provided active questions or fall back to default questions
  const questionsToAnalyze = activeQuestions || questions;

  questionsToAnalyze.forEach(q => {
    const subcat = subcategories.find(s => s.subcatId === q.subcatId);
    const domain = domains.find(d => d.domainId === q.domainId);
    const answer = answersMap.get(q.questionId);

    if (!subcat || !domain) return;

    // Only check high/critical subcategories
    if (subcat.criticality !== 'High' && subcat.criticality !== 'Critical') return;

    const scoreData = calculateQuestionScore(answer);

    // Include unanswered questions and low-score questions
    if (scoreData.isApplicable) {
      if (scoreData.effectiveScore === null || scoreData.effectiveScore < threshold) {
        gaps.push({
          questionId: q.questionId,
          questionText: q.questionText,
          subcatId: q.subcatId,
          subcatName: subcat.subcatName,
          domainId: q.domainId,
          domainName: domain.domainName,
          criticality: subcat.criticality,
          effectiveScore: scoreData.effectiveScore ?? 0,
          response: answer?.response || 'Não respondido',
          evidenceOk: answer?.evidenceOk || 'N/A',
          ownershipType: q.ownershipType,
          nistFunction: domain.nistAiRmfFunction,
        });
      }
    }
  });

  // Sort by criticality (Critical first) then by score (lowest first)
  return gaps.sort((a, b) => {
    if (a.criticality !== b.criticality) {
      return a.criticality === 'Critical' ? -1 : 1;
    }
    return a.effectiveScore - b.effectiveScore;
  });
}

// Get framework coverage
export interface FrameworkCoverage {
  framework: string;
  totalQuestions: number;
  answeredQuestions: number;
  averageScore: number;
  coverage: number;
}

// AUTHORITATIVE FRAMEWORK SET (ONLY) - exactly as defined by the user
// These are the only frameworks allowed to appear in reports/dashboards/filters.
const AUTHORITATIVE_FRAMEWORKS = new Set<string>([
  'NIST AI RMF',
  'ISO/IEC 27001 / 27002',
  'LGPD',
  'ISO/IEC 23894',
  'NIST SSDF',
  'CSA AI Security',
  'OWASP Top 10 for LLM Applications',
  'OWASP API Security Top 10',
]);

export function getFrameworkCoverage(
  answersMap: Map<string, Answer>,
  activeQuestions?: ActiveQuestion[]
): FrameworkCoverage[] {
  const frameworkMap = new Map<string, {
    total: number;
    answered: number;
    scores: number[];
  }>();

  // Use provided active questions or fall back to default questions
  const questionsToAnalyze = activeQuestions || questions;

  questionsToAnalyze.forEach(q => {
    getFrameworkTagsForQuestion(q).forEach(fw => {
      // Normalize framework name for grouping
      const mainFw = normalizeFrameworkName(fw);
      if (!mainFw) return; // exclude non-authoritative and unknown

      if (!frameworkMap.has(mainFw)) {
        frameworkMap.set(mainFw, { total: 0, answered: 0, scores: [] });
      }

      const data = frameworkMap.get(mainFw)!;
      data.total++;

      const answer = answersMap.get(q.questionId);
      if (answer?.response && answer.response !== 'NA') {
        data.answered++;
        const scoreData = calculateQuestionScore(answer);
        if (scoreData.effectiveScore !== null) {
          data.scores.push(scoreData.effectiveScore);
        }
      }
    });
  });

  return Array.from(frameworkMap.entries())
    .filter(([framework]) => AUTHORITATIVE_FRAMEWORKS.has(framework))
    .map(([framework, data]) => ({
      framework,
      totalQuestions: data.total,
      answeredQuestions: data.answered,
      averageScore: data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : 0,
      coverage: data.total > 0 ? data.answered / data.total : 0,
    }))
    .sort((a, b) => b.totalQuestions - a.totalQuestions);
}

// Helper to normalize framework names for grouping
// Returns null for frameworks that should NOT be exposed as analysis dimensions
function normalizeFrameworkName(fw: string): string | null {
  const lowerFw = fw.toLowerCase();

  // 1) NIST AI RMF
  if (lowerFw.includes('nist ai rmf') || lowerFw.includes('ai rmf')) return 'NIST AI RMF';

  // 2) ISO/IEC 27001 / 27002 (combined as one dimension)
  if (
    lowerFw.includes('iso 27001') ||
    lowerFw.includes('iso/iec 27001') ||
    lowerFw.includes('iso 27002') ||
    lowerFw.includes('iso/iec 27002')
  ) return 'ISO/IEC 27001 / 27002';

  // 3) LGPD
  if (lowerFw.includes('lgpd')) return 'LGPD';

  // 4) ISO/IEC 23894
  if (lowerFw.includes('iso/iec 23894') || lowerFw.includes('iso 23894')) return 'ISO/IEC 23894';

  // 5) NIST SSDF
  if (lowerFw.includes('nist ssdf') || lowerFw.includes('ssdf')) return 'NIST SSDF';

  // 6) CSA AI Security / AI Governance guidance
  if (lowerFw.includes('csa')) return 'CSA AI Security';

  // 7) OWASP Top 10 for LLM Applications
  if (lowerFw.includes('owasp') && (lowerFw.includes('llm') || lowerFw.includes('top 10 for llm'))) {
    return 'OWASP Top 10 for LLM Applications';
  }

  // 8) OWASP API Security Top 10
  if (lowerFw.includes('owasp') && lowerFw.includes('api')) return 'OWASP API Security Top 10';

  // Everything else is intentionally excluded from primary views:
  // MITRE ATLAS, STRIDE, CIS Benchmarks/Controls, SOC 2, EU AI Act,
  // ISO/IEC 42001, NIST CSF, NIST SP 800-53, SLSA, GDPR, BACEN/CMN, etc.
  return null;
}

// Generate strategic roadmap items based on gaps
export interface RoadmapItem {
  priority: 'immediate' | 'short' | 'medium';
  timeframe: string;
  domain: string;
  action: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  ownershipType: string;
}

export function generateRoadmap(
  answersMap: Map<string, Answer>,
  maxItems: number = 10,
  activeQuestions?: ActiveQuestion[]
): RoadmapItem[] {
  const gaps = getCriticalGaps(answersMap, 0.5, activeQuestions);
  const roadmap: RoadmapItem[] = [];

  // Group gaps by domain and prioritize
  const domainGaps = new Map<string, CriticalGap[]>();
  gaps.forEach(gap => {
    if (!domainGaps.has(gap.domainId)) {
      domainGaps.set(gap.domainId, []);
    }
    domainGaps.get(gap.domainId)!.push(gap);
  });

  let itemCount = 0;
  domainGaps.forEach((domainGapList, domainId) => {
    if (itemCount >= maxItems) return;

    const domain = domains.find(d => d.domainId === domainId);
    if (!domain) return;

    // Take top gaps per domain
    const topGaps = domainGapList.slice(0, 3);
    
    topGaps.forEach((gap, idx) => {
      if (itemCount >= maxItems) return;

      const priority: 'immediate' | 'short' | 'medium' = 
        gap.criticality === 'Critical' && gap.effectiveScore < 0.25 ? 'immediate' :
        gap.criticality === 'Critical' || gap.effectiveScore < 0.25 ? 'short' : 'medium';

      const timeframe = 
        priority === 'immediate' ? '0-30 dias' :
        priority === 'short' ? '30-60 dias' : '60-90 dias';

      roadmap.push({
        priority,
        timeframe,
        domain: domain.domainName,
        action: `Implementar controle: ${gap.subcatName}`,
        impact: gap.criticality === 'Critical' ? 'Alto impacto em risco' : 'Médio impacto em risco',
        effort: gap.response === 'Não respondido' ? 'medium' : gap.effectiveScore < 0.25 ? 'high' : 'low',
        ownershipType: gap.ownershipType || 'GRC',
      });

      itemCount++;
    });
  });

  // Sort by priority
  const priorityOrder = { immediate: 0, short: 1, medium: 2 };
  return roadmap.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
