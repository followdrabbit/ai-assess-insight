import frameworksData from '@/data/frameworks.json';

export interface Framework {
  frameworkId: string;
  frameworkName: string;
  shortName: string;
  description: string;
  targetAudience: ('Executive' | 'GRC' | 'Engineering')[];
  assessmentScope: string;
  defaultEnabled: boolean;
  version: string;
  category: 'core' | 'high-value' | 'tech-focused';
  references: string[];
}

export interface FrameworksConfig {
  version: string;
  lastUpdated: string;
  frameworks: Framework[];
}

// Type assertion for imported data
export const frameworksConfig: FrameworksConfig = frameworksData as FrameworksConfig;
export const frameworks: Framework[] = frameworksConfig.frameworks;

// Helper functions
export function getFrameworkById(frameworkId: string): Framework | undefined {
  return frameworks.find(f => f.frameworkId === frameworkId);
}

export function getFrameworkByShortName(shortName: string): Framework | undefined {
  return frameworks.find(f => f.shortName.toLowerCase() === shortName.toLowerCase());
}

export function getDefaultEnabledFrameworks(): Framework[] {
  return frameworks.filter(f => f.defaultEnabled);
}

export function getCoreFrameworks(): Framework[] {
  return frameworks.filter(f => f.category === 'core');
}

export function getFrameworksByAudience(audience: 'Executive' | 'GRC' | 'Engineering'): Framework[] {
  return frameworks.filter(f => f.targetAudience.includes(audience));
}

export function getFrameworkIds(): string[] {
  return frameworks.map(f => f.frameworkId);
}

// Authoritative framework IDs for validation
export const AUTHORITATIVE_FRAMEWORK_IDS = new Set(getFrameworkIds());

// Validate if a framework ID is in the authoritative set
export function isAuthoritativeFramework(frameworkId: string): boolean {
  return AUTHORITATIVE_FRAMEWORK_IDS.has(frameworkId);
}

// Map question framework strings to framework IDs
// Questions have strings like "NIST AI RMF GOVERN 1.1", "ISO 27001 A.5.1", etc.
// Order matters - more specific patterns should come first
const FRAMEWORK_PATTERNS: { pattern: RegExp; frameworkId: string }[] = [
  // NIST AI RMF - primary AI governance framework
  { pattern: /NIST\s*AI\s*RMF/i, frameworkId: 'NIST_AI_RMF' },
  
  // ISO standards
  { pattern: /ISO\s*\/?\s*IEC?\s*42001/i, frameworkId: 'NIST_AI_RMF' }, // Map 42001 to NIST AI RMF (AI governance)
  { pattern: /ISO\s*\/?\s*IEC?\s*23894/i, frameworkId: 'ISO_23894' },
  { pattern: /ISO\s*23894/i, frameworkId: 'ISO_23894' },
  { pattern: /ISO\s*\/?\s*IEC?\s*27001/i, frameworkId: 'ISO_27001_27002' },
  { pattern: /ISO\s*27001/i, frameworkId: 'ISO_27001_27002' },
  { pattern: /ISO\s*27002/i, frameworkId: 'ISO_27001_27002' },
  
  // Privacy/Data Protection
  { pattern: /LGPD/i, frameworkId: 'LGPD' },
  { pattern: /GDPR/i, frameworkId: 'LGPD' }, // Map GDPR to LGPD (privacy framework)
  { pattern: /NIST\s*Privacy/i, frameworkId: 'LGPD' }, // Privacy framework maps to LGPD
  
  // Development security
  { pattern: /NIST\s*SSDF/i, frameworkId: 'NIST_SSDF' },
  { pattern: /SLSA/i, frameworkId: 'NIST_SSDF' }, // Supply chain maps to SSDF
  
  // Cloud/Infrastructure security
  { pattern: /CSA/i, frameworkId: 'CSA_AI' },
  { pattern: /MITRE\s*ATLAS/i, frameworkId: 'CSA_AI' }, // MITRE ATLAS maps to CSA
  { pattern: /NIST\s*(SP\s*)?800-53/i, frameworkId: 'CSA_AI' }, // NIST 800-53 maps to CSA
  { pattern: /NIST\s*CSF/i, frameworkId: 'CSA_AI' }, // NIST CSF maps to CSA
  
  // OWASP
  { pattern: /OWASP\s*(Top\s*10\s*(for\s*)?)?LLM/i, frameworkId: 'OWASP_LLM' },
  { pattern: /OWASP\s*(Top\s*10\s*)?(for\s*)?API/i, frameworkId: 'OWASP_API' },
  { pattern: /OWASP\s*API/i, frameworkId: 'OWASP_API' },
  
  // EU AI Act - maps to NIST AI RMF (governance)
  { pattern: /EU\s*AI\s*Act/i, frameworkId: 'NIST_AI_RMF' },
];

/**
 * Given a framework string from a question (e.g., "NIST AI RMF GOVERN 1.1"),
 * returns the corresponding framework ID (e.g., "NIST_AI_RMF")
 */
export function mapQuestionFrameworkToId(questionFramework: string): string | null {
  for (const { pattern, frameworkId } of FRAMEWORK_PATTERNS) {
    if (pattern.test(questionFramework)) {
      return frameworkId;
    }
  }
  return null;
}

/**
 * Get all framework IDs that a question belongs to
 */
export function getQuestionFrameworkIds(questionFrameworks: string[]): string[] {
  const ids = new Set<string>();
  for (const fw of questionFrameworks) {
    const id = mapQuestionFrameworkToId(fw);
    if (id) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

/**
 * Check if a question belongs to any of the selected framework IDs
 */
export function questionBelongsToFrameworks(
  questionFrameworks: string[],
  selectedFrameworkIds: string[]
): boolean {
  if (selectedFrameworkIds.length === 0) return false;
  
  const selectedSet = new Set(selectedFrameworkIds);
  const questionIds = getQuestionFrameworkIds(questionFrameworks);
  
  return questionIds.some(id => selectedSet.has(id));
}

/**
 * Get primary framework ID for a question (first matched)
 */
export function getPrimaryFrameworkId(questionFrameworks: string[]): string | null {
  for (const fw of questionFrameworks) {
    const id = mapQuestionFrameworkToId(fw);
    if (id) return id;
  }
  return null;
}
