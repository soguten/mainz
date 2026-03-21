import { DictionaryI18nOptions } from "./types.ts";

export interface DictionaryI18n<
    Locale extends string,
    Dictionary extends object,
> {
    locales: readonly Locale[];
    defaultLocale: Locale;
    getLocale(): Locale;
    setLocale(locale: string): Locale;
    resolveLocale(locale: string | undefined): Locale;
    t<T = string>(path: string): T;
}

export function createDictionaryI18n<
    Locale extends string,
    Dictionary extends object,
>(
    options: DictionaryI18nOptions<Locale, Dictionary>,
): DictionaryI18n<Locale, Dictionary> {
    const normalizedSupported = options.locales.map((locale) => normalizeLocaleTag(locale)) as Locale[];
    const localeByNormalized = new Map<string, Locale>();

    for (let index = 0; index < normalizedSupported.length; index += 1) {
        localeByNormalized.set(normalizedSupported[index], options.locales[index]);
    }

    const fallbackLocale = options.fallbackLocale ?? options.defaultLocale;
    let activeLocale = resolveSupportedLocale<Locale>({
        candidate: options.initialLocale ?? options.detectLocale?.(),
        localeByNormalized,
        fallbackLocale,
    });

    return {
        locales: options.locales,
        defaultLocale: options.defaultLocale,
        getLocale(): Locale {
            return activeLocale;
        },
        setLocale(locale: string): Locale {
            activeLocale = resolveSupportedLocale<Locale>({
                candidate: locale,
                localeByNormalized,
                fallbackLocale,
            });
            return activeLocale;
        },
        resolveLocale(locale: string | undefined): Locale {
            return resolveSupportedLocale<Locale>({
                candidate: locale,
                localeByNormalized,
                fallbackLocale,
            });
        },
        t<T = string>(path: string): T {
            const currentDictionary = options.dictionaries[activeLocale];
            const currentTranslation = getByPath(currentDictionary, path);
            if (currentTranslation !== undefined) {
                return currentTranslation as T;
            }

            const resolvedFallback = resolveSupportedLocale<Locale>({
                candidate: fallbackLocale,
                localeByNormalized,
                fallbackLocale,
            });

            const fallbackDictionary = options.dictionaries[resolvedFallback];
            const fallbackTranslation = getByPath(fallbackDictionary, path);
            if (fallbackTranslation !== undefined) {
                return fallbackTranslation as T;
            }

            options.onMissingTranslation?.(path, activeLocale);
            return path as T;
        },
    };
}

export function detectNavigatorLocale(): string | undefined {
    if (typeof navigator === "undefined") {
        return undefined;
    }

    const candidates = [
        ...(navigator.languages ?? []),
        navigator.language,
    ].filter(Boolean);

    return candidates.length > 0 ? candidates[0] : undefined;
}

export function normalizeLocaleTag(locale: string): string {
    const normalized = locale.trim().replaceAll("_", "-");
    if (!normalized) {
        throw new Error("Locale cannot be empty.");
    }

    try {
        return Intl.getCanonicalLocales(normalized)[0]!;
    } catch {
        throw new Error(`Invalid locale "${locale}". Expected a valid BCP 47 language tag.`);
    }
}

export function toLocalePathSegment(locale: string): string {
    return normalizeLocaleTag(locale).toLowerCase();
}

export function resolveSupportedLocale(args: {
    candidate: string | undefined;
    localeByNormalized: Map<string, string>;
    fallbackLocale: string;
}): string;
export function resolveSupportedLocale<Locale extends string>(args: {
    candidate: string | undefined;
    localeByNormalized: Map<string, Locale>;
    fallbackLocale: Locale;
}): Locale;
export function resolveSupportedLocale<Locale extends string>(args: {
    candidate: string | undefined;
    localeByNormalized: Map<string, Locale>;
    fallbackLocale: Locale;
}): Locale {
    const fallback = normalizeLocaleTag(args.fallbackLocale);
    const fallbackMapped = args.localeByNormalized.get(fallback);
    if (!fallbackMapped) {
        throw new Error(`Fallback locale "${args.fallbackLocale}" is not part of supported locales.`);
    }

    if (!args.candidate) {
        return fallbackMapped;
    }

    const normalizedCandidate = normalizeLocaleTag(args.candidate);
    const exactMatch = args.localeByNormalized.get(normalizedCandidate);
    if (exactMatch) {
        return exactMatch;
    }

    const baseLanguage = normalizedCandidate.split("-")[0];
    if (baseLanguage) {
        const baseMatch = args.localeByNormalized.get(baseLanguage);
        if (baseMatch) {
            return baseMatch;
        }

        for (const [supportedNormalized, supportedLocale] of args.localeByNormalized) {
            const supportedBase = supportedNormalized.split("-")[0];
            if (supportedBase === baseLanguage) {
                return supportedLocale;
            }
        }
    }

    return fallbackMapped;
}

export function getByPath(source: unknown, path: string): unknown {
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
