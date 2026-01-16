/**
 * Question Versioning
 * 
 * Tracks changes to custom questions and allows reverting to previous versions
 */

import { supabase } from '@/integrations/supabase/client';

// Type assertion helper for the question_versions table
// This is needed because the table was just created and types haven't been regenerated
const questionVersionsTable = () => supabase.from('question_versions' as any);

export interface QuestionVersion {
  id: string;
  questionId: string;
  versionNumber: number;
  questionText: string;
  domainId: string;
  subcatId: string | null;
  criticality: string | null;
  ownershipType: string | null;
  riskSummary: string | null;
  expectedEvidence: string | null;
  imperativeChecks: string | null;
  frameworks: string[] | null;
  securityDomainId: string | null;
  changeType: 'create' | 'update' | 'revert';
  changeSummary: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface VersionDiff {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

/**
 * Save a new version of a question
 */
export async function saveQuestionVersion(
  questionId: string,
  data: {
    questionText: string;
    domainId: string;
    subcatId?: string | null;
    criticality?: string | null;
    ownershipType?: string | null;
    riskSummary?: string | null;
    expectedEvidence?: string | null;
    imperativeChecks?: string | null;
    frameworks?: string[] | null;
    securityDomainId?: string | null;
  },
  changeType: 'create' | 'update' | 'revert' = 'update',
  changeSummary?: string
): Promise<QuestionVersion | null> {
  try {
    // Get the next version number
    const { data: existingVersions, error: fetchError } = await questionVersionsTable()
      .select('version_number')
      .eq('question_id', questionId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching version number:', fetchError);
      return null;
    }

    const nextVersion = existingVersions && existingVersions.length > 0 
      ? existingVersions[0].version_number + 1 
      : 1;

    // Insert the new version
    const { data: newVersion, error: insertError } = await questionVersionsTable()
      .insert({
        question_id: questionId,
        version_number: nextVersion,
        question_text: data.questionText,
        domain_id: data.domainId,
        subcat_id: data.subcatId || null,
        criticality: data.criticality || null,
        ownership_type: data.ownershipType || null,
        risk_summary: data.riskSummary || null,
        expected_evidence: data.expectedEvidence || null,
        imperative_checks: data.imperativeChecks || null,
        frameworks: data.frameworks || null,
        security_domain_id: data.securityDomainId || null,
        change_type: changeType,
        change_summary: changeSummary || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving version:', insertError);
      return null;
    }

    return mapVersionRow(newVersion);
  } catch (error) {
    console.error('Error in saveQuestionVersion:', error);
    return null;
  }
}

/**
 * Get all versions of a question
 */
export async function getQuestionVersions(questionId: string): Promise<QuestionVersion[]> {
  try {
    const { data, error } = await questionVersionsTable()
      .select('*')
      .eq('question_id', questionId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      return [];
    }

    return (data || []).map(mapVersionRow);
  } catch (error) {
    console.error('Error in getQuestionVersions:', error);
    return [];
  }
}

/**
 * Get a specific version
 */
export async function getQuestionVersion(versionId: string): Promise<QuestionVersion | null> {
  try {
    const { data, error } = await supabase
      .from('question_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      console.error('Error fetching version:', error);
      return null;
    }

    return mapVersionRow(data);
  } catch (error) {
    console.error('Error in getQuestionVersion:', error);
    return null;
  }
}

/**
 * Get the latest version of a question
 */
export async function getLatestVersion(questionId: string): Promise<QuestionVersion | null> {
  try {
    const { data, error } = await supabase
      .from('question_versions')
      .select('*')
      .eq('question_id', questionId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest version:', error);
      return null;
    }

    return mapVersionRow(data);
  } catch (error) {
    console.error('Error in getLatestVersion:', error);
    return null;
  }
}

/**
 * Get version count for a question
 */
export async function getVersionCount(questionId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('question_versions')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', questionId);

    if (error) {
      console.error('Error counting versions:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getVersionCount:', error);
    return 0;
  }
}

/**
 * Compare two versions and get differences
 */
export function compareVersions(oldVersion: QuestionVersion, newVersion: QuestionVersion): VersionDiff[] {
  const diffs: VersionDiff[] = [];

  const fields: { key: keyof QuestionVersion; label: string }[] = [
    { key: 'questionText', label: 'Texto da Pergunta' },
    { key: 'domainId', label: 'Área' },
    { key: 'subcatId', label: 'Subcategoria' },
    { key: 'criticality', label: 'Criticidade' },
    { key: 'ownershipType', label: 'Responsável' },
    { key: 'riskSummary', label: 'Resumo de Risco' },
    { key: 'expectedEvidence', label: 'Evidência Esperada' },
    { key: 'imperativeChecks', label: 'Verificações' }
  ];

  for (const { key, label } of fields) {
    const oldVal = oldVersion[key]?.toString() || '';
    const newVal = newVersion[key]?.toString() || '';

    if (oldVal !== newVal) {
      diffs.push({
        field: key,
        label,
        oldValue: oldVal,
        newValue: newVal
      });
    }
  }

  // Compare frameworks array
  const oldFrameworks = (oldVersion.frameworks || []).sort().join(', ');
  const newFrameworks = (newVersion.frameworks || []).sort().join(', ');
  if (oldFrameworks !== newFrameworks) {
    diffs.push({
      field: 'frameworks',
      label: 'Frameworks',
      oldValue: oldFrameworks,
      newValue: newFrameworks
    });
  }

  return diffs;
}

/**
 * Delete all versions of a question (when question is deleted)
 */
export async function deleteQuestionVersions(questionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('question_versions')
      .delete()
      .eq('question_id', questionId);

    if (error) {
      console.error('Error deleting versions:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteQuestionVersions:', error);
    return false;
  }
}

/**
 * Get questions with version counts
 */
export async function getQuestionsVersionCounts(questionIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  
  if (questionIds.length === 0) return counts;

  try {
    const { data, error } = await supabase
      .from('question_versions')
      .select('question_id')
      .in('question_id', questionIds);

    if (error) {
      console.error('Error fetching version counts:', error);
      return counts;
    }

    // Count occurrences
    (data || []).forEach(row => {
      const current = counts.get(row.question_id) || 0;
      counts.set(row.question_id, current + 1);
    });

    return counts;
  } catch (error) {
    console.error('Error in getQuestionsVersionCounts:', error);
    return counts;
  }
}

// Helper to map database row to interface
function mapVersionRow(row: any): QuestionVersion {
  return {
    id: row.id,
    questionId: row.question_id,
    versionNumber: row.version_number,
    questionText: row.question_text,
    domainId: row.domain_id,
    subcatId: row.subcat_id,
    criticality: row.criticality,
    ownershipType: row.ownership_type,
    riskSummary: row.risk_summary,
    expectedEvidence: row.expected_evidence,
    imperativeChecks: row.imperative_checks,
    frameworks: row.frameworks,
    securityDomainId: row.security_domain_id,
    changeType: row.change_type as 'create' | 'update' | 'revert',
    changeSummary: row.change_summary,
    changedBy: row.changed_by,
    createdAt: row.created_at
  };
}

// Change type labels
export const CHANGE_TYPE_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  revert: 'Reversão'
};

// Format version date
export function formatVersionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
