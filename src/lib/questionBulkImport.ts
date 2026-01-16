/**
 * Bulk Question Import from CSV/Excel
 * 
 * Allows importing multiple questions at once from spreadsheet files
 */

import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

// Interfaces
export interface BulkQuestionRow {
  questionText: string;
  domainId?: string;
  domainName?: string;
  subcatId?: string;
  subcatName?: string;
  criticality?: string;
  ownershipType?: string;
  riskSummary?: string;
  expectedEvidence?: string;
  imperativeChecks?: string;
  frameworks?: string;
}

export interface ParsedQuestion {
  questionId: string;
  questionText: string;
  domainId: string;
  subcatId: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  ownershipType?: 'Executive' | 'GRC' | 'Engineering';
  riskSummary: string;
  expectedEvidence: string;
  imperativeChecks: string;
  frameworks: string[];
  securityDomainId: string;
  isValid: boolean;
  errors: string[];
  rowNumber: number;
}

export interface BulkImportValidation {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: string[];
  warnings: string[];
  questions: ParsedQuestion[];
  columnMapping: Record<string, string>;
}

export interface BulkImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// Column name mappings (support multiple variations)
const COLUMN_MAPPINGS: Record<string, string[]> = {
  questionText: ['questionText', 'question_text', 'question', 'pergunta', 'texto', 'text'],
  domainId: ['domainId', 'domain_id', 'domain', 'dominio_id'],
  domainName: ['domainName', 'domain_name', 'area', 'dominio', 'área'],
  subcatId: ['subcatId', 'subcat_id', 'subcategory_id', 'subcategoria_id'],
  subcatName: ['subcatName', 'subcat_name', 'subcategory', 'subcategoria'],
  criticality: ['criticality', 'criticidade', 'priority', 'prioridade', 'severity'],
  ownershipType: ['ownershipType', 'ownership_type', 'ownership', 'responsavel', 'owner'],
  riskSummary: ['riskSummary', 'risk_summary', 'risk', 'risco', 'resumo_risco'],
  expectedEvidence: ['expectedEvidence', 'expected_evidence', 'evidence', 'evidencia', 'evidência'],
  imperativeChecks: ['imperativeChecks', 'imperative_checks', 'checks', 'verificacoes', 'verificações'],
  frameworks: ['frameworks', 'framework', 'framework_refs', 'referencias']
};

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
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || '');
      });
    } else {
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

// Normalize column name to standard field name
function normalizeColumnName(header: string): string | null {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
  
  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    if (variations.some(v => normalized === v.toLowerCase().replace(/[^a-z0-9_]/g, ''))) {
      return field;
    }
  }
  return null;
}

// Normalize criticality value
function normalizeCriticality(value: string | undefined): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (!value) return 'Medium';
  const lower = value.toString().toLowerCase().trim();
  
  if (['low', 'baixa', 'baixo', 'l', '1'].includes(lower)) return 'Low';
  if (['medium', 'média', 'medio', 'm', '2'].includes(lower)) return 'Medium';
  if (['high', 'alta', 'alto', 'h', '3'].includes(lower)) return 'High';
  if (['critical', 'crítica', 'critico', 'c', '4'].includes(lower)) return 'Critical';
  
  return 'Medium';
}

// Normalize ownership type
function normalizeOwnership(value: string | undefined): 'Executive' | 'GRC' | 'Engineering' | undefined {
  if (!value) return undefined;
  const lower = value.toString().toLowerCase().trim();
  
  if (['executive', 'executivo', 'exec', 'e'].includes(lower)) return 'Executive';
  if (['grc', 'governance', 'governança', 'g'].includes(lower)) return 'GRC';
  if (['engineering', 'engenharia', 'eng', 'tech', 'técnico'].includes(lower)) return 'Engineering';
  
  return undefined;
}

