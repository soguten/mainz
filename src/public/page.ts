/**
 * Public page authoring APIs for Mainz.
 */

export {
    Locales,
    RenderMode,
    Route,
    requirePageRoutePath,
    resolvePageLocales,
    resolvePageRenderMode,
    resolvePageRoutePath,
} from "../components/page-metadata.ts";
export {
    createPageLoadContext,
    isPageConstructor,
    load,
    Page,
} from "../components/page.ts";
export type { PageRenderMode } from "../components/page-metadata.ts";
export type {
    PageEntryDefinition,
    PageHeadDefinition,
    PageHeadLinkDefinition,
    PageHeadMetaDefinition,
    PageRouteParams,
} from "../components/page-contract.ts";
export type {
    PageConstructor,
    PageEntriesContext,
    PageHeadContext,
    PageLoadContext,
    PageLoadContextInit,
    PageLoadHelpers,
    PageLoadResources,
    PageLoadRuntime,
    PageNavigationMode,
    PageResource,
} from "../components/page.ts";
