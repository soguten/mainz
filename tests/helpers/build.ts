import { resolve } from "node:path";
import {
  loadMainzConfig,
  normalizeMainzConfig,
} from "../../src/config/index.ts";
import {
  resolveEngineBuildJobs,
  resolveEngineBuildProfile,
  runEngineBuildJobs,
} from "../../src/build/index.ts";
import type {
  TestBuildContext,
  TestNavigationMode,
  TestScenarioBuildContext,
  TestAppTargetDefinition,
} from "./types.ts";
import { cliTestsRepoRoot } from "./types.ts";
import { makeMainzTempDir } from "./temp.ts";

const engineBuildLocks = new Map<string, Promise<void>>();
const testAppCleanupRetryDelaysMs = [25, 75, 150] as const;

type NamedTestAppBuildSpec = {
  testAppName: string;
  targetName: string;
  profile?: string;
  appFile?: string;
};

const routedAppBuildSpec = {
  testAppName: "routed-app",
  targetName: "routed-app",
} as const satisfies NamedTestAppBuildSpec;

const rootAppBuildSpec = {
  testAppName: "root-app",
  targetName: "root-app",
} as const satisfies NamedTestAppBuildSpec;

const routedDiEntriesAppBuildSpec = {
  testAppName: "routed-di-app",
  targetName: "routed-di-app",
} as const satisfies NamedTestAppBuildSpec;

const routedDiClientAppBuildSpec = {
  testAppName: "routed-di-client-app",
  targetName: "routed-di-client-app",
} as const satisfies NamedTestAppBuildSpec;

const routedAuthorizationAppBuildSpec = {
  testAppName: "routed-authorization-app",
  targetName: "routed-authorization-app",
} as const satisfies NamedTestAppBuildSpec;

const basePathAppBuildSpec = {
  testAppName: "base-path",
  targetName: "base-path-app",
  profile: "gh-pages",
} as const satisfies NamedTestAppBuildSpec;

const headSeoAppBuildSpec = {
  testAppName: "head-seo",
  targetName: "head-seo-app",
} as const satisfies NamedTestAppBuildSpec;

const generatedTagStabilityAppBuildSpec = {
  testAppName: "custom-element-generated-tag-stability",
  targetName: "generated-tag-stability-app",
} as const satisfies NamedTestAppBuildSpec;

const singleLocaleRoutedAppBuildSpec = {
  testAppName: "single-locale-routing",
  targetName: "single-locale-routed-app",
} as const satisfies NamedTestAppBuildSpec;

const documentLanguageRoutedAppBuildSpec = {
  testAppName: "document-language-routing",
  targetName: "document-language-routed-app",
} as const satisfies NamedTestAppBuildSpec;

export const buildRoutedAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(routedAppBuildSpec, navigation);

export const buildRootAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(rootAppBuildSpec, navigation);

export const buildSingleLocaleRoutedAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(
    singleLocaleRoutedAppBuildSpec,
    navigation,
  );

export const buildDocumentLanguageRoutedAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(
    documentLanguageRoutedAppBuildSpec,
    navigation,
  );

export const buildBasePathAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(basePathAppBuildSpec, navigation);

export const buildRoutedDiEntriesAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(routedDiEntriesAppBuildSpec, navigation);

export const buildRoutedDiClientAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(routedDiClientAppBuildSpec, navigation);

export const buildRoutedAuthorizationAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(
    routedAuthorizationAppBuildSpec,
    navigation,
  );

export const buildHeadSeoAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(headSeoAppBuildSpec, navigation);