// Parse frameworks string to array
function parseFrameworks(value: string | undefined): string[] {
  if (!value) return [];
  return value.toString()
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Generate unique question ID
function generateQuestionId(securityDomainId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${securityDomainId}_Q_${timestamp}_${random}`.toUpperCase();
}

/**
 * Validate and parse an import file
 */
export async function validateBulkImportFile(
  file: File,
  securityDomainId: string
): Promise<BulkImportValidation> {
  try {
    const workbook = await readWorkbookFromFile(file);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const questions: ParsedQuestion[] = [];
    const columnMapping: Record<string, string> = {};

    // Get first sheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        errors: ['Arquivo não contém planilhas'],
        warnings: [],
        questions: [],
        columnMapping: {}
      };
    }

    const rows = sheetToJson<any>(worksheet);
    const headers = getHeaders(worksheet);

    if (rows.length < 1) {
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        errors: ['Arquivo deve conter cabeçalho e pelo menos uma linha de dados'],
        warnings: [],
        questions: [],
        columnMapping: {}
      };
    }

    // Parse headers
    const headerIndexMap: Record<string, number> = {};

    headers.forEach((header, index) => {
      const field = normalizeColumnName(header);
      if (field) {
        headerIndexMap[field] = index;
        columnMapping[field] = header;
      }
    });

    // Check required columns
    if (!('questionText' in headerIndexMap)) {
      errors.push('Coluna obrigatória "questionText" (ou "pergunta") não encontrada');
    }

    // Fetch taxonomy data for validation
    const { data: taxonomyDomains } = await supabase
      .from('domains')
      .select('domain_id, domain_name')
      .eq('security_domain_id', securityDomainId);

    const { data: subcategories } = await supabase
      .from('subcategories')
      .select('subcat_id, subcat_name, domain_id')
      .eq('security_domain_id', securityDomainId);

    const domainMap = new Map<string, string>();
    const domainNameMap = new Map<string, string>();
    (taxonomyDomains || []).forEach(d => {
      domainMap.set(d.domain_id, d.domain_name);
      domainNameMap.set(d.domain_name.toLowerCase(), d.domain_id);
    });

    const subcatMap = new Map<string, { name: string; domainId: string }>();
    const subcatNameMap = new Map<string, string>();
    (subcategories || []).forEach(s => {
      subcatMap.set(s.subcat_id, { name: s.subcat_name, domainId: s.domain_id });
      subcatNameMap.set(s.subcat_name.toLowerCase(), s.subcat_id);
    });

    // Parse data rows
    rows.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for header row

      const getValue = (field: string): string => {
        return row[columnMapping[field]]?.toString() || '';
      };

      const questionText = getValue('questionText').trim();
      const rowErrors: string[] = [];

      if (!questionText) {
        rowErrors.push('Texto da pergunta é obrigatório');
      }

      // Resolve domain
      let domainId = getValue('domainId').trim();
      const domainName = getValue('domainName').trim();

      if (!domainId && domainName) {
        const resolved = domainNameMap.get(domainName.toLowerCase());
        if (resolved) {
          domainId = resolved;
        } else {
          rowErrors.push(`Área "${domainName}" não encontrada`);
        }
      }

      if (!domainId && !domainName) {
        rowErrors.push('Área (domainId ou domainName) é obrigatória');
      }

      // Resolve subcategory
      let subcatId = getValue('subcatId').trim();
      const subcatName = getValue('subcatName').trim();

      if (!subcatId && subcatName) {
        const resolved = subcatNameMap.get(subcatName.toLowerCase());
        if (resolved) {
          subcatId = resolved;
          // Also verify domain if resolved
          const subcatInfo = subcatMap.get(subcatId);
          if (subcatInfo && domainId && subcatInfo.domainId !== domainId) {
            warnings.push(`Linha ${rowNum}: Subcategoria "${subcatName}" pertence a outra área`);
          }
        } else {
          warnings.push(`Linha ${rowNum}: Subcategoria "${subcatName}" não encontrada`);
        }
      }

      const parsedQuestion: ParsedQuestion = {
        questionId: generateQuestionId(securityDomainId),
        questionText,
        domainId,
        subcatId: subcatId || '',
        criticality: normalizeCriticality(getValue('criticality')),
        ownershipType: normalizeOwnership(getValue('ownershipType')),
        riskSummary: getValue('riskSummary'),
        expectedEvidence: getValue('expectedEvidence'),
        imperativeChecks: getValue('imperativeChecks'),
        frameworks: parseFrameworks(getValue('frameworks')),
        securityDomainId,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
        rowNumber: rowNum
      };

      questions.push(parsedQuestion);

      if (rowErrors.length > 0) {
        errors.push(`Linha ${rowNum}: ${rowErrors.join(', ')}`);
      }
    });

    const validQuestions = questions.filter(q => q.isValid);

    return {
      isValid: errors.length === 0 && validQuestions.length > 0,
      totalRows: questions.length,
      validRows: validQuestions.length,
      errors,
      warnings,
      questions,
      columnMapping
    };
  } catch (err) {
    return {
      isValid: false,
      totalRows: 0,
      validRows: 0,
      errors: ['Erro ao processar arquivo: ' + (err as Error).message],
      warnings: [],
      questions: [],
      columnMapping: {}
    };
  }
}

/**
 * Import validated questions to the database
 */
export async function importBulkQuestions(
  questions: ParsedQuestion[],
  options: { skipInvalid?: boolean } = {}
): Promise<BulkImportResult> {
  const validQuestions = options.skipInvalid 
    ? questions.filter(q => q.isValid)
    : questions;

  const result: BulkImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
    warnings: []
  };

  for (const q of validQuestions) {
    if (!q.isValid) {
      result.failed++;
      result.errors.push(`Linha ${q.rowNumber}: ${q.errors.join(', ')}`);
      continue;
    }

    const { error } = await supabase
      .from('custom_questions')
      .insert({
        question_id: q.questionId,
        question_text: q.questionText,
        domain_id: q.domainId,
        subcat_id: q.subcatId || null,
        criticality: q.criticality,
        ownership_type: q.ownershipType,
        risk_summary: q.riskSummary,
        expected_evidence: q.expectedEvidence,
        imperative_checks: q.imperativeChecks,
        frameworks: q.frameworks,
        security_domain_id: q.securityDomainId,
        is_disabled: false
      });

    if (error) {
      result.failed++;
      result.errors.push(`Linha ${q.rowNumber}: ${error.message}`);
    } else {
      result.imported++;
    }
  }

  result.success = result.imported > 0;
  return result;
}

/**
 * Generate a template file for bulk import
 */
export async function generateImportTemplate(securityDomainId: string): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Security Assessment';
  workbook.created = new Date();

  // Template sheet
  const templateSheet = workbook.addWorksheet('Perguntas');
  templateSheet.columns = [
    { header: 'questionText', key: 'questionText', width: 60 },
    { header: 'domainName', key: 'domainName', width: 20 },
    { header: 'subcatName', key: 'subcatName', width: 20 },
    { header: 'criticality', key: 'criticality', width: 12 },
    { header: 'ownershipType', key: 'ownershipType', width: 15 },
    { header: 'riskSummary', key: 'riskSummary', width: 50 },
    { header: 'expectedEvidence', key: 'expectedEvidence', width: 50 },
    { header: 'imperativeChecks', key: 'imperativeChecks', width: 40 },
    { header: 'frameworks', key: 'frameworks', width: 30 },
  ];

  templateSheet.addRow({
    questionText: 'Exemplo: A organização possui política de segurança documentada?',
    domainName: 'Governança',
    subcatName: 'Políticas',
    criticality: 'High',
    ownershipType: 'GRC',
    riskSummary: 'Falta de políticas pode resultar em não conformidade',
    expectedEvidence: 'Documento de política aprovado e publicado',
    imperativeChecks: 'Verificar data de aprovação e assinaturas',
    frameworks: 'ISO_27001,NIST_CSF'
  });

  // Instructions sheet
  const instructionsSheet = workbook.addWorksheet('Instruções');
  instructionsSheet.columns = [
    { header: 'Campo', key: 'Campo', width: 20 },
    { header: 'Descrição', key: 'Descrição', width: 50 },
    { header: 'Exemplo', key: 'Exemplo', width: 30 },
  ];

  const instructionsData = [
    { Campo: 'questionText', Descrição: 'Texto completo da pergunta (obrigatório)', Exemplo: 'A organização possui...' },
    { Campo: 'domainName', Descrição: 'Nome da área/domínio de taxonomia', Exemplo: 'Governança' },
    { Campo: 'domainId', Descrição: 'ID da área (alternativa ao nome)', Exemplo: 'GOV_001' },
    { Campo: 'subcatName', Descrição: 'Nome da subcategoria', Exemplo: 'Políticas' },
    { Campo: 'subcatId', Descrição: 'ID da subcategoria (alternativa ao nome)', Exemplo: 'SUB_001' },
    { Campo: 'criticality', Descrição: 'Criticidade: Low, Medium, High, Critical', Exemplo: 'High' },
    { Campo: 'ownershipType', Descrição: 'Responsável: Executive, GRC, Engineering', Exemplo: 'GRC' },
    { Campo: 'riskSummary', Descrição: 'Resumo do risco associado', Exemplo: 'Falta de...' },
    { Campo: 'expectedEvidence', Descrição: 'Evidência esperada para conformidade', Exemplo: 'Documento...' },
    { Campo: 'imperativeChecks', Descrição: 'Verificações imperativas a realizar', Exemplo: 'Verificar...' },
    { Campo: 'frameworks', Descrição: 'Frameworks associados (separados por vírgula)', Exemplo: 'ISO_27001,NIST_CSF' }
  ];

  instructionsData.forEach(row => instructionsSheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download template file
 */
export async function downloadImportTemplate(securityDomainId: string): Promise<void> {
  const blob = await generateImportTemplate(securityDomainId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `template-perguntas-${securityDomainId.toLowerCase()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ EXPORT FUNCTIONALITY ============

export interface ExportableQuestion {
  questionId: string;
  questionText: string;
  domainId: string;
  domainName?: string;
  subcatId: string;
  subcatName?: string;
  criticality?: string;
  ownershipType?: string;
  riskSummary?: string;
  expectedEvidence?: string;
  imperativeChecks?: string;
  frameworks?: string[];
  securityDomainId?: string;
  isCustom: boolean;
  isDisabled: boolean;
}

/**
 * Export questions to Excel file
 */
export async function exportQuestionsToExcel(
  questions: ExportableQuestion[],
  securityDomainId: string,
  securityDomainName: string
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Security Assessment';
  workbook.created = new Date();

  // Fetch taxonomy data for enrichment
  const { data: taxonomyDomains } = await supabase
    .from('domains')
    .select('domain_id, domain_name')
    .eq('security_domain_id', securityDomainId);

  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcat_id, subcat_name');

  const domainMap = new Map<string, string>();
  (taxonomyDomains || []).forEach(d => domainMap.set(d.domain_id, d.domain_name));

  const subcatMap = new Map<string, string>();
  (subcategories || []).forEach(s => subcatMap.set(s.subcat_id, s.subcat_name));

  // Questions sheet
  const questionsSheet = workbook.addWorksheet('Perguntas');
  questionsSheet.columns = [
    { header: 'questionId', key: 'questionId', width: 25 },
    { header: 'questionText', key: 'questionText', width: 60 },
    { header: 'domainId', key: 'domainId', width: 15 },
    { header: 'domainName', key: 'domainName', width: 25 },
    { header: 'subcatId', key: 'subcatId', width: 15 },
    { header: 'subcatName', key: 'subcatName', width: 25 },
    { header: 'criticality', key: 'criticality', width: 12 },
    { header: 'ownershipType', key: 'ownershipType', width: 15 },
    { header: 'riskSummary', key: 'riskSummary', width: 40 },
    { header: 'expectedEvidence', key: 'expectedEvidence', width: 40 },
    { header: 'imperativeChecks', key: 'imperativeChecks', width: 40 },
    { header: 'frameworks', key: 'frameworks', width: 30 },
    { header: 'isCustom', key: 'isCustom', width: 10 },
    { header: 'isDisabled', key: 'isDisabled', width: 12 },
  ];

  questions.forEach(q => {
    questionsSheet.addRow({
      questionId: q.questionId,
      questionText: q.questionText,
      domainId: q.domainId,
      domainName: q.domainName || domainMap.get(q.domainId) || '',
      subcatId: q.subcatId,
      subcatName: q.subcatName || subcatMap.get(q.subcatId) || '',
      criticality: q.criticality || 'Medium',
      ownershipType: q.ownershipType || '',
      riskSummary: q.riskSummary || '',
      expectedEvidence: q.expectedEvidence || '',
      imperativeChecks: q.imperativeChecks || '',
      frameworks: (q.frameworks || []).join(', '),
      isCustom: q.isCustom ? 'Sim' : 'Não',
      isDisabled: q.isDisabled ? 'Sim' : 'Não'
    });
  });

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Resumo');
  summarySheet.columns = [
    { header: 'Campo', key: 'Campo', width: 25 },
    { header: 'Valor', key: 'Valor', width: 40 },
  ];

  const summaryData = [
    { Campo: 'Domínio de Segurança', Valor: securityDomainName },
    { Campo: 'ID do Domínio', Valor: securityDomainId },
    { Campo: 'Total de Perguntas', Valor: questions.length },
    { Campo: 'Perguntas Padrão', Valor: questions.filter(q => !q.isCustom).length },
    { Campo: 'Perguntas Personalizadas', Valor: questions.filter(q => q.isCustom).length },
    { Campo: 'Perguntas Ativas', Valor: questions.filter(q => !q.isDisabled).length },
    { Campo: 'Perguntas Desabilitadas', Valor: questions.filter(q => q.isDisabled).length },
    { Campo: 'Data de Exportação', Valor: new Date().toLocaleString('pt-BR') }
  ];
  summaryData.forEach(row => summarySheet.addRow(row));

  // Stats by domain
  const domainStats = new Map<string, { total: number; custom: number; disabled: number }>();
  questions.forEach(q => {
    const domainName = domainMap.get(q.domainId) || q.domainId;
    const current = domainStats.get(domainName) || { total: 0, custom: 0, disabled: 0 };
    current.total++;
    if (q.isCustom) current.custom++;
    if (q.isDisabled) current.disabled++;
    domainStats.set(domainName, current);
  });

  const domainStatsSheet = workbook.addWorksheet('Por Área');
  domainStatsSheet.columns = [
    { header: 'Área', key: 'Área', width: 30 },
    { header: 'Total', key: 'Total', width: 10 },
    { header: 'Personalizadas', key: 'Personalizadas', width: 15 },
    { header: 'Desabilitadas', key: 'Desabilitadas', width: 15 },
    { header: 'Ativas', key: 'Ativas', width: 10 },
  ];

  Array.from(domainStats.entries()).forEach(([domain, stats]) => {
    domainStatsSheet.addRow({
      'Área': domain,
      'Total': stats.total,
      'Personalizadas': stats.custom,
      'Desabilitadas': stats.disabled,
      'Ativas': stats.total - stats.disabled
    });
  });

  // Stats by criticality
  const critStats = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  questions.forEach(q => {
    const crit = (q.criticality || 'Medium') as keyof typeof critStats;
    if (crit in critStats) critStats[crit]++;
  });

  const critStatsSheet = workbook.addWorksheet('Por Criticidade');
  critStatsSheet.columns = [
    { header: 'Criticidade', key: 'Criticidade', width: 20 },
    { header: 'Quantidade', key: 'Quantidade', width: 12 },
  ];

  const critStatsData = [
    { Criticidade: 'Baixa (Low)', Quantidade: critStats.Low },
    { Criticidade: 'Média (Medium)', Quantidade: critStats.Medium },
    { Criticidade: 'Alta (High)', Quantidade: critStats.High },
    { Criticidade: 'Crítica (Critical)', Quantidade: critStats.Critical }
  ];
  critStatsData.forEach(row => critStatsSheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download questions as Excel file
 */
export async function downloadQuestionsExcel(
  questions: ExportableQuestion[],
  securityDomainId: string,
  securityDomainName: string
): Promise<void> {
  const blob = await exportQuestionsToExcel(questions, securityDomainId, securityDomainName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `perguntas-${securityDomainId.toLowerCase()}-${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export questions to CSV
 */
export async function exportQuestionsToCSV(
  questions: ExportableQuestion[],
  securityDomainId: string
): Promise<Blob> {
  // Fetch taxonomy data
  const { data: taxonomyDomains } = await supabase
    .from('domains')
    .select('domain_id, domain_name')
    .eq('security_domain_id', securityDomainId);

  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcat_id, subcat_name');

  const domainMap = new Map<string, string>();
  (taxonomyDomains || []).forEach(d => domainMap.set(d.domain_id, d.domain_name));

  const subcatMap = new Map<string, string>();
  (subcategories || []).forEach(s => subcatMap.set(s.subcat_id, s.subcat_name));

  // CSV headers
  const headers = [
    'questionId',
    'questionText',
    'domainId',
    'domainName',
    'subcatId',
    'subcatName',
    'criticality',
    'ownershipType',
    'riskSummary',
    'expectedEvidence',
    'imperativeChecks',
    'frameworks',
    'isCustom',
    'isDisabled'
  ];

  // Escape CSV field
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV content
  const rows = questions.map(q => [
    q.questionId,
    q.questionText,
    q.domainId,
    domainMap.get(q.domainId) || '',
    q.subcatId,
    subcatMap.get(q.subcatId) || '',
    q.criticality || 'Medium',
    q.ownershipType || '',
    q.riskSummary || '',
    q.expectedEvidence || '',
    q.imperativeChecks || '',
    (q.frameworks || []).join('; '),
    q.isCustom ? 'Sim' : 'Não',
    q.isDisabled ? 'Sim' : 'Não'
  ].map(escapeCSV).join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
}

/**
 * Download questions as CSV file
 */
export async function downloadQuestionsCSV(
  questions: ExportableQuestion[],
  securityDomainId: string
): Promise<void> {
  const blob = await exportQuestionsToCSV(questions, securityDomainId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `perguntas-${securityDomainId.toLowerCase()}-${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
