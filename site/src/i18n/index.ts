import en from "./locales/en.ts";
import pt from "./locales/pt.ts";
import { createAppDictionaryI18n } from "mainz/i18n";

const dictionaries = {
    en,
    pt,
} as const;

export type SiteLocale = keyof typeof dictionaries;
const DEFAULT_LOCALE: SiteLocale = "en";

const i18n = createAppDictionaryI18n({
    defaultLocale: DEFAULT_LOCALE,
    dictionaries,
    detect: {
        path: true,
        document: false,
        navigator: true,
    },
    onMissingTranslation: (key) => {
        console.warn(`[i18n] Missing translation for key: ${key}`);
    },
});

export const getLocale = i18n.getLocale;
export const setLocale = i18n.setLocale;
export const t = i18n.t;
