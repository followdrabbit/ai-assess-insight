import Dexie, { Table } from 'dexie';

export interface Answer {
  questionId: string;
  frameworkId: string;
  response: 'Sim' | 'Parcial' | 'Não' | 'NA' | null;
  evidenceOk: 'Sim' | 'Parcial' | 'Não' | 'NA' | null;
  notes: string;
  evidenceLinks: string[];
  updatedAt: string;
}

export interface AssessmentMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  enabledFrameworks: string[];
  selectedFrameworks: string[];
}

// Custom Framework (user-created)
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

// Custom Question (user-created)
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

// Disabled default questions (to track which defaults are disabled)
export interface DisabledQuestion {
  questionId: string;
  disabledAt: string;
}

// Change log for audit trail
export interface ChangeLog {
  id?: number;
  entityType: 'framework' | 'question' | 'setting';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'disable' | 'enable';
  changes: Record<string, any>;
  timestamp: string;
}

class AssessmentDatabase extends Dexie {
  answers!: Table<Answer, string>;
  meta!: Table<AssessmentMeta, string>;
  customFrameworks!: Table<CustomFramework, string>;
  customQuestions!: Table<CustomQuestion, string>;
  disabledQuestions!: Table<DisabledQuestion, string>;
  changeLogs!: Table<ChangeLog, number>;

  constructor() {
    super('AISecurityAssessmentDB');
    
    // Version 3: Added custom frameworks, questions, and change logs
    this.version(3).stores({
      answers: 'questionId, frameworkId, response, updatedAt',
      meta: 'id',
      customFrameworks: 'frameworkId, category, createdAt',
      customQuestions: 'questionId, domainId, subcatId, createdAt',
      disabledQuestions: 'questionId',
      changeLogs: '++id, entityType, entityId, timestamp'
    });

    // Version 2: Added frameworkId to answers and selectedFrameworks to meta
    this.version(2).stores({
      answers: 'questionId, frameworkId, response, updatedAt',
      meta: 'id'
    }).upgrade(tx => {
      return tx.table('answers').toCollection().modify(answer => {
        if (!answer.frameworkId) {
          answer.frameworkId = 'NIST_AI_RMF';
        }
      });
    });

    this.version(1).stores({
      answers: 'questionId, response, updatedAt',
      meta: 'id'
    });
  }
}

export const db = new AssessmentDatabase();

// Initialize database with default meta if needed
export async function initializeDatabase() {
  const metaCount = await db.meta.count();
  if (metaCount === 0) {
    await db.meta.add({
      id: 'current',
      name: 'Avaliação de Maturidade em Segurança de IA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0.0',
      enabledFrameworks: ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'],
      selectedFrameworks: []
    });
  } else {
    const meta = await db.meta.get('current');
    if (meta) {
      const updates: Partial<AssessmentMeta> = {};
      if (!meta.enabledFrameworks) {
        updates.enabledFrameworks = meta.selectedFrameworks || ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'];
      }
      if (!meta.selectedFrameworks) {
        updates.selectedFrameworks = [];
      }
      if (Object.keys(updates).length > 0) {
        await db.meta.update('current', updates);
      }
    }
  }
}

// ============ ANSWERS ============
export async function saveAnswer(answer: Answer): Promise<void> {
  await db.answers.put({
    ...answer,
    updatedAt: new Date().toISOString()
  });
  await db.meta.update('current', { updatedAt: new Date().toISOString() });
}

export async function getAllAnswers(): Promise<Answer[]> {
  return await db.answers.toArray();
}

export async function getAnswer(questionId: string): Promise<Answer | undefined> {
  return await db.answers.get(questionId);
}

export async function getAnswersByFramework(frameworkId: string): Promise<Answer[]> {
  return await db.answers.where('frameworkId').equals(frameworkId).toArray();
}

export async function clearAllAnswers(): Promise<void> {
  await db.answers.clear();
  await db.meta.update('current', { updatedAt: new Date().toISOString() });
}

export async function bulkSaveAnswers(answers: Answer[]): Promise<void> {
  await db.answers.bulkPut(answers);
  await db.meta.update('current', { updatedAt: new Date().toISOString() });
}

// ============ FRAMEWORKS (enabled/selected) ============
export async function getEnabledFrameworks(): Promise<string[]> {
  const meta = await db.meta.get('current');
  return meta?.enabledFrameworks || [];
}

export async function setEnabledFrameworks(frameworkIds: string[]): Promise<void> {
  await db.meta.update('current', {
    enabledFrameworks: frameworkIds,
    updatedAt: new Date().toISOString()
  });
}

export async function getSelectedFrameworks(): Promise<string[]> {
  const meta = await db.meta.get('current');
  return meta?.selectedFrameworks || [];
}

