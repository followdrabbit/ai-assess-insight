import Dexie, { Table } from 'dexie';
import { db, Answer, getAllAnswers } from './database';
import { frameworks as defaultFrameworks, Framework } from './frameworks';
import { questions as defaultQuestions, domains, subcategories } from './dataset';

// ========================================
// TYPES
// ========================================

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
  status: 'active' | 'disabled';
  notes: string;
  isCustom: boolean;
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
  frameworkId: string;
  ownershipType: 'Executive' | 'GRC' | 'Engineering';
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  weight: number;
  status: 'active' | 'disabled';
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeLogEntry {
  id?: number;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable' | 'restore' | 'reset' | 'backup' | 'import';
  entityType: 'framework' | 'question' | 'answer' | 'settings' | 'backup';
  entityId: string;
  entityName: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface BackupRecord {
  id?: number;
  name: string;
  description: string;
  createdAt: string;
  size: number;
  type: 'manual' | 'scheduled' | 'auto';
  version: string;
  answersCount: number;
  frameworksCount: number;
  questionsCount: number;
  checksum: string;
  data: string; // JSON stringified backup data
}

export interface PlatformSettings {
  id: string;
  // Scheduling
  scheduledBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupRetention: number; // Number of backups to keep
  lastScheduledBackup: string | null;
  // Assessment
  assessmentRemindersEnabled: boolean;
  reminderFrequencyDays: number;
  reviewCadenceMonths: number;
  // Security
  readOnlyMode: boolean;
  configLocked: boolean;
  configLockedAt: string | null;
  // Versioning
  platformVersion: string;
  frameworksVersion: string;
  questionsVersion: string;
  lastModified: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface FullBackupData {
  version: string;
  exportedAt: string;
  platform: {
    version: string;
    frameworksVersion: string;
    questionsVersion: string;
  };
  settings: PlatformSettings;
  selectedFrameworks: string[];
  customFrameworks: CustomFramework[];
  customQuestions: CustomQuestion[];
  answers: Answer[];
  changeLog: ChangeLogEntry[];
}

// ========================================
// DATABASE
// ========================================

class SettingsDatabase extends Dexie {
  customFrameworks!: Table<CustomFramework, string>;
  customQuestions!: Table<CustomQuestion, string>;
  changeLog!: Table<ChangeLogEntry, number>;
  backups!: Table<BackupRecord, number>;
  settings!: Table<PlatformSettings, string>;

  constructor() {
    super('AISecuritySettingsDB');
    
    this.version(1).stores({
      customFrameworks: 'frameworkId, status, isCustom, createdAt',
      customQuestions: 'questionId, frameworkId, domainId, subcatId, status, isCustom, createdAt',
      changeLog: '++id, timestamp, action, entityType, entityId',
      backups: '++id, createdAt, type, name',
      settings: 'id'
    });
  }
}

export const settingsDb = new SettingsDatabase();

// ========================================
// INITIALIZATION
// ========================================

const DEFAULT_SETTINGS: PlatformSettings = {
  id: 'main',
  scheduledBackupEnabled: false,
  backupFrequency: 'weekly',
  backupRetention: 5,
  lastScheduledBackup: null,
  assessmentRemindersEnabled: false,
  reminderFrequencyDays: 7,
  reviewCadenceMonths: 3,
  readOnlyMode: false,
  configLocked: false,
  configLockedAt: null,
  platformVersion: '2.0.0',
  frameworksVersion: '1.0.0',
  questionsVersion: '1.0.0',
  lastModified: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function initializeSettingsDatabase(): Promise<void> {
  const existingSettings = await settingsDb.settings.get('main');
  if (!existingSettings) {
    await settingsDb.settings.add(DEFAULT_SETTINGS);
  }
}

// ========================================
// SETTINGS OPERATIONS
// ========================================

export async function getSettings(): Promise<PlatformSettings> {
  await initializeSettingsDatabase();
  const settings = await settingsDb.settings.get('main');
  return settings || DEFAULT_SETTINGS;
}

export async function updateSettings(updates: Partial<PlatformSettings>): Promise<void> {
  await settingsDb.settings.update('main', {
    ...updates,
    updatedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  });
  await logChange({
    action: 'update',
    entityType: 'settings',
    entityId: 'main',
    entityName: 'Platform Settings',
    details: `Updated settings: ${Object.keys(updates).join(', ')}`,
  });
}

// ========================================
// FRAMEWORK OPERATIONS
// ========================================

export async function getAllFrameworks(): Promise<CustomFramework[]> {
  const customFrameworks = await settingsDb.customFrameworks.toArray();
  
  // Merge with default frameworks
  const mergedFrameworks: CustomFramework[] = defaultFrameworks.map(fw => {
    const custom = customFrameworks.find(cf => cf.frameworkId === fw.frameworkId);
    if (custom) return custom;
    
    return {
      ...fw,
      status: 'active' as const,
      notes: '',
      isCustom: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
  
  // Add purely custom frameworks
  customFrameworks
    .filter(cf => cf.isCustom)
    .forEach(cf => {
      if (!mergedFrameworks.find(mf => mf.frameworkId === cf.frameworkId)) {
        mergedFrameworks.push(cf);
      }
    });
  
  return mergedFrameworks;
}

export async function saveFramework(framework: CustomFramework): Promise<void> {
  const existing = await settingsDb.customFrameworks.get(framework.frameworkId);
  const now = new Date().toISOString();
  
  if (existing) {
    await settingsDb.customFrameworks.update(framework.frameworkId, {
      ...framework,
      updatedAt: now,
    });
    await logChange({
      action: 'update',
      entityType: 'framework',
      entityId: framework.frameworkId,
      entityName: framework.shortName,
      details: `Updated framework "${framework.shortName}"`,
    });
  } else {
    await settingsDb.customFrameworks.add({
      ...framework,
      createdAt: now,
      updatedAt: now,
    });
    await logChange({
      action: 'create',
      entityType: 'framework',
      entityId: framework.frameworkId,
      entityName: framework.shortName,
      details: `Created framework "${framework.shortName}"`,
    });
  }
  
  await updateVersions('frameworks');
}

export async function deleteFramework(frameworkId: string): Promise<{ success: boolean; error?: string }> {
  const answers = await getAllAnswers();
  const relatedAnswers = answers.filter(a => a.frameworkId === frameworkId);
  
  if (relatedAnswers.length > 0) {
    return {
      success: false,
      error: `Cannot delete framework: ${relatedAnswers.length} answers are associated with this framework.`
    };
  }
  
  const framework = await settingsDb.customFrameworks.get(frameworkId);
  await settingsDb.customFrameworks.delete(frameworkId);
  
  await logChange({
    action: 'delete',
    entityType: 'framework',
    entityId: frameworkId,
    entityName: framework?.shortName || frameworkId,
    details: `Deleted framework "${framework?.shortName || frameworkId}"`,
  });
  
  await updateVersions('frameworks');
  return { success: true };
}

export async function toggleFrameworkStatus(frameworkId: string, status: 'active' | 'disabled'): Promise<void> {
  const existing = await settingsDb.customFrameworks.get(frameworkId);
  const defaultFw = defaultFrameworks.find(f => f.frameworkId === frameworkId);
  
  if (existing) {
    await settingsDb.customFrameworks.update(frameworkId, { 
      status, 
      updatedAt: new Date().toISOString() 
    });
  } else if (defaultFw) {
    await settingsDb.customFrameworks.add({
      ...defaultFw,
      status,
      notes: '',
      isCustom: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  await logChange({
    action: status === 'active' ? 'enable' : 'disable',
    entityType: 'framework',
    entityId: frameworkId,
    entityName: existing?.shortName || defaultFw?.shortName || frameworkId,
    details: `${status === 'active' ? 'Enabled' : 'Disabled'} framework`,
  });
}

// ========================================
// QUESTION OPERATIONS
// ========================================

export async function getAllCustomQuestions(): Promise<CustomQuestion[]> {
  return await settingsDb.customQuestions.toArray();
}

export async function saveQuestion(question: CustomQuestion): Promise<void> {
  const existing = await settingsDb.customQuestions.get(question.questionId);
  const now = new Date().toISOString();
  
  if (existing) {
    await settingsDb.customQuestions.update(question.questionId, {
      ...question,
      updatedAt: now,
    });
    await logChange({
      action: 'update',
      entityType: 'question',
      entityId: question.questionId,
      entityName: question.questionText.substring(0, 50),
      details: `Updated question "${question.questionId}"`,
    });
  } else {
    await settingsDb.customQuestions.add({
      ...question,
      createdAt: now,
      updatedAt: now,
    });
    await logChange({
      action: 'create',
      entityType: 'question',
      entityId: question.questionId,
      entityName: question.questionText.substring(0, 50),
      details: `Created question "${question.questionId}"`,
    });
  }
  
  await updateVersions('questions');
}

export async function deleteQuestion(questionId: string): Promise<{ success: boolean; error?: string }> {
  const answers = await getAllAnswers();
  const hasAnswer = answers.find(a => a.questionId === questionId);
  
  if (hasAnswer) {
    return {
      success: false,
      error: 'Cannot delete question: An answer exists for this question.'
    };
  }
  
  const question = await settingsDb.customQuestions.get(questionId);
  await settingsDb.customQuestions.delete(questionId);
  
  await logChange({
    action: 'delete',
    entityType: 'question',
    entityId: questionId,
    entityName: question?.questionText.substring(0, 50) || questionId,
    details: `Deleted question "${questionId}"`,
  });
  
  await updateVersions('questions');
  return { success: true };
}

export async function toggleQuestionStatus(questionId: string, status: 'active' | 'disabled'): Promise<void> {
  const existing = await settingsDb.customQuestions.get(questionId);
  
  if (existing) {
    await settingsDb.customQuestions.update(questionId, { 
      status, 
      updatedAt: new Date().toISOString() 
    });
  }
  
  await logChange({
    action: status === 'active' ? 'enable' : 'disable',
    entityType: 'question',
    entityId: questionId,
    entityName: existing?.questionText.substring(0, 50) || questionId,
    details: `${status === 'active' ? 'Enabled' : 'Disabled'} question`,
  });
}

// ========================================
// CHANGE LOG
// ========================================

export async function logChange(entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>): Promise<void> {
  await settingsDb.changeLog.add({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export async function getChangeLog(limit = 100): Promise<ChangeLogEntry[]> {
  return await settingsDb.changeLog
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function clearChangeLog(): Promise<void> {
  await settingsDb.changeLog.clear();
}

// ========================================
// BACKUP OPERATIONS
// ========================================

export async function createBackup(
  name: string, 
  description: string, 
  type: 'manual' | 'scheduled' | 'auto'
): Promise<BackupRecord> {
  const answers = await getAllAnswers();
  const customFrameworks = await settingsDb.customFrameworks.toArray();
  const customQuestions = await settingsDb.customQuestions.toArray();
  const settings = await getSettings();
  const changeLog = await getChangeLog(500);
  const meta = await db.meta.get('current');
  
  const backupData: FullBackupData = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    platform: {
      version: settings.platformVersion,
      frameworksVersion: settings.frameworksVersion,
      questionsVersion: settings.questionsVersion,
    },
    settings,
    selectedFrameworks: meta?.selectedFrameworks || [],
    customFrameworks,
    customQuestions,
    answers,
    changeLog,
  };
  
  const dataString = JSON.stringify(backupData);
  const checksum = await generateChecksum(dataString);
  
  const backup: BackupRecord = {
    name,
    description,
    createdAt: new Date().toISOString(),
    size: new Blob([dataString]).size,
    type,
    version: '2.0.0',
    answersCount: answers.length,
    frameworksCount: customFrameworks.length,
    questionsCount: customQuestions.length,
    checksum,
    data: dataString,
  };
  
  const id = await settingsDb.backups.add(backup);
  
  await logChange({
    action: 'backup',
    entityType: 'backup',
    entityId: id?.toString() || name,
    entityName: name,
    details: `Created ${type} backup with ${answers.length} answers`,
  });
  
  // Enforce retention policy
  await enforceBackupRetention();
  
  if (type === 'scheduled') {
    await updateSettings({ lastScheduledBackup: new Date().toISOString() });
  }
  
  return { ...backup, id };
}

export async function getAllBackups(): Promise<BackupRecord[]> {
  return await settingsDb.backups.orderBy('createdAt').reverse().toArray();
}

export async function getBackup(id: number): Promise<BackupRecord | undefined> {
  return await settingsDb.backups.get(id);
}

export async function deleteBackup(id: number): Promise<void> {
  const backup = await settingsDb.backups.get(id);
  await settingsDb.backups.delete(id);
  
  await logChange({
    action: 'delete',
    entityType: 'backup',
    entityId: id.toString(),
    entityName: backup?.name || `Backup #${id}`,
    details: `Deleted backup`,
  });
}

export async function enforceBackupRetention(): Promise<void> {
  const settings = await getSettings();
  const backups = await getAllBackups();
  
  if (backups.length > settings.backupRetention) {
    const toDelete = backups.slice(settings.backupRetention);
    for (const backup of toDelete) {
      if (backup.id) {
        await settingsDb.backups.delete(backup.id);
      }
    }
  }
}

export function downloadBackupAsJSON(backup: BackupRecord): void {
  const blob = new Blob([backup.data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${backup.name.replace(/\s+/g, '-')}-${backup.createdAt.split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function validateBackupFile(file: File): Promise<{
  isValid: boolean;
  data?: FullBackupData;
  errors: string[];
  warnings: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as FullBackupData;
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validate structure
        if (!data.version) errors.push('Missing version field');
        if (!data.exportedAt) errors.push('Missing exportedAt field');
        if (!Array.isArray(data.answers)) errors.push('Invalid answers format');
        if (!data.settings) warnings.push('No settings in backup');
        
        // Validate checksum if present in stored backups
        if (data.version !== '2.0.0') {
          warnings.push(`Backup version ${data.version} may not be fully compatible`);
        }
        
        resolve({
          isValid: errors.length === 0,
          data: errors.length === 0 ? data : undefined,
          errors,
          warnings,
        });
      } catch (err) {
        resolve({
          isValid: false,
          errors: ['Invalid JSON format: ' + (err as Error).message],
          warnings: [],
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: ['Failed to read file'],
        warnings: [],
      });
    };
    
    reader.readAsText(file);
  });
}

export async function restoreFromBackup(data: FullBackupData): Promise<void> {
  // Restore settings
  if (data.settings) {
    await settingsDb.settings.put({
      ...data.settings,
      id: 'main',
      updatedAt: new Date().toISOString(),
    });
  }
  
  // Restore custom frameworks
  await settingsDb.customFrameworks.clear();
  if (data.customFrameworks?.length) {
    await settingsDb.customFrameworks.bulkAdd(data.customFrameworks);
  }
  
  // Restore custom questions
  await settingsDb.customQuestions.clear();
  if (data.customQuestions?.length) {
    await settingsDb.customQuestions.bulkAdd(data.customQuestions);
  }
  
  // Restore answers
  await db.answers.clear();
  if (data.answers?.length) {
    await db.answers.bulkPut(data.answers);
  }
  
  // Update meta
  await db.meta.update('current', {
    selectedFrameworks: data.selectedFrameworks || [],
    updatedAt: new Date().toISOString(),
  });
  
  await logChange({
    action: 'restore',
    entityType: 'backup',
    entityId: 'restore',
    entityName: 'Full Restore',
    details: `Restored from backup dated ${data.exportedAt}`,
  });
}

// ========================================
// RESET OPERATIONS
// ========================================

export async function resetAnswersOnly(): Promise<void> {
  await db.answers.clear();
  await db.meta.update('current', { updatedAt: new Date().toISOString() });
  
  await logChange({
    action: 'reset',
    entityType: 'answer',
    entityId: 'all',
    entityName: 'All Answers',
    details: 'Reset all answers',
  });
}

export async function resetAnswersAndDashboards(): Promise<void> {
  await db.answers.clear();
  await db.meta.update('current', { 
    updatedAt: new Date().toISOString(),
  });
  
  await logChange({
    action: 'reset',
    entityType: 'answer',
    entityId: 'all',
    entityName: 'Answers and Dashboards',
    details: 'Reset all answers and dashboard data',
  });
}

export async function factoryReset(): Promise<void> {
  // Clear all data
  await db.answers.clear();
  await settingsDb.customFrameworks.clear();
  await settingsDb.customQuestions.clear();
  await settingsDb.changeLog.clear();
  await settingsDb.backups.clear();
  await settingsDb.settings.clear();
  
  // Reinitialize
  await settingsDb.settings.add(DEFAULT_SETTINGS);
  await db.meta.update('current', {
    selectedFrameworks: ['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'],
    updatedAt: new Date().toISOString(),
  });
  
  await logChange({
    action: 'reset',
    entityType: 'settings',
    entityId: 'all',
    entityName: 'Factory Reset',
    details: 'Performed factory reset',
  });
}

// ========================================
// HELPERS
// ========================================

async function updateVersions(type: 'frameworks' | 'questions'): Promise<void> {
  const now = new Date().toISOString();
  if (type === 'frameworks') {
    await settingsDb.settings.update('main', { 
      frameworksVersion: now.split('T')[0],
      lastModified: now,
      updatedAt: now,
    });
  } else {
    await settingsDb.settings.update('main', { 
      questionsVersion: now.split('T')[0],
      lastModified: now,
      updatedAt: now,
    });
  }
}

async function generateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
