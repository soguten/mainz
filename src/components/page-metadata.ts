import { normalizeLocaleTag } from "../i18n/core.ts";
import type { RenderMode } from "../routing/types.ts";
import type { PageConstructor } from "./page.ts";

const PAGE_ROUTE_PATH = Symbol("mainz.page.route-path");
const PAGE_RENDER_MODE = Symbol("mainz.page.render-mode");
const PAGE_LOCALES = Symbol("mainz.page.locales");

export function Route(path: string) {
    return function <T extends PageConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyPageRoutePath(value, path);
    };
}

export function RenderMode(mode: RenderMode) {
    return function <T extends PageConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyPageRenderMode(value, mode);
    };
}

export function Locales(...locales: string[]) {
    return function <T extends PageConstructor>(
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

export function resolvePageRoutePath(pageCtor: object): string | undefined {
    const routeOwner = pageCtor as { [PAGE_ROUTE_PATH]?: string };
    const path = routeOwner[PAGE_ROUTE_PATH]?.trim();
    return path ? path : undefined;
}

export function requirePageRoutePath(pageCtor: object, errorMessage: string): string {
    const path = resolvePageRoutePath(pageCtor);
    if (!path) {
        throw new Error(errorMessage);
    }

    return path;
}

export function resolvePageRenderMode(pageCtor: object): RenderMode | undefined {
    const routeOwner = pageCtor as { [PAGE_RENDER_MODE]?: RenderMode };
    return routeOwner[PAGE_RENDER_MODE];
}

export function resolvePageLocales(pageCtor: object): readonly string[] | undefined {
    const routeOwner = pageCtor as { [PAGE_LOCALES]?: readonly string[] };
    return routeOwner[PAGE_LOCALES];
}

function applyPageRoutePath(pageCtor: PageConstructor, path: string): void {
    (pageCtor as { [PAGE_ROUTE_PATH]?: string })[PAGE_ROUTE_PATH] = path;
}

function applyPageRenderMode(pageCtor: PageConstructor, mode: RenderMode): void {
    (pageCtor as { [PAGE_RENDER_MODE]?: RenderMode })[PAGE_RENDER_MODE] = mode;
}

function applyPageLocales(pageCtor: PageConstructor, locales: readonly string[]): void {
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