export const buildGeneratedTagStabilityAppForNavigation = (
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> =>
  buildRegisteredTestAppForNavigation(
    generatedTagStabilityAppBuildSpec,
    navigation,
  );

export async function buildTestAppForNavigation(args: {
  testApp: Pick<
    TestAppTargetDefinition,
    "target" | "testAppRoot" | "outputDir" | "targetName"
  >;
  navigation: TestNavigationMode;
  profile?: string;
}): Promise<TestScenarioBuildContext> {
  await runTestAppBuildForNavigation(args);

  return {
    testAppName: args.testApp.targetName,
    testAppRoot: args.testApp.testAppRoot,
    availableBuilds: await resolveBuiltOutputContexts({
      outputBaseDir: args.testApp.outputDir,
      testAppName: args.testApp.targetName,
      testAppRoot: args.testApp.testAppRoot,
      targetName: args.testApp.targetName,
      navigation: args.navigation,
      profile: args.profile,
    }),
    targetName: args.testApp.targetName,
    navigation: args.navigation,
    profile: args.profile,
  };
}

export async function buildTargetWithEngine(args: {
  targetName: string;
  profile?: string;
  configPath?: string;
  cwd?: string;
}): Promise<void> {
  const cwd = args.cwd ?? cliTestsRepoRoot;
  const buildKey = [
    cwd,
    args.configPath ?? "mainz.config.ts",
    args.targetName,
  ].join("::");

  await withEngineBuildLock(buildKey, async () => {
    try {
      const loadedConfig = await loadMainzConfig(args.configPath);
      const normalizedConfig = normalizeMainzConfig(loadedConfig.config);
      const selectedTarget = normalizedConfig.targets.find((target) =>
        target.name === args.targetName
      );
      if (!selectedTarget) {
        throw new Error(
          `No targets matched "${args.targetName}". Available targets: ${
            normalizedConfig.targets.map((target) => target.name).join(", ")
          }`,
        );
      }

      const resolvedProfile = await resolveEngineBuildProfile(
        selectedTarget,
        args.profile,
        cwd,
      );

      const resolvedJobs = (await resolveEngineBuildJobs(
        normalizedConfig,
        {
          configPath: args.configPath,
          target: args.targetName,
          profile: args.profile,
        },
        cwd,
      )).map((job) => ({
        ...job,
        profile: job.target.name === selectedTarget.name
          ? resolvedProfile
          : job.profile,
      }));

      await runEngineBuildJobs(normalizedConfig, resolvedJobs, cwd);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to build ${args.targetName}: ${details}`,
      );
    }
  });
}

async function runTestAppBuildForNavigation(args: {
  testApp: Pick<
    TestAppTargetDefinition,
    "target" | "testAppRoot" | "outputDir" | "targetName"
  >;
  navigation: TestNavigationMode;
  profile?: string;
}): Promise<void> {
  await buildTestAppTargetWithEngine({
    target: args.testApp.target,
    profile: args.profile,
    cwd: cliTestsRepoRoot,
  });
}

export async function createTestAppTargetDefinition(args: {
  testAppName: string;
  targetName?: string;
  appFile?: string;
  appNavigation?: TestNavigationMode;
}): Promise<TestAppTargetDefinition> {
  const sourceTestAppRoot = resolve(
    cliTestsRepoRoot,
    "tests",
    "test-apps",
    args.testAppName,
  );
  const targetName = args.targetName ?? args.testAppName;
  const tempRoot = await makeMainzTempDir({
    cwd: cliTestsRepoRoot,
    prefix: `${args.testAppName}-`,
    subdirectories: ["tests", "test-apps"],
  });
  const testAppRoot = resolve(tempRoot, "test-app");
  await copyDirectory(sourceTestAppRoot, testAppRoot);
  if (args.appNavigation) {
    await applyAppNavigationToTestApp(testAppRoot, args.appNavigation);
  }
  const outputDir = resolve(tempRoot, "dist", targetName);
  const requestedAppFile = args.appFile
    ? resolve(testAppRoot, args.appFile)
    : resolve(testAppRoot, "src", "main.tsx");
  const buildConfigPath = resolve(testAppRoot, "mainz.build.ts");
  const hasBuildConfig = await fileExists(buildConfigPath);
  const includeAppFile = args.appFile !== undefined ||
    await fileExists(requestedAppFile);

  const targetDefinition = {
    name: targetName,
    rootDir: testAppRoot,
    ...(includeAppFile ? { appFile: requestedAppFile } : {}),
    ...(hasBuildConfig ? { buildConfig: buildConfigPath } : {}),
    outDir: outputDir,
  };
  const target = normalizeMainzConfig({
    targets: [targetDefinition],
  }).targets[0];

  return {
    target,
    targetDefinition,
    testAppRoot,
    outputDir,
    targetName,
    async cleanup() {
      await removeTestAppTempDir(tempRoot);
    },
  };
}

async function buildNamedTestAppForNavigation(args: {
  testAppName: string;
  targetName: string;
  navigation: TestNavigationMode;
  profile?: string;
  appFile?: string;
}): Promise<TestScenarioBuildContext> {
  const testApp = await createTestAppTargetDefinition({
    testAppName: args.testAppName,
    targetName: args.targetName,
    appFile: args.appFile,
    appNavigation: args.navigation,
  });

  try {
    const context = await buildTestAppForNavigation({
      testApp,
      navigation: args.navigation,
      profile: args.profile,
    });

    return {
      ...context,
      cleanup: testApp.cleanup,
    };
  } catch (error) {
    await testApp.cleanup();
    throw error;
  }
}

async function buildRegisteredTestAppForNavigation(
  spec: NamedTestAppBuildSpec,
  navigation: TestNavigationMode,
): Promise<TestScenarioBuildContext> {
  return await buildNamedTestAppForNavigation({
    ...spec,
    navigation,
    profile: spec.profile,
  });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveBuiltOutputContexts(args: {
  outputBaseDir: string;
  testAppName?: string;
  testAppRoot?: string;
  targetName: string;
  navigation: TestNavigationMode;
  profile?: string;
}): Promise<TestBuildContext[]> {
  const builds: TestBuildContext[] = [];
  for (const outputKind of ["csr", "ssg"] as const) {
    const modeOutputDir = resolve(args.outputBaseDir, outputKind);
    if (await fileExists(modeOutputDir)) {
      builds.push({
        testAppName: args.testAppName,
        testAppRoot: args.testAppRoot,
        outputDir: modeOutputDir,
        targetName: args.targetName,
        navigation: args.navigation,
        profile: args.profile,
      });
    }
  }
  return builds;
}

async function removeTestAppTempDir(path: string): Promise<void> {
  for (const delayMs of [0, ...testAppCleanupRetryDelaysMs]) {
    try {
      await Deno.remove(path, { recursive: true });
      return;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        if (
          delayMs ===
            testAppCleanupRetryDelaysMs[
              testAppCleanupRetryDelaysMs.length - 1
            ]
        ) {
          throw error;
        }

        await delay(delayMs);
        continue;
      }

      return;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildTestAppTargetWithEngine(args: {
  target: TestAppTargetDefinition["target"];
  profile?: string;
  cwd?: string;
}): Promise<void> {
  const cwd = args.cwd ?? cliTestsRepoRoot;
  const normalizedConfig = {
    runtime: "deno" as const,
    targets: [args.target],
  };
  const buildKey = [
    cwd,
    args.target.name,
    args.target.outDir,
  ].join("::");

  await withEngineBuildLock(buildKey, async () => {
    try {
      const resolvedProfile = await resolveEngineBuildProfile(
        args.target,
        args.profile,
        cwd,
      );

      const resolvedJobs = (await resolveEngineBuildJobs(
        normalizedConfig,
        {
          target: args.target.name,
          profile: args.profile,
        },
        cwd,
      )).map((job) => ({
        ...job,
        profile: resolvedProfile,
      }));

      await runEngineBuildJobs(normalizedConfig, resolvedJobs, cwd);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to build ${args.target.name}: ${details}`,
      );
    }
  });
}

