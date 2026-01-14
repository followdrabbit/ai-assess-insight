import { supabase } from '@/integrations/supabase/client';
import maturityRefData from '@/data/maturityRef.json';

export interface Domain {
  domainId: string;
  domainName: string;
  order: number;
  nistAiRmfFunction?: string;
  strategicQuestion?: string;
  description?: string;
  bankingRelevance?: string;
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

// Maturity reference data (static, from JSON)
export const maturityLevels: MaturityLevel[] = maturityRefData.levels;
export const criticalityLevels: CriticalityLevel[] = maturityRefData.criticalityLevels;
export const responseOptions: ResponseOption[] = maturityRefData.responseOptions;
export const evidenceOptions: EvidenceOption[] = maturityRefData.evidenceOptions;

// Cache for data
let domainsCache: Domain[] | null = null;
let subcategoriesCache: Subcategory[] | null = null;
let questionsCache: Question[] | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch domains from database
export async function fetchDomains(forceRefresh = false): Promise<Domain[]> {
  const now = Date.now();
  
  if (!forceRefresh && domainsCache && (now - lastFetch) < CACHE_DURATION) {
    return domainsCache;
  }

  console.log('Fetching domains from database...');
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching domains:', error);
    return domainsCache || [];
  }

  console.log('Domains fetched:', data?.length || 0);
  domainsCache = (data || []).map(row => ({
    domainId: row.domain_id,
    domainName: row.domain_name,
    order: row.display_order || 1,
    nistAiRmfFunction: row.nist_ai_rmf_function,
    strategicQuestion: row.strategic_question,
    description: row.description,
    bankingRelevance: row.banking_relevance
  }));

  lastFetch = now;
  return domainsCache;
}

// Fetch subcategories from database
export async function fetchSubcategories(forceRefresh = false): Promise<Subcategory[]> {
  const now = Date.now();
  
  if (!forceRefresh && subcategoriesCache && (now - lastFetch) < CACHE_DURATION) {
    return subcategoriesCache;
  }

  console.log('Fetching subcategories from database...');
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .order('subcat_id');

  if (error) {
    console.error('Error fetching subcategories:', error);
    return subcategoriesCache || [];
  }

  console.log('Subcategories fetched:', data?.length || 0);
  subcategoriesCache = (data || []).map(row => ({
    subcatId: row.subcat_id,
    domainId: row.domain_id,
    subcatName: row.subcat_name,
    definition: row.definition,
    objective: row.objective,
    securityOutcome: row.security_outcome,
    criticality: (row.criticality || 'Medium') as Subcategory['criticality'],
    weight: Number(row.weight) || 1.0,
    ownershipType: row.ownership_type as Subcategory['ownershipType'],
    riskSummary: row.risk_summary,
    frameworkRefs: row.framework_refs || []
  }));

  return subcategoriesCache;
}

// Fetch questions from database
export async function fetchQuestions(forceRefresh = false): Promise<Question[]> {
  const now = Date.now();
  
  if (!forceRefresh && questionsCache && (now - lastFetch) < CACHE_DURATION) {
    return questionsCache;
  }

  console.log('Fetching questions from database...');
  const { data, error } = await supabase
    .from('default_questions')
    .select('*')
    .order('question_id');

  if (error) {
    console.error('Error fetching questions:', error);
    return questionsCache || [];
  }

  console.log('Questions fetched:', data?.length || 0);
  questionsCache = (data || []).map(row => ({
    questionId: row.question_id,
    subcatId: row.subcat_id,
    domainId: row.domain_id,
    questionText: row.question_text,
    expectedEvidence: row.expected_evidence || '',
    imperativeChecks: row.imperative_checks || '',
    riskSummary: row.risk_summary || '',
    frameworks: row.frameworks || [],
    ownershipType: row.ownership_type as Question['ownershipType']
  }));

  return questionsCache;
}

// Clear all caches
export function clearDataCache(): void {
  domainsCache = null;
  subcategoriesCache = null;
  questionsCache = null;
  lastFetch = 0;
}

// NIST AI RMF Functions for grouping
export const nistAiRmfFunctions = ['GOVERN', 'MAP', 'MEASURE', 'MANAGE'] as const;
export type NistAiRmfFunction = typeof nistAiRmfFunctions[number];

// Ownership types for role-based views
export const ownershipTypes = ['Executive', 'GRC', 'Engineering'] as const;
export type OwnershipType = typeof ownershipTypes[number];

// Rationalized Framework Categories
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
export async function getDomainById(domainId: string): Promise<Domain | undefined> {
  const domains = await fetchDomains();
  return domains.find(d => d.domainId === domainId);
}

export async function getSubcategoryById(subcatId: string): Promise<Subcategory | undefined> {
  const subcategories = await fetchSubcategories();
  return subcategories.find(s => s.subcatId === subcatId);
}

export async function getSubcategoriesByDomain(domainId: string): Promise<Subcategory[]> {
  const subcategories = await fetchSubcategories();
  return subcategories.filter(s => s.domainId === domainId);
}

export async function getQuestionsBySubcategory(subcatId: string): Promise<Question[]> {
  const questions = await fetchQuestions();
  return questions.filter(q => q.subcatId === subcatId);
}

