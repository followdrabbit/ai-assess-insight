import taxonomyData from '@/data/taxonomy.json';
import questionsData from '@/data/questions.json';
import maturityRefData from '@/data/maturityRef.json';
import cloudSecurityTaxonomy from '@/data/cloud-security-taxonomy.json';
import cloudSecurityQuestions from '@/data/cloud-security-questions.json';
import devsecOpsTaxonomy from '@/data/devsecops-taxonomy.json';
import devsecOpsQuestions from '@/data/devsecops-questions.json';

export interface Domain {
  domainId: string;
  domainName: string;
  order: number;
  nistAiRmfFunction?: string;
  strategicQuestion?: string;
  description?: string;
  bankingRelevance?: string;
  securityDomainId?: string;
}

export interface Subcategory {
  subcatId: string;
  domainId: string;
  subcatName: string;
  definition?: string;
  objective?: string;
  securityOutcome?: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  weight: number;
  ownershipType?: 'Executive' | 'GRC' | 'Engineering';
  riskSummary?: string;
  frameworkRefs?: string[];
  securityDomainId?: string;
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
  frameworkId?: string;
  ownershipType?: 'Executive' | 'GRC' | 'Engineering';
  securityDomainId?: string;
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

export interface FrameworkCategory {
  name: string;
  description: string;
  frameworks: string[];
}

// Merge domains from all security domains
const aiSecurityDomains: Domain[] = (taxonomyData.domains as Domain[]).map(d => ({
  ...d,
  securityDomainId: 'AI_SECURITY'
}));

const cloudSecurityDomains: Domain[] = (cloudSecurityTaxonomy.domains as Domain[]).map(d => ({
  ...d,
  securityDomainId: 'CLOUD_SECURITY'
}));

const devsecOpsDomains: Domain[] = (devsecOpsTaxonomy.domains as Domain[]).map(d => ({
  ...d,
  securityDomainId: 'DEVSECOPS'
}));

// Merge subcategories from all security domains
const aiSecuritySubcategories: Subcategory[] = (taxonomyData.subcategories as Subcategory[]).map(s => ({
  ...s,
  securityDomainId: 'AI_SECURITY'
}));

const cloudSecuritySubcategories: Subcategory[] = (cloudSecurityTaxonomy.subcategories as Subcategory[]).map(s => ({
  ...s,
  securityDomainId: 'CLOUD_SECURITY'
}));

const devsecOpsSubcategories: Subcategory[] = (devsecOpsTaxonomy.subcategories as Subcategory[]).map(s => ({
  ...s,
  securityDomainId: 'DEVSECOPS'
}));

// Merge questions from all security domains
const aiSecurityQuestions: Question[] = (questionsData.questions as Question[]).map(q => ({
  ...q,
  securityDomainId: 'AI_SECURITY'
}));

const cloudSecurityQuestionsData: Question[] = (cloudSecurityQuestions.questions as Question[]).map(q => ({
  ...q,
  securityDomainId: 'CLOUD_SECURITY'
}));

const devsecOpsQuestionsData: Question[] = (devsecOpsQuestions.questions as Question[]).map(q => ({
  ...q,
  securityDomainId: 'DEVSECOPS'
}));

// Exported merged data
export const domains: Domain[] = [
  ...aiSecurityDomains,
  ...cloudSecurityDomains,
  ...devsecOpsDomains
];

export const subcategories: Subcategory[] = [
  ...aiSecuritySubcategories,
  ...cloudSecuritySubcategories,
  ...devsecOpsSubcategories
];

export const questions: Question[] = [
  ...aiSecurityQuestions,
  ...cloudSecurityQuestionsData,
  ...devsecOpsQuestionsData
];

export const maturityLevels: MaturityLevel[] = maturityRefData.levels;
export const criticalityLevels: CriticalityLevel[] = maturityRefData.criticalityLevels;
export const responseOptions: ResponseOption[] = maturityRefData.responseOptions;
export const evidenceOptions: EvidenceOption[] = maturityRefData.evidenceOptions;
export const frameworkCategories: Record<string, FrameworkCategory> = 
  (taxonomyData as any).frameworkCategories || {};

// NIST AI RMF Functions for grouping
export const nistAiRmfFunctions = ['GOVERN', 'MAP', 'MEASURE', 'MANAGE'] as const;
export type NistAiRmfFunction = typeof nistAiRmfFunctions[number];

// Ownership types for role-based views
export const ownershipTypes = ['Executive', 'GRC', 'Engineering'] as const;
export type OwnershipType = typeof ownershipTypes[number];

// Rationalized Framework Categories for AI Security Maturity
export const frameworkCategoryIds = [
  'NIST_AI_RMF',
  'SECURITY_BASELINE',
  'AI_RISK_MGMT',
  'SECURE_DEVELOPMENT',
  'PRIVACY_LGPD',
  'THREAT_EXPOSURE',
] as const;
export type FrameworkCategoryId = typeof frameworkCategoryIds[number];

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

// Get domains by NIST AI RMF function
export function getDomainsByNistFunction(nistFunction: NistAiRmfFunction): Domain[] {
  return domains.filter(d => d.nistAiRmfFunction === nistFunction);
}

// Get subcategories by ownership type
export function getSubcategoriesByOwnership(ownershipType: OwnershipType): Subcategory[] {
  return subcategories.filter(s => s.ownershipType === ownershipType);
}

// Get questions by ownership type
export function getQuestionsByOwnership(ownershipType: OwnershipType): Question[] {
  return questions.filter(q => q.ownershipType === ownershipType);
}

// Get domains by security domain
export function getDomainsBySecurityDomain(securityDomainId: string): Domain[] {
  return domains.filter(d => d.securityDomainId === securityDomainId);
}

// Get subcategories by security domain
export function getSubcategoriesBySecurityDomain(securityDomainId: string): Subcategory[] {
  return subcategories.filter(s => s.securityDomainId === securityDomainId);
}

// Get questions by security domain
export function getQuestionsBySecurityDomain(securityDomainId: string): Question[] {
  return questions.filter(q => q.securityDomainId === securityDomainId);
}

// Normalize framework name to rationalized category
export function getFrameworkCategory(framework: string): FrameworkCategoryId | null {
  const lowerFramework = framework.toLowerCase();
  
  if (lowerFramework.includes('nist ai rmf') || 
      lowerFramework.includes('ai rmf')) {
    return 'NIST_AI_RMF';
  }
  
  if (lowerFramework.includes('iso 27001') || 
      lowerFramework.includes('iso/iec 27001') ||
      lowerFramework.includes('iso 27002') ||
      lowerFramework.includes('iso/iec 27002') ||
      lowerFramework.includes('nist sp 800-53') || 
      lowerFramework.includes('nist 800-53') ||
      lowerFramework.includes('nist csf')) {
    return 'SECURITY_BASELINE';
  }
  
  if (lowerFramework.includes('iso/iec 23894') || 
      lowerFramework.includes('iso 23894') ||
      lowerFramework.includes('iso/iec 42001') || 
      lowerFramework.includes('iso 42001') ||
      lowerFramework.includes('iso 31000')) {
    return 'AI_RISK_MGMT';
  }
  
  if (lowerFramework.includes('nist ssdf') || 
      lowerFramework.includes('ssdf') ||
      lowerFramework.includes('slsa') || 
      lowerFramework.includes('sbom') ||
      lowerFramework.includes('csa') ||
      (lowerFramework.includes('owasp') && lowerFramework.includes('ml'))) {
    return 'SECURE_DEVELOPMENT';
  }
  
  if (lowerFramework.includes('lgpd') || 
      lowerFramework.includes('privacy framework') ||
      lowerFramework.includes('lc 105') ||
      lowerFramework.includes('lei complementar 105')) {
    return 'PRIVACY_LGPD';
  }
  
  if (lowerFramework.includes('owasp llm') ||
      lowerFramework.includes('owasp api') ||
      lowerFramework.includes('api security')) {
    return 'THREAT_EXPOSURE';
  }
  
  if (lowerFramework.includes('mitre') ||
      lowerFramework.includes('stride') ||
      lowerFramework.includes('cis controls') ||
      lowerFramework.includes('cis benchmark') ||
      lowerFramework.includes('soc 2') ||
      lowerFramework.includes('eu ai act') ||
      lowerFramework.includes('ieee ead') ||
      lowerFramework.includes('gdpr')) {
    return null;
  }
  
  return null;
}

// Get questions by framework category
export function getQuestionsByFrameworkCategory(categoryId: FrameworkCategoryId): Question[] {
  return questions.filter(q => 
    q.frameworks.some(fw => getFrameworkCategory(fw) === categoryId)
  );
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

// Get question count by NIST function
export function getQuestionCountByNistFunction(): Record<NistAiRmfFunction, number> {
  const counts: Record<string, number> = { GOVERN: 0, MAP: 0, MEASURE: 0, MANAGE: 0 };
  domains.forEach(d => {
    if (d.nistAiRmfFunction) {
      counts[d.nistAiRmfFunction] += questions.filter(q => q.domainId === d.domainId).length;
    }
  });
  return counts as Record<NistAiRmfFunction, number>;
}

// Get question count by ownership
export function getQuestionCountByOwnership(): Record<OwnershipType, number> {
  const counts: Record<string, number> = { Executive: 0, GRC: 0, Engineering: 0 };
  questions.forEach(q => {
    if (q.ownershipType) {
      counts[q.ownershipType]++;
    }
  });
  return counts as Record<OwnershipType, number>;
}

// Get question count by framework category
export function getQuestionCountByFrameworkCategory(): Record<FrameworkCategoryId, number> {
  const counts: Record<string, number> = {};
  frameworkCategoryIds.forEach(cat => {
    counts[cat] = getQuestionsByFrameworkCategory(cat).length;
  });
  return counts as Record<FrameworkCategoryId, number>;
}

// Get statistics by security domain
export function getStatsBySecurityDomain(securityDomainId: string): {
  totalDomains: number;
  totalSubcategories: number;
  totalQuestions: number;
} {
  return {
    totalDomains: getDomainsBySecurityDomain(securityDomainId).length,
    totalSubcategories: getSubcategoriesBySecurityDomain(securityDomainId).length,
    totalQuestions: getQuestionsBySecurityDomain(securityDomainId).length,
  };
}
