import taxonomyData from '@/data/taxonomy.json';
import questionsData from '@/data/questions.json';
import maturityRefData from '@/data/maturityRef.json';

export interface Domain {
  domainId: string;
  domainName: string;
  order: number;
}

export interface Subcategory {
  subcatId: string;
  domainId: string;
  subcatName: string;
  definition?: string;
  objective?: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  weight: number;
  riskSummary?: string;
  frameworkRefs?: string[];
}

export interface Question {
  questionId: string;
  subcatId: string;
  domainId: string;
  questionText: string;
  expectedEvidence: string;
  imperativeChecks: string;
  riskSummary: string;
  frameworks: string[];
}

export interface MaturityLevel {
  level: number;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
  color: string;
}

export interface CriticalityLevel {
  name: string;
  weight: number;
  color: string;
}

export interface ResponseOption {
  value: string;
  score: number | null;
  label: string;
}

export interface EvidenceOption {
  value: string;
  multiplier: number | null;
  label: string;
}

// Type assertions for imported data
export const domains: Domain[] = taxonomyData.domains;
export const subcategories: Subcategory[] = taxonomyData.subcategories as Subcategory[];
export const questions: Question[] = questionsData.questions;
export const maturityLevels: MaturityLevel[] = maturityRefData.levels;
export const criticalityLevels: CriticalityLevel[] = maturityRefData.criticalityLevels;
export const responseOptions: ResponseOption[] = maturityRefData.responseOptions;
export const evidenceOptions: EvidenceOption[] = maturityRefData.evidenceOptions;

// Helper functions
export function getDomainById(domainId: string): Domain | undefined {
  return domains.find(d => d.domainId === domainId);
}

export function getSubcategoryById(subcatId: string): Subcategory | undefined {
  return subcategories.find(s => s.subcatId === subcatId);
}

export function getSubcategoriesByDomain(domainId: string): Subcategory[] {
  return subcategories.filter(s => s.domainId === domainId);
}

export function getQuestionsBySubcategory(subcatId: string): Question[] {
  return questions.filter(q => q.subcatId === subcatId);
}

export function getQuestionsByDomain(domainId: string): Question[] {
  return questions.filter(q => q.domainId === domainId);
}

export function getQuestionById(questionId: string): Question | undefined {
  return questions.find(q => q.questionId === questionId);
}

export function getMaturityLevel(score: number): MaturityLevel {
  return maturityLevels.find(l => score >= l.minScore && score <= l.maxScore) || maturityLevels[0];
}

export function getCriticalityWeight(criticality: string): number {
  const level = criticalityLevels.find(c => c.name === criticality);
  return level?.weight || 1.0;
}

export function getResponseScore(response: string): number | null {
  const option = responseOptions.find(o => o.value === response);
  return option?.score ?? null;
}

export function getEvidenceMultiplier(evidence: string): number | null {
  const option = evidenceOptions.find(o => o.value === evidence);
  return option?.multiplier ?? null;
}

// Statistics
export function getTotalQuestions(): number {
  return questions.length;
}

export function getTotalDomains(): number {
  return domains.length;
}

export function getTotalSubcategories(): number {
  return subcategories.length;
}

export function getQuestionCountByDomain(): Record<string, number> {
  const counts: Record<string, number> = {};
  domains.forEach(d => {
    counts[d.domainId] = questions.filter(q => q.domainId === d.domainId).length;
  });
  return counts;
}

export function getQuestionCountBySubcategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  subcategories.forEach(s => {
    counts[s.subcatId] = questions.filter(q => q.subcatId === s.subcatId).length;
  });
  return counts;
}
