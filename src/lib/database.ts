import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { z } from 'zod';
import { logAuditEvent } from './auditLog';

// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ============ VALIDATION SCHEMAS ============
const responseEnum = z.enum(['Sim', 'Parcial', 'Não', 'NA']).nullable();

const answerSchema = z.object({
  questionId: z.string().min(1).max(100),
  frameworkId: z.string().max(100),
  response: responseEnum,
  evidenceOk: responseEnum,
  notes: z.string().max(5000).default(''),
  evidenceLinks: z.array(z.string().max(2000)).max(50).default([]),
  updatedAt: z.string().optional()
});

const customFrameworkSchema = z.object({
  frameworkId: z.string().min(1).max(100),
  frameworkName: z.string().min(1).max(200),
  shortName: z.string().min(1).max(50),
  description: z.string().max(2000).default(''),
  targetAudience: z.array(z.enum(['Executive', 'GRC', 'Engineering'])).default([]),
  assessmentScope: z.string().max(500).default(''),
  defaultEnabled: z.boolean().default(false),
  version: z.string().max(20).default('1.0.0'),
  category: z.enum(['core', 'high-value', 'tech-focused', 'custom']).default('custom'),
  references: z.array(z.string().max(2000)).max(20).default([]),
  securityDomainId: z.string().max(100).optional()
});

const customQuestionSchema = z.object({
  questionId: z.string().min(1).max(100),
  subcatId: z.string().max(100).default(''),
  domainId: z.string().min(1).max(100),
  questionText: z.string().min(1).max(2000),
  expectedEvidence: z.string().max(2000).default(''),
  imperativeChecks: z.string().max(2000).default(''),
  riskSummary: z.string().max(2000).default(''),
  frameworks: z.array(z.string().max(100)).max(20).default([]),
  ownershipType: z.enum(['Executive', 'GRC', 'Engineering']).optional(),
  criticality: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  securityDomainId: z.string().max(100).optional(),
  isDisabled: z.boolean().optional()
});

// ============ TYPES ============
export interface Answer {
  questionId: string;
  frameworkId: string;
  response: 'Sim' | 'Parcial' | 'Não' | 'NA' | null;
  evidenceOk: 'Sim' | 'Parcial' | 'Não' | 'NA' | null;
  notes: string;
  evidenceLinks: string[];
  updatedAt: string;
}

export interface CustomFramework {
  frameworkId: string;
  frameworkName: string;
  shortName: string;
  description: string;
  targetAudience: ('Executive' | 'GRC' | 'Engineering')[];
  assessmentScope: string;
  defaultEnabled: boolean;
  version: string;
  category: 'core' | 'high-value' | 'tech-focused' | 'custom';
  references: string[];
  securityDomainId?: string;
  isCustom: true;
  createdAt: string;
  updatedAt: string;
}

export interface CustomQuestion {
  questionId: string;
  subcatId: string;
  domainId: string;
  questionText: string;
  expectedEvidence: string;
  imperativeChecks: string;
  riskSummary: string;
  frameworks: string[];
  ownershipType?: 'Executive' | 'GRC' | 'Engineering';
  criticality?: 'Low' | 'Medium' | 'High' | 'Critical';
  securityDomainId?: string;
  isCustom: true;
  isDisabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeLog {
  id?: number;
  entityType: 'framework' | 'question' | 'setting' | 'answer';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'disable' | 'enable';
  changes: Record<string, any>;
  createdAt: string;
  // Enhanced audit fields
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  deviceType?: string | null;
  browserName?: string | null;
  osName?: string | null;
}

// ============ INITIALIZATION ============
export async function initializeDatabase(): Promise<void> {
  const userId = await getCurrentUserId();
  
  // Check if meta exists for this user
  const { data } = await supabase
    .from('assessment_meta')
    .select('id')
    .maybeSingle();
  
  if (!data) {
    // All frameworks enabled by default for community testing
    const allFrameworkIds = [
      'NIST_AI_RMF', 'ISO_27001_27002', 'ISO_23894', 'LGPD', 'CSA_AI', 'OWASP_LLM',
      'CSA_CCM', 'CIS_BENCHMARKS', 'NIST_SSDF', 'OWASP_API', 'OWASP_ASVS', 'SLSA'
    ];
    await supabase.from('assessment_meta').insert({
      id: 'current',
      name: 'TrustLayer - Avaliação de Governança de Segurança',
      enabled_frameworks: allFrameworkIds,
      selected_frameworks: [],
      version: '2.0.0',
      user_id: userId
    });
  }
}

// ============ ANSWERS ============
export async function saveAnswer(answer: Answer): Promise<void> {
  // Validate input
  const validated = answerSchema.parse(answer);
  const userId = await getCurrentUserId();
  
  const { error } = await supabase
    .from('answers')
    .upsert({
      question_id: validated.questionId,
      framework_id: validated.frameworkId,
      response: validated.response,
      evidence_ok: validated.evidenceOk,
      notes: validated.notes,
      evidence_links: validated.evidenceLinks,
      user_id: userId
    }, { onConflict: 'question_id' });
  
  if (error) throw error;
}

export async function getAllAnswers(): Promise<Answer[]> {
  const { data, error } = await supabase
    .from('answers')
    .select('*');
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    questionId: row.question_id,
    frameworkId: row.framework_id || '',
    response: row.response as Answer['response'],
    evidenceOk: row.evidence_ok as Answer['evidenceOk'],
    notes: row.notes || '',
    evidenceLinks: row.evidence_links || [],
    updatedAt: row.updated_at
  }));
}

