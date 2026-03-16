import { toLocalePathSegment } from "mainz/i18n";

export function buildDocsHref(path: string): string {
    const normalizedPath = normalizeRoutePath(path);
    const targetLocales = readTargetLocales();
    const activeLocale = resolveActiveLocale(targetLocales);
    const localePrefix = readLocalePrefix();
    const shouldPrefixLocale = localePrefix === "always" || targetLocales.length > 1;
    const localizedPath = shouldPrefixLocale && activeLocale
        ? applyLocalePrefix(normalizedPath, activeLocale, targetLocales)
        : stripLocalePrefix(normalizedPath, targetLocales);

    return prependBasePath(localizedPath, readBasePath());
}

function resolveActiveLocale(targetLocales: readonly string[]): string | undefined {
    const documentLocale = document.documentElement.lang.trim();
    if (documentLocale) {
        const matchedLocale = targetLocales.find((locale) => locale.toLowerCase() === documentLocale.toLowerCase());
        if (matchedLocale) {
            return matchedLocale;
        }
    }

    return targetLocales[0];
}

function applyLocalePrefix(path: string, locale: string, targetLocales: readonly string[]): string {
    const routePath = stripLocalePrefix(path, targetLocales);
    const localeSegment = toLocalePathSegment(locale);

    if (routePath === "/") {
        return `/${localeSegment}/`;
    }

    return `/${localeSegment}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;
}

function stripLocalePrefix(path: string, targetLocales: readonly string[]): string {
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) {
        return "/";
    }

    const [first, ...rest] = segments;
    const hasLocalePrefix = targetLocales.some((locale) => locale.toLowerCase() === first.toLowerCase());
    if (!hasLocalePrefix) {
        return path;
    }

    return rest.length === 0 ? "/" : `/${rest.join("/")}`;
}

function normalizeRoutePath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed || trimmed === "/") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const normalizedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");
    return normalizedSlashes.length > 1 && normalizedSlashes.endsWith("/")
        ? normalizedSlashes.slice(0, -1)
        : normalizedSlashes;
}

function prependBasePath(path: string, basePath: string): string {
    if (basePath === "/") {
        return path;
    }

    if (path === "/") {
        return basePath;
    }

    return `${basePath.slice(0, -1)}${path.startsWith("/") ? path : `/${path}`}`;
}

function readBasePath(): string {
    if (typeof __MAINZ_BASE_PATH__ === "string" && __MAINZ_BASE_PATH__.trim()) {
        return normalizeBasePath(__MAINZ_BASE_PATH__);
    }

    return "/";
}

function readTargetLocales(): readonly string[] {
    if (typeof __MAINZ_TARGET_LOCALES__ !== "undefined" && Array.isArray(__MAINZ_TARGET_LOCALES__)) {
        return __MAINZ_TARGET_LOCALES__.filter((value): value is string => typeof value === "string");
    }

    const documentLocale = document.documentElement.lang.trim();
    return documentLocale ? [documentLocale] : [];
}

function readLocalePrefix(): "auto" | "always" {
    if (typeof __MAINZ_LOCALE_PREFIX__ !== "undefined") {
        return __MAINZ_LOCALE_PREFIX__;
    }

    return "auto";
}

function normalizeBasePath(basePath: string): string {
    const trimmed = basePath.trim();
    if (!trimmed || trimmed === "." || trimmed === "./" || trimmed === "/") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}
