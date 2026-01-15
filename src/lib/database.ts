import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

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
}

// ============ INITIALIZATION ============
export async function initializeDatabase(): Promise<void> {
  // Check if meta exists, if not it was created by migration
  const { data } = await supabase
    .from('assessment_meta')
    .select('id')
    .eq('id', 'current')
    .single();
  
  if (!data) {
    await supabase.from('assessment_meta').insert({
      id: 'current',
      name: 'Avaliação de Maturidade em Segurança de IA',
      enabled_frameworks: ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'],
      selected_frameworks: [],
      version: '2.0.0'
    });
  }
}

// ============ ANSWERS ============
export async function saveAnswer(answer: Answer): Promise<void> {
  const { error } = await supabase
    .from('answers')
    .upsert({
      question_id: answer.questionId,
      framework_id: answer.frameworkId,
      response: answer.response,
      evidence_ok: answer.evidenceOk,
      notes: answer.notes,
      evidence_links: answer.evidenceLinks
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
  const rows = answers.map(a => ({
    question_id: a.questionId,
    framework_id: a.frameworkId,
    response: a.response,
    evidence_ok: a.evidenceOk,
    notes: a.notes,
    evidence_links: a.evidenceLinks
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
  
  if (error || !data) return ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'];
  return data.enabled_frameworks || [];
}

export async function setEnabledFrameworks(frameworkIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('assessment_meta')
    .update({ enabled_frameworks: frameworkIds })
    .eq('id', 'current');
  
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
  const { error } = await supabase
    .from('assessment_meta')
    .update({ selected_frameworks: frameworkIds })
    .eq('id', 'current');
  
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
    isCustom: true as const,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function createCustomFramework(
  framework: Omit<CustomFramework, 'isCustom' | 'createdAt' | 'updatedAt'>
): Promise<CustomFramework> {
  const { data, error } = await supabase
    .from('custom_frameworks')
    .insert({
      framework_id: framework.frameworkId,
      framework_name: framework.frameworkName,
      short_name: framework.shortName,
      description: framework.description,
      target_audience: framework.targetAudience,
      assessment_scope: framework.assessmentScope,
      default_enabled: framework.defaultEnabled,
      version: framework.version,
      category: framework.category,
      reference_links: framework.references
    })
    .select()
    .single();
  
  if (error) throw error;
  
  await logChange('framework', framework.frameworkId, 'create', framework);
  
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
    isCustom: true as const,
    isDisabled: row.is_disabled || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function createCustomQuestion(
  question: Omit<CustomQuestion, 'isCustom' | 'createdAt' | 'updatedAt'>
): Promise<CustomQuestion> {
  const { data, error } = await supabase
    .from('custom_questions')
    .insert({
      question_id: question.questionId,
      subcat_id: question.subcatId,
      domain_id: question.domainId,
      question_text: question.questionText,
      expected_evidence: question.expectedEvidence,
      imperative_checks: question.imperativeChecks,
      risk_summary: question.riskSummary,
      frameworks: question.frameworks,
      ownership_type: question.ownershipType,
      criticality: question.criticality,
      is_disabled: question.isDisabled
    })
    .select()
    .single();
  
  if (error) throw error;
  
  await logChange('question', question.questionId, 'create', question);
  
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
export async function logChange(
  entityType: ChangeLog['entityType'],
  entityId: string,
  action: ChangeLog['action'],
  changes: Record<string, any>
): Promise<void> {
  await supabase.from('change_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
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
    createdAt: row.created_at
  }));
}

// ============ MATURITY SNAPSHOTS ============
export interface MaturitySnapshot {
  id: string;
  snapshotDate: string;
  snapshotType: 'automatic' | 'manual';
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

export async function getMaturitySnapshots(daysBack: number = 90): Promise<MaturitySnapshot[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  
  const { data, error } = await supabase
    .from('maturity_snapshots')
    .select('*')
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });
  
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
  
  // Check if we already have a snapshot for today with same type
  if (!forceInsert && snapshot.snapshotType === 'automatic') {
    const { data: existing } = await supabase
      .from('maturity_snapshots')
      .select('id')
      .eq('snapshot_date', today)
      .eq('snapshot_type', 'automatic')
      .maybeSingle();
    
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

export async function getLastSnapshotDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from('maturity_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) return null;
  return data.snapshot_date;
}
