/// <reference lib="deno.ns" />

import type {
  TestNavigationMode,
  TestScenarioBuildContext,
} from "../helpers/types.ts";
import { type TestAppId, resolveTestAppDefinition } from "./test-apps.ts";
import {
  describeBuiltArtifact,
  isCsrArtifact,
  isSsgArtifact,
  type BuiltArtifact,
} from "./artifacts.ts";
import type { ResolvedTestApp } from "./render-test-app.ts";
import type { TestScreen } from "../../src/testing/test-screen.ts";

export type ScenarioNavigation = TestNavigationMode;
export type ScenarioAppId = TestAppId;

export type ScenarioBuildRecipe = {
  app: ScenarioAppId;
  profile?: string;
  navigation: ScenarioNavigation;
};

export type ScenarioArtifactSet = {
  recipe: ScenarioBuildRecipe;
  context: TestScenarioBuildContext;
  available: BuiltArtifact[];
  cleanup?(): Promise<void>;
};

export type ScenarioRouteLoadResult = {
  html: string;
  htmlPath: string;
  outputDir: string;
  status?: number;
};
export type ScenarioRouteApi = {
  load(): Promise<ScenarioRouteLoadResult>;
  render(): Promise<TestScreen<Element>>;
  html(): Promise<string>;
  json<T>(file: string): Promise<T>;
};
export type ScenarioDocumentApi = {
  html(): Promise<string>;
  renderAt(args: {
    url: string;
    basePath?: string;
    navigationReady?: {
      locale?: string;
      path?: string;
      matchedPath?: string;
      navigationType?: "initial" | "push" | "pop";
    };
  }): Promise<TestScreen<Element>>;
};
export type ScenarioApp = {
  id: ScenarioAppId;
  route(routePath: string): ScenarioRouteApi;
  document(documentHtmlPath: string): ScenarioDocumentApi;
};

export type ScenarioCase = {
  name: string;
  app?: ScenarioAppId;
  profile?: string;
  navigation?: readonly ScenarioNavigation[];
  run(args: {
    navigation: ScenarioNavigation;
    app: ScenarioApp;
    t: Deno.TestContext;
  }): Promise<void>;
};

type ScenarioCaseGroup = {
  recipe: ScenarioBuildRecipe;
  cases: ScenarioCase[];
};

type ScenarioTestAppDefinitionResolver = typeof resolveTestAppDefinition;
type ResolvedScenarioTestAppDefinition = ReturnType<
  typeof resolveTestAppDefinition
>;
type ScenarioStepRunner = Pick<Deno.TestContext, "step">;
type ScenarioResolvedAppContext = {
  id: ScenarioAppId;
  testApp: ResolvedTestApp;
  artifacts: ScenarioArtifactSet;
};

const defaultScenarioNavigations = [
  "spa",
  "mpa",
] as const satisfies readonly ScenarioNavigation[];

export function scenarioTest(input: ScenarioCase): ScenarioCase {
  return input;
}

export function defineScenarioSuite(input: {
  name: string;
  app?: ScenarioAppId;
  cases: readonly ScenarioCase[];
  navigations?: readonly ScenarioNavigation[];
}): void {
  const navigations = input.navigations ?? defaultScenarioNavigations;

  for (const navigation of navigations) {
    Deno.test(`${input.name}: ${navigation}`, async (t) => {
      await runScenarioNavigation({
        t,
        app: input.app,
        navigation,
        cases: input.cases,
      });
    });
  }
}

