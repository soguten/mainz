import { normalizeLocaleTag } from "../i18n/core.ts";

const PAGE_ROUTE_PATH = Symbol.for("mainz.page.route-path");
const PAGE_RENDER_MODE = Symbol.for("mainz.page.render-mode");
const PAGE_LOCALES = Symbol.for("mainz.page.locales");
type DecoratedPageClass = abstract new (...args: unknown[]) => object;

/** Public page render-mode contract used by page decorators and metadata helpers. */
export type PageRenderMode = "csr" | "ssg";
export type PageSsgFallback = "404" | "csr";
export interface PageRenderConfig {
    mode: PageRenderMode;
    fallback?: PageSsgFallback;
}

/**
 * Declares the application route served by a page class.
 *
 * Use `@Route(...)` to bind a `Page` to a concrete path such as:
 *
 * - `"/"`
 * - `"/login"`
 * - `"/stories/:slug"`
 */
export function Route(path: string): <T extends abstract new (...args: unknown[]) => object>(
    value: T,
    _context?: ClassDecoratorContext<T>,
) => void {
    return function <T extends DecoratedPageClass>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyPageRoutePath(value, path);
    };
}

/**
 * Declares how a page is rendered.
 *
 * `@RenderMode(...)` is page-owned and fixes the page's rendering model.
 * Supported values are:
 *
 * - `"csr"`: the page renders in the client runtime
 * - `"ssg"`: the page participates in static generation
 *
 * `ssg` pages default to strict `404` behavior for missing dynamic entries.
 * Use `{ fallback: "csr" }` to keep known entries prerendered while allowing
 * missing concrete entries to boot through the client path in dev/runtime flows
 * that support that contract.
 *
 * Use `@RenderMode(...)` to describe the page-level render contract.
 */
export function RenderMode(mode: "csr"): <T extends abstract new (...args: unknown[]) => object>(
    value: T,
    _context?: ClassDecoratorContext<T>,
) => void;
export function RenderMode(
    mode: "ssg",
    options?: { fallback?: PageSsgFallback },
): <T extends abstract new (...args: unknown[]) => object>(
    value: T,
    _context?: ClassDecoratorContext<T>,
) => void;
export function RenderMode(
    mode: PageRenderMode,
    options?: { fallback?: PageSsgFallback },
): <T extends abstract new (...args: unknown[]) => object>(
    value: T,
    _context?: ClassDecoratorContext<T>,
) => void {
    return function <T extends DecoratedPageClass>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyPageRenderMode(value, normalizePageRenderConfig(mode, options));
    };
}

/**
 * Declares the explicit locales served by a page.
 *
 * Use `@Locales(...)` when a page supports a subset of the app locales or when the page should
 * opt into locale-specific output independently of app defaults.
 */
export function Locales(...locales: string[]): <T extends abstract new (...args: unknown[]) => object>(
    value: T,
    context?: ClassDecoratorContext<T>,
) => void {
    return function <T extends DecoratedPageClass>(
        value: T,
        context?: ClassDecoratorContext<T>,
    ): void {
        if (context) {
            context.addInitializer(() => applyPageLocales(value, locales));
            return;
        }

        applyPageLocales(value, locales);
    };
}

/** Resolves the route path declared on a page constructor, when present. */
export function resolvePageRoutePath(pageCtor: object): string | undefined {
    const routeOwner = pageCtor as { [PAGE_ROUTE_PATH]?: string };
    const path = routeOwner[PAGE_ROUTE_PATH]?.trim();
    return path ? path : undefined;
}

/** Resolves the route path declared on a page constructor or throws with the provided message. */
export function requirePageRoutePath(pageCtor: object, errorMessage: string): string {
    const path = resolvePageRoutePath(pageCtor);
    if (!path) {
        throw new Error(errorMessage);
    }

    return path;
}

/** Resolves the explicit render mode declared on a page constructor, when present. */
export function resolvePageRenderMode(pageCtor: object): PageRenderMode | undefined {
    return resolvePageRenderConfig(pageCtor)?.mode;
}

/** Resolves the explicit render config declared on a page constructor, when present. */
export function resolvePageRenderConfig(pageCtor: object): PageRenderConfig | undefined {
    const routeOwner = pageCtor as { [PAGE_RENDER_MODE]?: PageRenderMode | PageRenderConfig };
    const resolved = routeOwner[PAGE_RENDER_MODE];
    if (!resolved) {
        return undefined;
    }

    if (typeof resolved === "string") {
        return { mode: resolved };
    }

    return normalizeStoredPageRenderConfig(resolved);
}

/** Resolves the normalized locales declared on a page constructor, when present. */
export function resolvePageLocales(pageCtor: object): readonly string[] | undefined {
    const routeOwner = pageCtor as { [PAGE_LOCALES]?: readonly string[] };
    return routeOwner[PAGE_LOCALES];
}

function applyPageRoutePath(pageCtor: object, path: string): void {
    (pageCtor as { [PAGE_ROUTE_PATH]?: string })[PAGE_ROUTE_PATH] = path;
}

function applyPageRenderMode(pageCtor: object, config: PageRenderConfig): void {
    (pageCtor as { [PAGE_RENDER_MODE]?: PageRenderConfig })[PAGE_RENDER_MODE] = config;
}

function applyPageLocales(pageCtor: object, locales: readonly string[]): void {
    (pageCtor as { [PAGE_LOCALES]?: readonly string[] })[PAGE_LOCALES] = locales.map((
        locale,
        index,
    ) => {
        try {
            return normalizeLocaleTag(locale);
        } catch (error) {
            throw new Error(
                `@Locales() received invalid locale "${locale}" at index ${index}. ${toErrorMessage(error)}`,
            );
        }
    });
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function normalizePageRenderConfig(
    mode: PageRenderMode,
    options?: { fallback?: PageSsgFallback },
): PageRenderConfig {
    if (mode === "csr") {
        return { mode };
    }

    return {
        mode,
        fallback: options?.fallback ?? "404",
    };
}

function normalizeStoredPageRenderConfig(config: PageRenderConfig): PageRenderConfig {
    if (config.mode === "ssg") {
        return {
            mode: "ssg",
            fallback: config.fallback === "csr" ? "csr" : "404",
        };
    }

    return {
        mode: "csr",
    };
}