async function copyDirectory(
  sourceDir: string,
  destinationDir: string,
): Promise<void> {
  await Deno.mkdir(destinationDir, { recursive: true });
  for await (const entry of Deno.readDir(sourceDir)) {
    const sourcePath = resolve(sourceDir, entry.name);
    const destinationPath = resolve(destinationDir, entry.name);

    if (entry.isDirectory) {
      await copyDirectory(sourcePath, destinationPath);
      continue;
    }

    await Deno.copyFile(sourcePath, destinationPath);
  }
}

async function applyAppNavigationToTestApp(
  testAppRoot: string,
  navigation: TestNavigationMode,
): Promise<void> {
  const mainPath = resolve(testAppRoot, "src", "main.tsx");
  if (!await fileExists(mainPath)) {
    return;
  }

  const source = await Deno.readTextFile(mainPath);
  const withoutExistingNavigation = source.replace(
    /^(\s*)navigation:\s*"(spa|mpa)",\r?\n/m,
    "",
  );
  const updated = withoutExistingNavigation.replace(
    /^(\s*id:\s*"[^"]+",\r?\n)/m,
    `$1    navigation: ${JSON.stringify(navigation)},\n`,
  );

  if (updated === withoutExistingNavigation) {
    throw new Error(
      `Could not apply app navigation to test app at ${mainPath}.`,
    );
  }

  await Deno.writeTextFile(mainPath, updated);
}

async function withEngineBuildLock(
  key: string,
  run: () => Promise<void>,
): Promise<void> {
  const previous = engineBuildLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = previous.catch(() => undefined).then(() => current);
  engineBuildLocks.set(key, chain);

  await previous.catch(() => undefined);

  try {
    await run();
  } finally {
    release();

    if (engineBuildLocks.get(key) === chain) {
      engineBuildLocks.delete(key);
    }
  }
}
