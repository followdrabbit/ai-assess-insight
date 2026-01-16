/**
 * i18n Synchronization Utility
 * 
 * This utility helps synchronize translation keys across all language files.
 * It can detect missing keys and generate reports or sync files.
 * 
 * Usage in browser console or as a module:
 * 
 * import { i18nSync } from '@/lib/i18nSync';
 * 
 * // Get sync report
 * const report = i18nSync.getReport();
 * console.log(report);
 * 
 * // Get missing keys for a specific language
 * const missing = i18nSync.getMissingKeys('es-ES');
 * 
 * // Generate patched translations
 * const patched = i18nSync.generatePatchedTranslations('es-ES');
 */

import enUS from '@/i18n/locales/en-US.json';
import ptBR from '@/i18n/locales/pt-BR.json';
import esES from '@/i18n/locales/es-ES.json';

type TranslationObject = Record<string, unknown>;
type LanguageCode = 'en-US' | 'pt-BR' | 'es-ES';

const translations: Record<LanguageCode, TranslationObject> = {
  'en-US': enUS as TranslationObject,
  'pt-BR': ptBR as TranslationObject,
  'es-ES': esES as TranslationObject,
};

const languageNames: Record<LanguageCode, string> = {
  'en-US': 'English (US)',
  'pt-BR': 'Português (Brasil)',
  'es-ES': 'Español (España)',
};

/**
 * Recursively extracts all keys from a nested object
 * Returns keys in dot notation (e.g., "common.save", "dashboard.title")
 */
function getAllKeys(obj: TranslationObject, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as TranslationObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: TranslationObject, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as TranslationObject)[part];
  }

  return current;
}

/**
 * Sets a nested value in an object using dot notation
 */
