import { createDictionaryI18n, detectNavigatorLocale, DictionaryI18n, normalizeLocaleTag } from "./core.ts";
import { MAINZ_LOCALE_CHANGE_EVENT, type MainzLocaleChangeDetail } from "../runtime-events.ts";

/** Controls which browser signals Mainz should use to detect the initial locale. */
export interface DictionaryI18nAppDetectOptions {
    /** Reads the leading pathname segment when it contains a supported locale. */
    path?: boolean;
    /** Reads `document.documentElement.lang` when available. */
    document?: boolean;
    /** Reads `navigator.languages` and `navigator.language` as a final browser fallback. */
    navigator?: boolean;
}

/** Application-facing options used to create a browser-aware dictionary runtime. */
export interface DictionaryI18nAppOptions<
    Dictionaries extends Record<string, object>,
> {
    /** Default locale used when no stronger locale signal is available. */
    defaultLocale: keyof Dictionaries & string;
    /** Translation dictionaries keyed by locale. */
    dictionaries: Dictionaries;
    /** Optional fallback locale used for missing translations. */
    fallbackLocale?: keyof Dictionaries & string;
    /** Explicit locale to use before browser detection is attempted. */
    initialLocale?: string;
    /** Browser detection strategy used to derive the initial locale. */
    detect?: DictionaryI18nAppDetectOptions;
    /** Optional hook invoked when a translation key is missing in the active locale. */
    onMissingTranslation?: (key: string, locale: keyof Dictionaries & string) => void;
}

/** Creates a browser-aware dictionary runtime backed by the provided locale dictionaries. */
export function createAppDictionaryI18n<
    Dictionaries extends Record<string, object>,
>(
    options: DictionaryI18nAppOptions<Dictionaries>,
): DictionaryI18n<
    keyof Dictionaries & string,
    Dictionaries[keyof Dictionaries & string]
> {
    const locales = Object.keys(options.dictionaries) as (keyof Dictionaries & string)[];
    if (locales.length === 0) {
        throw new Error("createAppDictionaryI18n requires at least one locale in dictionaries.");
    }

    const initialLocale = options.initialLocale ?? detectInitialLocale(locales, options.detect);

    const i18n = createDictionaryI18n<
        keyof Dictionaries & string,
        Dictionaries[keyof Dictionaries & string]
    >({
        defaultLocale: options.defaultLocale,
        locales,
        dictionaries: options.dictionaries as Record<
            keyof Dictionaries & string,
            Dictionaries[keyof Dictionaries & string]
        >,
        fallbackLocale: options.fallbackLocale,
        initialLocale,
        onMissingTranslation: options.onMissingTranslation,
    });

    bindLocaleChangeEvents(i18n);
    return i18n;
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

function bindLocaleChangeEvents<Locale extends string, Dictionary extends object>(
    i18n: DictionaryI18n<Locale, Dictionary>,
): void {
    if (typeof document === "undefined") {
        return;
    }

    document.addEventListener(MAINZ_LOCALE_CHANGE_EVENT, (event) => {
        const detail = (event as CustomEvent<MainzLocaleChangeDetail>).detail;
        if (!detail?.locale) {
            return;
        }

        i18n.setLocale(detail.locale);
    });
}
