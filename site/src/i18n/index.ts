import en from "./locales/en.ts";
import pt from "./locales/pt.ts";

const dictionaries = {
    en,
    pt,
} as const;

export type SiteLocale = keyof typeof dictionaries;
const DEFAULT_LOCALE: SiteLocale = "en";
const SUPPORTED_LOCALES = Object.keys(dictionaries) as SiteLocale[];

let activeLocale: SiteLocale = detectBrowserLocale();

export function getLocale(): SiteLocale {
    return activeLocale;
}

export function setLocale(locale: SiteLocale): void {
    activeLocale = locale;
}

export function t<T = string>(path: string): T {
    const dictionary = dictionaries[activeLocale];
    const resolved = getByPath(dictionary, path);

    if (resolved !== undefined) {
        return resolved as T;
    }

    const fallback = getByPath(dictionaries.en, path);
    if (fallback !== undefined) {
        return fallback as T;
    }

    console.warn(`[i18n] Missing translation for key: ${path}`);
    return path as T;
}

function detectBrowserLocale(): SiteLocale {
    const fallback = SUPPORTED_LOCALES.includes(DEFAULT_LOCALE)
        ? DEFAULT_LOCALE
        : SUPPORTED_LOCALES[0];

    if (typeof navigator === "undefined") {
        return fallback;
    }

    const candidates = [
        ...(navigator.languages ?? []),
        navigator.language,
    ].filter(Boolean);

    for (const candidate of candidates) {
        const normalized = candidate.toLowerCase().replace("_", "-");
        const exactMatch = SUPPORTED_LOCALES.find((locale) => locale === normalized);
        if (exactMatch) return exactMatch;

        const base = normalized.split("-")[0] as SiteLocale;
        const baseMatch = SUPPORTED_LOCALES.find((locale) => locale === base);
        if (baseMatch) return baseMatch;
    }

    return fallback;
}

function getByPath(source: unknown, path: string): unknown {
    const chunks = path.split(".");
    let current: unknown = source;

    for (const chunk of chunks) {
        if (current == null || typeof current !== "object") {
            return undefined;
        }

        current = (current as Record<string, unknown>)[chunk];
    }

    return current;
}
