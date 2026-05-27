import { Component } from "./component.ts";
import type { Principal } from "../authorization/index.ts";
import type { DefaultProps, DefaultState } from "./types.ts";
import {
  readResource,
  type Resource,
  type ResourceRuntime,
} from "../resources/resource.ts";
import type {
  PageEntryDefinition,
  PageMetadataDefinition,
  PageMetadataLinkDefinition,
  PageMetadataMetaDefinition,
  PageRouteParams,
} from "./page-contract.ts";
import type { RouteContext, RouteProfileContext } from "./route-context.ts";
import { isRouteContext } from "./route-context.ts";
import {
  Locales,
  type PageRenderConfig,
  type PageRenderMode,
  type PageSsgFallback,
  RenderMode,
  requirePageRoutePath,
  resolvePageLocales,
  resolvePageRenderConfig,
  resolvePageRenderMode,
  resolvePageRoutePath,
  Route,
} from "./page-metadata.ts";

declare const __MAINZ_RUNTIME_ENV__: "build" | "client";
const MAINZ_PAGE_CONSTRUCTOR = Symbol.for("mainz.page.constructor");

export {
  Locales,
  RenderMode,
  requirePageRoutePath,
  resolvePageLocales,
  resolvePageRenderConfig,
  resolvePageRenderMode,
  resolvePageRoutePath,
  Route,
} from "./page-metadata.ts";
export type {
  PageRenderConfig,
  PageRenderMode,
  PageSsgFallback,
} from "./page-metadata.ts";
export type {
  PageEntryDefinition,
  PageMetadataDefinition,
  PageMetadataLinkDefinition,
  PageMetadataMetaDefinition,
  PageRouteParams,
} from "./page-contract.ts";
export type { RouteContext, RouteProfileContext } from "./route-context.ts";

/** Navigation mode visible to page-owned load and metadata helpers. */
export type PageNavigationMode = "spa" | "mpa";

/** Runtime channel used when resolving page-owned resources. */
export type PageLoadRuntime = "build" | "client";

/**
 * Structural resource contract accepted by page-owned resource readers.
 *
 * Mainz page helpers are designed to consume Mainz resources, but the public contract stays small
 * by requiring only the read/load shape needed by the page API.
 */
export interface PageResource<Params = void, Context = void, Value = unknown> {
  /** Reads or resolves a resource value for the given params and context. */
  read(params: Params, context: Context): Value | Promise<Value>;
  /** Underlying resource loader used by Mainz resource implementations. */
  load(params: Params, context: Context): Value | Promise<Value>;
}

/** Context passed to `Page.entries()` when expanding static routes. */
export interface PageEntriesContext {
  /** Locale currently being expanded, when entry generation is locale-aware. */
  locale?: string;
  /** Active profile metadata associated with the target being expanded. */
  profile?: RouteProfileContext;
}

/** Helper namespace for deriving page loaders from route params. */
export interface PageLoadHelpers {
  /** Creates a loader that reads a single route param by name. */
  byParam<Value>(
    name: string,
    resolver: (
      value: string,
      context: PageLoadContext,
    ) => Value | Promise<Value>,
  ): (context: PageLoadContext) => Value | Promise<Value>;
  /** Creates a loader that reads a selected subset of route params. */
  byParams<const Names extends readonly string[], Value>(
    names: Names,
    resolver: (
      params: { readonly [K in Names[number]]: string },
      context: PageLoadContext,
    ) => Value | Promise<Value>,
  ): (context: PageLoadContext) => Value | Promise<Value>;
}

/** Full route-aware context passed to page `load()` and `metadata()` helpers. */
export interface PageLoadContext {
  /** Current requested path. */
  path: string;
  /** Current matched route pattern path. */
  matchedPath: string;
  /** Route params resolved for the current request. */
  params: PageRouteParams;
  /** Locale resolved for the current request, when present. */
  locale?: string;
  /** Fully resolved request URL. */
  url: URL;
  /** Page render mode active for the current request. */
  renderMode: PageRenderMode;
  /** Navigation mode active for the current request. */
  navigationMode: PageNavigationMode;
  /** Abort signal for the current page load operation. */
  signal: AbortSignal;
  /** Principal resolved for the current request, when present. */
  principal?: Principal;
  /** Profile metadata associated with the current target, when present. */
  profile?: RouteProfileContext;
  /** Route context exposed to the page subtree. */
  route: RouteContext;
  /** Page-owned resource reader helpers. */
  resources: PageLoadResources;
}

/** Context passed to `Page.metadata()`. */
export type PageMetadataContext = PageLoadContext;

