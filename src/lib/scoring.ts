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
export function calculateOverallMetrics(answersMap: Map<string, Answer>): OverallMetrics {
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
  const coverage = totalApplicable > 0 ? totalAnswered / totalApplicable : 0;
  const evidenceReadiness = evidenceCount > 0 ? totalEvidenceScore / evidenceCount : 0;

  return {
    overallScore,
    maturityLevel: getMaturityLevel(overallScore),
    totalQuestions: questions.length,
    answeredQuestions: totalAnswered,
    applicableQuestions: totalApplicable,
    coverage,
    evidenceReadiness,
    criticalGaps: totalCriticalGaps,
    domainMetrics,
    nistFunctionMetrics,
    ownershipMetrics,
    frameworkCategoryMetrics,
  };
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
  threshold: number = 0.5
): CriticalGap[] {
  const gaps: CriticalGap[] = [];

  questions.forEach(q => {
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

// AUTHORITATIVE FRAMEWORK SET - Only these frameworks are shown in reports/dashboards
const AUTHORITATIVE_FRAMEWORKS = new Set([
  'NIST AI RMF',
  'ISO 27001',
  'ISO 27002',
  'ISO/IEC 23894',
  'NIST SSDF',
  'CSA AI Security',
  'LGPD',
  'OWASP LLM Top 10',
  'OWASP API Security',
  // Secondary but still shown
  'ISO/IEC 42001',
  'NIST SP 800-53',
  'NIST CSF',
  'SLSA',
]);

// Frameworks explicitly excluded from primary views
const EXCLUDED_FRAMEWORKS = new Set([
  'MITRE ATLAS',
  'MITRE ATT&CK',
  'STRIDE',
  'CIS Controls',
  'SOC 2',
  'EU AI Act',
  'IEEE EAD',
  'GDPR',
  'BACEN/CMN',
  'LC 105 (Sigilo)',
]);

export function getFrameworkCoverage(answersMap: Map<string, Answer>): FrameworkCoverage[] {
  const frameworkMap = new Map<string, {
    total: number;
    answered: number;
    scores: number[];
  }>();

  questions.forEach(q => {
    getFrameworkTagsForQuestion(q).forEach(fw => {
      // Normalize framework name for grouping
      const mainFw = normalizeFrameworkName(fw);
      
      // Skip excluded frameworks
      if (EXCLUDED_FRAMEWORKS.has(mainFw) || mainFw === null) {
        return;
      }
      
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
// Returns null for frameworks that should be excluded
function normalizeFrameworkName(fw: string): string | null {
  const lowerFw = fw.toLowerCase();
  
  // CORE FRAMEWORKS (Strategic / Mandatory)
  if (lowerFw.includes('nist ai rmf')) return 'NIST AI RMF';
  if (lowerFw.includes('iso 27001') || lowerFw.includes('iso/iec 27001')) return 'ISO 27001';
  if (lowerFw.includes('iso 27002') || lowerFw.includes('iso/iec 27002')) return 'ISO 27002';
  if (lowerFw.includes('lgpd')) return 'LGPD';
  
  // HIGH VALUE (Execution / Architecture)
  if (lowerFw.includes('iso/iec 23894') || lowerFw.includes('iso 23894')) return 'ISO/IEC 23894';
  if (lowerFw.includes('iso/iec 42001') || lowerFw.includes('iso 42001')) return 'ISO/IEC 42001';
  if (lowerFw.includes('nist ssdf') || lowerFw.includes('ssdf')) return 'NIST SSDF';
  if (lowerFw.includes('csa')) return 'CSA AI Security';
  if (lowerFw.includes('slsa')) return 'SLSA';
  
  // TECH-FOCUSED (Abuse & Exposure)
  if (lowerFw.includes('owasp llm') || lowerFw.includes('owasp top 10 llm')) return 'OWASP LLM Top 10';
  if (lowerFw.includes('owasp api')) return 'OWASP API Security';
  
  // Secondary but still tracked
  if (lowerFw.includes('nist sp 800-53') || lowerFw.includes('nist 800-53')) return 'NIST SP 800-53';
  if (lowerFw.includes('nist csf')) return 'NIST CSF';
  
  // EXCLUDED FRAMEWORKS - Return identifiable name but they'll be filtered out
  if (lowerFw.includes('eu ai act')) return 'EU AI Act';
  if (lowerFw.includes('mitre atlas')) return 'MITRE ATLAS';
  if (lowerFw.includes('mitre att&ck') || lowerFw.includes('mitre attack')) return 'MITRE ATT&CK';
  if (lowerFw.includes('cis controls') || lowerFw.includes('cis critical')) return 'CIS Controls';
  if (lowerFw.includes('gdpr')) return 'GDPR';
  if (lowerFw.includes('ieee ead')) return 'IEEE EAD';
  if (lowerFw.includes('owasp ml') || lowerFw.includes('owasp machine learning')) return 'OWASP ML Security';
  if (lowerFw.includes('owasp top 10') && !lowerFw.includes('llm') && !lowerFw.includes('api')) return 'OWASP Top 10';
  
  // Brazilian Financial Regulation - excluded from primary views
  if (
    lowerFw.includes('res. cmn') ||
    lowerFw.includes('resolução cmn') ||
    lowerFw.includes('cmn 4.') ||
    lowerFw.includes('cmn 5.') ||
    lowerFw.includes('bacen')
  ) return 'BACEN/CMN';
  if (lowerFw.includes('lc 105') || lowerFw.includes('lei complementar 105')) return 'LC 105 (Sigilo)';
  
  // Unknown frameworks - return null to exclude
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
  maxItems: number = 10
): RoadmapItem[] {
  const gaps = getCriticalGaps(answersMap, 0.5);
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
