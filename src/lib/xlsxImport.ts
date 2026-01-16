import ExcelJS from 'exceljs';
import { Answer } from './database';
import { questions } from './dataset';

const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0'];

export interface ImportResult {
  success: boolean;
  answers: Answer[];
  warnings: string[];
  errors: string[];
  metadata?: {
    schemaVersion: string;
    exportedAt: string;
    totalAnswers: number;
  };
}

export interface ImportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  columnMapping: Record<string, string>;
}

// Helper to read workbook from file
async function readWorkbookFromFile(file: File): Promise<ExcelJS.Workbook> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return workbook;
}

// Helper to get sheet data as array of objects
function sheetToJson<T = any>(worksheet: ExcelJS.Worksheet): T[] {
  const rows: T[] = [];
  const headers: string[] = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || '');
      });
    } else {
      // Data rows
      const obj: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          obj[header] = cell.value;
        }
      });
      rows.push(obj);
    }
  });
  
  return rows;
}

// Helper to get first row as headers
function getHeaders(worksheet: ExcelJS.Worksheet): string[] {
  const headers: string[] = [];
  const firstRow = worksheet.getRow(1);
  firstRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '');
  });
  return headers;
}

// Validate file before import
export async function validateImportFile(file: File): Promise<ImportValidation> {
  try {
    const workbook = await readWorkbookFromFile(file);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const columnMapping: Record<string, string> = {};

    // Check for required sheets
    const sheetNames = workbook.worksheets.map(ws => ws.name);
    
    if (!sheetNames.includes('Answers')) {
      errors.push('Planilha "Answers" não encontrada no arquivo');
    }

    if (!sheetNames.includes('Metadata')) {
      warnings.push('Planilha "Metadata" não encontrada. Versão não pode ser validada.');
    } else {
      // Validate schema version
      const metadataSheet = workbook.getWorksheet('Metadata');
      if (metadataSheet) {
        const metadataRows = sheetToJson<any>(metadataSheet);
        
        if (metadataRows.length > 0) {
          const schemaVersion = metadataRows[0].schemaVersion;
          if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
            warnings.push(`Versão do schema (${schemaVersion}) pode não ser totalmente compatível`);
          }
        }
      }
    }

    // Validate Answers sheet columns
    if (sheetNames.includes('Answers')) {
      const answersSheet = workbook.getWorksheet('Answers');
      if (answersSheet) {
        const headers = getHeaders(answersSheet);
        const requiredColumns = ['questionId', 'response'];
        const optionalColumns = ['evidenceOk', 'notes', 'evidenceLinks', 'updatedAt'];
        
        requiredColumns.forEach(col => {
          const foundIndex = headers.findIndex(h => 
            h?.toLowerCase() === col.toLowerCase()
          );
          if (foundIndex === -1) {
            errors.push(`Coluna obrigatória "${col}" não encontrada`);
          } else {
            columnMapping[col] = headers[foundIndex];
          }
        });

        optionalColumns.forEach(col => {
          const foundIndex = headers.findIndex(h => 
            h?.toLowerCase() === col.toLowerCase()
          );
          if (foundIndex !== -1) {
            columnMapping[col] = headers[foundIndex];
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      columnMapping,
    };
  } catch (err) {
    return {
      isValid: false,
      errors: ['Erro ao ler arquivo: ' + (err as Error).message],
      warnings: [],
      columnMapping: {},
    };
  }
}

// Import answers from XLSX file
export async function importAnswersFromXLSX(file: File): Promise<ImportResult> {
  try {
    const workbook = await readWorkbookFromFile(file);
    
    const answers: Answer[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Get valid question IDs
    const validQuestionIds = new Set(questions.map(q => q.questionId));

    // Parse Answers sheet
    const sheetNames = workbook.worksheets.map(ws => ws.name);
    
    if (!sheetNames.includes('Answers')) {
      return {
        success: false,
        answers: [],
        warnings: [],
        errors: ['Planilha "Answers" não encontrada'],
      };
    }

    const answersSheet = workbook.getWorksheet('Answers');
    if (!answersSheet) {
      return {
        success: false,
        answers: [],
        warnings: [],
        errors: ['Planilha "Answers" não encontrada'],
      };
    }

    const answersRows = sheetToJson<any>(answersSheet);

    answersRows.forEach((row, index) => {
      const questionId = row.questionId?.toString().trim();
      
      if (!questionId) {
        warnings.push(`Linha ${index + 2}: questionId vazio, ignorando`);
        return;
      }

      if (!validQuestionIds.has(questionId)) {
        warnings.push(`Linha ${index + 2}: questionId "${questionId}" não encontrado no banco de perguntas, ignorando`);
        return;
      }

      const response = normalizeResponse(row.response);
      const evidenceOk = normalizeEvidence(row.evidenceOk);

      // Parse evidence links
      let evidenceLinks: string[] = [];
      if (row.evidenceLinks) {
        evidenceLinks = row.evidenceLinks
          .toString()
          .split('|')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }

      answers.push({
        questionId,
        frameworkId: row.frameworkId?.toString() || 'NIST_AI_RMF', // Default for backward compatibility
        response,
        evidenceOk,
        notes: row.notes?.toString() || '',
        evidenceLinks,
        updatedAt: row.updatedAt || new Date().toISOString(),
      });
    });

    // Parse metadata if available
    let metadata;
    if (sheetNames.includes('Metadata')) {
      const metadataSheet = workbook.getWorksheet('Metadata');
      if (metadataSheet) {
        const metadataRows = sheetToJson<any>(metadataSheet);
        
        if (metadataRows.length > 0) {
          metadata = {
            schemaVersion: metadataRows[0].schemaVersion || 'unknown',
            exportedAt: metadataRows[0].exportedAt || 'unknown',
            totalAnswers: answers.length,
          };
        }
      }
    }

    return {
      success: true,
      answers,
      warnings,
      errors,
      metadata,
    };
  } catch (err) {
    return {
      success: false,
      answers: [],
      warnings: [],
      errors: ['Erro ao processar arquivo: ' + (err as Error).message],
    };
  }
}

// Normalize response values
function normalizeResponse(value: any): Answer['response'] {
  if (!value) return null;
  
  const str = value.toString().trim().toLowerCase();
  
  if (str === 'sim' || str === 'yes' || str === 's' || str === '1') return 'Sim';
  if (str === 'parcial' || str === 'partial' || str === 'p' || str === '0.5') return 'Parcial';
  if (str === 'não' || str === 'nao' || str === 'no' || str === 'n' || str === '0') return 'Não';
  if (str === 'na' || str === 'n/a' || str === '-') return 'NA';
  
  return null;
}

// Normalize evidence values
function normalizeEvidence(value: any): Answer['evidenceOk'] {
  if (!value) return null;
  
  const str = value.toString().trim().toLowerCase();
  
  if (str === 'sim' || str === 'yes' || str === 's' || str === '1') return 'Sim';
  if (str === 'parcial' || str === 'partial' || str === 'p') return 'Parcial';
  if (str === 'não' || str === 'nao' || str === 'no' || str === 'n' || str === '0') return 'Não';
  if (str === 'na' || str === 'n/a' || str === '-') return 'NA';
  
  return null;
}