/** Resource helpers available from `PageLoadContext.resources`. */
export interface PageLoadResources {
  /** Reads a page-owned resource under the current page execution environment. */
  read<Params, Context, Value>(
    resource: PageResource<Params, Context, Value>,
    params: Params,
    context: Context,
  ): Value | Promise<Value>;
}

/** Initialization payload used to build a full `PageLoadContext`. */
export interface PageLoadContextInit {
  /** Requested path. Defaults to `url.pathname`. */
  path?: string;
  /** Matched route path. Defaults to the resolved `path`. */
  matchedPath?: string;
  /** Route params resolved for the request. */
  params: PageRouteParams;
  /** Locale resolved for the request, when present. */
  locale?: string;
  /** Fully resolved request URL. */
  url: URL;
  /** Page render mode active for the request. */
  renderMode: PageRenderMode;
  /** Navigation mode active for the request. */
  navigationMode: PageNavigationMode;
  /** Abort signal for the load operation. */
  signal?: AbortSignal;
  /** Principal resolved for the current request, when present. */
  principal?: Principal;
  /** Profile metadata associated with the current target, when present. */
  profile?: RouteProfileContext;
  /** Runtime channel used for page-owned resource reads. */
  runtime?: PageLoadRuntime;
}

export const MAINZ_METADATA_MANAGED_ATTR = "data-mainz-metadata-managed";

/**
 * Base class for Mainz pages.
 *
 * `Page` extends `Component` with route-owned concerns such as:
 *
 * - route path and route params
 * - page render mode
 * - document metadata
 * - static entry generation for SSG
 *
 * Use `Page` when the class represents a navigable route in the application.
 * Use `Component` for reusable view pieces inside a page.
 *
 * Like `Component`, `Page` uses the generic order `Page<Props, State, Data>`.
 * Page data is typically resolved through `load()` and then consumed by `render()` and
 * `metadata()`.
 */
export abstract class Page<P = DefaultProps, S = DefaultState, D = unknown>
  extends Component<
    P,
    S,
    D,
    PageLoadContext
  > {
  private pageData?: D;

  /** Returns page-owned data resolved through the route-aware page lifecycle. */
  override get data(): D {
    const propsRecord = typeof this.props === "object" && this.props !== null
      ? this.props as Record<string, unknown>
      : undefined;

    return (this.pageData ?? propsRecord?.data) as D;
  }

  override set data(value: D) {
    this.pageData = value;
  }

  /**
   * Returns document metadata for this page.
   *
   * Mainz calls `metadata()` with the current page context so the page can derive title, meta
   * tags, and link tags from route state and resolved page data.
   *
   * Use `metadata()` for document metadata only.
   * Use `render()` for visible page content.
   */
  metadata(_context?: PageMetadataContext): PageMetadataDefinition | undefined {
    return undefined;
  }

  /** Connects the page and applies managed document metadata when ready to render. */
  override connectedCallback() {
    if (this.shouldDeferInitialPageRender()) {
      return;
    }

    super.connectedCallback();
    applyPageMetadataToDocument(this, this.props);
  }

  /** Reapplies managed document metadata after each page render. */
  override afterRender(): void {
    applyPageMetadataToDocument(this, this.props);
    super.afterRender?.();
  }

  /** Pages manage their own route-owned loading instead of participating in component loading. */
  protected override participatesInComponentLoad(): boolean {
    return false;
  }

  /** Determines whether the current props already contain a resolved route context. */
  private hasResolvedRouteContext(): boolean {
    if (typeof this.props !== "object" || this.props === null) {
      return false;
    }

    return isRouteContext((this.props as Record<string, unknown>).route);
  }

  /** Detects whether the initial page render should wait for route context resolution. */
  private shouldDeferInitialPageRender(): boolean {
    if (this.hasResolvedRouteContext()) {
      return false;
    }

    if (this.childNodes.length > 0) {
      return true;
    }

    const routePath = resolvePageRoutePath(this.constructor as PageConstructor);
    return typeof routePath === "string" && /[:*]/.test(routePath);
  }
}

/** Constructor contract used by page discovery, route metadata, and page helpers. */
export interface PageConstructor {
  /** Creates a new page instance. */
  new (...args: unknown[]): Page<any, any, any>;
  /** Prototype associated with the page constructor. */
  readonly prototype: Page<any, any, any>;
  /** Stable class name used for diagnostics and metadata. */
  readonly name: string;
  /** Optional static entry expansion used during SSG route materialization. */
  entries?(
    context: PageEntriesContext,
  ): readonly PageEntryDefinition[] | Promise<readonly PageEntryDefinition[]>;
}

