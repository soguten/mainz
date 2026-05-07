/** Canonical locale identifier represented as a BCP 47 language tag string. */
export type LocaleTag = string;

/** Application-level locale configuration used by Mainz routing and page metadata. */
export interface I18nConfig<Locale extends LocaleTag = LocaleTag> {
  /** Default locale used when no more specific locale can be resolved. */
  defaultLocale: Locale;
  /** Supported locales available to the application. */
  locales: readonly Locale[];
  /** Locale prefix strategy used when building locale-aware paths. */
  localePrefix?: "except-default" | "always";
  /** Strategy used to detect the active locale for the current request or client. */
  detectLocale?: "path-first" | "navigator";
  /** Optional locale used when translations for the active locale are missing. */
  fallbackLocale?: Locale;
  /** Canonical site URL used when generating locale-aware absolute URLs. */
  siteUrl?: string;
}

/** Async loader used to fetch a locale message bundle, optionally scoped by namespace. */
export interface MessagesLoader<Locale extends LocaleTag = LocaleTag> {
  (locale: Locale, ns?: string): Promise<Record<string, unknown>>;
}

/** Options used to construct a dictionary-backed i18n runtime. */
export interface DictionaryI18nOptions<
  Locale extends LocaleTag,
  Dictionary extends object,
> {
  /** Default locale used by the dictionary runtime. */
  defaultLocale: Locale;
  /** Supported locales available to the runtime. */
  locales: readonly Locale[];
  /** In-memory translation dictionaries keyed by locale. */
  dictionaries: Record<Locale, Dictionary>;
  /** Optional fallback locale used when a translation is missing. */
  fallbackLocale?: Locale;
  /** Optional initial locale used before runtime detection runs. */
  initialLocale?: string;
  /** Optional callback used to detect the initial locale lazily. */
  detectLocale?: () => string | undefined;
  /** Optional hook invoked when a translation key is missing in the active locale. */
  onMissingTranslation?: (key: string, locale: Locale) => void;
}
