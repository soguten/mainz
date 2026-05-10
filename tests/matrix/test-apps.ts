/// <reference lib="deno.ns" />

import {
  buildBasePathAppForNavigation,
  buildDocumentLanguageRoutedAppForNavigation,
  buildGeneratedTagStabilityAppForNavigation,
  buildHeadSeoAppForNavigation,
  buildRootAppForNavigation,
  buildRoutedAuthorizationAppForNavigation,
  buildRoutedAppForNavigation,
  buildRoutedDiClientAppForNavigation,
  buildRoutedDiEntriesAppForNavigation,
  buildSingleLocaleRoutedAppForNavigation,
} from "../helpers/build.ts";
import type {
  TestNavigationMode,
  TestScenarioBuildContext,
} from "../helpers/types.ts";
import {
  loadBuiltDocument,
  previewBuiltRoute,
  readBuiltJsonFile,
  readBuiltRouteHtml,
  renderBuiltDocument,
  renderBuiltRoute,
  resolveBuiltRouteHtmlPath,
  type ResolvedTestApp,
} from "./render-test-app.ts";

export type TestAppId =
  | "RoutedApp"
  | "RootApp"
  | "RoutedDIEntriesApp"
  | "RoutedDIClientApp"
  | "RoutedAuthorizationApp"
  | "SingleLocaleRoutedApp"
  | "DocumentLanguageRoutedApp"
  | "BasePathApp"
  | "HeadSeoApp"
  | "GeneratedTagStabilityApp";

type ScenarioBuildArgs = {
  navigation: TestNavigationMode;
  profile?: string;
};

type TestAppDefinition = {
  id: TestAppId;
  buildScenario?(args: ScenarioBuildArgs): Promise<TestScenarioBuildContext>;
  resolve(): ResolvedTestApp;
};

type NavigationScenarioBuilder = (
  navigation: TestNavigationMode,
) => Promise<TestScenarioBuildContext>;

const resolvedTestApp: Omit<ResolvedTestApp, "id"> = {
  readHtml: readBuiltRouteHtml,
  readJson: readBuiltJsonFile,
  loadDocument: loadBuiltDocument,
  resolveHtmlPath: resolveBuiltRouteHtmlPath,
  preview: previewBuiltRoute,
  renderDocument: renderBuiltDocument,
  render: renderBuiltRoute,
};

function buildScenarioFromNavigationBuilder(
  build: NavigationScenarioBuilder,
): (args: ScenarioBuildArgs) => Promise<TestScenarioBuildContext> {
  return ({ navigation }) => build(navigation);
}

function defineNavigationScenarioTestApp(args: {
  id: TestAppId;
  buildNavigation: NavigationScenarioBuilder;
}): TestAppDefinition {
  return {
    id: args.id,
    buildScenario: buildScenarioFromNavigationBuilder(args.buildNavigation),
    resolve() {
      return createResolvedTestApp(args.id);
    },
  };
}

export const testApps: Record<TestAppId, TestAppDefinition> = {
  "RoutedApp": defineNavigationScenarioTestApp({
    id: "RoutedApp",
    buildNavigation: buildRoutedAppForNavigation,
  }),
  "RootApp": defineNavigationScenarioTestApp({
    id: "RootApp",
    buildNavigation: buildRootAppForNavigation,
  }),
  "RoutedDIEntriesApp": defineNavigationScenarioTestApp({
    id: "RoutedDIEntriesApp",
    buildNavigation: buildRoutedDiEntriesAppForNavigation,
  }),
  "RoutedDIClientApp": defineNavigationScenarioTestApp({
    id: "RoutedDIClientApp",
    buildNavigation: buildRoutedDiClientAppForNavigation,
  }),
  "RoutedAuthorizationApp": defineNavigationScenarioTestApp({
    id: "RoutedAuthorizationApp",
    buildNavigation: buildRoutedAuthorizationAppForNavigation,
  }),
  "SingleLocaleRoutedApp": defineNavigationScenarioTestApp({
    id: "SingleLocaleRoutedApp",
    buildNavigation: buildSingleLocaleRoutedAppForNavigation,
  }),
  "DocumentLanguageRoutedApp": defineNavigationScenarioTestApp({
    id: "DocumentLanguageRoutedApp",
    buildNavigation: buildDocumentLanguageRoutedAppForNavigation,
  }),
  "BasePathApp": defineNavigationScenarioTestApp({
    id: "BasePathApp",
    buildNavigation: buildBasePathAppForNavigation,
  }),
  "HeadSeoApp": defineNavigationScenarioTestApp({
    id: "HeadSeoApp",
    buildNavigation: buildHeadSeoAppForNavigation,
  }),
  "GeneratedTagStabilityApp": defineNavigationScenarioTestApp({
    id: "GeneratedTagStabilityApp",
    buildNavigation: buildGeneratedTagStabilityAppForNavigation,
  }),
};

export function resolveTestAppDefinition(
  appId: TestAppId,
): TestAppDefinition {
  const definition = testApps[appId];
  if (!definition) {
    throw new Error(`Unknown test app "${appId}".`);
  }

  return definition;
}

function createResolvedTestApp(id: TestAppId): ResolvedTestApp {
  return {
    id,
    ...resolvedTestApp,
  };
}
