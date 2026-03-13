import { createDictionaryI18n, detectNavigatorLocale, DictionaryI18n, normalizeLocaleTag } from "./core.ts";

export interface DictionaryI18nAppDetectOptions {
    path?: boolean;
    document?: boolean;
    navigator?: boolean;
}

type LocaleKeys<T extends Record<string, object>> = keyof T & string;
type LocaleDictionary<T extends Record<string, object>> = T[LocaleKeys<T>];

export interface DictionaryI18nAppOptions<
    Dictionaries extends Record<string, object>,
> {
    defaultLocale: LocaleKeys<Dictionaries>;
    dictionaries: Dictionaries;
    fallbackLocale?: LocaleKeys<Dictionaries>;
    initialLocale?: string;
    detect?: DictionaryI18nAppDetectOptions;
    onMissingTranslation?: (key: string, locale: LocaleKeys<Dictionaries>) => void;
}

export function createAppDictionaryI18n<
    Dictionaries extends Record<string, object>,
>(
    options: DictionaryI18nAppOptions<Dictionaries>,
): DictionaryI18n<LocaleKeys<Dictionaries>, LocaleDictionary<Dictionaries>> {
    const locales = Object.keys(options.dictionaries) as LocaleKeys<Dictionaries>[];
    if (locales.length === 0) {
        throw new Error("createAppDictionaryI18n requires at least one locale in dictionaries.");
    }

    const initialLocale = options.initialLocale ?? detectInitialLocale(locales, options.detect);

    return createDictionaryI18n<LocaleKeys<Dictionaries>, LocaleDictionary<Dictionaries>>({
        defaultLocale: options.defaultLocale,
        locales,
        dictionaries: options.dictionaries as Record<LocaleKeys<Dictionaries>, LocaleDictionary<Dictionaries>>,
        fallbackLocale: options.fallbackLocale,
        initialLocale,
        onMissingTranslation: options.onMissingTranslation,
    });
}

function detectInitialLocale<Locale extends string>(
    locales: readonly Locale[],
    detectOptions: DictionaryI18nAppDetectOptions | undefined,
): string | undefined {
    const detect = {
        path: true,
        document: true,
        navigator: true,
        ...(detectOptions ?? {}),
    };

    const lookup = buildLocaleLookup(locales);

    if (detect.path) {
        const fromPath = detectLocaleFromPath(lookup);
        if (fromPath) return fromPath;
    }

    if (detect.document) {
        const fromDocument = detectLocaleFromDocument(lookup);
        if (fromDocument) return fromDocument;
    }

    if (detect.navigator) {
        return detectNavigatorLocale();
    }

    return undefined;
}

function buildLocaleLookup<Locale extends string>(locales: readonly Locale[]): Map<string, Locale> {
    const lookup = new Map<string, Locale>();

    for (const locale of locales) {
        lookup.set(normalizeLocaleTag(locale).toLowerCase(), locale);
    }

    return lookup;
}

function detectLocaleFromPath<Locale extends string>(lookup: Map<string, Locale>): string | undefined {
    if (typeof location === "undefined") {
        return undefined;
    }

    const firstSegment = location.pathname.split("/").filter(Boolean)[0];
    if (!firstSegment) {
        return undefined;
    }

    return matchSupportedLocale(firstSegment, lookup);
}

function detectLocaleFromDocument<Locale extends string>(lookup: Map<string, Locale>): string | undefined {
    if (typeof document === "undefined") {
        return undefined;
    }

    const lang = document.documentElement?.lang?.trim();
    if (!lang) {
        return undefined;
    }

    return matchSupportedLocale(lang, lookup);
}

function matchSupportedLocale<Locale extends string>(
    candidate: string,
    lookup: Map<string, Locale>,
): Locale | undefined {
    let normalized: string;

    try {
        normalized = normalizeLocaleTag(candidate);
    } catch {
        return undefined;
    }

    const exact = lookup.get(normalized.toLowerCase());
    if (exact) {
        return exact;
    }

    const baseLanguage = normalized.split("-")[0];
    if (!baseLanguage) {
        return undefined;
    }

    const baseMatch = lookup.get(baseLanguage.toLowerCase());
    if (baseMatch) {
        return baseMatch;
    }

    for (const [supportedNormalized, locale] of lookup) {
        if (supportedNormalized.split("-")[0] === baseLanguage.toLowerCase()) {
            return locale;
        }
    }

    return undefined;
}
