import { Component } from "./component.ts";
import type { DefaultProps, DefaultState } from "./types.ts";
import type { RenderMode } from "../routing/types.ts";

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

export interface PageDefinition {
    path: string;
    mode?: RenderMode;
    locales?: readonly string[];
    head?: PageHeadDefinition;
}

export type PageConstructor = typeof Component & {
    page?: PageDefinition;
};

export abstract class Page<P = DefaultProps, S = DefaultState> extends Component<P, S> {
    static page?: PageDefinition;

    override connectedCallback() {
        super.connectedCallback();
        applyPageHeadToDocument(this.constructor as PageConstructor);
    }

    override afterRender(): void {
        applyPageHeadToDocument(this.constructor as PageConstructor);
        super.afterRender?.();
    }
}

export function isPageConstructor(value: unknown): value is PageConstructor {
    if (typeof value !== "function") {
        return false;
    }

    return value === Page || value.prototype instanceof Page;
}

const MAINZ_HEAD_MANAGED = "data-mainz-head-managed";

export function applyPageHeadToDocument(pageCtor: PageConstructor): void {
    if (typeof document === "undefined") {
        return;
    }

    const page = pageCtor.page;
    if (!page?.head) {
        return;
    }

    if (page.head.title) {
        document.title = page.head.title;
    }

    const head = document.head;
    if (!head) {
        return;
    }

    head.querySelectorAll(`[${MAINZ_HEAD_MANAGED}]`).forEach((node) => node.remove());

    for (const meta of page.head.meta ?? []) {
        const element = document.createElement("meta");
        if (meta.name) {
            element.setAttribute("name", meta.name);
        }
        if (meta.property) {
            element.setAttribute("property", meta.property);
        }
        element.setAttribute("content", meta.content);
        element.setAttribute(MAINZ_HEAD_MANAGED, "true");
        head.appendChild(element);
    }

    for (const link of page.head.links ?? []) {
        const element = document.createElement("link");
        element.setAttribute("rel", link.rel);
        element.setAttribute("href", link.href);
        if (link.hreflang) {
            element.setAttribute("hreflang", link.hreflang);
        }
        element.setAttribute(MAINZ_HEAD_MANAGED, "true");
        head.appendChild(element);
    }
}