export async function runScenarioNavigation(args: {
  t: ScenarioStepRunner;
  app?: ScenarioAppId;
  navigation: ScenarioNavigation;
  cases: readonly ScenarioCase[];
  resolveTestAppDefinition?: ScenarioTestAppDefinitionResolver;
}): Promise<void> {
  const groups = groupScenarioCasesByRecipe(args.cases, args.navigation, args.app);
  logScenarioDiagnostics(args.navigation, groups);

  for (const group of groups) {
    const testAppDefinition =
      (args.resolveTestAppDefinition ?? resolveTestAppDefinition)(
        group.recipe.app,
      );
    try {
      const artifacts = await buildScenarioArtifactSet(
        group.recipe,
        testAppDefinition,
      );
      const resolvedTestApp = testAppDefinition.resolve();
      const app = createScenarioApp({
        id: group.recipe.app,
        testApp: resolvedTestApp,
        artifacts,
      });
      const availableArtifactDirs = new Map<string, readonly string[]>([
        [
          getScenarioRecipeKey(group.recipe),
          artifacts.available.map((artifact) => artifact.context.outputDir),
        ],
      ]);

      try {
        for (const testCase of group.cases) {
          await args.t.step(testCase.name, async (step) => {
            try {
              await testCase.run({
                navigation: args.navigation,
                app,
                t: step,
              });
            } catch (error) {
              throw createScenarioDiagnosticsError(
                error,
                args.navigation,
                [group],
                availableArtifactDirs,
              );
            }
          });
        }
      } finally {
        await artifacts.cleanup?.();
      }
    } catch (error) {
      throw createScenarioDiagnosticsError(error, args.navigation, [group]);
    }
  }
}

export function groupScenarioCasesByRecipe(
  cases: readonly ScenarioCase[],
  navigation: ScenarioNavigation,
  suiteApp?: ScenarioAppId,
): ScenarioCaseGroup[] {
  const groups = new Map<string, ScenarioCaseGroup>();

  for (const testCase of cases) {
    const supportedNavigations = testCase.navigation ??
      defaultScenarioNavigations;
    if (!supportedNavigations.includes(navigation)) {
      continue;
    }

    const recipe: ScenarioBuildRecipe = {
      app: resolveScenarioCaseAppId(testCase, suiteApp),
      profile: testCase.profile,
      navigation,
    };
    const key = getScenarioRecipeKey(recipe);
    const existing = groups.get(key);

    if (existing) {
      existing.cases.push(testCase);
      continue;
    }

    groups.set(key, {
      recipe,
      cases: [testCase],
    });
  }

  return [...groups.values()];
}

export function getScenarioRecipeKey(recipe: ScenarioBuildRecipe): string {
  return JSON.stringify([
    recipe.app,
    recipe.profile ?? "",
    recipe.navigation,
  ]);
}

export function formatScenarioRecipeDiagnostics(
  navigation: ScenarioNavigation,
  groups: readonly ScenarioCaseGroup[],
  availableArtifactDirs?: ReadonlyMap<string, readonly string[]>,
): string {
  const lines = [`[matrix] navigation: ${navigation}`];

  for (const group of groups) {
    lines.push(
      `[matrix] recipe: app=${group.recipe.app} profile=${
        group.recipe.profile ?? "none"
      } navigation=${group.recipe.navigation}`,
    );
    const outputDirs = availableArtifactDirs?.get(
      getScenarioRecipeKey(group.recipe),
    );
    for (const outputDir of outputDirs ?? []) {
      lines.push(
        `[matrix] artifact: mode=${describeOutputDir(outputDir)} outputDir=${outputDir}`,
      );
    }
    lines.push("[matrix] cases:");
    for (const testCase of group.cases) {
      lines.push(`- ${testCase.name}`);
    }
  }

  return lines.join("\n");
}

function describeOutputDir(outputDir: string): string {
  const outputLabel = outputDir.replace(/\\/g, "/").split("/").pop();
  return outputLabel && outputLabel.length > 0 ? outputLabel : "unknown";
}

async function buildScenarioArtifactSet(
  recipe: ScenarioBuildRecipe,
  testAppDefinition: ResolvedScenarioTestAppDefinition,
): Promise<ScenarioArtifactSet> {
  const context = await buildScenarioContext(
    recipe,
    testAppDefinition,
  );
  const available = context.availableBuilds.map((build) => {
    return {
      recipe: {
        app: recipe.app,
        profile: recipe.profile,
        navigation: recipe.navigation,
      },
      context: {
        testAppName: build.testAppName,
        testAppRoot: build.testAppRoot,
        outputDir: build.outputDir,
        targetName: build.targetName,
        navigation: build.navigation,
        profile: build.profile,
      },
      cleanup: context.cleanup,
    };
  });

  return {
    recipe,
    context,
    available,
    cleanup: context.cleanup,
  };
}

