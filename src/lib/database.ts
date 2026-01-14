import Dexie, { Table } from 'dexie';

export interface Answer {
  questionId: string;
  frameworkId: string; // NEW: explicit framework association
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
  selectedFrameworks: string[]; // NEW: track selected frameworks
}

class AssessmentDatabase extends Dexie {
  answers!: Table<Answer, string>;
  meta!: Table<AssessmentMeta, string>;

  constructor() {
    super('AISecurityAssessmentDB');
    
    // Version 2: Added frameworkId to answers and selectedFrameworks to meta
    this.version(2).stores({
      answers: 'questionId, frameworkId, response, updatedAt',
      meta: 'id'
    }).upgrade(tx => {
      // Migrate existing answers to include frameworkId (default to NIST_AI_RMF)
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
      selectedFrameworks: ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'] // Default core frameworks
    });
  } else {
    // Ensure selectedFrameworks exists in existing meta
    const meta = await db.meta.get('current');
    if (meta && !meta.selectedFrameworks) {
      await db.meta.update('current', {
        selectedFrameworks: ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD']
      });
    }
  }
}

// Helper functions
export async function saveAnswer(answer: Answer): Promise<void> {
  await db.answers.put({
    ...answer,
    updatedAt: new Date().toISOString()
  });
  
  // Update meta timestamp
  await db.meta.update('current', {
    updatedAt: new Date().toISOString()
  });
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
  await db.meta.update('current', {
    updatedAt: new Date().toISOString()
  });
}

export async function bulkSaveAnswers(answers: Answer[]): Promise<void> {
  await db.answers.bulkPut(answers);
  await db.meta.update('current', {
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
