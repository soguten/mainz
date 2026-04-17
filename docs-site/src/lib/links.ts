import { toLocalePathSegment } from "mainz/i18n";

export function buildDocsHref(path: string): string {
    const normalizedPath = normalizeRoutePath(path);
    const appLocales = readAppLocales();
    const activeLocale = resolveActiveLocale(appLocales);
    const localePrefix = readLocalePrefix();
    const defaultLocale = readDefaultLocale(appLocales);
    const shouldPrefixLocale = localePrefix === "always" ||
        (activeLocale !== undefined &&
            defaultLocale !== undefined &&
            activeLocale.toLowerCase() !== defaultLocale.toLowerCase());
    const localizedPath = shouldPrefixLocale && activeLocale
        ? applyLocalePrefix(normalizedPath, activeLocale, appLocales)
        : stripLocalePrefix(normalizedPath, appLocales);

    return prependBasePath(localizedPath, readBasePath());
}

function resolveActiveLocale(appLocales: readonly string[]): string | undefined {
    const documentLocale = document.documentElement.lang.trim();
    if (documentLocale) {
        const matchedLocale = appLocales.find((locale) =>
            locale.toLowerCase() === documentLocale.toLowerCase()
        );
        if (matchedLocale) {
            return matchedLocale;
        }
    }

    return appLocales[0];
}

function applyLocalePrefix(path: string, locale: string, appLocales: readonly string[]): string {
    const routePath = stripLocalePrefix(path, appLocales);
    const localeSegment = toLocalePathSegment(locale);

    if (routePath === "/") {
        return `/${localeSegment}/`;
    }

    return `/${localeSegment}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;
}

function stripLocalePrefix(path: string, appLocales: readonly string[]): string {
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) {
        return "/";
    }

    const [first, ...rest] = segments;
    const hasLocalePrefix = appLocales.some((locale) =>
        locale.toLowerCase() === first.toLowerCase()
    );
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

function readAppLocales(): readonly string[] {
    if (typeof __MAINZ_APP_LOCALES__ !== "undefined" && Array.isArray(__MAINZ_APP_LOCALES__)) {
        return __MAINZ_APP_LOCALES__.filter((value): value is string => typeof value === "string");
    }

    const documentLocale = document.documentElement.lang.trim();
    return documentLocale ? [documentLocale] : [];
}

function readDefaultLocale(appLocales: readonly string[]): string | undefined {
    if (typeof __MAINZ_DEFAULT_LOCALE__ !== "undefined" && __MAINZ_DEFAULT_LOCALE__?.trim()) {
        return __MAINZ_DEFAULT_LOCALE__;
    }

    return appLocales[0];
}

function readLocalePrefix(): "except-default" | "always" {
    if (typeof __MAINZ_LOCALE_PREFIX__ !== "undefined") {
        return __MAINZ_LOCALE_PREFIX__;
    }

    return "except-default";
}

function normalizeBasePath(basePath: string): string {
    const trimmed = basePath.trim();
    if (!trimmed || trimmed === "." || trimmed === "./" || trimmed === "/") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}
