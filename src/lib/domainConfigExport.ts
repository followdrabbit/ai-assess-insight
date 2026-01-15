/**
 * Domain Configuration Export/Import
 * 
 * Handles exporting and importing complete security domain configurations
 * including taxonomy (domains, subcategories), frameworks, and questions.
 */

import { supabase } from '@/integrations/supabase/client';
import { SecurityDomain } from './securityDomains';

const SCHEMA_VERSION = '1.0.0';
const CONFIG_TYPE = 'SECURITY_DOMAIN_CONFIG';

// Export interfaces
export interface DomainConfigExport {
  metadata: DomainConfigMetadata;
  securityDomain: SecurityDomainConfig;
  taxonomy: TaxonomyConfig;
  frameworks: FrameworkConfig[];
  questions: QuestionConfig[];
}

export interface DomainConfigMetadata {
  schemaVersion: string;
  configType: string;
  exportedAt: string;
  sourceDomainId: string;
  sourceDomainName: string;
}

export interface SecurityDomainConfig {
  domainId: string;
  domainName: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  displayOrder: number;
}

export interface TaxonomyDomainConfig {
  domainId: string;
  domainName: string;
  description: string | null;
  displayOrder: number | null;
  nistAiRmfFunction: string | null;
  bankingRelevance: string | null;
  strategicQuestion: string | null;
}

export interface TaxonomySubcategoryConfig {
  subcatId: string;
  subcatName: string;
  domainId: string;
  definition: string | null;
  objective: string | null;
  criticality: string | null;
  ownershipType: string | null;
  riskSummary: string | null;
  securityOutcome: string | null;
  weight: number | null;
  frameworkRefs: string[] | null;
}

export interface TaxonomyConfig {
  domains: TaxonomyDomainConfig[];
  subcategories: TaxonomySubcategoryConfig[];
}

export interface FrameworkConfig {
  frameworkId: string;
  frameworkName: string;
  shortName: string;
  version: string | null;
  description: string | null;
  category: string | null;
  targetAudience: string[] | null;
  assessmentScope: string | null;
  referenceLinks: string[] | null;
  defaultEnabled: boolean | null;
}

export interface QuestionConfig {
  questionId: string;
  questionText: string;
  domainId: string;
  subcatId: string | null;
  criticality: string | null;
  ownershipType: string | null;
  riskSummary: string | null;
  expectedEvidence: string | null;
  imperativeChecks: string | null;
  frameworks: string[] | null;
}

// Import result interface
export interface ImportResult {
  success: boolean;
  domainId: string | null;
  warnings: string[];
  errors: string[];
  stats: {
    taxonomyDomains: number;
    subcategories: number;
    frameworks: number;
    questions: number;
  };
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: DomainConfigExport | null;
}

/**
 * Export a complete security domain configuration
 */
