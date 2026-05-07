/**
 * Public application definition and startup APIs for Mainz.
 */

export { defineApp, startApp } from "../navigation/index.ts";

export type {
  AppRootComponentConstructor,
  DefinedApp,
  DefinedRootApp,
  DefinedRoutedApp,
  NavigationController,
  RootAppDefinition,
  RoutedAppAuthorizationDefinition,
  RoutedAppDefinition,
  RoutedAppI18nDefinition,
  RoutePathResolver,
  SpaLazyPageDefinition,
  SpaPageConstructor,
  SpaPageDefinition,
  SpaPageModule,
  SpaRouteDefinition,
  SpaRouteParams,
  StartDefinedAppOptions,
} from "../navigation/index.ts";
