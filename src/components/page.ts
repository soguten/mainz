import { Component } from "./component.ts";
import type { DefaultProps, DefaultState } from "./types.ts";
import type { NavigationMode, RenderMode } from "../routing/types.ts";
import { readResource, type Resource, type ResourceRuntime } from "../resources/index.ts";

export interface PageHeadMetaDefinition {
    name?: string;
    property?: string;
    content: string;
}

export interface PageHeadLinkDefinition {
    rel: string;
    href: string;
    hreflang?: string;
}

export interface PageHeadDefinition {
    title?: string;
    meta?: readonly PageHeadMetaDefinition[];
    links?: readonly PageHeadLinkDefinition[];
}

export type PageRouteParams = Readonly<Record<string, string>>;

export interface PageEntriesContext {
    locale?: string;
}

export interface PageEntryDefinition {
    params: PageRouteParams;
}

type PageEntryLike = PageEntryDefinition | PageRouteParams;
type PageEntriesMapper<Item> = (item: Item, context: PageEntriesContext) => PageEntryLike;
type PageEntriesLoader<Item> = (
    context: PageEntriesContext,
) => readonly Item[] | Promise<readonly Item[]>;
type PageLoadByParamResolver<Value> = (
    value: string,
    context: PageLoadContext,
) => Value | Promise<Value>;
type PageLoadByParamsResolver<Names extends readonly string[], Value> = (
    params: { readonly [K in Names[number]]: string },
    context: PageLoadContext,
) => Value | Promise<Value>;

export interface PageLoadContext {
    params: PageRouteParams;
    locale?: string;
    url: URL;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    resources: PageLoadResources;
}

export interface PageLoadResources {
    read<Params, Context, Value>(
        resource: Resource<Params, Context, Value>,
        params: Params,
        context: Context,
    ): Value | Promise<Value>;
}

export interface PageLoadContextInit {
    params: PageRouteParams;
    locale?: string;
    url: URL;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    runtime?: ResourceRuntime;
}

export interface PageDefinition {
    notFound?: boolean;
    head?: PageHeadDefinition;
}

export const MAINZ_HEAD_MANAGED_ATTR = "data-mainz-head-managed";
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

export abstract class Page<P = DefaultProps, S = DefaultState> extends Component<P, S> {
    static page?: PageDefinition;

    override connectedCallback() {
        super.connectedCallback();
        applyPageHeadToDocument(this.constructor as PageConstructor, this.props);
    }

    override afterRender(): void {
        applyPageHeadToDocument(this.constructor as PageConstructor, this.props);
        super.afterRender?.();
    }
}

export interface PageConstructor {
    new (...args: unknown[]): Page<any, any>;
    readonly prototype: Page<any, any>;
    readonly name: string;
    page?: PageDefinition;
    entries?(
        context: PageEntriesContext,
    ): readonly PageEntryDefinition[] | Promise<readonly PageEntryDefinition[]>;
    load?(context: PageLoadContext): unknown | Promise<unknown>;
    [PAGE_ROUTE_PATH]?: string;
    [PAGE_RENDER_MODE]?: RenderMode;
    [PAGE_LOCALES]?: readonly string[];
}

export const entries = {
    from<Item>(
        items: readonly Item[],
        mapper: PageEntriesMapper<Item>,
    ): (context: PageEntriesContext) => readonly PageEntryDefinition[] {
        return (context) =>
            items.map((item) => normalizePageEntryDefinition(mapper(item, context)));
    },
    fromAsync<Item>(
        loader: PageEntriesLoader<Item>,
        mapper?: PageEntriesMapper<Item>,
    ): (context: PageEntriesContext) => Promise<readonly PageEntryDefinition[]> {
        return async (context) => {
            const items = await loader(context);
            return items.map((item) =>
                normalizePageEntryDefinition(mapper ? mapper(item, context) : item as PageEntryLike)
            );
        };
    },
};

export const load = {
    byParam<Value>(
        name: string,
        resolver: PageLoadByParamResolver<Value>,
    ): (context: PageLoadContext) => Value | Promise<Value> {
        return (context) => resolver(context.params[name], context);
    },
    byParams<const Names extends readonly string[], Value>(
        names: Names,
        resolver: PageLoadByParamsResolver<Names, Value>,
    ): (context: PageLoadContext) => Value | Promise<Value> {
        return (context) => {
            const selectedParams = Object.fromEntries(
                names.map((name) => [name, context.params[name]]),
            ) as { readonly [K in Names[number]]: string };

            return resolver(selectedParams, context);
        };
    },
};

