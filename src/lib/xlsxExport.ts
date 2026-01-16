import ExcelJS from 'exceljs';
import { Answer } from './database';
import { domains, subcategories, questions } from './dataset';
import { calculateOverallMetrics } from './scoring';

const SCHEMA_VERSION = '1.0.0';
const APP_VERSION = '1.0.0';

interface ExportMetadata {
  appVersion: string;
  schemaVersion: string;
  exportedAt: string;
  templateVersion: string;
  totalQuestions: number;
  totalAnswered: number;
}

interface ExportSummary {
  overallScore: number;
  maturityLabel: string;
  coverage: number;
  criticalGaps: number;
  evidenceReadiness: number;
}

export async function exportAnswersToXLSX(answersMap: Map<string, Answer>): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Security Assessment';
  workbook.created = new Date();

  // Sheet 1: Answers
  const answersSheet = workbook.addWorksheet('Answers');
  
  const answersData = Array.from(answersMap.values()).map(answer => {
    const question = questions.find(q => q.questionId === answer.questionId);
    const subcat = question ? subcategories.find(s => s.subcatId === question.subcatId) : null;
    const domain = question ? domains.find(d => d.domainId === question.domainId) : null;

    return {
      questionId: answer.questionId,
      frameworkId: answer.frameworkId || '',
      subcatId: question?.subcatId || '',
      domainId: question?.domainId || '',
      domainName: domain?.domainName || '',
      subcatName: subcat?.subcatName || '',
      questionText: question?.questionText || '',
      response: answer.response || '',
      evidenceOk: answer.evidenceOk || '',
      notes: answer.notes || '',
      evidenceLinks: answer.evidenceLinks?.join(' | ') || '',
      updatedAt: answer.updatedAt || '',
    };
  });

  answersSheet.columns = [
    { header: 'questionId', key: 'questionId', width: 15 },
    { header: 'frameworkId', key: 'frameworkId', width: 12 },
    { header: 'subcatId', key: 'subcatId', width: 12 },
    { header: 'domainId', key: 'domainId', width: 10 },
    { header: 'domainName', key: 'domainName', width: 25 },
    { header: 'subcatName', key: 'subcatName', width: 30 },
    { header: 'questionText', key: 'questionText', width: 60 },
    { header: 'response', key: 'response', width: 10 },
    { header: 'evidenceOk', key: 'evidenceOk', width: 10 },
    { header: 'notes', key: 'notes', width: 40 },
    { header: 'evidenceLinks', key: 'evidenceLinks', width: 50 },
    { header: 'updatedAt', key: 'updatedAt', width: 25 },
  ];

  answersData.forEach(row => answersSheet.addRow(row));

  // Sheet 2: Metadata
  const metadataSheet = workbook.addWorksheet('Metadata');
  const metrics = calculateOverallMetrics(answersMap);
  const metadata: ExportMetadata = {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    templateVersion: '1.0.0',
    totalQuestions: questions.length,
    totalAnswered: answersMap.size,
  };

  metadataSheet.columns = [
    { header: 'appVersion', key: 'appVersion', width: 15 },
    { header: 'schemaVersion', key: 'schemaVersion', width: 15 },
    { header: 'exportedAt', key: 'exportedAt', width: 25 },
    { header: 'templateVersion', key: 'templateVersion', width: 15 },
    { header: 'totalQuestions', key: 'totalQuestions', width: 15 },
    { header: 'totalAnswered', key: 'totalAnswered', width: 15 },
  ];
  metadataSheet.addRow(metadata);

  // Sheet 3: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  const summary: ExportSummary = {
    overallScore: Math.round(metrics.overallScore * 100) / 100,
    maturityLabel: `${metrics.maturityLevel.level} - ${metrics.maturityLevel.name}`,
    coverage: Math.round(metrics.coverage * 100),
    criticalGaps: metrics.criticalGaps,
    evidenceReadiness: Math.round(metrics.evidenceReadiness * 100),
  };

  summarySheet.columns = [
    { header: 'overallScore', key: 'overallScore', width: 15 },
    { header: 'maturityLabel', key: 'maturityLabel', width: 30 },
    { header: 'coverage', key: 'coverage', width: 12 },
    { header: 'criticalGaps', key: 'criticalGaps', width: 12 },
    { header: 'evidenceReadiness', key: 'evidenceReadiness', width: 18 },
  ];
  summarySheet.addRow(summary);

  // Sheet 4: Domain Scores
  const domainSheet = workbook.addWorksheet('DomainScores');
  const domainScores = metrics.domainMetrics.map(dm => ({
    domainId: dm.domainId,
    domainName: dm.domainName,
    score: Math.round(dm.score * 100) / 100,
    maturityLevel: dm.maturityLevel.level,
    maturityName: dm.maturityLevel.name,
    totalQuestions: dm.totalQuestions,
    answeredQuestions: dm.answeredQuestions,
    coverage: Math.round(dm.coverage * 100),
    criticalGaps: dm.criticalGaps,
  }));

  domainSheet.columns = [
    { header: 'domainId', key: 'domainId', width: 15 },
    { header: 'domainName', key: 'domainName', width: 30 },
    { header: 'score', key: 'score', width: 10 },
    { header: 'maturityLevel', key: 'maturityLevel', width: 12 },
    { header: 'maturityName', key: 'maturityName', width: 20 },
    { header: 'totalQuestions', key: 'totalQuestions', width: 15 },
    { header: 'answeredQuestions', key: 'answeredQuestions', width: 18 },
    { header: 'coverage', key: 'coverage', width: 12 },
    { header: 'criticalGaps', key: 'criticalGaps', width: 12 },
  ];
  domainScores.forEach(row => domainSheet.addRow(row));

  // Sheet 5: Subcategory Scores
  const subcatSheet = workbook.addWorksheet('SubcategoryScores');
  const subcatScores: any[] = [];
  metrics.domainMetrics.forEach(dm => {
    dm.subcategoryMetrics.forEach(sm => {
      subcatScores.push({
        domainId: dm.domainId,
        domainName: dm.domainName,
        subcatId: sm.subcatId,
        subcatName: sm.subcatName,
        criticality: sm.criticality,
        weight: sm.weight,
        score: Math.round(sm.score * 100) / 100,
        maturityLevel: sm.maturityLevel.level,
        maturityName: sm.maturityLevel.name,
        totalQuestions: sm.totalQuestions,
        answeredQuestions: sm.answeredQuestions,
        coverage: Math.round(sm.coverage * 100),
        criticalGaps: sm.criticalGaps,
      });
    });
  });

  subcatSheet.columns = [
    { header: 'domainId', key: 'domainId', width: 15 },
    { header: 'domainName', key: 'domainName', width: 25 },
    { header: 'subcatId', key: 'subcatId', width: 15 },
    { header: 'subcatName', key: 'subcatName', width: 30 },
    { header: 'criticality', key: 'criticality', width: 12 },
    { header: 'weight', key: 'weight', width: 10 },
    { header: 'score', key: 'score', width: 10 },
    { header: 'maturityLevel', key: 'maturityLevel', width: 12 },
    { header: 'maturityName', key: 'maturityName', width: 20 },
    { header: 'totalQuestions', key: 'totalQuestions', width: 15 },
    { header: 'answeredQuestions', key: 'answeredQuestions', width: 18 },
    { header: 'coverage', key: 'coverage', width: 12 },
    { header: 'criticalGaps', key: 'criticalGaps', width: 12 },
  ];
  subcatScores.forEach(row => subcatSheet.addRow(row));

  // Generate blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadXLSX(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateExportFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `ai-security-assessment-${dateStr}_${timeStr}.xlsx`;
}
