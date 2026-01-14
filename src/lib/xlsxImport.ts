import * as XLSX from 'xlsx';
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

// Validate file before import
export function validateImportFile(file: File): Promise<ImportValidation> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const errors: string[] = [];
        const warnings: string[] = [];
        const columnMapping: Record<string, string> = {};

        // Check for required sheets
        if (!workbook.SheetNames.includes('Answers')) {
          errors.push('Planilha "Answers" não encontrada no arquivo');
        }

        if (!workbook.SheetNames.includes('Metadata')) {
          warnings.push('Planilha "Metadata" não encontrada. Versão não pode ser validada.');
        } else {
          // Validate schema version
          const metadataSheet = workbook.Sheets['Metadata'];
          const metadataRows = XLSX.utils.sheet_to_json<any>(metadataSheet);
          
          if (metadataRows.length > 0) {
            const schemaVersion = metadataRows[0].schemaVersion;
            if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
              warnings.push(`Versão do schema (${schemaVersion}) pode não ser totalmente compatível`);
            }
          }
        }

        // Validate Answers sheet columns
        if (workbook.SheetNames.includes('Answers')) {
          const answersSheet = workbook.Sheets['Answers'];
          const answersRows = XLSX.utils.sheet_to_json<any>(answersSheet, { header: 1 });
          
          if (answersRows.length > 0) {
            const headers = answersRows[0] as string[];
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

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings,
          columnMapping,
        });
      } catch (err) {
        resolve({
          isValid: false,
          errors: ['Erro ao ler arquivo: ' + (err as Error).message],
          warnings: [],
          columnMapping: {},
        });
      }
    };

    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: ['Erro ao ler arquivo'],
        warnings: [],
        columnMapping: {},
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

// Import answers from XLSX file
export function importAnswersFromXLSX(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const answers: Answer[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];

        // Get valid question IDs
        const validQuestionIds = new Set(questions.map(q => q.questionId));

        // Parse Answers sheet
        if (!workbook.SheetNames.includes('Answers')) {
          resolve({
            success: false,
            answers: [],
            warnings: [],
            errors: ['Planilha "Answers" não encontrada'],
          });
          return;
        }

        const answersSheet = workbook.Sheets['Answers'];
        const answersRows = XLSX.utils.sheet_to_json<any>(answersSheet);

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
            response,
            evidenceOk,
            notes: row.notes?.toString() || '',
            evidenceLinks,
            updatedAt: row.updatedAt || new Date().toISOString(),
          });
        });

        // Parse metadata if available
        let metadata;
        if (workbook.SheetNames.includes('Metadata')) {
          const metadataSheet = workbook.Sheets['Metadata'];
          const metadataRows = XLSX.utils.sheet_to_json<any>(metadataSheet);
          
          if (metadataRows.length > 0) {
            metadata = {
              schemaVersion: metadataRows[0].schemaVersion || 'unknown',
              exportedAt: metadataRows[0].exportedAt || 'unknown',
              totalAnswers: answers.length,
            };
          }
        }

        resolve({
          success: true,
          answers,
          warnings,
          errors,
          metadata,
        });
      } catch (err) {
        resolve({
          success: false,
          answers: [],
          warnings: [],
          errors: ['Erro ao processar arquivo: ' + (err as Error).message],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        answers: [],
        warnings: [],
        errors: ['Erro ao ler arquivo'],
      });
    };

    reader.readAsArrayBuffer(file);
  });
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
