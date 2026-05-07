/** Route params resolved for the active page or component request. */
export type PageRouteParams = Readonly<Record<string, string>>;

/** `<meta>` definition emitted by a page head contract. */
export interface PageHeadMetaDefinition {
  /** Optional `name` attribute for standard document metadata. */
  name?: string;
  /** Optional `property` attribute for graph-style metadata such as Open Graph. */
  property?: string;
  /** Content emitted for the resulting `<meta>` tag. */
  content: string;
}

/** `<link>` definition emitted by a page head contract. */
export interface PageHeadLinkDefinition {
  /** `rel` attribute for the emitted `<link>` tag. */
  rel: string;
  /** `href` attribute for the emitted `<link>` tag. */
  href: string;
  /** Optional `hreflang` attribute for alternate language links. */
  hreflang?: string;
}

/** Document head contract returned by a page. */
export interface PageHeadDefinition {
  /** Document title emitted for the page. */
  title?: string;
  /** Metadata tags emitted for the page head. */
  meta?: readonly PageHeadMetaDefinition[];
  /** Link tags emitted for the page head. */
  links?: readonly PageHeadLinkDefinition[];
}

/** Static entry definition returned by `Page.entries()` for SSG expansion. */
export interface PageEntryDefinition {
  /** Concrete route params used to materialize a static page entry. */
  params: PageRouteParams;
}