async function buildScenarioContext(
  recipe: ScenarioBuildRecipe,
  testAppDefinition: ResolvedScenarioTestAppDefinition,
): Promise<TestScenarioBuildContext> {
  if (!testAppDefinition.buildScenario) {
    throw new Error(
      `Scenario suite does not support app "${recipe.app}" yet.`,
    );
  }

  return await testAppDefinition.buildScenario({
    navigation: recipe.navigation,
    profile: recipe.profile,
  });
}

function resolveScenarioCaseAppId(
  testCase: ScenarioCase,
  suiteApp?: ScenarioAppId,
): ScenarioAppId {
  const app = testCase.app ?? suiteApp;
  if (!app) {
    throw new Error(
      `Scenario case "${testCase.name}" must declare an app directly or inherit one from the suite.`,
    );
  }

  return app;
}

function createScenarioApp(args: ScenarioResolvedAppContext): ScenarioApp {
  return {
    id: args.id,
    route(routePath) {
      return {
        async load() {
          const preview = await args.testApp.preview(
            await resolveArtifactForRoute(args, routePath),
            routePath,
          );

          return {
            html: preview.html,
            htmlPath: preview.htmlPath,
            outputDir: preview.outputDir,
            status: preview.responseStatus,
          };
        },
        async render() {
          return await args.testApp.render(
            await resolveArtifactForRoute(args, routePath),
            routePath,
          );
        },
        async html() {
          return await args.testApp.readHtml(
            await resolveArtifactForRoute(args, routePath),
            routePath,
          );
        },
        async json<T>(file: string) {
          return await args.testApp.readJson<T>(
            await resolveArtifactForRoute(args, routePath),
            file,
          );
        },
      };
    },
    document(documentHtmlPath) {
      return {
        async html() {
          const artifact = await resolveArtifactForDocumentFile(
            args,
            documentHtmlPath,
          );
          return await Deno.readTextFile(
            `${artifact.context.outputDir}/${documentHtmlPath}`,
          );
        },
        async renderAt(input) {
          return await args.testApp.renderDocument({
            artifact: await resolveArtifactForDocument(
              args,
              input.url,
              input.basePath,
            ),
            documentHtmlPath,
            url: input.url,
            basePath: input.basePath,
            navigationReady: input.navigationReady,
          });
        },
      };
    },
  };
}

async function resolveArtifactForRoute(
  args: Pick<ScenarioResolvedAppContext, "testApp" | "artifacts">,
  routePath: string,
): Promise<BuiltArtifact> {
  const availableArtifacts = getAvailableScenarioArtifacts(args.artifacts);
  if (availableArtifacts.length === 1) {
    return availableArtifacts[0];
  }

  const ssgArtifact = findSsgArtifact(args.artifacts.available);
  if (ssgArtifact && await doesRouteHtmlExist(args.testApp, ssgArtifact, routePath)) {
    return ssgArtifact;
  }

  const csrArtifact = findCsrArtifact(args.artifacts.available);
  if (csrArtifact && await doesRouteHtmlExist(args.testApp, csrArtifact, routePath)) {
    return csrArtifact;
  }

  if (args.artifacts.recipe.navigation === "spa" && csrArtifact) {
    return csrArtifact;
  }

  if (ssgArtifact && await doesDocumentExist(ssgArtifact, "404.html")) {
    return ssgArtifact;
  }

  if (csrArtifact) {
    return csrArtifact;
  }

  if (ssgArtifact) {
    return ssgArtifact;
  }

  throw new Error(
    `Scenario app "${args.artifacts.recipe.app}" did not produce any built artifacts for ${args.artifacts.recipe.navigation}.`,
  );
}

async function resolveArtifactForDocument(
  args: Pick<ScenarioResolvedAppContext, "testApp" | "artifacts">,
  url: string,
  basePath?: string,
): Promise<BuiltArtifact> {
  return await resolveArtifactForRoute(
    args,
    toScenarioRoutePath(url, basePath),
  );
}

