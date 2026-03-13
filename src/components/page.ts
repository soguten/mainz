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
}

export function isPageConstructor(value: unknown): value is PageConstructor {
    if (typeof value !== "function") {
        return false;
    }

    return value === Page || value.prototype instanceof Page;
}
