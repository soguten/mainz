import {
  createDictionaryI18n,
  detectNavigatorLocale,
  type DictionaryI18n,
  getByPath,
  normalizeLocaleTag,
  toLocalePathSegment,
} from "./core.ts";
import {
  MAINZ_LOCALE_CHANGE_EVENT,
  type MainzLocaleChangeDetail,
} from "../runtime-events.ts";

export interface AppI18nMissingPolicy<Locale extends string = string> {
  onKey?: "warn" | "error" | "silent";
  fallback?: "default-locale" | Locale;
}

export interface AppI18nDefinition<
  Locale extends string = string,
  Dictionary extends object = Record<string, unknown>,
> {
  locales: readonly Locale[];
  defaultLocale: Locale;
  localePrefix?: "always" | "except-default";
  dictionaries?: Record<Locale, Dictionary>;
  missing?: AppI18nMissingPolicy<Locale>;
}

export interface BuildLocaleHrefOptions {
  locationLike?: Pick<Location, "pathname" | "search" | "hash">;
  hashDictionaryPath?: string;
}

export interface AppI18n<
  Locale extends string = string,
  Dictionary extends object = Record<string, unknown>,
> extends DictionaryI18n<Locale, Dictionary> {
  localePrefix: "always" | "except-default";
  getDictionary(locale?: string): Dictionary;
  buildLocaleHref(
    nextLocale: Locale,
    options?: BuildLocaleHrefOptions,
  ): string;
  buildLocaleRootHref(nextLocale: Locale): string;
  t<T = string>(key: string, params?: Record<string, unknown>): T;
}

type InstalledAppI18nState = {
  dictionaries: Record<string, object>;
  i18n: AppI18n<string, object>;
};

let installedAppI18nState: InstalledAppI18nState | undefined;

export function installAppI18n<
  Locale extends string,
  Dictionary extends object,
>(definition: AppI18nDefinition<Locale, Dictionary>): AppI18n<Locale, Dictionary> {
  if (!definition.dictionaries) {
    throw new Error(
      "installAppI18n(...) requires i18n.dictionaries to be defined.",
    );
  }

  validateDictionariesAgainstLocales(definition);

  const localePrefix = definition.localePrefix ?? "except-default";
  const fallbackLocale = resolveFallbackLocale(definition);
  const dictionaries = definition.dictionaries as Record<Locale, Dictionary>;
  const initialLocale = detectInitialLocale(definition.locales);

  const baseI18n = createDictionaryI18n({
    defaultLocale: definition.defaultLocale,
    locales: definition.locales,
    dictionaries,
    fallbackLocale,
    initialLocale,
    onMissingTranslation: createMissingTranslationHandler(definition),
  });
  bindLocaleChangeEvents(baseI18n);

  const installed = {
    ...baseI18n,
    localePrefix,
    getDictionary(locale?: string): Dictionary {
      const resolvedLocale = locale
        ? baseI18n.resolveLocale(locale)
        : baseI18n.getLocale();
      return dictionaries[resolvedLocale];
    },
    buildLocaleHref(
      nextLocale: Locale,
      options?: BuildLocaleHrefOptions,
    ): string {
      return buildLocaleHrefFromRuntime({
        i18n: installed as AppI18n<Locale, Dictionary>,
        dictionaries,
        nextLocale,
        locationLike: options?.locationLike,
        hashDictionaryPath: options?.hashDictionaryPath,
      });
    },
    buildLocaleRootHref(nextLocale: Locale): string {
      return buildLocalizedPathname(installed, "/", nextLocale);
    },
    t<T = string>(key: string, params?: Record<string, unknown>): T {
      const value = baseI18n.t<unknown>(key);
      if (typeof value !== "string" || !params) {
        return value as T;
      }

      return interpolateTranslation(value, params) as T;
    },
  } satisfies AppI18n<Locale, Dictionary>;

  installedAppI18nState = {
    dictionaries: definition.dictionaries as Record<string, object>,
    i18n: installed as AppI18n<string, object>,
  };
  return installed;
}

export function clearAppI18n(): void {
  installedAppI18nState = undefined;
}

export function hasAppI18n(): boolean {
  return Boolean(installedAppI18nState);
}

export function getAppI18n<
  Locale extends string = string,
  Dictionary extends object = Record<string, unknown>,
>(): AppI18n<Locale, Dictionary> {
  if (!installedAppI18nState) {
    throw new Error(
      "No app i18n runtime is installed. Define app.i18n.dictionaries and start the app, or install the runtime in tests first.",
    );
  }

  return installedAppI18nState.i18n as AppI18n<Locale, Dictionary>;
}

