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
  securityDomainId?: string; // NEW: Associates framework with a security domain
}

export interface FrameworksConfig {
  version: string;
  lastUpdated: string;
  frameworks: Framework[];
}

// Type assertion for imported data
export const frameworksConfig: FrameworksConfig = frameworksData as FrameworksConfig;
export const frameworks: Framework[] = frameworksConfig.frameworks;

// Security Domain to Framework mapping
// This maps each framework to its primary security domain
export const FRAMEWORK_DOMAIN_MAP: Record<string, string> = {
  // AI Security Frameworks
  'NIST_AI_RMF': 'AI_SECURITY',
  'ISO_27001_27002': 'AI_SECURITY', // General security, but primarily used in AI context here
  'ISO_23894': 'AI_SECURITY',
  'LGPD': 'AI_SECURITY', // Privacy applies to AI data handling
  'CSA_AI': 'AI_SECURITY',
  'OWASP_LLM': 'AI_SECURITY',
  
  // Cloud Security Frameworks
  'CSA_CCM': 'CLOUD_SECURITY',
  'CIS_BENCHMARKS': 'CLOUD_SECURITY',
  'ISO_27017': 'CLOUD_SECURITY', // Cloud-specific ISO extension
  'ISO_27018': 'CLOUD_SECURITY', // Cloud privacy
  'NIST_800_144': 'CLOUD_SECURITY', // NIST Cloud Computing Guidelines
  
  // DevSecOps Frameworks
  'NIST_SSDF': 'DEVSECOPS',
  'OWASP_API': 'DEVSECOPS',
  'OWASP_ASVS': 'DEVSECOPS',
  'SLSA': 'DEVSECOPS',
};

/**
 * Get the security domain ID for a framework
 * First checks the explicit map, then falls back to the framework's securityDomainId property
 */
export function getFrameworkSecurityDomain(frameworkId: string): string {
  // Check explicit map first
  if (FRAMEWORK_DOMAIN_MAP[frameworkId]) {
    return FRAMEWORK_DOMAIN_MAP[frameworkId];
  }
  // Fall back to the framework's own securityDomainId property from JSON
  const framework = frameworks.find(f => f.frameworkId === frameworkId);
  if (framework?.securityDomainId) {
    return framework.securityDomainId;
  }
  // Default to AI_SECURITY for backwards compatibility
  return 'AI_SECURITY';
}

/**
 * Get all frameworks for a specific security domain
 * Checks both the explicit map and the framework's securityDomainId property
 */