export async function exportDomainConfig(securityDomainId: string): Promise<DomainConfigExport | null> {
  try {
    // Get security domain
    const { data: secDomain, error: secDomainError } = await supabase
      .from('security_domains')
      .select('*')
      .eq('domain_id', securityDomainId)
      .single();

    if (secDomainError || !secDomain) {
      console.error('Error fetching security domain:', secDomainError);
      return null;
    }

    // Get taxonomy domains
    const { data: taxDomains, error: taxDomainsError } = await supabase
      .from('domains')
      .select('*')
      .eq('security_domain_id', securityDomainId)
      .order('display_order', { ascending: true });

    if (taxDomainsError) {
      console.error('Error fetching taxonomy domains:', taxDomainsError);
      return null;
    }

    // Get subcategories
    const { data: subcategories, error: subcatsError } = await supabase
      .from('subcategories')
      .select('*')
      .eq('security_domain_id', securityDomainId);

    if (subcatsError) {
      console.error('Error fetching subcategories:', subcatsError);
      return null;
    }

    // Get custom frameworks
    const { data: customFrameworks, error: fwError } = await supabase
      .from('custom_frameworks')
      .select('*')
      .eq('security_domain_id', securityDomainId);

    if (fwError) {
      console.error('Error fetching custom frameworks:', fwError);
    }

    // Get default frameworks for this domain
    const { data: defaultFrameworks, error: dfwError } = await supabase
      .from('default_frameworks')
      .select('*')
      .eq('security_domain_id', securityDomainId);

    if (dfwError) {
      console.error('Error fetching default frameworks:', dfwError);
    }

    // Get custom questions
    const { data: customQuestions, error: cqError } = await supabase
      .from('custom_questions')
      .select('*')
      .eq('security_domain_id', securityDomainId);

    if (cqError) {
      console.error('Error fetching custom questions:', cqError);
    }

    // Get default questions for this domain
    const { data: defaultQuestions, error: dqError } = await supabase
      .from('default_questions')
      .select('*')
      .eq('security_domain_id', securityDomainId);

    if (dqError) {
      console.error('Error fetching default questions:', dqError);
    }

    // Build export object
    const config: DomainConfigExport = {
      metadata: {
        schemaVersion: SCHEMA_VERSION,
        configType: CONFIG_TYPE,
        exportedAt: new Date().toISOString(),
        sourceDomainId: securityDomainId,
        sourceDomainName: secDomain.domain_name
      },
      securityDomain: {
        domainId: secDomain.domain_id,
        domainName: secDomain.domain_name,
        shortName: secDomain.short_name,
        description: secDomain.description || '',
        color: secDomain.color || 'blue',
        icon: secDomain.icon || 'shield',
        displayOrder: secDomain.display_order || 1
      },
      taxonomy: {
        domains: (taxDomains || []).map(d => ({
          domainId: d.domain_id,
          domainName: d.domain_name,
          description: d.description,
          displayOrder: d.display_order,
          nistAiRmfFunction: d.nist_ai_rmf_function,
          bankingRelevance: d.banking_relevance,
          strategicQuestion: d.strategic_question
        })),
        subcategories: (subcategories || []).map(s => ({
          subcatId: s.subcat_id,
          subcatName: s.subcat_name,
          domainId: s.domain_id,
          definition: s.definition,
          objective: s.objective,
          criticality: s.criticality,
          ownershipType: s.ownership_type,
          riskSummary: s.risk_summary,
          securityOutcome: s.security_outcome,
          weight: s.weight,
          frameworkRefs: s.framework_refs
        }))
      },
      frameworks: [
        ...(customFrameworks || []).map(f => ({
          frameworkId: f.framework_id,
          frameworkName: f.framework_name,
          shortName: f.short_name,
          version: f.version,
          description: f.description,
          category: f.category,
          targetAudience: f.target_audience,
          assessmentScope: f.assessment_scope,
          referenceLinks: f.reference_links,
          defaultEnabled: f.default_enabled
        })),
        ...(defaultFrameworks || []).map(f => ({
          frameworkId: f.framework_id,
          frameworkName: f.framework_name,
          shortName: f.short_name,
          version: f.version,
          description: f.description,
          category: f.category,
          targetAudience: f.target_audience,
          assessmentScope: f.assessment_scope,
          referenceLinks: f.reference_links,
          defaultEnabled: f.default_enabled
        }))
      ],
      questions: [
        ...(customQuestions || []).map(q => ({
          questionId: q.question_id,
          questionText: q.question_text,
          domainId: q.domain_id,
          subcatId: q.subcat_id,
          criticality: q.criticality,
          ownershipType: q.ownership_type,
          riskSummary: q.risk_summary,
          expectedEvidence: q.expected_evidence,
          imperativeChecks: q.imperative_checks,
          frameworks: q.frameworks
        })),
        ...(defaultQuestions || []).map(q => ({
          questionId: q.question_id,
          questionText: q.question_text,
          domainId: q.domain_id,
          subcatId: q.subcat_id,
          criticality: null,
          ownershipType: q.ownership_type,
          riskSummary: q.risk_summary,
          expectedEvidence: q.expected_evidence,
          imperativeChecks: q.imperative_checks,
          frameworks: q.frameworks
        }))
      ]
    };

    return config;
  } catch (error) {
    console.error('Error exporting domain config:', error);
    return null;
  }
}