export async function getAnswer(questionId: string): Promise<Answer | undefined> {
  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('question_id', questionId)
    .single();
  
  if (error || !data) return undefined;
  
  return {
    questionId: data.question_id,
    frameworkId: data.framework_id || '',
    response: data.response as Answer['response'],
    evidenceOk: data.evidence_ok as Answer['evidenceOk'],
    notes: data.notes || '',
    evidenceLinks: data.evidence_links || [],
    updatedAt: data.updated_at
  };
}

export async function clearAllAnswers(): Promise<void> {
  const { error } = await supabase
    .from('answers')
    .delete()
    .neq('question_id', '');
  
  if (error) throw error;
}

export async function bulkSaveAnswers(answers: Answer[]): Promise<void> {
  // Validate all answers
  const validatedAnswers = answers.map(a => answerSchema.parse(a));
  const userId = await getCurrentUserId();
  
  const rows = validatedAnswers.map(a => ({
    question_id: a.questionId,
    framework_id: a.frameworkId,
    response: a.response,
    evidence_ok: a.evidenceOk,
    notes: a.notes,
    evidence_links: a.evidenceLinks,
    user_id: userId
  }));
  
  const { error } = await supabase
    .from('answers')
    .upsert(rows, { onConflict: 'question_id' });
  
  if (error) throw error;
}

// ============ FRAMEWORKS (enabled/selected) ============
export async function getEnabledFrameworks(): Promise<string[]> {
  const { data, error } = await supabase
    .from('assessment_meta')
    .select('enabled_frameworks')
    .eq('id', 'current')
    .single();
  
  // All frameworks enabled by default for community testing
  if (error || !data) return [
    'NIST_AI_RMF', 'ISO_27001_27002', 'ISO_23894', 'LGPD', 'CSA_AI', 'OWASP_LLM',
    'CSA_CCM', 'CIS_BENCHMARKS', 'NIST_SSDF', 'OWASP_API', 'OWASP_ASVS', 'SLSA'
  ];
  return data.enabled_frameworks || [];
}

export async function setEnabledFrameworks(frameworkIds: string[]): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('assessment_meta')
    .upsert({ 
      id: 'current', 
      enabled_frameworks: frameworkIds,
      updated_at: new Date().toISOString(),
      user_id: userId
    }, { onConflict: 'id' });
  
  if (error) throw error;
}

export async function getSelectedFrameworks(): Promise<string[]> {
  const { data, error } = await supabase
    .from('assessment_meta')
    .select('selected_frameworks')
    .eq('id', 'current')
    .single();
  
  if (error || !data) return [];
  return data.selected_frameworks || [];
}

export async function setSelectedFrameworks(frameworkIds: string[]): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('assessment_meta')
    .upsert({ 
      id: 'current', 
      selected_frameworks: frameworkIds,
      updated_at: new Date().toISOString(),
      user_id: userId
    }, { onConflict: 'id' });
  
  if (error) throw error;
}

// ============ SECURITY DOMAIN (selected) ============
export async function getSelectedSecurityDomain(): Promise<string | null> {
  const { data, error } = await supabase
    .from('assessment_meta')
    .select('security_domain_id')
    .eq('id', 'current')
    .single();
  
  if (error || !data) return 'AI_SECURITY';
  return (data as any).security_domain_id || 'AI_SECURITY';
}