export function getLocale<Locale extends string = string>(): Locale {
  return getAppI18n<Locale>().getLocale();
}

export function setLocale<Locale extends string = string>(locale: string): Locale {
  return getAppI18n<Locale>().setLocale(locale);
}

export function resolveLocale<Locale extends string = string>(
  locale: string | undefined,
): Locale {
  return getAppI18n<Locale>().resolveLocale(locale);
}

export function t<T = string>(
  key: string,
  params?: Record<string, unknown>,
): T {
  return getAppI18n().t<T>(key, params);
}

export function buildLocaleHref<Locale extends string = string>(
  nextLocale: Locale,
  options?: BuildLocaleHrefOptions,
): string {
  return getAppI18n<Locale>().buildLocaleHref(nextLocale, options);
}

export function buildLocaleRootHref<Locale extends string = string>(
  nextLocale: Locale,
): string {
  return getAppI18n<Locale>().buildLocaleRootHref(nextLocale);
}

function validateDictionariesAgainstLocales<
  Locale extends string,
  Dictionary extends object,
>(definition: AppI18nDefinition<Locale, Dictionary>): void {
  const dictionaryKeys = Object.keys(definition.dictionaries ?? {});
  for (const locale of definition.locales) {
    if (!(locale in (definition.dictionaries ?? {}))) {
      throw new Error(
        `App i18n.dictionaries is missing locale "${locale}".`,
      );
    }
  }

  for (const locale of dictionaryKeys) {
    if (!definition.locales.includes(locale as Locale)) {
      throw new Error(
        `App i18n.dictionaries declares unsupported locale "${locale}".`,
      );
    }
  }
}

function resolveFallbackLocale<
  Locale extends string,
  Dictionary extends object,
>(definition: AppI18nDefinition<Locale, Dictionary>): Locale | undefined {
  const fallback = definition.missing?.fallback;
  if (!fallback || fallback === "default-locale") {
    return definition.defaultLocale;
  }

  return fallback;
}

function createMissingTranslationHandler<
  Locale extends string,
  Dictionary extends object,
>(
  definition: AppI18nDefinition<Locale, Dictionary>,
): ((key: string, locale: Locale) => void) | undefined {
  const policy = definition.missing?.onKey ?? "warn";
  if (policy === "silent") {
    return undefined;
  }

  return (key, locale) => {
    const message =
      `[mainz/i18n] Missing translation for key "${key}" in locale "${locale}".`;
    if (policy === "error") {
      throw new Error(message);
    }

    console.warn(message);
  };
}

function interpolateTranslation(
  value: string,
  params: Record<string, unknown>,
): string {
  return value.replaceAll(/\{([^{}]+)\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    if (!key) {
      return "";
    }

    const replacement = params[key];
    return replacement === undefined ? `{${key}}` : String(replacement);
  });
}

function buildLocaleHrefFromRuntime<
  Locale extends string,
  Dictionary extends object,
>(args: {
  i18n: AppI18n<Locale, Dictionary>;
  dictionaries: Record<Locale, Dictionary>;
  nextLocale: Locale;
  locationLike?: Pick<Location, "pathname" | "search" | "hash">;
  hashDictionaryPath?: string;
}): string {
  const locationLike = args.locationLike ?? window.location;
  const currentLocale = resolveCurrentLocaleFromPathname(
    args.i18n,
    locationLike.pathname,
  );
  const pathname = buildLocalizedPathname(args.i18n, locationLike.pathname, args.nextLocale);
  const hash = args.hashDictionaryPath
    ? mapHashToLocale({
      dictionaries: args.dictionaries,
      currentLocale,
      nextLocale: args.nextLocale,
      hash: locationLike.hash,
      hashDictionaryPath: args.hashDictionaryPath,
    })
    : locationLike.hash;

  return `${pathname}${locationLike.search}${hash}`;
}