export async function setSelectedFrameworks(frameworkIds: string[]): Promise<void> {
  await db.meta.update('current', {
    selectedFrameworks: frameworkIds,
    updatedAt: new Date().toISOString()
  });
}

// ============ CUSTOM FRAMEWORKS CRUD ============
export async function getAllCustomFrameworks(): Promise<CustomFramework[]> {
  return await db.customFrameworks.toArray();
}

export async function getCustomFramework(frameworkId: string): Promise<CustomFramework | undefined> {
  return await db.customFrameworks.get(frameworkId);
}

export async function createCustomFramework(framework: Omit<CustomFramework, 'isCustom' | 'createdAt' | 'updatedAt'>): Promise<CustomFramework> {
  const now = new Date().toISOString();
  const newFramework: CustomFramework = {
    ...framework,
    isCustom: true,
    createdAt: now,
    updatedAt: now
  };
  await db.customFrameworks.add(newFramework);
  await logChange('framework', framework.frameworkId, 'create', newFramework);
  return newFramework;
}

export async function updateCustomFramework(frameworkId: string, updates: Partial<CustomFramework>): Promise<void> {
  const existing = await db.customFrameworks.get(frameworkId);
  if (!existing) throw new Error('Framework não encontrado');
  
  await db.customFrameworks.update(frameworkId, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await logChange('framework', frameworkId, 'update', updates);
}

export async function deleteCustomFramework(frameworkId: string): Promise<void> {
  const existing = await db.customFrameworks.get(frameworkId);
  if (!existing) throw new Error('Framework não encontrado');
  
  await db.customFrameworks.delete(frameworkId);
  await logChange('framework', frameworkId, 'delete', { frameworkId });
  
  // Also remove from enabled frameworks if present
  const meta = await db.meta.get('current');
  if (meta?.enabledFrameworks.includes(frameworkId)) {
    await setEnabledFrameworks(meta.enabledFrameworks.filter(id => id !== frameworkId));
  }
}

// ============ CUSTOM QUESTIONS CRUD ============
export async function getAllCustomQuestions(): Promise<CustomQuestion[]> {
  return await db.customQuestions.toArray();
}

export async function getCustomQuestion(questionId: string): Promise<CustomQuestion | undefined> {
  return await db.customQuestions.get(questionId);
}

export async function createCustomQuestion(question: Omit<CustomQuestion, 'isCustom' | 'createdAt' | 'updatedAt'>): Promise<CustomQuestion> {
  const now = new Date().toISOString();
  const newQuestion: CustomQuestion = {
    ...question,
    isCustom: true,
    createdAt: now,
    updatedAt: now
  };
  await db.customQuestions.add(newQuestion);
  await logChange('question', question.questionId, 'create', newQuestion);
  return newQuestion;
}

export async function updateCustomQuestion(questionId: string, updates: Partial<CustomQuestion>): Promise<void> {
  const existing = await db.customQuestions.get(questionId);
  if (!existing) throw new Error('Pergunta não encontrada');
  
  await db.customQuestions.update(questionId, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await logChange('question', questionId, 'update', updates);
}

export async function deleteCustomQuestion(questionId: string): Promise<void> {
  const existing = await db.customQuestions.get(questionId);
  if (!existing) throw new Error('Pergunta não encontrada');
  
  await db.customQuestions.delete(questionId);
  await logChange('question', questionId, 'delete', { questionId });
  
  // Also delete any answers for this question
  await db.answers.delete(questionId);
}

// ============ DISABLED DEFAULT QUESTIONS ============
export async function getDisabledQuestions(): Promise<string[]> {
  const disabled = await db.disabledQuestions.toArray();
  return disabled.map(d => d.questionId);
}

export async function disableDefaultQuestion(questionId: string): Promise<void> {
  await db.disabledQuestions.put({
    questionId,
    disabledAt: new Date().toISOString()
  });
  await logChange('question', questionId, 'disable', { questionId });
}

export async function enableDefaultQuestion(questionId: string): Promise<void> {
  await db.disabledQuestions.delete(questionId);
  await logChange('question', questionId, 'enable', { questionId });
}

// ============ CHANGE LOGS ============
export async function logChange(
  entityType: ChangeLog['entityType'],
  entityId: string,
  action: ChangeLog['action'],
  changes: Record<string, any>
): Promise<void> {
  await db.changeLogs.add({
    entityType,
    entityId,
    action,
    changes,
    timestamp: new Date().toISOString()
  });
}

export async function getChangeLogs(limit: number = 100): Promise<ChangeLog[]> {
  return await db.changeLogs.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function getChangeLogsForEntity(entityType: ChangeLog['entityType'], entityId: string): Promise<ChangeLog[]> {
  return await db.changeLogs
    .where({ entityType, entityId })
    .reverse()
    .toArray();
}