/** Helper namespace for deriving page loaders from route params. */
export const load: PageLoadHelpers = {
  byParam<Value>(
    name: string,
    resolver: (
      value: string,
      context: PageLoadContext,
    ) => Value | Promise<Value>,
  ): (context: PageLoadContext) => Value | Promise<Value> {
    return (context) => resolver(context.params[name], context);
  },
  byParams<const Names extends readonly string[], Value>(
    names: Names,
    resolver: (
      params: { readonly [K in Names[number]]: string },
      context: PageLoadContext,
    ) => Value | Promise<Value>,
  ): (context: PageLoadContext) => Value | Promise<Value> {
    return (context) => {
      const selectedParams = Object.fromEntries(
        names.map((name) => [name, context.params[name]]),
      ) as { readonly [K in Names[number]]: string };

      return resolver(selectedParams, context);
    };
  },
};

/**
 * Creates a normalized `PageLoadContext` from a partial initialization payload.
 */
export function createPageLoadContext(
  init: PageLoadContextInit,
): PageLoadContext {
  const routePath = init.path ?? init.url.pathname;
  const matchedPath = init.matchedPath ?? routePath;
  const baseContext = {
    path: routePath,
    matchedPath,
    params: init.params,
    locale: init.locale,
    url: init.url,
    renderMode: init.renderMode,
    navigationMode: init.navigationMode,
    signal: init.signal ?? new AbortController().signal,
    principal: init.principal,
    profile: init.profile,
    runtime: init.runtime ?? resolveMainzResourceRuntime(),
  } satisfies PageLoadContextInit;

  const route: RouteContext = {
    path: routePath,
    matchedPath,
    params: init.params,
    locale: init.locale,
    url: init.url,
    renderMode: init.renderMode,
    navigationMode: init.navigationMode,
    principal: init.principal,
    profile: init.profile,
  };

  return {
    ...baseContext,
    route,
    resources: {
      read<Params, Context, Value>(
        resource: PageResource<Params, Context, Value>,
        params: Params,
        context: Context,
      ) {
        return readResource(
          resource as Resource<Params, Context, Value>,
          params,
          context,
          {
            renderMode: baseContext.renderMode,
            navigationMode: baseContext.navigationMode,
            runtime: baseContext.runtime,
            consumer: "page-load",
          },
        );
      },
    },
  };
}

(Page as unknown as Record<PropertyKey, unknown>)[MAINZ_PAGE_CONSTRUCTOR] =
  true;

/** Determines whether a value is a Mainz `Page` constructor. */
export function isPageConstructor(value: unknown): value is PageConstructor {
  if (typeof value !== "function") {
    return false;
  }

  return value === Page ||
    value.prototype instanceof Page ||
    (value as unknown as Record<PropertyKey, unknown>)[
        MAINZ_PAGE_CONSTRUCTOR
      ] === true;
}

export function applyPageMetadataToDocument(
  page: Page<any, any, any>,
  props?: unknown,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const head = document.head;
  if (!head) {
    return;
  }

  head.querySelectorAll(`[${MAINZ_METADATA_MANAGED_ATTR}]`).forEach((node) =>
    node.remove()
  );

  const metadataDefinition = resolvePageMetadataDefinition(page, props);
  if (!metadataDefinition) {
    return;
  }

  if (metadataDefinition.title) {
    document.title = metadataDefinition.title;
  }

  for (const meta of metadataDefinition.meta ?? []) {
    const element = document.createElement("meta");
    if (meta.name) {
      element.setAttribute("name", meta.name);
    }
    if (meta.property) {
      element.setAttribute("property", meta.property);
    }
    element.setAttribute("content", meta.content);
    element.setAttribute(MAINZ_METADATA_MANAGED_ATTR, "true");
    head.appendChild(element);
  }

  for (const link of metadataDefinition.links ?? []) {
    const element = document.createElement("link");
    element.setAttribute("rel", link.rel);
    element.setAttribute("href", link.href);
    if (link.hreflang) {
      element.setAttribute("hreflang", link.hreflang);
    }
    element.setAttribute(MAINZ_METADATA_MANAGED_ATTR, "true");
    head.appendChild(element);
  }
}

function resolvePageMetadataDefinition(
  page: Page<any, any, any>,
  props?: unknown,
): PageMetadataDefinition | undefined {
  const propsRecord = typeof props === "object" && props !== null
    ? props as Record<string, unknown>
    : undefined;
  const routeValue = propsRecord?.route;
  const routeRecord = typeof routeValue === "object" && routeValue !== null
    ? routeValue as Record<string, unknown>
    : undefined;
  const directMetadata = propsRecord?.metadata;
  const routeMetadata = routeRecord?.metadata;
  const instanceMetadata = page.metadata(
    resolvePageMetadataContext(page, routeRecord),
  );
  const mergedRouteMetadata = mergePageMetadataDefinitions(
    instanceMetadata,
    isPageMetadataDefinition(routeMetadata) ? routeMetadata : undefined,
  );

  return mergePageMetadataDefinitions(
    mergedRouteMetadata,
    isPageMetadataDefinition(directMetadata) ? directMetadata : undefined,
  );
}