async function resolveArtifactForDocumentFile(
  args: Pick<ScenarioResolvedAppContext, "testApp" | "artifacts">,
  documentHtmlPath: string,
): Promise<BuiltArtifact> {
  const availableArtifacts = getAvailableScenarioArtifacts(args.artifacts);
  if (availableArtifacts.length === 1) {
    return availableArtifacts[0];
  }

  if (documentHtmlPath === "404.html") {
    const ssgArtifact = findSsgArtifact(args.artifacts.available);
    if (ssgArtifact) {
      return ssgArtifact;
    }
  }

  const ssgArtifact = findSsgArtifact(args.artifacts.available);
  if (ssgArtifact && await doesDocumentExist(ssgArtifact, documentHtmlPath)) {
    return ssgArtifact;
  }

  const csrArtifact = findCsrArtifact(args.artifacts.available);
  if (csrArtifact && await doesDocumentExist(csrArtifact, documentHtmlPath)) {
    return csrArtifact;
  }

  return await resolveArtifactForRoute(
    args,
    toScenarioRouteFromDocument(documentHtmlPath),
  );
}

function getAvailableScenarioArtifacts(
  artifacts: ScenarioArtifactSet,
): BuiltArtifact[] {
  return [...artifacts.available];
}

function findCsrArtifact(
  artifacts: readonly BuiltArtifact[],
): BuiltArtifact | undefined {
  return artifacts.find((artifact) => isCsrArtifact(artifact));
}

function findSsgArtifact(
  artifacts: readonly BuiltArtifact[],
): BuiltArtifact | undefined {
  return artifacts.find((artifact) => isSsgArtifact(artifact));
}

async function doesRouteHtmlExist(
  testApp: ResolvedTestApp,
  artifact: BuiltArtifact,
  routePath: string,
): Promise<boolean> {
  return await doesFileExist(testApp.resolveHtmlPath(artifact, routePath));
}

async function doesDocumentExist(
  artifact: BuiltArtifact,
  documentHtmlPath: string,
): Promise<boolean> {
  return await doesFileExist(
    `${artifact.context.outputDir}/${documentHtmlPath.replace(/\\/g, "/")}`,
  );
}

async function doesFileExist(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }

    throw error;
  }
}

function toScenarioRoutePath(url: string, basePath?: string): string {
  const pathname = new URL(url).pathname;
  const normalizedBasePath = normalizeBasePath(basePath);
  if (!normalizedBasePath || !pathname.startsWith(normalizedBasePath)) {
    return pathname || "/";
  }

  const withoutBasePath = pathname.slice(normalizedBasePath.length - 1);
  return withoutBasePath || "/";
}

function normalizeBasePath(basePath?: string): string | undefined {
  if (!basePath) {
    return undefined;
  }

  return basePath.endsWith("/") ? basePath : `${basePath}/`;
}

function toScenarioRouteFromDocument(documentHtmlPath: string): string {
  const normalizedPath = documentHtmlPath.replace(/\\/g, "/");
  if (normalizedPath === "index.html") {
    return "/";
  }

  if (normalizedPath.endsWith("/index.html")) {
    const routePath = normalizedPath.slice(0, -"index.html".length);
    return routePath.startsWith("/") ? routePath : `/${routePath}`;
  }

  if (normalizedPath.endsWith(".html")) {
    const routePath = normalizedPath.slice(0, -".html".length);
    return routePath.startsWith("/") ? routePath : `/${routePath}`;
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
}

function logScenarioDiagnostics(
  navigation: ScenarioNavigation,
  groups: readonly ScenarioCaseGroup[],
): void {
  if (Deno.env.get("MAINZ_MATRIX_VERBOSE") !== "1") {
    return;
  }

  console.log(formatScenarioRecipeDiagnostics(navigation, groups));
}

function createScenarioDiagnosticsError(
  error: unknown,
  navigation: ScenarioNavigation,
  groups: readonly ScenarioCaseGroup[],
  availableArtifactDirs?: ReadonlyMap<string, readonly string[]>,
): Error {
  const details = error instanceof Error ? error.message : String(error);
  return new Error(
    `${details}\n\n${
      formatScenarioRecipeDiagnostics(navigation, groups, availableArtifactDirs)
    }`,
  );
}
