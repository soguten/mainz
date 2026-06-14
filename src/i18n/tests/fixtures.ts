import { clearAppI18n, installAppI18n } from "../index.ts";

export const testAppDictionaries = {
  en: {
    anchors: { journey: "journey" },
    common: { title: "Hello" },
    greeting: "Hello, {name}",
  },
  pt: {
    anchors: { journey: "trilha" },
    common: { title: "Ola" },
    greeting: "Ola, {name}",
  },
} as const;

export function installTestAppI18n(
  overrides: Partial<Parameters<typeof installAppI18n>[0]> = {},
): void {
  clearAppI18n();
  installAppI18n({
    locales: ["en", "pt"],
    defaultLocale: "en",
    dictionaries: testAppDictionaries,
    ...overrides,
  });
}