function setNestedValue(obj: TranslationObject, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as TranslationObject;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Deep clone an object
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export interface MissingKeyInfo {
  key: string;
  referenceValue: string;
  suggestedValue: string;
}

export interface SyncReport {
  timestamp: string;
  referenceLanguage: LanguageCode;
  totalKeys: number;
  languages: Record<LanguageCode, {
    name: string;
    totalKeys: number;
    missingKeys: number;
    extraKeys: number;
    coverage: number;
    missing: MissingKeyInfo[];
    extra: string[];
  }>;
  summary: {
    allSynced: boolean;
    totalMissing: number;
    totalExtra: number;
  };
}

export const i18nSync = {
  /**
   * Get all unique keys across all languages
   */
  getAllUniqueKeys(): string[] {
    const allKeysSet = new Set<string>();
    for (const lang of Object.keys(translations) as LanguageCode[]) {
      const keys = getAllKeys(translations[lang]);
      keys.forEach((key) => allKeysSet.add(key));
    }
    return Array.from(allKeysSet).sort();
  },

  /**
   * Get keys for a specific language
   */
  getLanguageKeys(lang: LanguageCode): string[] {
    return getAllKeys(translations[lang]);
  },

  /**
   * Get missing keys for a specific language compared to reference (en-US)
   */
  getMissingKeys(lang: LanguageCode, referenceLang: LanguageCode = 'en-US'): MissingKeyInfo[] {
    const refKeys = getAllKeys(translations[referenceLang]);
    const langKeys = getAllKeys(translations[lang]);
    
    const missing: MissingKeyInfo[] = [];
    
    for (const key of refKeys) {
      if (!langKeys.includes(key)) {
        const refValue = getNestedValue(translations[referenceLang], key);
        missing.push({
          key,
          referenceValue: typeof refValue === 'string' ? refValue : JSON.stringify(refValue),
          suggestedValue: `[TODO: ${lang}] ${typeof refValue === 'string' ? refValue : ''}`,
        });
      }
    }
    
    return missing;
  },

  /**
   * Get extra keys in a language that don't exist in reference
   */
  getExtraKeys(lang: LanguageCode, referenceLang: LanguageCode = 'en-US'): string[] {
    const refKeys = getAllKeys(translations[referenceLang]);
    const langKeys = getAllKeys(translations[lang]);
    
    return langKeys.filter(key => !refKeys.includes(key));
  },

  /**
   * Generate a full sync report
   */
  getReport(referenceLang: LanguageCode = 'en-US'): SyncReport {
    const allKeys = this.getAllUniqueKeys();
    const refKeys = getAllKeys(translations[referenceLang]);
    
    const report: SyncReport = {
      timestamp: new Date().toISOString(),
      referenceLanguage: referenceLang,
      totalKeys: allKeys.length,
      languages: {} as SyncReport['languages'],
      summary: {
        allSynced: true,
        totalMissing: 0,
        totalExtra: 0,
      },
    };

    for (const lang of Object.keys(translations) as LanguageCode[]) {
      const langKeys = getAllKeys(translations[lang]);
      const missing = this.getMissingKeys(lang, referenceLang);
      const extra = this.getExtraKeys(lang, referenceLang);
      
      report.languages[lang] = {
        name: languageNames[lang],
        totalKeys: langKeys.length,
        missingKeys: missing.length,
        extraKeys: extra.length,
        coverage: refKeys.length > 0 ? ((langKeys.length - extra.length) / refKeys.length) * 100 : 100,
        missing,
        extra,
      };

      if (missing.length > 0 || extra.length > 0) {
        report.summary.allSynced = false;
      }
      report.summary.totalMissing += missing.length;
      report.summary.totalExtra += extra.length;
    }

    return report;
  },

  /**
   * Generate patched translations with missing keys filled in
   */
  generatePatchedTranslations(
    lang: LanguageCode, 
    referenceLang: LanguageCode = 'en-US',
    options: { 
      markAsTodo?: boolean; 
      copyFromReference?: boolean;
    } = {}
  ): TranslationObject {
    const { markAsTodo = true, copyFromReference = false } = options;
    
    const patched = deepClone(translations[lang]);
    const missing = this.getMissingKeys(lang, referenceLang);
    
    for (const { key, referenceValue } of missing) {
      let value: string;
      
      if (copyFromReference) {
        value = referenceValue;
      } else if (markAsTodo) {
        value = `[TODO: ${lang}] ${referenceValue}`;
      } else {
        value = referenceValue;
      }
      
      setNestedValue(patched, key, value);
    }
    
    return patched;
  },

  /**
   * Generate a downloadable JSON file with patched translations
   */
  downloadPatchedTranslations(
    lang: LanguageCode, 
    referenceLang: LanguageCode = 'en-US',
    options?: { markAsTodo?: boolean; copyFromReference?: boolean }
  ): void {
    const patched = this.generatePatchedTranslations(lang, referenceLang, options);
    const json = JSON.stringify(patched, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lang}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Print a formatted report to console
   */
  printReport(referenceLang: LanguageCode = 'en-US'): void {
    const report = this.getReport(referenceLang);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 i18n SYNCHRONIZATION REPORT');
    console.log('='.repeat(60));
    console.log(`📅 Generated: ${report.timestamp}`);
    console.log(`🔤 Reference Language: ${languageNames[referenceLang]} (${referenceLang})`);
    console.log(`🔑 Total Unique Keys: ${report.totalKeys}`);
    console.log('');
    
    for (const lang of Object.keys(report.languages) as LanguageCode[]) {
      const data = report.languages[lang];
      const status = data.missingKeys === 0 && data.extraKeys === 0 ? '✅' : '⚠️';
      console.log(`${status} ${data.name} (${lang})`);
      console.log(`   Keys: ${data.totalKeys} | Coverage: ${data.coverage.toFixed(1)}%`);
      
      if (data.missingKeys > 0) {
        console.log(`   ❌ Missing: ${data.missingKeys} keys`);
        data.missing.slice(0, 5).forEach(m => {
          console.log(`      - ${m.key}`);
        });
        if (data.missing.length > 5) {
          console.log(`      ... and ${data.missing.length - 5} more`);
        }
      }
      
      if (data.extraKeys > 0) {
        console.log(`   ⚡ Extra: ${data.extraKeys} keys`);
        data.extra.slice(0, 3).forEach(e => {
          console.log(`      - ${e}`);
        });
        if (data.extra.length > 3) {
          console.log(`      ... and ${data.extra.length - 3} more`);
        }
      }
      
      console.log('');
    }
    
    console.log('='.repeat(60));
    if (report.summary.allSynced) {
      console.log('✅ All languages are synchronized!');
    } else {
      console.log(`⚠️ Sync needed: ${report.summary.totalMissing} missing, ${report.summary.totalExtra} extra keys`);
    }
    console.log('='.repeat(60) + '\n');
  },

  /**
   * Generate markdown report
   */
  generateMarkdownReport(referenceLang: LanguageCode = 'en-US'): string {
    const report = this.getReport(referenceLang);
    
    let md = `# i18n Synchronization Report\n\n`;
    md += `**Generated:** ${report.timestamp}\n`;
    md += `**Reference:** ${languageNames[referenceLang]} (${referenceLang})\n`;
    md += `**Total Keys:** ${report.totalKeys}\n\n`;
    
    md += `## Summary\n\n`;
    md += `| Language | Keys | Coverage | Missing | Extra | Status |\n`;
    md += `|----------|------|----------|---------|-------|--------|\n`;
    
    for (const lang of Object.keys(report.languages) as LanguageCode[]) {
      const data = report.languages[lang];
      const status = data.missingKeys === 0 && data.extraKeys === 0 ? '✅' : '⚠️';
      md += `| ${data.name} | ${data.totalKeys} | ${data.coverage.toFixed(1)}% | ${data.missingKeys} | ${data.extraKeys} | ${status} |\n`;
    }
    
    md += `\n## Details\n\n`;
    
    for (const lang of Object.keys(report.languages) as LanguageCode[]) {
      const data = report.languages[lang];
      if (data.missingKeys > 0 || data.extraKeys > 0) {
        md += `### ${data.name} (${lang})\n\n`;
        
        if (data.missingKeys > 0) {
          md += `#### Missing Keys (${data.missingKeys})\n\n`;
          md += `| Key | Reference Value |\n`;
          md += `|-----|----------------|\n`;
          data.missing.forEach(m => {
            md += `| \`${m.key}\` | ${m.referenceValue.substring(0, 50)}${m.referenceValue.length > 50 ? '...' : ''} |\n`;
          });
          md += `\n`;
        }
        
        if (data.extraKeys > 0) {
          md += `#### Extra Keys (${data.extraKeys})\n\n`;
          data.extra.forEach(e => {
            md += `- \`${e}\`\n`;
          });
          md += `\n`;
        }
      }
    }
    
    return md;
  },

  /**
   * Download markdown report
   */
  downloadMarkdownReport(referenceLang: LanguageCode = 'en-US'): void {
    const md = this.generateMarkdownReport(referenceLang);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `i18n-sync-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).i18nSync = i18nSync;
}

export default i18nSync;