export async function setSelectedSecurityDomain(domainId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('assessment_meta')
    .upsert({ 
      id: 'current', 
      security_domain_id: domainId,
      updated_at: new Date().toISOString(),
      user_id: userId
    }, { onConflict: 'id' });
  
  if (error) throw error;
}

// ============ CUSTOM FRAMEWORKS CRUD ============
export async function getAllCustomFrameworks(): Promise<CustomFramework[]> {
  const { data, error } = await supabase
    .from('custom_frameworks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    frameworkId: row.framework_id,
    frameworkName: row.framework_name,
    shortName: row.short_name,
    description: row.description || '',
    targetAudience: (row.target_audience || []) as CustomFramework['targetAudience'],
    assessmentScope: row.assessment_scope || '',
    defaultEnabled: row.default_enabled || false,
    version: row.version || '1.0.0',
    category: row.category as CustomFramework['category'],
    references: row.reference_links || [],
    securityDomainId: row.security_domain_id || undefined,
    isCustom: true as const,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function getCustomFramework(frameworkId: string): Promise<CustomFramework | undefined> {
  const { data, error } = await supabase
    .from('custom_frameworks')
    .select('*')
    .eq('framework_id', frameworkId)
    .single();
  
  if (error || !data) return undefined;
  
  return {
    frameworkId: data.framework_id,
    frameworkName: data.framework_name,
    shortName: data.short_name,
    description: data.description || '',
    targetAudience: (data.target_audience || []) as CustomFramework['targetAudience'],
    assessmentScope: data.assessment_scope || '',
    defaultEnabled: data.default_enabled || false,
    version: data.version || '1.0.0',
    category: data.category as CustomFramework['category'],
    references: data.reference_links || [],
    securityDomainId: data.security_domain_id || undefined,
    isCustom: true as const,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function createCustomFramework(
  framework: Omit<CustomFramework, 'isCustom' | 'createdAt' | 'updatedAt'>
): Promise<CustomFramework> {
  // Validate input
  const validated = customFrameworkSchema.parse(framework);
  
  const { data, error } = await supabase
    .from('custom_frameworks')
    .insert({
      framework_id: validated.frameworkId,
      framework_name: validated.frameworkName,
      short_name: validated.shortName,
      description: validated.description,
      target_audience: validated.targetAudience,
      assessment_scope: validated.assessmentScope,
      default_enabled: validated.defaultEnabled,
      version: validated.version,
      category: validated.category,
      reference_links: validated.references,
      security_domain_id: validated.securityDomainId || null
    })
    .select()
    .single();
  
  if (error) throw error;
  
  await logChange('framework', validated.frameworkId, 'create', validated);
  
  return {
    ...framework,
    isCustom: true,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateCustomFramework(
  frameworkId: string, 
  updates: Partial<CustomFramework>
): Promise<void> {
  const updateData: Record<string, any> = {};
  
  if (updates.frameworkName !== undefined) updateData.framework_name = updates.frameworkName;
  if (updates.shortName !== undefined) updateData.short_name = updates.shortName;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.targetAudience !== undefined) updateData.target_audience = updates.targetAudience;
  if (updates.assessmentScope !== undefined) updateData.assessment_scope = updates.assessmentScope;
  if (updates.defaultEnabled !== undefined) updateData.default_enabled = updates.defaultEnabled;
  if (updates.version !== undefined) updateData.version = updates.version;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.references !== undefined) updateData.reference_links = updates.references;
  if (updates.securityDomainId !== undefined) updateData.security_domain_id = updates.securityDomainId;
  
  const { error } = await supabase
    .from('custom_frameworks')
    .update(updateData)
    .eq('framework_id', frameworkId);
  
  if (error) throw error;
  
  await logChange('framework', frameworkId, 'update', updates);
}

export async function deleteCustomFramework(frameworkId: string): Promise<void> {
  const { error } = await supabase
    .from('custom_frameworks')
    .delete()
    .eq('framework_id', frameworkId);
  
  if (error) throw error;
  
  await logChange('framework', frameworkId, 'delete', { frameworkId });
  
  // Also remove from enabled frameworks if present
  const enabledFrameworks = await getEnabledFrameworks();
  if (enabledFrameworks.includes(frameworkId)) {
    await setEnabledFrameworks(enabledFrameworks.filter(id => id !== frameworkId));
  }
}

// ============ CUSTOM QUESTIONS CRUD ============
export async function getAllCustomQuestions(): Promise<CustomQuestion[]> {
  const { data, error } = await supabase
    .from('custom_questions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    questionId: row.question_id,
    subcatId: row.subcat_id || '',
    domainId: row.domain_id,
    questionText: row.question_text,
    expectedEvidence: row.expected_evidence || '',
    imperativeChecks: row.imperative_checks || '',
    riskSummary: row.risk_summary || '',
    frameworks: row.frameworks || [],
    ownershipType: row.ownership_type as CustomQuestion['ownershipType'],
    criticality: row.criticality as CustomQuestion['criticality'],
    securityDomainId: row.security_domain_id || undefined,
    isCustom: true as const,
    isDisabled: row.is_disabled || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function createCustomQuestion(
  question: Omit<CustomQuestion, 'isCustom' | 'createdAt' | 'updatedAt'>
): Promise<CustomQuestion> {
  // Validate input
  const validated = customQuestionSchema.parse(question);
  
  const { data, error } = await supabase
    .from('custom_questions')
    .insert({
      question_id: validated.questionId,
      subcat_id: validated.subcatId,
      domain_id: validated.domainId,
      question_text: validated.questionText,
      expected_evidence: validated.expectedEvidence,
      imperative_checks: validated.imperativeChecks,
      risk_summary: validated.riskSummary,
      frameworks: validated.frameworks,
      ownership_type: validated.ownershipType,
      criticality: validated.criticality,
      security_domain_id: validated.securityDomainId || null,
      is_disabled: validated.isDisabled
    })
    .select()
    .single();
  
  if (error) throw error;
  
  await logChange('question', validated.questionId, 'create', validated);
  
  return {
    ...question,
    isCustom: true,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateCustomQuestion(
  questionId: string, 
  updates: Partial<CustomQuestion>
): Promise<void> {
  const updateData: Record<string, any> = {};
  
  if (updates.subcatId !== undefined) updateData.subcat_id = updates.subcatId;
  if (updates.domainId !== undefined) updateData.domain_id = updates.domainId;
  if (updates.questionText !== undefined) updateData.question_text = updates.questionText;
  if (updates.expectedEvidence !== undefined) updateData.expected_evidence = updates.expectedEvidence;
  if (updates.imperativeChecks !== undefined) updateData.imperative_checks = updates.imperativeChecks;
  if (updates.riskSummary !== undefined) updateData.risk_summary = updates.riskSummary;
  if (updates.frameworks !== undefined) updateData.frameworks = updates.frameworks;
  if (updates.ownershipType !== undefined) updateData.ownership_type = updates.ownershipType;
  if (updates.criticality !== undefined) updateData.criticality = updates.criticality;
  if (updates.securityDomainId !== undefined) updateData.security_domain_id = updates.securityDomainId;
  if (updates.isDisabled !== undefined) updateData.is_disabled = updates.isDisabled;
  
  const { error } = await supabase
    .from('custom_questions')
    .update(updateData)
    .eq('question_id', questionId);
  
  if (error) throw error;
  
  await logChange('question', questionId, 'update', updates);
}

export async function deleteCustomQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('custom_questions')
    .delete()
    .eq('question_id', questionId);
  
  if (error) throw error;
  
  await logChange('question', questionId, 'delete', { questionId });
  
  // Also delete any answers for this question
  await supabase.from('answers').delete().eq('question_id', questionId);
}

// ============ DISABLED DEFAULT QUESTIONS ============
export async function getDisabledQuestions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('disabled_questions')
    .select('question_id');
  
  if (error) throw error;
  return (data || []).map(d => d.question_id);
}

export async function disableDefaultQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('disabled_questions')
    .upsert({ question_id: questionId });
  
  if (error) throw error;
  await logChange('question', questionId, 'disable', { questionId });
}

export async function enableDefaultQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('disabled_questions')
    .delete()
    .eq('question_id', questionId);
  
  if (error) throw error;
  await logChange('question', questionId, 'enable', { questionId });
}

// ============ DISABLED DEFAULT FRAMEWORKS ============
export async function getDisabledFrameworks(): Promise<string[]> {
  const { data, error } = await supabase
    .from('disabled_frameworks')
    .select('framework_id');
  
  if (error) throw error;
  return (data || []).map(d => d.framework_id);
}

export async function disableDefaultFramework(frameworkId: string): Promise<void> {
  const { error } = await supabase
    .from('disabled_frameworks')
    .upsert({ framework_id: frameworkId });
  
  if (error) throw error;
  await logChange('framework', frameworkId, 'disable', { frameworkId });
  
  // Also remove from enabled frameworks if present
  const enabledFrameworks = await getEnabledFrameworks();
  if (enabledFrameworks.includes(frameworkId)) {
    await setEnabledFrameworks(enabledFrameworks.filter(id => id !== frameworkId));
  }
}

export async function enableDefaultFramework(frameworkId: string): Promise<void> {
  const { error } = await supabase
    .from('disabled_frameworks')
    .delete()
    .eq('framework_id', frameworkId);
  
  if (error) throw error;
  await logChange('framework', frameworkId, 'enable', { frameworkId });
}

// ============ CHANGE LOGS ============
/**
 * Log a change with full audit trail (IP, User-Agent, device info)
 * Uses edge function for server-side header capture
 */
export async function logChange(
  entityType: ChangeLog['entityType'],
  entityId: string,
  action: ChangeLog['action'],
  changes: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    entityType,
    entityId,
    action,
    changes
  });
}

export async function getChangeLogs(limit: number = 100): Promise<ChangeLog[]> {
  const { data, error } = await supabase
    .from('change_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    entityType: row.entity_type as ChangeLog['entityType'],
    entityId: row.entity_id,
    action: row.action as ChangeLog['action'],
    changes: row.changes as Record<string, any>,
    createdAt: row.created_at ?? '',
    // Enhanced audit fields
    ipAddress: row.ip_address as string | null,
    userAgent: row.user_agent as string | null,
    requestId: row.request_id as string | null,
    sessionId: row.session_id as string | null,
    deviceType: row.device_type as string | null,
    browserName: row.browser_name as string | null,
    osName: row.os_name as string | null,
  }));
}