function resolvePageMetadataContext(
  page: Page<any, any, any>,
  routeRecord: Record<string, unknown> | undefined,
): PageMetadataContext {
  let routeContext: RouteContext | undefined = isRouteContext(routeRecord)
    ? routeRecord
    : undefined;
  if (!routeContext) {
    try {
      routeContext = page.route;
    } catch {
      routeContext = undefined;
    }
  }

  if (routeContext) {
    return createPageLoadContext({
      path: routeContext.path,
      matchedPath: routeContext.matchedPath,
      params: routeContext.params,
      locale: routeContext.locale,
      url: routeContext.url,
      renderMode: routeContext.renderMode,
      navigationMode: routeContext.navigationMode,
      principal: routeContext.principal,
      profile: routeContext.profile,
    });
  }

  const fallbackUrl = typeof window !== "undefined"
    ? new URL(window.location.href)
    : new URL("https://mainz.local/");

  return createPageLoadContext({
    path: fallbackUrl.pathname,
    matchedPath: fallbackUrl.pathname,
    params: {},
    locale: undefined,
    url: fallbackUrl,
    renderMode: "csr",
    navigationMode: "spa",
  });
}

function isPageMetadataDefinition(
  value: unknown,
): value is PageMetadataDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return "title" in candidate || "meta" in candidate || "links" in candidate;
}

export function mergePageMetadataDefinitions(
  base: PageMetadataDefinition | undefined,
  override: PageMetadataDefinition | undefined,
): PageMetadataDefinition | undefined {
  if (!base) {
    return override;
  }

  if (!override) {
    return base;
  }

  return {
    title: override.title ?? base.title,
    meta: mergePageMetadataMetaDefinitions(base.meta, override.meta),
    links: mergePageMetadataLinkDefinitions(base.links, override.links),
  };
}

function mergePageMetadataMetaDefinitions(
  base: readonly PageMetadataMetaDefinition[] | undefined,
  override: readonly PageMetadataMetaDefinition[] | undefined,
): readonly PageMetadataMetaDefinition[] | undefined {
  if (!base) {
    return override;
  }

  if (!override) {
    return base;
  }

  const merged = [...base];

  for (const item of override) {
    const key = getPageMetadataMetaKey(item);
    if (!key) {
      merged.push(item);
      continue;
    }

    const existingIndex = merged.findIndex((candidate) =>
      getPageMetadataMetaKey(candidate) === key
    );
    if (existingIndex >= 0) {
      merged[existingIndex] = item;
      continue;
    }

    merged.push(item);
  }

  return merged;
}

function mergePageMetadataLinkDefinitions(
  base: readonly PageMetadataLinkDefinition[] | undefined,
  override: readonly PageMetadataLinkDefinition[] | undefined,
): readonly PageMetadataLinkDefinition[] | undefined {
  if (!base) {
    return override;
  }

  if (!override) {
    return base;
  }

  const merged = [...base];

  for (const item of override) {
    const key = getPageMetadataLinkKey(item);
    if (!key) {
      merged.push(item);
      continue;
    }

    const existingIndex = merged.findIndex((candidate) =>
      getPageMetadataLinkKey(candidate) === key
    );
    if (existingIndex >= 0) {
      merged[existingIndex] = item;
      continue;
    }

    merged.push(item);
  }

  return merged;
}

function getPageMetadataMetaKey(
  item: PageMetadataMetaDefinition,
): string | undefined {
  if (item.name) {
    return `name:${item.name}`;
  }

  if (item.property) {
    return `property:${item.property}`;
  }

  return undefined;
}

function getPageMetadataLinkKey(
  item: PageMetadataLinkDefinition,
): string | undefined {
  if (item.rel === "canonical") {
    return "rel:canonical";
  }

  if (item.rel === "alternate" && item.hreflang) {
    return `rel:alternate:${item.hreflang}`;
  }

  if (item.rel && item.href) {
    return `rel:${item.rel}:href:${item.href}`;
  }

  return undefined;
}

function resolveMainzResourceRuntime(): ResourceRuntime {
  if (typeof __MAINZ_RUNTIME_ENV__ !== "undefined") {
    return __MAINZ_RUNTIME_ENV__;
  }

  const fromGlobal =
    (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
  return fromGlobal === "build" ? "build" : "client";
}
