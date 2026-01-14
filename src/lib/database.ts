import Dexie, { Table } from 'dexie';

export interface Answer {
  questionId: string;
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
}

class AssessmentDatabase extends Dexie {
  answers!: Table<Answer, string>;
  meta!: Table<AssessmentMeta, string>;

  constructor() {
    super('AISecurityAssessmentDB');
    
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
      version: '1.0.0'
    });
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