function buildLocalizedPathname<Locale extends string, Dictionary extends object>(
  i18n: AppI18n<Locale, Dictionary>,
  pathname: string,
  nextLocale: Locale,
): string {
  const segments = pathname.split("/").filter(Boolean);
  const nextLocaleSegment = toLocalePathSegment(nextLocale);
  const localeIndex = findLocaleSegmentIndex(i18n.locales, segments);
  const shouldPrefixNextLocale = shouldPrefixLocale(i18n, nextLocale);

  if (localeIndex >= 0) {
    if (!shouldPrefixNextLocale) {
      segments.splice(localeIndex, 1);
      return segments.length === 0
        ? "/"
        : `/${segments.join("/")}${
          shouldKeepTrailingSlash(pathname, segments) ? "/" : ""
        }`;
    }

    segments[localeIndex] = nextLocaleSegment;
    return `/${segments.join("/")}${
      shouldKeepTrailingSlash(pathname, segments) ? "/" : ""
    }`;
  }

  if (segments.length === 0) {
    return shouldPrefixNextLocale ? `/${nextLocaleSegment}/` : "/";
  }

  if (!shouldPrefixNextLocale) {
    return `/${segments.join("/")}${pathname.endsWith("/") ? "/" : ""}`;
  }

  return `/${[nextLocaleSegment, ...segments].join("/")}/`;
}

function resolveCurrentLocaleFromPathname<
  Locale extends string,
  Dictionary extends object,
>(
  i18n: AppI18n<Locale, Dictionary>,
  pathname: string,
): Locale {
  const segments = pathname.split("/").filter(Boolean);
  const localeIndex = findLocaleSegmentIndex(i18n.locales, segments);
  if (localeIndex >= 0) {
    return i18n.resolveLocale(segments[localeIndex]);
  }

  return i18n.resolveLocale(i18n.getLocale());
}

function findLocaleSegmentIndex(
  locales: readonly string[],
  segments: readonly string[],
): number {
  return segments.findIndex((segment) => {
    const normalized = segment.toLowerCase();
    return locales.some((locale) =>
      toLocalePathSegment(locale) === normalized
    );
  });
}

function shouldPrefixLocale<
  Locale extends string,
  Dictionary extends object,
>(
  i18n: AppI18n<Locale, Dictionary>,
  locale: Locale,
): boolean {
  if (i18n.localePrefix === "always") {
    return true;
  }

  return i18n.resolveLocale(locale) !== i18n.defaultLocale;
}

function shouldKeepTrailingSlash(
  pathname: string,
  segments: readonly string[],
): boolean {
  return pathname.endsWith("/") || segments.length <= 1;
}

function mapHashToLocale<Locale extends string, Dictionary extends object>(args: {
  dictionaries: Record<Locale, Dictionary>;
  currentLocale: Locale;
  nextLocale: Locale;
  hash: string;
  hashDictionaryPath: string;
}): string {
  if (!args.hash.startsWith("#") || args.hash.length <= 1) {
    return args.hash;
  }

  const currentDictionaryValue = getByPath(
    args.dictionaries[args.currentLocale],
    args.hashDictionaryPath,
  );
  const nextDictionaryValue = getByPath(
    args.dictionaries[args.nextLocale],
    args.hashDictionaryPath,
  );

  if (!isStringRecord(currentDictionaryValue) || !isStringRecord(nextDictionaryValue)) {
    return args.hash;
  }

  const currentAnchor = args.hash.slice(1);
  for (const [anchorKey, anchorValue] of Object.entries(currentDictionaryValue)) {
    if (anchorValue !== currentAnchor) {
      continue;
    }

    const translatedAnchor = nextDictionaryValue[anchorKey];
    return translatedAnchor ? `#${translatedAnchor}` : args.hash;
  }

  return args.hash;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null &&
    Object.values(value).every((entry) => typeof entry === "string");
}

function detectInitialLocale<Locale extends string>(
  locales: readonly Locale[],
): string | undefined {
  const lookup = buildLocaleLookup(locales);
  const fromPath = detectLocaleFromPath(lookup);
  if (fromPath) {
    return fromPath;
  }

  const fromDocument = detectLocaleFromDocument(lookup);
  if (fromDocument) {
    return fromDocument;
  }

  return detectNavigatorLocale();
}

function buildLocaleLookup<Locale extends string>(
  locales: readonly Locale[],
): Map<string, Locale> {
  const lookup = new Map<string, Locale>();

  for (const locale of locales) {
    lookup.set(normalizeLocaleTag(locale).toLowerCase(), locale);
  }

  return lookup;
}

function detectLocaleFromPath<Locale extends string>(
  lookup: Map<string, Locale>,
): string | undefined {
  if (typeof location === "undefined") {
    return undefined;
  }

  const firstSegment = location.pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) {
    return undefined;
  }

  return matchSupportedLocale(firstSegment, lookup);
}

function detectLocaleFromDocument<Locale extends string>(
  lookup: Map<string, Locale>,
): string | undefined {
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

function bindLocaleChangeEvents<
  Locale extends string,
  Dictionary extends object,
>(
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
