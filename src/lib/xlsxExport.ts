import * as XLSX from 'xlsx';
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

export function exportAnswersToXLSX(answersMap: Map<string, Answer>): Blob {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Answers
  const answersData = Array.from(answersMap.values()).map(answer => {
    const question = questions.find(q => q.questionId === answer.questionId);
    const subcat = question ? subcategories.find(s => s.subcatId === question.subcatId) : null;
    const domain = question ? domains.find(d => d.domainId === question.domainId) : null;

    return {
      questionId: answer.questionId,
      frameworkId: answer.frameworkId || '', // NEW: include framework in export
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

  const answersSheet = XLSX.utils.json_to_sheet(answersData);
  
  // Set column widths
  answersSheet['!cols'] = [
    { wch: 15 }, // questionId
    { wch: 12 }, // subcatId
    { wch: 10 }, // domainId
    { wch: 25 }, // domainName
    { wch: 30 }, // subcatName
    { wch: 60 }, // questionText
    { wch: 10 }, // response
    { wch: 10 }, // evidenceOk
    { wch: 40 }, // notes
    { wch: 50 }, // evidenceLinks
    { wch: 25 }, // updatedAt
  ];

  XLSX.utils.book_append_sheet(wb, answersSheet, 'Answers');

  // Sheet 2: Metadata
  const metrics = calculateOverallMetrics(answersMap);
  const metadata: ExportMetadata = {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    templateVersion: '1.0.0',
    totalQuestions: questions.length,
    totalAnswered: answersMap.size,
  };

  const metadataSheet = XLSX.utils.json_to_sheet([metadata]);
  XLSX.utils.book_append_sheet(wb, metadataSheet, 'Metadata');

  // Sheet 3: Summary
  const summary: ExportSummary = {
    overallScore: Math.round(metrics.overallScore * 100) / 100,
    maturityLabel: `${metrics.maturityLevel.level} - ${metrics.maturityLevel.name}`,
    coverage: Math.round(metrics.coverage * 100),
    criticalGaps: metrics.criticalGaps,
    evidenceReadiness: Math.round(metrics.evidenceReadiness * 100),
  };

  const summarySheet = XLSX.utils.json_to_sheet([summary]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sheet 4: Domain Scores
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

  const domainSheet = XLSX.utils.json_to_sheet(domainScores);
  XLSX.utils.book_append_sheet(wb, domainSheet, 'DomainScores');

  // Sheet 5: Subcategory Scores
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

  const subcatSheet = XLSX.utils.json_to_sheet(subcatScores);
  XLSX.utils.book_append_sheet(wb, subcatSheet, 'SubcategoryScores');

  // Generate blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
