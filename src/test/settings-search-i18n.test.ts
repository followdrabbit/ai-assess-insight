import { describe, it, expect } from "vitest";
import enUS from "@/i18n/locales/en-US.json";
import ptBR from "@/i18n/locales/pt-BR.json";
import esES from "@/i18n/locales/es-ES.json";

type TranslationObject = Record<string, unknown>;

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

/**
 * All translation keys used by SettingsSearch component
 * These must exist in all 3 language files
 */
const SETTINGS_SEARCH_KEYS = [
  // Placeholder
  "settingsSearch.placeholder",
  "settingsSearch.noResults",
  "settingsSearch.tryTerms",

  // Content Tab Items
  "settingsSearch.domains.title",
  "settingsSearch.domains.description",
  "settingsSearch.domains.section",
  "settingsSearch.frameworks.title",
  "settingsSearch.frameworks.description",
  "settingsSearch.frameworks.section",
  "settingsSearch.questions.title",
  "settingsSearch.questions.description",
  "settingsSearch.questions.section",

  // Assessment Tab Items
  "settingsSearch.assessmentInfo.title",
  "settingsSearch.assessmentInfo.description",
  "settingsSearch.assessmentInfo.section",
  "settingsSearch.frameworkSelection.title",
  "settingsSearch.frameworkSelection.description",
  "settingsSearch.frameworkSelection.section",

  // Preferences Tab Items
  "settingsSearch.appearance.title",
  "settingsSearch.appearance.description",
  "settingsSearch.appearance.section",
  "settingsSearch.voiceSettings.title",
  "settingsSearch.voiceSettings.description",
  "settingsSearch.voiceSettings.section",
  "settingsSearch.sttConfig.title",
  "settingsSearch.sttConfig.description",
  "settingsSearch.sttConfig.section",
  "settingsSearch.voiceProfile.title",
  "settingsSearch.voiceProfile.description",
  "settingsSearch.voiceProfile.section",
  "settingsSearch.notifications.title",
  "settingsSearch.notifications.description",
  "settingsSearch.notifications.section",

  // System Tab Items
  "settingsSearch.export.title",
  "settingsSearch.export.description",
  "settingsSearch.export.section",
  "settingsSearch.demoData.title",
  "settingsSearch.demoData.description",
  "settingsSearch.demoData.section",
  "settingsSearch.clearAnswers.title",
  "settingsSearch.clearAnswers.description",
  "settingsSearch.clearAnswers.section",
  "settingsSearch.restoreDefaults.title",
  "settingsSearch.restoreDefaults.description",
  "settingsSearch.restoreDefaults.section",
  "settingsSearch.about.title",
  "settingsSearch.about.description",
  "settingsSearch.about.section",

  // Tab labels used in TAB_CONFIG
  "settings.contentTab",
  "settings.assessmentTab",
  "settings.preferencesTab",
  "settings.systemTab",
];