/**
 * Download domain config as JSON file
 */
export function downloadDomainConfig(config: DomainConfigExport): void {
  const jsonStr = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `domain-config-${config.securityDomain.shortName.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate an import file
 */
export function validateImportFile(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content) as DomainConfigExport;

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate metadata
        if (!config.metadata) {
          errors.push('Arquivo não contém metadados válidos');
        } else {
          if (config.metadata.configType !== CONFIG_TYPE) {
            errors.push(`Tipo de configuração inválido: ${config.metadata.configType}`);
          }
          if (config.metadata.schemaVersion !== SCHEMA_VERSION) {
            warnings.push(`Versão do schema (${config.metadata.schemaVersion}) pode não ser totalmente compatível`);
          }
        }

        // Validate security domain
        if (!config.securityDomain) {
          errors.push('Arquivo não contém configuração de domínio de segurança');
        } else {
          if (!config.securityDomain.domainId || !config.securityDomain.domainName) {
            errors.push('Domínio de segurança inválido: faltam campos obrigatórios');
          }
        }

        // Validate taxonomy
        if (!config.taxonomy) {
          warnings.push('Arquivo não contém taxonomia');
        }

        // Check arrays
        if (!Array.isArray(config.frameworks)) {
          config.frameworks = [];
          warnings.push('Nenhum framework encontrado no arquivo');
        }

        if (!Array.isArray(config.questions)) {
          config.questions = [];
          warnings.push('Nenhuma pergunta encontrada no arquivo');
        }

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings,
          config: errors.length === 0 ? config : null
        });
      } catch (err) {
        resolve({
          isValid: false,
          errors: ['Erro ao processar arquivo: ' + (err as Error).message],
          warnings: [],
          config: null
        });
      }
    };

    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: ['Erro ao ler arquivo'],
        warnings: [],
        config: null
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Generate a unique domain ID for import
 */
function generateUniqueDomainId(baseName: string, existingIds: string[]): string {
  const baseId = baseName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  let uniqueId = baseId;
  let counter = 1;

  while (existingIds.includes(uniqueId)) {
    uniqueId = `${baseId}_${counter}`;
    counter++;
  }

  return uniqueId;
}

/**
 * Import a domain configuration
 */
export async function importDomainConfig(
  config: DomainConfigExport,
  options: {
    newDomainId?: string;
    newDomainName?: string;
    importFrameworks?: boolean;
    importQuestions?: boolean;
  } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    domainId: null,
    warnings: [],
    errors: [],
    stats: {
      taxonomyDomains: 0,
      subcategories: 0,
      frameworks: 0,
      questions: 0
    }
  };

  try {
    // Get existing security domains
    const { data: existingDomains } = await supabase
      .from('security_domains')
      .select('domain_id');

    const existingIds = (existingDomains || []).map(d => d.domain_id);

    // Generate new domain ID if not provided
    const newDomainId = options.newDomainId || 
      generateUniqueDomainId(config.securityDomain.shortName, existingIds);

    const newDomainName = options.newDomainName || config.securityDomain.domainName;

    // Check if domain ID already exists
    if (existingIds.includes(newDomainId)) {
      result.errors.push(`Domínio com ID "${newDomainId}" já existe`);
      return result;
    }

    // Create ID mappings for taxonomy
    const domainIdMap: Record<string, string> = {};
    const subcatIdMap: Record<string, string> = {};

    // Create security domain
    const { error: secDomainError } = await supabase
      .from('security_domains')
      .insert({
        domain_id: newDomainId,
        domain_name: newDomainName,
        short_name: options.newDomainId ? options.newDomainId.replace(/_/g, ' ') : config.securityDomain.shortName,
        description: config.securityDomain.description,
        color: config.securityDomain.color,
        icon: config.securityDomain.icon,
        display_order: config.securityDomain.displayOrder,
        is_enabled: true
      });

    if (secDomainError) {
      result.errors.push(`Erro ao criar domínio de segurança: ${secDomainError.message}`);
      return result;
    }

    result.domainId = newDomainId;

    // Import taxonomy domains
    for (const taxDomain of config.taxonomy?.domains || []) {
      const newTaxDomainId = `${newDomainId}_${taxDomain.domainId.split('_').pop() || Date.now()}`;
      domainIdMap[taxDomain.domainId] = newTaxDomainId;

      const { error: taxError } = await supabase
        .from('domains')
        .insert({
          domain_id: newTaxDomainId,
          domain_name: taxDomain.domainName,
          description: taxDomain.description,
          display_order: taxDomain.displayOrder,
          nist_ai_rmf_function: taxDomain.nistAiRmfFunction,
          banking_relevance: taxDomain.bankingRelevance,
          strategic_question: taxDomain.strategicQuestion,
          security_domain_id: newDomainId
        });

      if (taxError) {
        result.warnings.push(`Aviso ao criar domínio de taxonomia "${taxDomain.domainName}": ${taxError.message}`);
      } else {
        result.stats.taxonomyDomains++;
      }
    }

    // Import subcategories
    for (const subcat of config.taxonomy?.subcategories || []) {
      const mappedDomainId = domainIdMap[subcat.domainId] || subcat.domainId;
      const newSubcatId = `${newDomainId}_${subcat.subcatId.split('_').pop() || Date.now()}`;
      subcatIdMap[subcat.subcatId] = newSubcatId;

      const { error: subcatError } = await supabase
        .from('subcategories')
        .insert({
          subcat_id: newSubcatId,
          subcat_name: subcat.subcatName,
          domain_id: mappedDomainId,
          definition: subcat.definition,
          objective: subcat.objective,
          criticality: subcat.criticality,
          ownership_type: subcat.ownershipType,
          risk_summary: subcat.riskSummary,
          security_outcome: subcat.securityOutcome,
          weight: subcat.weight,
          framework_refs: subcat.frameworkRefs,
          security_domain_id: newDomainId
        });

      if (subcatError) {
        result.warnings.push(`Aviso ao criar subcategoria "${subcat.subcatName}": ${subcatError.message}`);
      } else {
        result.stats.subcategories++;
      }
    }

    // Import frameworks (if enabled)
    if (options.importFrameworks !== false) {
      for (const fw of config.frameworks || []) {
        const newFwId = `${newDomainId}_${fw.frameworkId.split('_').pop() || Date.now()}`;

        const { error: fwError } = await supabase
          .from('custom_frameworks')
          .insert({
            framework_id: newFwId,
            framework_name: fw.frameworkName,
            short_name: fw.shortName,
            version: fw.version,
            description: fw.description,
            category: fw.category,
            target_audience: fw.targetAudience,
            assessment_scope: fw.assessmentScope,
            reference_links: fw.referenceLinks,
            default_enabled: fw.defaultEnabled,
            security_domain_id: newDomainId
          });

        if (fwError) {
          result.warnings.push(`Aviso ao criar framework "${fw.frameworkName}": ${fwError.message}`);
        } else {
          result.stats.frameworks++;
        }
      }
    }

    // Import questions (if enabled)
    if (options.importQuestions !== false) {
      for (const q of config.questions || []) {
        const mappedDomainId = domainIdMap[q.domainId] || q.domainId;
        const mappedSubcatId = q.subcatId ? (subcatIdMap[q.subcatId] || q.subcatId) : null;
        const newQId = `${newDomainId}_${q.questionId.split('_').pop() || Date.now()}`;

        const { error: qError } = await supabase
          .from('custom_questions')
          .insert({
            question_id: newQId,
            question_text: q.questionText,
            domain_id: mappedDomainId,
            subcat_id: mappedSubcatId,
            criticality: q.criticality,
            ownership_type: q.ownershipType,
            risk_summary: q.riskSummary,
            expected_evidence: q.expectedEvidence,
            imperative_checks: q.imperativeChecks,
            frameworks: q.frameworks,
            security_domain_id: newDomainId
          });

        if (qError) {
          result.warnings.push(`Aviso ao criar pergunta: ${qError.message}`);
        } else {
          result.stats.questions++;
        }
      }
    }

    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(`Erro durante importação: ${(error as Error).message}`);
    return result;
  }
}
