/**
 * Public application definition and startup APIs for Mainz.
 */

export {
    defineApp,
    startApp,
} from "../navigation/index.ts";

export type {
    AppRootComponentConstructor,
    DefinedApp,
    DefinedRootApp,
    DefinedRoutedApp,
    NavigationController,
    RootAppDefinition,
    RoutePathResolver,
    RoutedAppAuthorizationDefinition,
    RoutedAppDefinition,
    RoutedAppI18nDefinition,
    SpaLazyPageDefinition,
    SpaPageConstructor,
    SpaPageDefinition,
    SpaPageModule,
    SpaRouteDefinition,
    SpaRouteParams,
    StartDefinedAppOptions,
} from "../navigation/index.ts";
