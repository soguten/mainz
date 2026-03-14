export type LocaleTag = string;

export interface I18nConfig<Locale extends LocaleTag = LocaleTag> {
    defaultLocale: Locale;
    locales: readonly Locale[];
    localePrefix?: "auto" | "always";
    detectLocale?: "path-first" | "navigator";
    fallbackLocale?: Locale;
    siteUrl?: string;
}

export interface MessagesLoader<Locale extends LocaleTag = LocaleTag> {
    (locale: Locale, ns?: string): Promise<Record<string, unknown>>;
}

export interface DictionaryI18nOptions<
    Locale extends LocaleTag,
    Dictionary extends object,
> {
    defaultLocale: Locale;
    locales: readonly Locale[];
    dictionaries: Record<Locale, Dictionary>;
    fallbackLocale?: Locale;
    initialLocale?: string;
    detectLocale?: () => string | undefined;
    onMissingTranslation?: (key: string, locale: Locale) => void;
}
