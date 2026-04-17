import en from "./locales/en.ts";
import pt from "./locales/pt.ts";
import { createAppDictionaryI18n, toLocalePathSegment } from "mainz/i18n";
import type { SiteDictionary } from "./types.ts";

const dictionaries = {
    en,
    pt,
} as const;

export type SiteLocale = keyof typeof dictionaries;
export const siteLocales = Object.keys(dictionaries) as SiteLocale[];
const DEFAULT_LOCALE: SiteLocale = "en";

const i18n = createAppDictionaryI18n({
    defaultLocale: DEFAULT_LOCALE,
    dictionaries,
    detect: {
        path: true,
        document: true,
        navigator: true,
    },
    onMissingTranslation: (key) => {
        console.warn(`[i18n] Missing translation for key: ${key}`);
    },
});

export const getLocale = i18n.getLocale;
export const setLocale = i18n.setLocale;
export const resolveLocale = i18n.resolveLocale;
export const t = i18n.t;

export function buildSiteLocaleHref(
    nextLocale: SiteLocale,
    locationLike: Pick<Location, "pathname" | "search" | "hash"> = window.location,
): string {
    const currentLocale = resolveCurrentLocaleFromPathname(locationLike.pathname);
    const pathname = buildLocalizedPathname(locationLike.pathname, nextLocale);
    const hash = mapHashToLocale(locationLike.hash, currentLocale, nextLocale);

    return `${pathname}${locationLike.search}${hash}`;
}

function buildLocalizedPathname(pathname: string, nextLocale: SiteLocale): string {
    const segments = pathname.split("/").filter(Boolean);
    const nextLocaleSegment = toLocalePathSegment(nextLocale);
    const localeIndex = findLocaleSegmentIndex(segments);
    const shouldPrefixNextLocale = nextLocale !== DEFAULT_LOCALE;

    if (localeIndex >= 0) {
        if (!shouldPrefixNextLocale) {
            segments.splice(localeIndex, 1);
            return segments.length === 0
                ? "/"
                : `/${segments.join("/")}${shouldKeepTrailingSlash(pathname, segments) ? "/" : ""}`;
        }

        segments[localeIndex] = nextLocaleSegment;
        return `/${segments.join("/")}${shouldKeepTrailingSlash(pathname, segments) ? "/" : ""}`;
    }

    if (segments.length === 0) {
        return shouldPrefixNextLocale ? `/${nextLocaleSegment}/` : "/";
    }

    if (!shouldPrefixNextLocale) {
        return `/${segments.join("/")}${pathname.endsWith("/") ? "/" : ""}`;
    }

    const nextSegments = [nextLocaleSegment, ...segments];

    return `/${nextSegments.join("/")}/`;
}

function findLocaleSegmentIndex(segments: readonly string[]): number {
    return segments.findIndex((segment) => {
        const normalized = segment.toLowerCase();
        return siteLocales.some((locale) => toLocalePathSegment(locale) === normalized);
    });
}

function resolveCurrentLocaleFromPathname(pathname: string): SiteLocale {
    const segments = pathname.split("/").filter(Boolean);
    const localeIndex = findLocaleSegmentIndex(segments);
    if (localeIndex >= 0) {
        return resolveLocale(segments[localeIndex]) as SiteLocale;
    }

    return resolveLocale(getLocale()) as SiteLocale;
}

function shouldKeepTrailingSlash(pathname: string, segments: readonly string[]): boolean {
    return pathname.endsWith("/") || segments.length <= 1;
}

function mapHashToLocale(hash: string, currentLocale: SiteLocale, nextLocale: SiteLocale): string {
    if (!hash.startsWith("#") || hash.length <= 1) {
        return hash;
    }

    const currentAnchor = hash.slice(1);
    const currentAnchors = getDictionary(currentLocale).anchors;
    const nextAnchors = getDictionary(nextLocale).anchors;

    for (const [anchorKey, anchorValue] of Object.entries(currentAnchors)) {
        if (anchorValue !== currentAnchor) {
            continue;
        }

        const translatedAnchor = nextAnchors[anchorKey as keyof SiteDictionary["anchors"]];
        return translatedAnchor ? `#${translatedAnchor}` : hash;
    }

    return hash;
}

function getDictionary(locale: SiteLocale): SiteDictionary {
    return dictionaries[locale];
}
