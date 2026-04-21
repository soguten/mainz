/** Route params resolved for the active page or component request. */
export type PageRouteParams = Readonly<Record<string, string>>;

/** `<meta>` definition emitted by a page head contract. */
export interface PageHeadMetaDefinition {
    name?: string;
    property?: string;
    content: string;
}

/** `<link>` definition emitted by a page head contract. */
export interface PageHeadLinkDefinition {
    rel: string;
    href: string;
    hreflang?: string;
}

/** Document head contract returned by a page. */
export interface PageHeadDefinition {
    title?: string;
    meta?: readonly PageHeadMetaDefinition[];
    links?: readonly PageHeadLinkDefinition[];
}

/** Static entry definition returned by `Page.entries()` for SSG expansion. */
export interface PageEntryDefinition {
    params: PageRouteParams;
}
