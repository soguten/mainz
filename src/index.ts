export { Component, CustomElement } from "./components/index.ts";
export { isPageConstructor, Page, Route } from "./components/index.ts";
export { startNavigation, startPagesApp } from "./navigation/index.ts";
export type { DefaultProps, DefaultState } from "./components/index.ts";
export type {
    NavigationLocaleContext,
    RoutePathResolver,
    SpaLazyPageDefinition,
    SpaNavigationOptions,
    SpaNavigationRenderContext,
    SpaPageConstructor,
    SpaPageDefinition,
    SpaPageModule,
    SpaRouteParams,
    StartNavigationOptions,
    StartPagesAppOptions,
} from "./navigation/index.ts";
export type {
    PageConstructor,
    PageDefinition,
    PageEntriesContext,
    PageEntryDefinition,
    PageHeadDefinition,
    PageHeadLinkDefinition,
    PageHeadMetaDefinition,
    PageLoadContext,
    PageRouteParams,
} from "./components/index.ts";
export {
    createAppDictionaryI18n,
    createDictionaryI18n,
    detectNavigatorLocale,
    normalizeLocaleTag,
    toLocalePathSegment as toI18nLocalePathSegment,
    validateMessagesForLocales,
} from "./i18n/index.ts";
export type {
    DictionaryI18nAppDetectOptions,
    DictionaryI18nAppOptions,
    DictionaryI18nOptions,
    I18nConfig,
    LocaleTag,
    MessagesLoader,
} from "./i18n/index.ts";
export {
    buildSsgOutputEntries,
    buildTargetRouteManifest,
    inferFilesystemRoute,
    inferFilesystemRoutes,
    isDynamicRoutePath,
    isFilesystemPageFile,
    materializeRoutePath,
    toLocalePathSegment,
} from "./routing/index.ts";
export type {
    BuildTargetRouteManifestInput,
    FilesystemRoute,
    FilesystemRoutingOptions,
    NavigationMode,
    RenderMode,
    ResolvedSsgRouteEntry,
    RouteManifestEntry,
    RouteSource,
    SsgOutputEntry,
    TargetDefinition,
    TargetRouteManifest,
} from "./routing/index.ts";
