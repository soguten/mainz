import { Component } from "./component.ts";
import type { DefaultProps, DefaultState } from "./types.ts";
import type { NavigationMode, RenderMode } from "../routing/types.ts";

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

export interface PageLoadContext {
    params: PageRouteParams;
    locale?: string;
    url: URL;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
}

export interface PageDefinition {
    mode?: RenderMode;
    notFound?: boolean;
    locales?: readonly string[];
    head?: PageHeadDefinition;
}

export const MAINZ_HEAD_MANAGED_ATTR = "data-mainz-head-managed";
const PAGE_ROUTE_PATH = Symbol("mainz.page.route-path");

export function Route(path: string) {
    return function <T extends PageConstructor>(value: T, _context?: ClassDecoratorContext<T>): void {
        applyPageRoutePath(value, path);
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
    entries?(context: PageEntriesContext): readonly PageEntryDefinition[] | Promise<readonly PageEntryDefinition[]>;
    load?(context: PageLoadContext): unknown | Promise<unknown>;
    [PAGE_ROUTE_PATH]?: string;
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

function resolvePageHeadDefinition(pageCtor: PageConstructor, props?: unknown): PageHeadDefinition | undefined {
    const propsRecord = typeof props === "object" && props !== null ? props as Record<string, unknown> : undefined;
    const routeValue = propsRecord?.route;
    const routeRecord = typeof routeValue === "object" && routeValue !== null ? routeValue as Record<string, unknown> : undefined;
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
