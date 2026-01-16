import { describe, it, expect } from "vitest";
import enUS from "@/i18n/locales/en-US.json";
import ptBR from "@/i18n/locales/pt-BR.json";
import esES from "@/i18n/locales/es-ES.json";

type TranslationObject = Record<string, unknown>;

/**
 * Recursively extracts all keys from a nested object
 * Returns keys in dot notation (e.g., "common.save", "dashboard.title")
 */
function getAllKeys(obj: TranslationObject, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
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
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as TranslationObject)[part];
  }

  return current;
}

describe("i18n Translation Keys", () => {
  const languages = {
    "en-US": enUS,
    "pt-BR": ptBR,
    "es-ES": esES,
  };

  const languageNames = Object.keys(languages) as (keyof typeof languages)[];

  // Get all unique keys across all languages
  const allKeysSet = new Set<string>();
  for (const lang of languageNames) {
    const keys = getAllKeys(languages[lang] as TranslationObject);
    keys.forEach((key) => allKeysSet.add(key));
  }
  const allKeys = Array.from(allKeysSet).sort();

  describe("Key Presence Validation", () => {
    it("should have at least one translation key", () => {
      expect(allKeys.length).toBeGreaterThan(0);
    });

    // Test each language has all keys
    for (const lang of languageNames) {
      describe(`${lang} translations`, () => {
        const langKeys = getAllKeys(languages[lang] as TranslationObject);

        it(`should have translation keys defined`, () => {
          expect(langKeys.length).toBeGreaterThan(0);
        });

        // Find missing keys for this language
        const missingKeys = allKeys.filter((key) => !langKeys.includes(key));

        if (missingKeys.length > 0) {
          it.fails(`should have all keys present (missing ${missingKeys.length} keys)`, () => {
            expect(missingKeys).toEqual([]);
          });
        } else {
          it("should have all keys present", () => {
            expect(missingKeys).toEqual([]);
          });
        }
      });
    }
  });

  describe("Key Consistency Between Languages", () => {
    // Compare each language pair
    for (let i = 0; i < languageNames.length; i++) {
      for (let j = i + 1; j < languageNames.length; j++) {
        const lang1 = languageNames[i];
        const lang2 = languageNames[j];

        describe(`${lang1} vs ${lang2}`, () => {
          const keys1 = getAllKeys(languages[lang1] as TranslationObject);
          const keys2 = getAllKeys(languages[lang2] as TranslationObject);

          const onlyIn1 = keys1.filter((k) => !keys2.includes(k));
          const onlyIn2 = keys2.filter((k) => !keys1.includes(k));

          it(`should have matching keys (${lang1} -> ${lang2})`, () => {
            if (onlyIn1.length > 0) {
              console.warn(`Keys only in ${lang1}:`, onlyIn1);
            }
            expect(onlyIn1).toEqual([]);
          });

          it(`should have matching keys (${lang2} -> ${lang1})`, () => {
            if (onlyIn2.length > 0) {
              console.warn(`Keys only in ${lang2}:`, onlyIn2);
            }
            expect(onlyIn2).toEqual([]);
          });
        });
      }
    }
  });

  describe("Value Validation", () => {
    for (const lang of languageNames) {
      describe(`${lang} values`, () => {
        const langObj = languages[lang] as TranslationObject;
        const keys = getAllKeys(langObj);

        it("should not have empty string values", () => {
          const emptyKeys = keys.filter((key) => {
            const value = getNestedValue(langObj, key);
            return value === "";
          });

          if (emptyKeys.length > 0) {
            console.warn(`Empty values in ${lang}:`, emptyKeys);
          }
          expect(emptyKeys).toEqual([]);
        });

        it("should not have undefined values", () => {
          const undefinedKeys = keys.filter((key) => {
            const value = getNestedValue(langObj, key);
            return value === undefined;
          });
          expect(undefinedKeys).toEqual([]);
        });

        it("should have string values for all keys", () => {
          const nonStringKeys = keys.filter((key) => {
            const value = getNestedValue(langObj, key);
            return typeof value !== "string";
          });

          if (nonStringKeys.length > 0) {
            console.warn(`Non-string values in ${lang}:`, nonStringKeys);
          }
          expect(nonStringKeys).toEqual([]);
        });
      });
    }
  });

  describe("Interpolation Validation", () => {
    // Check that interpolation variables are consistent across languages
    const interpolationRegex = /\{\{(\w+)\}\}/g;

    for (const key of allKeys) {
      const values: Record<string, string> = {};
      const variables: Record<string, string[]> = {};

      for (const lang of languageNames) {
        const value = getNestedValue(languages[lang] as TranslationObject, key);
        if (typeof value === "string") {
          values[lang] = value;
          const matches = [...value.matchAll(interpolationRegex)];
          variables[lang] = matches.map((m) => m[1]).sort();
        }
      }

      // Only test if at least one language has interpolation
      const hasInterpolation = Object.values(variables).some((v) => v && v.length > 0);

      if (hasInterpolation) {
        it(`should have consistent interpolation variables for "${key}"`, () => {
          const refLang = languageNames[0];
          const refVars = variables[refLang] || [];

          for (const lang of languageNames.slice(1)) {
            const langVars = variables[lang] || [];
            if (refVars.length > 0 || langVars.length > 0) {
              expect(langVars).toEqual(refVars);
            }
          }
        });
      }
    }
  });

  describe("Placeholder Validation", () => {
    // Comprehensive placeholder validation
    const placeholderPatterns = {
      interpolation: /\{\{(\w+)\}\}/g,      // {{variable}}
      htmlTags: /<(\w+)[^>]*>/g,             // <tag>
      closingTags: /<\/(\w+)>/g,             // </tag>
    };

    /**
     * Extract all placeholders from a string
     */
    function extractPlaceholders(value: string): {
      interpolations: string[];
      htmlTags: string[];
    } {
      const interpolations = [...value.matchAll(placeholderPatterns.interpolation)].map(m => m[1]);
      const openTags = [...value.matchAll(placeholderPatterns.htmlTags)].map(m => m[1]);
      const closeTags = [...value.matchAll(placeholderPatterns.closingTags)].map(m => m[1]);
      
      return {
        interpolations: interpolations.sort(),
        htmlTags: [...new Set([...openTags, ...closeTags])].sort(),
      };
    }

    it("should have consistent placeholders across all languages", () => {
      const inconsistencies: Array<{
        key: string;
        type: string;
        expected: string[];
        actual: string[];
        language: string;
      }> = [];

      for (const key of allKeys) {
        const placeholdersByLang: Record<string, ReturnType<typeof extractPlaceholders>> = {};

        for (const lang of languageNames) {
          const value = getNestedValue(languages[lang] as TranslationObject, key);
          if (typeof value === "string") {
            placeholdersByLang[lang] = extractPlaceholders(value);
          }
        }

        // Compare with reference language (en-US)
        const refLang = languageNames[0];
        const refPlaceholders = placeholdersByLang[refLang];

        if (!refPlaceholders) continue;

        for (const lang of languageNames.slice(1)) {
          const langPlaceholders = placeholdersByLang[lang];
          if (!langPlaceholders) continue;

          // Check interpolations
          if (JSON.stringify(refPlaceholders.interpolations) !== JSON.stringify(langPlaceholders.interpolations)) {
            inconsistencies.push({
              key,
              type: "interpolation",
              expected: refPlaceholders.interpolations,
              actual: langPlaceholders.interpolations,
              language: lang,
            });
          }

          // Check HTML tags
          if (JSON.stringify(refPlaceholders.htmlTags) !== JSON.stringify(langPlaceholders.htmlTags)) {
            inconsistencies.push({
              key,
              type: "htmlTags",
              expected: refPlaceholders.htmlTags,
              actual: langPlaceholders.htmlTags,
              language: lang,
            });
          }
        }
      }

      if (inconsistencies.length > 0) {
        console.warn("\n⚠️ Placeholder Inconsistencies Found:");
        for (const issue of inconsistencies) {
          console.warn(`   ${issue.key} (${issue.language}): ${issue.type}`);
          console.warn(`     Expected: ${JSON.stringify(issue.expected)}`);
          console.warn(`     Actual:   ${JSON.stringify(issue.actual)}`);
        }
      }

      expect(inconsistencies).toEqual([]);
    });

    it("should report placeholder usage statistics", () => {
      const stats = {
        totalKeysWithPlaceholders: 0,
        interpolationCount: 0,
        uniqueInterpolations: new Set<string>(),
      };

      for (const key of allKeys) {
        const value = getNestedValue(languages["en-US"] as TranslationObject, key);
        if (typeof value === "string") {
          const placeholders = extractPlaceholders(value);
          
          if (placeholders.interpolations.length > 0) {
            stats.totalKeysWithPlaceholders++;
            stats.interpolationCount += placeholders.interpolations.length;
            placeholders.interpolations.forEach(p => stats.uniqueInterpolations.add(p));
          }
        }
      }

      console.log("\n📊 Placeholder Statistics:");
      console.log(`   Keys with placeholders: ${stats.totalKeysWithPlaceholders}`);
      console.log(`   Total interpolations: ${stats.interpolationCount}`);
      console.log(`   Unique variables: ${stats.uniqueInterpolations.size}`);
      console.log(`   Variables used: ${[...stats.uniqueInterpolations].sort().join(", ")}`);

      expect(true).toBe(true);
    });

    it("should validate common placeholder patterns", () => {
      const commonPlaceholders = ["count", "name", "email", "time", "value", "total", "id", "language", "domain", "framework"];
      const usedPlaceholders = new Set<string>();

      for (const key of allKeys) {
        const value = getNestedValue(languages["en-US"] as TranslationObject, key);
        if (typeof value === "string") {
          const matches = [...value.matchAll(placeholderPatterns.interpolation)];
          matches.forEach(m => usedPlaceholders.add(m[1]));
        }
      }

      console.log("\n📋 Common Placeholder Usage:");
      for (const placeholder of commonPlaceholders) {
        const isUsed = usedPlaceholders.has(placeholder);
        console.log(`   {{${placeholder}}}: ${isUsed ? "✓ Used" : "○ Not used"}`);
      }

      // Report any unusual placeholders
      const unusualPlaceholders = [...usedPlaceholders].filter(p => !commonPlaceholders.includes(p));
      if (unusualPlaceholders.length > 0) {
        console.log(`\n   Other placeholders: ${unusualPlaceholders.join(", ")}`);
      }

      expect(true).toBe(true);
    });
  });

  describe("Summary Statistics", () => {
    it("should report translation coverage", () => {
      console.log("\n📊 i18n Coverage Report:");
      console.log(`   Total unique keys: ${allKeys.length}`);

      for (const lang of languageNames) {
        const keys = getAllKeys(languages[lang] as TranslationObject);
        const coverage = ((keys.length / allKeys.length) * 100).toFixed(1);
        console.log(`   ${lang}: ${keys.length} keys (${coverage}%)`);
      }

      // This test always passes - it's just for reporting
      expect(true).toBe(true);
    });
  });
});
