/**
 * Security Domains - Core concept for multi-domain governance platform
 * 
 * A Security Domain represents a major area of security governance
 * that CISOs and security leadership are responsible for.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SecurityDomain {
  domainId: string;
  domainName: string;
  shortName: string;
  description: string;
  icon: string;
  displayOrder: number;
  isEnabled: boolean;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

// Default security domains (fallback if DB fetch fails)
export const DEFAULT_SECURITY_DOMAINS: SecurityDomain[] = [
  {
    domainId: 'AI_SECURITY',
    domainName: 'AI Security',
    shortName: 'AI Sec',
    description: 'Segurança de IA: riscos de modelo, dados, runtime, governança e abuso',
    icon: 'brain',
    displayOrder: 1,
    isEnabled: true,
    color: 'purple'
  },
  {
    domainId: 'CLOUD_SECURITY',
    domainName: 'Cloud Security',
    shortName: 'Cloud Sec',
    description: 'Segurança em nuvem: responsabilidade compartilhada, identidade, proteção de dados, postura',
    icon: 'cloud',
    displayOrder: 2,
    isEnabled: true,
    color: 'blue'
  },
  {
    domainId: 'DEVSECOPS',
    domainName: 'DevSecOps Security',
    shortName: 'DevSecOps',
    description: 'Segurança de desenvolvimento: AppSec, InfraSec, CI/CD e Pipeline Security',
    icon: 'code',
    displayOrder: 3,
    isEnabled: true,
    color: 'green'
  }
];

// Color mappings for UI
export const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' }
};

// Icon mappings (lucide-react icon names)
export const DOMAIN_ICONS: Record<string, string> = {
  brain: 'Brain',
  cloud: 'Cloud',
  code: 'Code',
  shield: 'Shield',
  lock: 'Lock',
  database: 'Database',
  server: 'Server',
  key: 'Key'
};

/**
 * Fetch all security domains from database
 */
export async function getAllSecurityDomains(): Promise<SecurityDomain[]> {
  try {
    const { data, error } = await supabase
      .from('security_domains')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching security domains:', error);
      return DEFAULT_SECURITY_DOMAINS;
    }

    return (data || []).map(row => ({
      domainId: row.domain_id,
      domainName: row.domain_name,
      shortName: row.short_name,
      description: row.description || '',
      icon: row.icon || 'shield',
      displayOrder: row.display_order || 0,
      isEnabled: row.is_enabled ?? true,
      color: row.color || 'blue',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error fetching security domains:', error);
    return DEFAULT_SECURITY_DOMAINS;
  }
}

/**
 * Get enabled security domains only
 */
export async function getEnabledSecurityDomains(): Promise<SecurityDomain[]> {
  const domains = await getAllSecurityDomains();
  return domains.filter(d => d.isEnabled);
}

/**
 * Get a specific security domain by ID
 */
export async function getSecurityDomainById(domainId: string): Promise<SecurityDomain | undefined> {
  const domains = await getAllSecurityDomains();
  return domains.find(d => d.domainId === domainId);
}

/**
 * Get the default security domain (AI_SECURITY)
 */
export function getDefaultSecurityDomainId(): string {
  return 'AI_SECURITY';
}

/**
 * Check if a domain ID is valid
 */
export async function isValidSecurityDomain(domainId: string): Promise<boolean> {
  const domains = await getAllSecurityDomains();
  return domains.some(d => d.domainId === domainId);
}

/**
 * Get domain display info for UI
 */
export function getDomainDisplayInfo(domain: SecurityDomain): {
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  const colors = DOMAIN_COLORS[domain.color] || DOMAIN_COLORS.blue;
  return {
    bgClass: colors.bg,
    textClass: colors.text,
    borderClass: colors.border
  };
}
