/**
 * JSR entrypoint for the published Mainz package.
 *
 * @module
 */

export * from "./src/public/core.ts";
export * from "./src/public/authorization.ts";
export {
    Locales,
    RenderMode,
    Route,
    requirePageRoutePath,
    resolvePageLocales,
    resolvePageRenderMode,
    resolvePageRoutePath,
} from "./src/public/page.ts";
export type {
    PageEntryDefinition,
    PageHeadDefinition,
    PageHeadLinkDefinition,
    PageHeadMetaDefinition,
    PageRenderMode,
} from "./src/public/page.ts";
