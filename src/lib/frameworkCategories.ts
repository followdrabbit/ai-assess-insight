import { FrameworkCategoryId } from './dataset';

// Re-export the type for convenience
export type { FrameworkCategoryId };

/**
 * Human-readable labels for framework categories
 * Used across all dashboard views for consistent naming
 */
export const frameworkCategoryLabels: Record<FrameworkCategoryId, string> = {
  NIST_AI_RMF: 'NIST AI RMF',
  SECURITY_BASELINE: 'ISO 27001/27002',
  AI_RISK_MGMT: 'ISO 23894 / Gestão de Riscos',
  SECURE_DEVELOPMENT: 'NIST SSDF / CSA',
  PRIVACY_LGPD: 'LGPD / Privacidade',
  THREAT_EXPOSURE: 'OWASP LLM + API',
};

/**
 * Chart colors for framework categories using design system tokens
 * Provides consistent visual identity across all dashboard charts
 */
export const frameworkCategoryColors: Record<FrameworkCategoryId, string> = {
  NIST_AI_RMF: 'hsl(var(--chart-1))',
  SECURITY_BASELINE: 'hsl(var(--chart-2))',
  AI_RISK_MGMT: 'hsl(var(--chart-3))',
  SECURE_DEVELOPMENT: 'hsl(var(--chart-4))',
  PRIVACY_LGPD: 'hsl(var(--chart-5))',
  THREAT_EXPOSURE: 'hsl(221, 83%, 53%)',
};

/**
 * Helper to get category label with fallback
 */
export function getCategoryLabel(categoryId: FrameworkCategoryId): string {
  return frameworkCategoryLabels[categoryId] || categoryId;
}

/**
 * Helper to get category color with fallback
 */
export function getCategoryColor(categoryId: FrameworkCategoryId): string {
  return frameworkCategoryColors[categoryId] || 'hsl(var(--primary))';
}