export function createPageLoadContext(init: PageLoadContextInit): PageLoadContext {
    const baseContext = {
        params: init.params,
        locale: init.locale,
        url: init.url,
        renderMode: init.renderMode,
        navigationMode: init.navigationMode,
        runtime: init.runtime ?? resolveMainzResourceRuntime(),
    } satisfies PageLoadContextInit;

    return {
        ...baseContext,
        resources: {
            read(resource, params, context) {
                return readResource(resource, params, context, {
                    renderMode: baseContext.renderMode,
                    navigationMode: baseContext.navigationMode,
                    runtime: baseContext.runtime,
                    consumer: "page-load",
                });
            },
        },
    };
}

export function isPageConstructor(value: unknown): value is PageConstructor {
    if (typeof value !== "function") {
        return false;
    }

    return value === Page || value.prototype instanceof Page;
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

export function applyPageHeadToDocument(pageCtor: PageConstructor, props?: unknown): void {
    if (typeof document === "undefined") {
        return;
    }

    const head = document.head;
    if (!head) {
        return;
    }

    head.querySelectorAll(`[${MAINZ_HEAD_MANAGED_ATTR}]`).forEach((node) => node.remove());

    const headDefinition = resolvePageHeadDefinition(pageCtor, props);
    if (!headDefinition) {
        return;
    }

    if (headDefinition.title) {
        document.title = headDefinition.title;
    }

    for (const meta of headDefinition.meta ?? []) {
        const element = document.createElement("meta");
        if (meta.name) {
            element.setAttribute("name", meta.name);
        }
        if (meta.property) {
            element.setAttribute("property", meta.property);
        }
        element.setAttribute("content", meta.content);
        element.setAttribute(MAINZ_HEAD_MANAGED_ATTR, "true");
        head.appendChild(element);
    }

    for (const link of headDefinition.links ?? []) {
        const element = document.createElement("link");
        element.setAttribute("rel", link.rel);
        element.setAttribute("href", link.href);
        if (link.hreflang) {
            element.setAttribute("hreflang", link.hreflang);
        }
        element.setAttribute(MAINZ_HEAD_MANAGED_ATTR, "true");
        head.appendChild(element);
    }
}

function resolvePageHeadDefinition(
    pageCtor: PageConstructor,
    props?: unknown,
): PageHeadDefinition | undefined {
    const propsRecord = typeof props === "object" && props !== null
        ? props as Record<string, unknown>
        : undefined;
    const routeValue = propsRecord?.route;
    const routeRecord = typeof routeValue === "object" && routeValue !== null
        ? routeValue as Record<string, unknown>
        : undefined;
    const routeHead = routeRecord?.head;

    if (isPageHeadDefinition(routeHead)) {
        return routeHead;
    }

    const directHead = propsRecord?.head;
    if (isPageHeadDefinition(directHead)) {
        return directHead;
    }

    return pageCtor.page?.head;
}

function isPageHeadDefinition(value: unknown): value is PageHeadDefinition {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return "title" in candidate || "meta" in candidate || "links" in candidate;
}

function applyPageRoutePath(pageCtor: PageConstructor, path: string): void {
    pageCtor[PAGE_ROUTE_PATH] = path;
}

function applyPageRenderMode(pageCtor: PageConstructor, mode: RenderMode): void {
    pageCtor[PAGE_RENDER_MODE] = mode;
}

function applyPageLocales(pageCtor: PageConstructor, locales: readonly string[]): void {
    pageCtor[PAGE_LOCALES] = [...locales];
}

function resolveMainzResourceRuntime(): ResourceRuntime {
    if (typeof __MAINZ_RUNTIME_ENV__ !== "undefined") {
        return __MAINZ_RUNTIME_ENV__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
    return fromGlobal === "build" ? "build" : "client";
}

function normalizePageEntryDefinition(entry: PageEntryLike): PageEntryDefinition {
    if (isPageEntryDefinition(entry)) {
        return entry;
    }

    return {
        params: entry,
    };
}

function isPageEntryDefinition(entry: PageEntryLike): entry is PageEntryDefinition {
    return "params" in entry;
}
