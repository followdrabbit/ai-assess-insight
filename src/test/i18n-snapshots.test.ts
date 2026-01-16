import { describe, it, expect } from "vitest";
import enUS from "@/i18n/locales/en-US.json";
import ptBR from "@/i18n/locales/pt-BR.json";
import esES from "@/i18n/locales/es-ES.json";

/**
 * Snapshot tests for i18n translations
 * 
 * These tests detect accidental modifications to translation files.
 * If a translation is intentionally changed, update the snapshot with:
 *   npm run test -- -u
 * 
 * The snapshots capture:
 * 1. Complete structure of each language file
 * 2. All translation keys and values
 * 3. Key structure consistency across languages
 */

describe("i18n Translation Snapshots", () => {
  describe("English (en-US)", () => {
    it("should match the snapshot for common translations", () => {
      expect(enUS.common).toMatchSnapshot();
    });

    it("should match the snapshot for auth translations", () => {
      expect(enUS.auth).toMatchSnapshot();
    });

    it("should match the snapshot for navigation translations", () => {
      expect(enUS.navigation).toMatchSnapshot();
    });

    it("should match the snapshot for dashboard translations", () => {
      expect(enUS.dashboard).toMatchSnapshot();
    });

    it("should match the snapshot for assessment translations", () => {
      expect(enUS.assessment).toMatchSnapshot();
    });

    it("should match the snapshot for settings translations", () => {
      expect(enUS.settings).toMatchSnapshot();
    });

    it("should match the snapshot for profile translations", () => {
      expect(enUS.profile).toMatchSnapshot();
    });

    it("should match the snapshot for home translations", () => {
      expect(enUS.home).toMatchSnapshot();
    });

    it("should match the snapshot for help translations", () => {
      expect(enUS.help).toMatchSnapshot();
    });

    it("should match the snapshot for errors translations", () => {
      expect(enUS.errors).toMatchSnapshot();
    });
  });

  describe("Portuguese (pt-BR)", () => {
    it("should match the snapshot for common translations", () => {
      expect(ptBR.common).toMatchSnapshot();
    });

    it("should match the snapshot for auth translations", () => {
      expect(ptBR.auth).toMatchSnapshot();
    });

    it("should match the snapshot for navigation translations", () => {
      expect(ptBR.navigation).toMatchSnapshot();
    });

    it("should match the snapshot for dashboard translations", () => {
      expect(ptBR.dashboard).toMatchSnapshot();
    });

    it("should match the snapshot for assessment translations", () => {
      expect(ptBR.assessment).toMatchSnapshot();
    });

    it("should match the snapshot for settings translations", () => {
      expect(ptBR.settings).toMatchSnapshot();
    });

    it("should match the snapshot for profile translations", () => {
      expect(ptBR.profile).toMatchSnapshot();
    });

    it("should match the snapshot for home translations", () => {
      expect(ptBR.home).toMatchSnapshot();
    });

    it("should match the snapshot for help translations", () => {
      expect(ptBR.help).toMatchSnapshot();
    });

    it("should match the snapshot for errors translations", () => {
      expect(ptBR.errors).toMatchSnapshot();
    });
  });

  describe("Spanish (es-ES)", () => {
    it("should match the snapshot for common translations", () => {
      expect(esES.common).toMatchSnapshot();
    });

    it("should match the snapshot for auth translations", () => {
      expect(esES.auth).toMatchSnapshot();
    });

    it("should match the snapshot for navigation translations", () => {
      expect(esES.navigation).toMatchSnapshot();
    });

    it("should match the snapshot for dashboard translations", () => {
      expect(esES.dashboard).toMatchSnapshot();
    });

    it("should match the snapshot for assessment translations", () => {
      expect(esES.assessment).toMatchSnapshot();
    });

    it("should match the snapshot for settings translations", () => {
      expect(esES.settings).toMatchSnapshot();
    });

    it("should match the snapshot for profile translations", () => {
      expect(esES.profile).toMatchSnapshot();
    });

    it("should match the snapshot for home translations", () => {
      expect(esES.home).toMatchSnapshot();
    });

    it("should match the snapshot for help translations", () => {
      expect(esES.help).toMatchSnapshot();
    });

    it("should match the snapshot for errors translations", () => {
      expect(esES.errors).toMatchSnapshot();
    });
  });

  describe("Structure Consistency", () => {
    it("should have identical top-level keys across all languages", () => {
      const enKeys = Object.keys(enUS).sort();
      const ptKeys = Object.keys(ptBR).sort();
      const esKeys = Object.keys(esES).sort();

      expect(ptKeys).toEqual(enKeys);
      expect(esKeys).toEqual(enKeys);
    });

    it("should have identical key counts for each section", () => {
      const sections = Object.keys(enUS) as (keyof typeof enUS)[];

      for (const section of sections) {
        const enCount = Object.keys(enUS[section]).length;
        const ptCount = Object.keys(ptBR[section]).length;
        const esCount = Object.keys(esES[section]).length;

        expect(ptCount).toBe(enCount);
        expect(esCount).toBe(enCount);
      }
    });

    it("should match the key structure snapshot", () => {
      const getKeyStructure = (obj: Record<string, unknown>, prefix = ""): string[] => {
        const keys: string[] = [];
        for (const key of Object.keys(obj).sort()) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = obj[key];
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            keys.push(...getKeyStructure(value as Record<string, unknown>, fullKey));
          } else {
            keys.push(fullKey);
          }
        }
        return keys;
      };

      const structure = getKeyStructure(enUS as unknown as Record<string, unknown>);
      expect(structure).toMatchSnapshot();
    });
  });
});