export function getFrameworksBySecurityDomain(securityDomainId: string): Framework[] {
  return frameworks.filter(f => {
    // Check explicit map first
    if (FRAMEWORK_DOMAIN_MAP[f.frameworkId]) {
      return FRAMEWORK_DOMAIN_MAP[f.frameworkId] === securityDomainId;
    }
    // Fall back to the framework's own securityDomainId property
    return f.securityDomainId === securityDomainId;
  });
}

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
// STRICT MATCHING: Only map to frameworks that are explicitly referenced
// Do NOT map to other frameworks (e.g., don't map NIST CSF to CSA_CCM)
const FRAMEWORK_PATTERNS: { pattern: RegExp; frameworkId: string }[] = [
  // NIST AI RMF - primary AI governance framework
  { pattern: /NIST\s*AI\s*RMF/i, frameworkId: 'NIST_AI_RMF' },
  
  // ISO/IEC 42001 - AI Management System (maps to NIST AI RMF as they're complementary)
  { pattern: /ISO\s*\/?\s*IEC?\s*42001/i, frameworkId: 'NIST_AI_RMF' },
  
  // ISO/IEC 23894 - AI Risk Management
  { pattern: /ISO\s*\/?\s*IEC?\s*23894/i, frameworkId: 'ISO_23894' },
  { pattern: /ISO\s*23894/i, frameworkId: 'ISO_23894' },
  
  // ISO 27001/27002 - Information Security
  { pattern: /ISO\s*\/?\s*IEC?\s*27001/i, frameworkId: 'ISO_27001_27002' },
  { pattern: /ISO\s*27001/i, frameworkId: 'ISO_27001_27002' },
  { pattern: /ISO\s*27002/i, frameworkId: 'ISO_27001_27002' },
  
  // LGPD - Brazilian Data Protection
  { pattern: /LGPD/i, frameworkId: 'LGPD' },
  
  // NIST SSDF - Secure Software Development
  { pattern: /NIST\s*SSDF/i, frameworkId: 'NIST_SSDF' },
  { pattern: /SSDF/i, frameworkId: 'NIST_SSDF' },
  
  // CSA CCM - Cloud Controls Matrix
  { pattern: /CSA\s*CCM/i, frameworkId: 'CSA_CCM' },
  { pattern: /CSA\s*Cloud\s*Controls/i, frameworkId: 'CSA_CCM' },
  
  // CIS Controls / Benchmarks - Cloud Security
  { pattern: /CIS\s*Controls?/i, frameworkId: 'CIS_BENCHMARKS' },
  { pattern: /CIS\s*Benchmarks?/i, frameworkId: 'CIS_BENCHMARKS' },
  { pattern: /CIS\s+\d/i, frameworkId: 'CIS_BENCHMARKS' }, // e.g., "CIS 1", "CIS 8"
  
  // ISO 27017 - Cloud-specific security
  { pattern: /ISO\s*\/?\s*IEC?\s*27017/i, frameworkId: 'CSA_CCM' }, // Map to CSA CCM as they're complementary for cloud
  { pattern: /ISO\s*27017/i, frameworkId: 'CSA_CCM' },
  
  // NIST SP 800-144 - Cloud Computing Guidelines
  { pattern: /NIST\s*SP\s*800-?144/i, frameworkId: 'CSA_CCM' }, // Map to CSA CCM
  { pattern: /NIST\s*800-?144/i, frameworkId: 'CSA_CCM' },
  
  // NIST SP 800-53 - Security and Privacy Controls (Cloud context)
  { pattern: /NIST\s*SP\s*800-?53/i, frameworkId: 'CSA_CCM' }, // Map to CSA CCM in cloud context
  
  // CSA AI - Cloud Security Alliance AI guidance
  { pattern: /CSA\s*AI/i, frameworkId: 'CSA_AI' },
  
  // OWASP LLM Top 10
  { pattern: /OWASP\s*LLM/i, frameworkId: 'OWASP_LLM' },
  { pattern: /OWASP\s*(Top\s*10\s*(for\s*)?)?LLM/i, frameworkId: 'OWASP_LLM' },
  { pattern: /LLM0[1-9]/i, frameworkId: 'OWASP_LLM' },
  { pattern: /LLM10/i, frameworkId: 'OWASP_LLM' },
  
  // OWASP API Security
  { pattern: /OWASP\s*API/i, frameworkId: 'OWASP_API' },
  { pattern: /API[1-9]:/i, frameworkId: 'OWASP_API' },
  { pattern: /API10:/i, frameworkId: 'OWASP_API' },
  
  // OWASP ASVS - Application Security Verification Standard
  { pattern: /OWASP\s*ASVS/i, frameworkId: 'OWASP_ASVS' },
  { pattern: /ASVS/i, frameworkId: 'OWASP_ASVS' },
  
  // SLSA - Supply Chain Levels for Software Artifacts
  { pattern: /SLSA/i, frameworkId: 'SLSA' },
  
  // NOTE: The following frameworks are intentionally NOT mapped to other frameworks
  // to ensure strict filtering. If a question only references these, it won't appear
  // unless explicitly enabled:
  // - ISO 31000 (standalone risk management)
  // - NIST CSF (standalone cybersecurity framework)
  // - EU AI Act (standalone regulation)
  // - GDPR (use LGPD for privacy)
  // - MITRE ATLAS (adversarial threats)
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