export async function getQuestionsByDomain(domainId: string): Promise<Question[]> {
  const questions = await fetchQuestions();
  return questions.filter(q => q.domainId === domainId);
}

export async function getQuestionById(questionId: string): Promise<Question | undefined> {
  const questions = await fetchQuestions();
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

export async function getDomainsByNistFunction(nistFunction: NistAiRmfFunction): Promise<Domain[]> {
  const domains = await fetchDomains();
  return domains.filter(d => d.nistAiRmfFunction === nistFunction);
}

export async function getSubcategoriesByOwnership(ownershipType: OwnershipType): Promise<Subcategory[]> {
  const subcategories = await fetchSubcategories();
  return subcategories.filter(s => s.ownershipType === ownershipType);
}

export async function getQuestionsByOwnership(ownershipType: OwnershipType): Promise<Question[]> {
  const questions = await fetchQuestions();
  return questions.filter(q => q.ownershipType === ownershipType);
}

export function getFrameworkCategory(framework: string): FrameworkCategoryId | null {
  const lowerFramework = framework.toLowerCase();
  
  if (lowerFramework.includes('nist ai rmf') || lowerFramework.includes('ai rmf')) {
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
  
  return null;
}

export async function getQuestionsByFrameworkCategory(categoryId: FrameworkCategoryId): Promise<Question[]> {
  const questions = await fetchQuestions();
  return questions.filter(q => 
    q.frameworks.some(fw => getFrameworkCategory(fw) === categoryId)
  );
}

export async function getTotalQuestions(): Promise<number> {
  const questions = await fetchQuestions();
  return questions.length;
}

export async function getTotalDomains(): Promise<number> {
  const domains = await fetchDomains();
  return domains.length;
}

export async function getTotalSubcategories(): Promise<number> {
  const subcategories = await fetchSubcategories();
  return subcategories.length;
}

export async function getQuestionCountByDomain(): Promise<Record<string, number>> {
  const [domains, questions] = await Promise.all([fetchDomains(), fetchQuestions()]);
  const counts: Record<string, number> = {};
  domains.forEach(d => {
    counts[d.domainId] = questions.filter(q => q.domainId === d.domainId).length;
  });
  return counts;
}

export async function getQuestionCountBySubcategory(): Promise<Record<string, number>> {
  const [subcategories, questions] = await Promise.all([fetchSubcategories(), fetchQuestions()]);
  const counts: Record<string, number> = {};
  subcategories.forEach(s => {
    counts[s.subcatId] = questions.filter(q => q.subcatId === s.subcatId).length;
  });
  return counts;
}

export async function getQuestionCountByNistFunction(): Promise<Record<NistAiRmfFunction, number>> {
  const [domains, questions] = await Promise.all([fetchDomains(), fetchQuestions()]);
  const counts: Record<string, number> = { GOVERN: 0, MAP: 0, MEASURE: 0, MANAGE: 0 };
  domains.forEach(d => {
    if (d.nistAiRmfFunction) {
      counts[d.nistAiRmfFunction] += questions.filter(q => q.domainId === d.domainId).length;
    }
  });
  return counts as Record<NistAiRmfFunction, number>;
}

export async function getQuestionCountByOwnership(): Promise<Record<OwnershipType, number>> {
  const questions = await fetchQuestions();
  const counts: Record<string, number> = { Executive: 0, GRC: 0, Engineering: 0 };
  questions.forEach(q => {
    if (q.ownershipType) {
      counts[q.ownershipType]++;
    }
  });
  return counts as Record<OwnershipType, number>;
}

export async function getQuestionCountByFrameworkCategory(): Promise<Record<FrameworkCategoryId, number>> {
  const counts: Record<string, number> = {};
  for (const cat of frameworkCategoryIds) {
    const categoryQuestions = await getQuestionsByFrameworkCategory(cat);
    counts[cat] = categoryQuestions.length;
  }
  return counts as Record<FrameworkCategoryId, number>;
}

// Framework categories static definition
export const frameworkCategories: Record<string, FrameworkCategory> = {
  NIST_AI_RMF: {
    name: 'NIST AI RMF',
    description: 'Framework primário de gestão de riscos de IA',
    frameworks: ['NIST AI RMF']
  },
  SECURITY_BASELINE: {
    name: 'Baseline de Segurança',
    description: 'Controles de segurança da informação fundamentais',
    frameworks: ['ISO 27001', 'ISO 27002', 'NIST CSF']
  },
  AI_RISK_MGMT: {
    name: 'Gestão de Riscos de IA',
    description: 'Frameworks específicos para riscos de IA',
    frameworks: ['ISO 23894', 'ISO 42001']
  },
  SECURE_DEVELOPMENT: {
    name: 'Desenvolvimento Seguro',
    description: 'Práticas de segurança no ciclo de desenvolvimento',
    frameworks: ['NIST SSDF', 'CSA']
  },
  PRIVACY_LGPD: {
    name: 'Privacidade e LGPD',
    description: 'Proteção de dados pessoais',
    frameworks: ['LGPD']
  },
  THREAT_EXPOSURE: {
    name: 'Exposição a Ameaças',
    description: 'Riscos técnicos de LLM e API',
    frameworks: ['OWASP LLM', 'OWASP API']
  }
};