describe("SettingsSearch i18n Keys", () => {
  const languages = {
    "en-US": enUS,
    "pt-BR": ptBR,
    "es-ES": esES,
  };

  const languageNames = Object.keys(languages) as (keyof typeof languages)[];

  describe("All Required Keys Exist", () => {
    for (const lang of languageNames) {
      describe(`${lang} translations`, () => {
        const langObj = languages[lang] as TranslationObject;

        it("should have all SettingsSearch keys defined", () => {
          const missingKeys: string[] = [];

          for (const key of SETTINGS_SEARCH_KEYS) {
            const value = getNestedValue(langObj, key);
            if (value === undefined) {
              missingKeys.push(key);
            }
          }

          if (missingKeys.length > 0) {
            console.error(`\n❌ Missing keys in ${lang}:`);
            missingKeys.forEach((key) => console.error(`   - ${key}`));
          }

          expect(missingKeys).toEqual([]);
        });

        it("should not have empty string values for SettingsSearch keys", () => {
          const emptyKeys: string[] = [];

          for (const key of SETTINGS_SEARCH_KEYS) {
            const value = getNestedValue(langObj, key);
            if (value === "") {
              emptyKeys.push(key);
            }
          }

          if (emptyKeys.length > 0) {
            console.error(`\n⚠️ Empty values in ${lang}:`);
            emptyKeys.forEach((key) => console.error(`   - ${key}`));
          }

          expect(emptyKeys).toEqual([]);
        });

        it("should have string values for all SettingsSearch keys", () => {
          const nonStringKeys: string[] = [];

          for (const key of SETTINGS_SEARCH_KEYS) {
            const value = getNestedValue(langObj, key);
            if (value !== undefined && typeof value !== "string") {
              nonStringKeys.push(`${key} (type: ${typeof value})`);
            }
          }

          if (nonStringKeys.length > 0) {
            console.error(`\n⚠️ Non-string values in ${lang}:`);
            nonStringKeys.forEach((key) => console.error(`   - ${key}`));
          }

          expect(nonStringKeys).toEqual([]);
        });
      });
    }
  });

  describe("Placeholder Consistency", () => {
    const interpolationRegex = /\{\{(\w+)\}\}/g;

    it("should have consistent interpolation variables across all languages", () => {
      const inconsistencies: Array<{
        key: string;
        refLang: string;
        refVars: string[];
        lang: string;
        langVars: string[];
      }> = [];

      for (const key of SETTINGS_SEARCH_KEYS) {
        const variablesByLang: Record<string, string[]> = {};

        for (const lang of languageNames) {
          const value = getNestedValue(languages[lang] as TranslationObject, key);
          if (typeof value === "string") {
            const matches = [...value.matchAll(interpolationRegex)];
            variablesByLang[lang] = matches.map((m) => m[1]).sort();
          }
        }

        // Compare with reference language (en-US)
        const refLang = languageNames[0];
        const refVars = variablesByLang[refLang] || [];

        for (const lang of languageNames.slice(1)) {
          const langVars = variablesByLang[lang] || [];
          if (JSON.stringify(refVars) !== JSON.stringify(langVars)) {
            inconsistencies.push({
              key,
              refLang,
              refVars,
              lang,
              langVars,
            });
          }
        }
      }

      if (inconsistencies.length > 0) {
        console.error("\n⚠️ Interpolation Inconsistencies:");
        for (const issue of inconsistencies) {
          console.error(`   ${issue.key}:`);
          console.error(`     ${issue.refLang}: {{${issue.refVars.join("}}, {{")}}`);
          console.error(`     ${issue.lang}: {{${issue.langVars.join("}}, {{")}}`);
        }
      }

      expect(inconsistencies).toEqual([]);
    });
  });

  describe("Key Categories Coverage", () => {
    it("should have all content tab items", () => {
      const contentKeys = SETTINGS_SEARCH_KEYS.filter(
        (key) =>
          key.includes("domains") ||
          key.includes("frameworks") ||
          key.includes("questions")
      ).filter((key) => key.startsWith("settingsSearch."));

      // Should have title, description, section for each item
      expect(contentKeys.length).toBe(9); // 3 items × 3 keys each
    });

    it("should have all assessment tab items", () => {
      const assessmentKeys = SETTINGS_SEARCH_KEYS.filter(
        (key) =>
          key.includes("assessmentInfo") || key.includes("frameworkSelection")
      );

      expect(assessmentKeys.length).toBe(6); // 2 items × 3 keys each
    });

    it("should have all preferences tab items", () => {
      const preferencesKeys = SETTINGS_SEARCH_KEYS.filter(
        (key) =>
          key.includes("appearance") ||
          key.includes("voiceSettings") ||
          key.includes("sttConfig") ||
          key.includes("voiceProfile") ||
          key.includes("notifications")
      );

      expect(preferencesKeys.length).toBe(15); // 5 items × 3 keys each
    });

    it("should have all system tab items", () => {
      const systemKeys = SETTINGS_SEARCH_KEYS.filter(
        (key) =>
          key.includes("export") ||
          key.includes("demoData") ||
          key.includes("clearAnswers") ||
          key.includes("restoreDefaults") ||
          key.includes("about")
      );

      expect(systemKeys.length).toBe(15); // 5 items × 3 keys each
    });

    it("should have all tab labels", () => {
      const tabKeys = SETTINGS_SEARCH_KEYS.filter((key) =>
        key.startsWith("settings.") && key.endsWith("Tab")
      );

      expect(tabKeys.length).toBe(4); // content, assessment, preferences, system
    });
  });

  describe("Summary Statistics", () => {
    it("should report SettingsSearch i18n coverage", () => {
      console.log("\n📊 SettingsSearch i18n Report:");
      console.log(`   Total required keys: ${SETTINGS_SEARCH_KEYS.length}`);

      for (const lang of languageNames) {
        const langObj = languages[lang] as TranslationObject;
        let foundCount = 0;
        let emptyCount = 0;

        for (const key of SETTINGS_SEARCH_KEYS) {
          const value = getNestedValue(langObj, key);
          if (value !== undefined) {
            foundCount++;
            if (value === "") {
              emptyCount++;
            }
          }
        }

        const coverage = ((foundCount / SETTINGS_SEARCH_KEYS.length) * 100).toFixed(1);
        console.log(
          `   ${lang}: ${foundCount}/${SETTINGS_SEARCH_KEYS.length} keys (${coverage}%)${emptyCount > 0 ? ` - ${emptyCount} empty` : ""}`
        );
      }

      expect(true).toBe(true);
    });
  });
});
