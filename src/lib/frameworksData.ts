import { supabase } from '@/integrations/supabase/client';

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

// Cache for frameworks
let frameworksCache: Framework[] | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch frameworks from database
export async function fetchFrameworks(): Promise<Framework[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (frameworksCache && (now - lastFetch) < CACHE_DURATION) {
    return frameworksCache;
  }

  const { data, error } = await supabase
    .from('default_frameworks')
    .select('*')
    .order('framework_id');

  if (error) {
    console.error('Error fetching frameworks:', error);
    // Return cache if available, empty array otherwise
    return frameworksCache || [];
  }

  frameworksCache = (data || []).map(row => ({
    frameworkId: row.framework_id,
    frameworkName: row.framework_name,
    shortName: row.short_name,
    description: row.description || '',
    targetAudience: (row.target_audience || []) as Framework['targetAudience'],
    assessmentScope: row.assessment_scope || '',
    defaultEnabled: row.default_enabled || false,
    version: row.version || '1.0',
    category: (row.category || 'core') as Framework['category'],
    references: row.reference_links || []
  }));

  lastFetch = now;
  return frameworksCache;
}

// Clear cache (call when data is updated)
export function clearFrameworksCache(): void {
  frameworksCache = null;
  lastFetch = 0;
}

// Helper functions
export async function getFrameworkById(frameworkId: string): Promise<Framework | undefined> {
  const frameworks = await fetchFrameworks();
  return frameworks.find(f => f.frameworkId === frameworkId);
}

export async function getFrameworkByShortName(shortName: string): Promise<Framework | undefined> {
  const frameworks = await fetchFrameworks();
  return frameworks.find(f => f.shortName.toLowerCase() === shortName.toLowerCase());
}

export async function getDefaultEnabledFrameworks(): Promise<Framework[]> {
  const frameworks = await fetchFrameworks();
  return frameworks.filter(f => f.defaultEnabled);
}

export async function getCoreFrameworks(): Promise<Framework[]> {
  const frameworks = await fetchFrameworks();
  return frameworks.filter(f => f.category === 'core');
}

export async function getFrameworksByAudience(audience: 'Executive' | 'GRC' | 'Engineering'): Promise<Framework[]> {
  const frameworks = await fetchFrameworks();
  return frameworks.filter(f => f.targetAudience.includes(audience));
}

export async function getFrameworkIds(): Promise<string[]> {
  const frameworks = await fetchFrameworks();
  return frameworks.map(f => f.frameworkId);
}

// Framework pattern matching (kept from original for question-framework mapping)
const FRAMEWORK_PATTERNS: { pattern: RegExp; frameworkId: string }[] = [
  { pattern: /NIST\s*AI\s*RMF/i, frameworkId: 'NIST_AI_RMF' },
  { pattern: /ISO\s*\/?\s*IEC?\s*42001/i, frameworkId: 'NIST_AI_RMF' },
  { pattern: /ISO\s*\/?\s*IEC?\s*23894/i, frameworkId: 'ISO_23894' },
  { pattern: /ISO\s*23894/i, frameworkId: 'ISO_23894' },
  { pattern: /ISO\s*\/?\s*IEC?\s*27001/i, frameworkId: 'ISO_27001_27002' },
  { pattern: /ISO\s*27001/i, frameworkId: 'ISO_27001_27002' },
  { pattern: /ISO\s*27002/i, frameworkId: 'ISO_27001_27002' },
  { pattern: /LGPD/i, frameworkId: 'LGPD' },
  { pattern: /NIST\s*SSDF/i, frameworkId: 'NIST_SSDF' },
  { pattern: /SSDF/i, frameworkId: 'NIST_SSDF' },
  { pattern: /CSA\s*CCM/i, frameworkId: 'CSA_CCM' },
  { pattern: /CSA\s*Cloud\s*Controls/i, frameworkId: 'CSA_CCM' },
  { pattern: /CSA\s*AI/i, frameworkId: 'CSA_AI' },
  { pattern: /OWASP\s*LLM/i, frameworkId: 'OWASP_LLM' },
  { pattern: /OWASP\s*(Top\s*10\s*(for\s*)?)?LLM/i, frameworkId: 'OWASP_LLM' },
  { pattern: /LLM0[1-9]/i, frameworkId: 'OWASP_LLM' },
  { pattern: /LLM10/i, frameworkId: 'OWASP_LLM' },
  { pattern: /OWASP\s*API/i, frameworkId: 'OWASP_API' },
  { pattern: /API[1-9]:/i, frameworkId: 'OWASP_API' },
  { pattern: /API10:/i, frameworkId: 'OWASP_API' },
];

export function mapQuestionFrameworkToId(questionFramework: string): string | null {
  for (const { pattern, frameworkId } of FRAMEWORK_PATTERNS) {
    if (pattern.test(questionFramework)) {
      return frameworkId;
    }
  }
  return null;
}

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

export function questionBelongsToFrameworks(
  questionFrameworks: string[],
  selectedFrameworkIds: string[]
): boolean {
  if (selectedFrameworkIds.length === 0) return false;
  
  const selectedSet = new Set(selectedFrameworkIds);
  const questionIds = getQuestionFrameworkIds(questionFrameworks);
  
  return questionIds.some(id => selectedSet.has(id));
}

export function getPrimaryFrameworkId(questionFrameworks: string[]): string | null {
  for (const fw of questionFrameworks) {
    const id = mapQuestionFrameworkToId(fw);
    if (id) return id;
  }
  return null;
}
