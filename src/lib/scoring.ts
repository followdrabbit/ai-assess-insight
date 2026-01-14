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
} from './dataset';

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
}

export interface DomainMetrics {
  domainId: string;
  domainName: string;
  score: number;
  maturityLevel: MaturityLevel;
  totalQuestions: number;
  answeredQuestions: number;
  applicableQuestions: number;
  coverage: number;
  subcategoryMetrics: SubcategoryMetrics[];
  criticalGaps: number;
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

// Calculate overall metrics
export function calculateOverallMetrics(answersMap: Map<string, Answer>): OverallMetrics {
  const domainMetrics = domains.map(d => 
    calculateDomainMetrics(d.domainId, answersMap)
  );

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

export function getFrameworkCoverage(answersMap: Map<string, Answer>): FrameworkCoverage[] {
  const frameworkMap = new Map<string, {
    total: number;
    answered: number;
    scores: number[];
  }>();

  questions.forEach(q => {
    q.frameworks.forEach(fw => {
      // Extract main framework name (before " - ")
      const mainFw = fw.split(' - ')[0].trim();
      
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