// ============ MATURITY SNAPSHOTS ============
export interface MaturitySnapshot {
  id: string;
  snapshotDate: string;
  snapshotType: 'automatic' | 'manual';
  securityDomainId?: string;
  overallScore: number;
  overallCoverage: number;
  evidenceReadiness: number;
  maturityLevel: number;
  totalQuestions: number;
  answeredQuestions: number;
  criticalGaps: number;
  domainMetrics: DomainSnapshot[];
  frameworkMetrics: FrameworkSnapshot[];
  frameworkCategoryMetrics: FrameworkCategorySnapshot[];
  createdAt: string;
}

export interface DomainSnapshot {
  domainId: string;
  domainName: string;
  score: number;
  coverage: number;
  criticalGaps: number;
}

export interface FrameworkSnapshot {
  framework: string;
  score: number;
  coverage: number;
  totalQuestions: number;
  answeredQuestions: number;
}

export interface FrameworkCategorySnapshot {
  categoryId: string;
  categoryName: string;
  score: number;
  coverage: number;
}

export async function getMaturitySnapshots(daysBack: number = 90, securityDomainId?: string): Promise<MaturitySnapshot[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  
  let query = supabase
    .from('maturity_snapshots')
    .select('*')
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });
  
  // Filter by security domain if provided
  if (securityDomainId) {
    query = query.eq('security_domain_id', securityDomainId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map(row => {
    // Parse JSON fields safely - they may be strings or already parsed objects
    const parseJsonField = <T>(field: unknown): T[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field as T[];
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    return {
      id: row.id,
      snapshotDate: row.snapshot_date,
      snapshotType: row.snapshot_type as 'automatic' | 'manual',
      securityDomainId: row.security_domain_id || undefined,
      overallScore: Number(row.overall_score),
      overallCoverage: Number(row.overall_coverage),
      evidenceReadiness: Number(row.evidence_readiness),
      maturityLevel: row.maturity_level,
      totalQuestions: row.total_questions,
      answeredQuestions: row.answered_questions,
      criticalGaps: row.critical_gaps,
      domainMetrics: parseJsonField<DomainSnapshot>(row.domain_metrics),
      frameworkMetrics: parseJsonField<FrameworkSnapshot>(row.framework_metrics),
      frameworkCategoryMetrics: parseJsonField<FrameworkCategorySnapshot>(row.framework_category_metrics),
      createdAt: row.created_at || ''
    };
  });
}

export async function saveMaturitySnapshot(
  snapshot: Omit<MaturitySnapshot, 'id' | 'createdAt'>,
  forceInsert: boolean = false
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const securityDomainId = snapshot.securityDomainId || null;
  const userId = await getCurrentUserId();
  
  // Check if we already have a snapshot for today with same type and domain
  if (!forceInsert && snapshot.snapshotType === 'automatic') {
    let existingQuery = supabase
      .from('maturity_snapshots')
      .select('id')
      .eq('snapshot_date', today)
      .eq('snapshot_type', 'automatic');
    
    if (securityDomainId) {
      existingQuery = existingQuery.eq('security_domain_id', securityDomainId);
    } else {
      existingQuery = existingQuery.is('security_domain_id', null);
    }
    
    const { data: existing } = await existingQuery.maybeSingle();
    
    if (existing) {
      // Update existing snapshot
      const { error } = await supabase
        .from('maturity_snapshots')
        .update({
          overall_score: snapshot.overallScore,
          overall_coverage: snapshot.overallCoverage,
          evidence_readiness: snapshot.evidenceReadiness,
          maturity_level: snapshot.maturityLevel,
          total_questions: snapshot.totalQuestions,
          answered_questions: snapshot.answeredQuestions,
          critical_gaps: snapshot.criticalGaps,
          domain_metrics: snapshot.domainMetrics as unknown as Json,
          framework_metrics: snapshot.frameworkMetrics as unknown as Json,
          framework_category_metrics: snapshot.frameworkCategoryMetrics as unknown as Json
        })
        .eq('id', existing.id);
      
      if (error) throw error;
      return;
    }
  }
  
  // Insert new snapshot
  const { error } = await supabase
    .from('maturity_snapshots')
    .insert([{
      snapshot_date: snapshot.snapshotDate || today,
      snapshot_type: snapshot.snapshotType,
      security_domain_id: securityDomainId,
      user_id: userId,
      overall_score: snapshot.overallScore,
      overall_coverage: snapshot.overallCoverage,
      evidence_readiness: snapshot.evidenceReadiness,
      maturity_level: snapshot.maturityLevel,
      total_questions: snapshot.totalQuestions,
      answered_questions: snapshot.answeredQuestions,
      critical_gaps: snapshot.criticalGaps,
      domain_metrics: snapshot.domainMetrics as unknown as Json,
      framework_metrics: snapshot.frameworkMetrics as unknown as Json,
      framework_category_metrics: snapshot.frameworkCategoryMetrics as unknown as Json
    }]);
  
  if (error) throw error;
}

export async function getLastSnapshotDate(securityDomainId?: string): Promise<string | null> {
  let query = supabase
    .from('maturity_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1);
  
  if (securityDomainId) {
    query = query.eq('security_domain_id', securityDomainId);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error || !data) return null;
  return data.snapshot_date;
}

// ============ CHART ANNOTATIONS ============
export interface ChartAnnotation {
  id: string;
  annotationDate: string;
  title: string;
  description?: string;
  annotationType: string;
  color?: string;
  securityDomainId?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getChartAnnotations(securityDomainId?: string): Promise<ChartAnnotation[]> {
  let query = supabase
    .from('chart_annotations')
    .select('*')
    .order('annotation_date', { ascending: false });
  
  if (securityDomainId) {
    query = query.or(`security_domain_id.eq.${securityDomainId},security_domain_id.is.null`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching chart annotations:', error);
    throw error;
  }
  
  return (data || []).map(row => ({
    id: row.id,
    annotationDate: row.annotation_date,
    title: row.title,
    description: row.description || undefined,
    annotationType: row.annotation_type,
    color: row.color || undefined,
    securityDomainId: row.security_domain_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function createChartAnnotation(annotation: Omit<ChartAnnotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChartAnnotation> {
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from('chart_annotations')
    .insert([{
      annotation_date: annotation.annotationDate,
      title: annotation.title,
      description: annotation.description || null,
      annotation_type: annotation.annotationType,
      color: annotation.color || '#3b82f6',
      security_domain_id: annotation.securityDomainId || null,
      user_id: userId
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating chart annotation:', error);
    throw error;
  }
  
  return {
    id: data.id,
    annotationDate: data.annotation_date,
    title: data.title,
    description: data.description || undefined,
    annotationType: data.annotation_type,
    color: data.color || undefined,
    securityDomainId: data.security_domain_id || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateChartAnnotation(
  id: string, 
  updates: Partial<Omit<ChartAnnotation, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };
  
  if (updates.annotationDate !== undefined) updateData.annotation_date = updates.annotationDate;
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description || null;
  if (updates.annotationType !== undefined) updateData.annotation_type = updates.annotationType;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.securityDomainId !== undefined) updateData.security_domain_id = updates.securityDomainId || null;
  
  const { error } = await supabase
    .from('chart_annotations')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating chart annotation:', error);
    throw error;
  }
}

export async function deleteChartAnnotation(id: string): Promise<void> {
  const { error } = await supabase
    .from('chart_annotations')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting chart annotation:', error);
    throw error;
  }
}
