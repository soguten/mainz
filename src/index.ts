export { Component } from "./components/index.ts";
export { Page, isPageConstructor } from "./components/index.ts";
export { startNavigation, startPagesApp } from "./navigation/index.ts";
export type { DefaultProps, DefaultState } from "./components/index.ts";
export type {
    NavigationLocaleContext,
    RoutePathResolver,
    SpaLazyPageDefinition,
    SpaNavigationOptions,
    SpaPageConstructor,
    SpaPageModule,
    SpaNavigationRenderContext,
    SpaPageDefinition,
    SpaRouteParams,
    StartPagesAppOptions,
    StartNavigationOptions,
} from "./navigation/index.ts";
export type {
    PageConstructor,
    PageDefinition,
    PageHeadDefinition,
    PageHeadLinkDefinition,
    PageHeadMetaDefinition,
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
    isFilesystemPageFile,
    toLocalePathSegment,
} from "./routing/index.ts";
export type {
    BuildTargetRouteManifestInput,
    FilesystemRoute,
    FilesystemRoutingOptions,
    NavigationMode,
    RenderMode,
    RouteManifestEntry,
    RouteSource,
    SsgOutputEntry,
    TargetDefinition,
    TargetRouteManifest,
} from "./routing/index.ts";
